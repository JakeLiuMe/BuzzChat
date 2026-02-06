// BuzzChat - AI Cost Control & Abuse Prevention
// Smart caching, rate limiting, and cost optimization

import { browserAPI } from '../core/config.js';

// Storage keys
const STORAGE_KEYS = {
  AI_CACHE: 'buzzchatAICache',
  AI_USAGE: 'buzzchatAIUsage',
  AI_SETTINGS: 'buzzchatAISettings'
};

// Cost constants (Claude Haiku pricing)
const COSTS = {
  INPUT_PER_1M: 0.25,
  OUTPUT_PER_1M: 1.25,
  AVG_INPUT_TOKENS: 150,
  AVG_OUTPUT_TOKENS: 80
};

// Tier limits (requests per day)
const TIER_LIMITS = {
  free: 50,
  pro: 500,
  'seller+': 1000,
  sellerplus: 1000,
  team: Infinity // BYOK or unlimited
};

// Rate limits (requests per minute)
const RATE_LIMITS = {
  free: 5,
  pro: 15,
  'seller+': 30,
  sellerplus: 30,
  team: 60
};

/**
 * Normalize a question for cache lookup
 * "How much is shipping?" → "how much shipping"
 */
function normalizeQuestion(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[?!.,'"]/g, '')
    .replace(/\b(is|are|the|a|an|what|how|do|does|can|will|would|could)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate cache key from normalized question
 */
function getCacheKey(question, context = {}) {
  const normalized = normalizeQuestion(question);
  const contextStr = context.currentItem || '';
  return `${normalized}|${contextStr}`.substring(0, 100);
}

/**
 * Get cached response if available
 */
export async function getCachedResponse(question, context = {}) {
  const key = getCacheKey(question, context);
  
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.AI_CACHE], (result) => {
      const cache = result[STORAGE_KEYS.AI_CACHE] || {};
      const entry = cache[key];
      
      // Cache valid for 24 hours
      if (entry && (Date.now() - entry.timestamp) < 24 * 60 * 60 * 1000) {
        resolve(entry.response);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Store response in cache
 */
export async function cacheResponse(question, response, context = {}) {
  const key = getCacheKey(question, context);
  
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.AI_CACHE], (result) => {
      const cache = result[STORAGE_KEYS.AI_CACHE] || {};
      
      // Limit cache size to 500 entries
      const keys = Object.keys(cache);
      if (keys.length >= 500) {
        // Remove oldest entries
        const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
        sorted.slice(0, 100).forEach(k => delete cache[k]);
      }
      
      cache[key] = {
        response,
        timestamp: Date.now(),
        question: question.substring(0, 200)
      };
      
      browserAPI.storage.local.set({ [STORAGE_KEYS.AI_CACHE]: cache }, resolve);
    });
  });
}

/**
 * Get usage stats for current period
 */
export async function getUsageStats() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.AI_USAGE], (result) => {
      const usage = result[STORAGE_KEYS.AI_USAGE] || {
        daily: { count: 0, date: new Date().toDateString(), tokens: 0 },
        monthly: { count: 0, month: new Date().getMonth(), tokens: 0 },
        minute: { count: 0, timestamp: Date.now() },
        total: { count: 0, tokens: 0, cost: 0 }
      };
      
      // Reset daily if new day
      if (usage.daily.date !== new Date().toDateString()) {
        usage.daily = { count: 0, date: new Date().toDateString(), tokens: 0 };
      }
      
      // Reset monthly if new month
      if (usage.monthly.month !== new Date().getMonth()) {
        usage.monthly = { count: 0, month: new Date().getMonth(), tokens: 0 };
      }
      
      // Reset minute counter if >60s passed
      if (Date.now() - usage.minute.timestamp > 60000) {
        usage.minute = { count: 0, timestamp: Date.now() };
      }
      
      resolve(usage);
    });
  });
}

/**
 * Record an AI API call
 */
export async function recordUsage(inputTokens = COSTS.AVG_INPUT_TOKENS, outputTokens = COSTS.AVG_OUTPUT_TOKENS) {
  const usage = await getUsageStats();
  
  const totalTokens = inputTokens + outputTokens;
  const cost = (inputTokens / 1000000 * COSTS.INPUT_PER_1M) + 
               (outputTokens / 1000000 * COSTS.OUTPUT_PER_1M);
  
  usage.daily.count++;
  usage.daily.tokens += totalTokens;
  usage.monthly.count++;
  usage.monthly.tokens += totalTokens;
  usage.minute.count++;
  usage.total.count++;
  usage.total.tokens += totalTokens;
  usage.total.cost += cost;
  
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [STORAGE_KEYS.AI_USAGE]: usage }, () => {
      resolve(usage);
    });
  });
}

/**
 * Check if user can make an AI request
 */
export async function canMakeRequest(tier = 'free') {
  const usage = await getUsageStats();
  const dailyLimit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const rateLimit = RATE_LIMITS[tier] || RATE_LIMITS.free;
  
  // Check daily limit
  if (usage.daily.count >= dailyLimit) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: `Daily limit reached (${dailyLimit} AI responses). Resets at midnight.`,
      resetIn: getTimeUntilMidnight()
    };
  }
  
  // Check rate limit
  if (usage.minute.count >= rateLimit) {
    return {
      allowed: false,
      reason: 'rate_limit',
      message: `Too many requests. Please wait a moment.`,
      resetIn: 60 - Math.floor((Date.now() - usage.minute.timestamp) / 1000)
    };
  }
  
  return {
    allowed: true,
    remaining: {
      daily: dailyLimit - usage.daily.count,
      perMinute: rateLimit - usage.minute.count
    }
  };
}

/**
 * Get time until midnight (daily reset)
 */
function getTimeUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight - now) / 1000);
}

/**
 * Smart AI request wrapper - checks cache, limits, then calls AI
 */
export async function smartAIRequest(question, context, tier, apiCallFn) {
  // 1. Check cache first (FREE)
  const cached = await getCachedResponse(question, context);
  if (cached) {
    console.log('[BuzzChat] AI cache hit:', question.substring(0, 50));
    return { response: cached, fromCache: true, cost: 0 };
  }
  
  // 2. Check if allowed
  const canRequest = await canMakeRequest(tier);
  if (!canRequest.allowed) {
    return { 
      error: true, 
      reason: canRequest.reason,
      message: canRequest.message,
      resetIn: canRequest.resetIn
    };
  }
  
  // 3. Make the API call
  try {
    const result = await apiCallFn();
    
    if (result.text) {
      // 4. Cache the response
      await cacheResponse(question, result.text, context);
      
      // 5. Record usage
      await recordUsage(result.usage?.inputTokens, result.usage?.outputTokens);
    }
    
    return { response: result.text, fromCache: false, usage: result.usage };
  } catch (error) {
    return { error: true, message: error.message };
  }
}

/**
 * Batch multiple questions into one API call
 */
export function batchQuestions(messages) {
  // Group similar questions
  const groups = {};
  
  messages.forEach((msg, idx) => {
    const normalized = normalizeQuestion(msg.text);
    const key = normalized.substring(0, 30);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({ ...msg, originalIndex: idx });
  });
  
  // Return grouped for batch processing
  return Object.values(groups);
}

/**
 * Estimate cost for a batch of messages
 */
export function estimateCost(messageCount, avgInputTokens = 150, avgOutputTokens = 80) {
  const inputCost = (messageCount * avgInputTokens / 1000000) * COSTS.INPUT_PER_1M;
  const outputCost = (messageCount * avgOutputTokens / 1000000) * COSTS.OUTPUT_PER_1M;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost,
    formatted: `$${(inputCost + outputCost).toFixed(4)}`
  };
}

/**
 * Get cost savings from caching
 */
export async function getCostSavings() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.AI_CACHE, STORAGE_KEYS.AI_USAGE], (result) => {
      const cache = result[STORAGE_KEYS.AI_CACHE] || {};
      const usage = result[STORAGE_KEYS.AI_USAGE] || { total: { count: 0, cost: 0 } };
      
      const cacheHits = Object.keys(cache).length;
      const estimatedSaved = cacheHits * 0.00015; // Avg cost per request
      
      resolve({
        cacheEntries: cacheHits,
        apiCalls: usage.total.count,
        actualCost: usage.total.cost,
        estimatedSaved,
        efficiency: usage.total.count > 0 
          ? Math.round((cacheHits / (cacheHits + usage.total.count)) * 100)
          : 0
      });
    });
  });
}

/**
 * Clear cache (for testing or reset)
 */
export async function clearCache() {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove([STORAGE_KEYS.AI_CACHE], resolve);
  });
}

/**
 * Get abuse indicators for an account
 */
export function detectAbusePatterns(usage) {
  const flags = [];
  
  // Flag 1: Using 5x average daily usage
  if (usage.daily.count > 250) {
    flags.push({ type: 'high_volume', severity: 'warning' });
  }
  
  // Flag 2: Consistently hitting rate limits
  if (usage.minute.count >= 10) {
    flags.push({ type: 'rate_abuse', severity: 'warning' });
  }
  
  // Flag 3: Unusual patterns (would need more data)
  // This is a placeholder for ML-based detection
  
  return {
    suspicious: flags.length > 0,
    flags,
    riskScore: Math.min(flags.length * 25, 100)
  };
}

// Export defaults
export default {
  getCachedResponse,
  cacheResponse,
  getUsageStats,
  recordUsage,
  canMakeRequest,
  smartAIRequest,
  batchQuestions,
  estimateCost,
  getCostSavings,
  clearCache,
  detectAbusePatterns,
  TIER_LIMITS,
  RATE_LIMITS
};
