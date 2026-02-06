// BuzzChat - Background Service Worker
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.
// Handles alarms, cross-tab communication, persistent state, and license verification

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Import native messaging handler for MCP server communication
import { initNativeMessaging, handleNativeMessage } from './nativeMessaging.js';

// =============================================================================
// SECURE AI PROXY
// =============================================================================
// All Anthropic API calls are routed through this background worker so that
// API keys never appear in content-script network traffic (DevTools safe).

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-3-haiku-20240307';
const AI_MAX_TOKENS = 100;
const AI_TIMEOUT_MS = 5000;

const AI_TONE_STYLES = {
  friendly: 'warm, casual, use emojis sparingly, helpful and approachable',
  professional: 'polite, clear, businesslike, courteous',
  hype: 'excited, energetic, lots of enthusiasm, occasional emojis like fire and sparkles',
  chill: 'relaxed, laid-back, conversational, easygoing'
};

// =============================================================================
// SMART INTENT DETECTION SYSTEM
// =============================================================================
// Detects buyer intent, sentiment, and priority to help sellers focus on
// messages that matter most - actual buyers, not just lurkers.

const INTENT_PATTERNS = {
  // HIGH PRIORITY - Active purchase signals (these people want to BUY)
  purchase: {
    exact: ['sold', 'mine', 'claiming', 'claimed', 'i want it', 'i need it', 'take it', 'ill take it', "i'll take it", 'want this', 'need this', 'buying', 'purchased', 'got it', 'snagged', 'copped', 'secured'],
    patterns: [/\bi('ll|m gonna|m going to) (take|buy|get|claim|grab)/i, /^mine!?$/i, /^sold!?$/i, /^claiming!?$/i, /^i want( this)?!?$/i, /dibs/i, /shut up and take my money/i]
  },

  // HIGH PRIORITY - Price questions (pre-purchase behavior)
  priceQuestion: {
    exact: ['how much', 'price', 'cost', 'pricing', '$$', '$?', 'what price', "what's it going for", 'going for', 'asking price', 'retail', 'msrp'],
    patterns: [/how much (is|for|does)/i, /what('s| is| does) (the |it )?(price|cost)/i, /price\s*(check|\?|on)/i, /\$+\?/]
  },

  // HIGH PRIORITY - Availability questions (ready to buy if available)
  availability: {
    exact: ['still available', 'is this gone', 'any left', 'sold out', 'in stock', 'do you have', 'got any', 'available', 'left'],
    patterns: [/still (have|got|available)/i, /any (more|left|available)/i, /is (this|it|that) (gone|sold|available)/i, /do you (still )?have/i, /got any more/i, /how many left/i]
  },

  // MEDIUM PRIORITY - Shipping questions (serious buyer signal)
  shipping: {
    exact: ['ship to', 'shipping cost', 'shipping price', 'international', 'worldwide', 'ship international', 'delivery', 'how long to ship', 'shipping time', 'tracking'],
    patterns: [/ship(ping)? to .+/i, /do you ship (to )?/i, /(shipping|delivery) (cost|price|time|fee)/i, /how (long|much) (for |to |is )?(ship|deliver)/i, /international ship/i, /ship outside/i, /where do you ship/i]
  },

  // MEDIUM PRIORITY - Size/fit questions (considering purchase)
  sizeQuestion: {
    exact: ['what size', 'size', 'sizing', 'fit', 'fits', 'measurements', 'dimensions', 'length', 'width', 'tts', 'true to size', 'runs small', 'runs big', 'runs large'],
    patterns: [/what size (is|does)/i, /(how does|does) (it|this) fit/i, /fit (like|check)/i, /size (guide|chart|info)/i, /tts\??/i, /true to size\??/i, /runs (small|big|large|tight)/i, /measurements\??/i]
  },

  // MEDIUM PRIORITY - Condition/authenticity questions
  condition: {
    exact: ['condition', 'authentic', 'real', 'fake', 'legit', 'original', 'worn', 'used', 'new', 'nwt', 'nib', 'mint', 'flaws', 'defects'],
    patterns: [/what('s| is) the condition/i, /is (this|it) (authentic|real|legit|original)/i, /(any )?(flaws|defects|damage)/i, /how (worn|used)/i, /new with tags/i, /condition\??/i]
  },

  // LOW-MEDIUM - Complaints (need attention but not sales)
  complaint: {
    exact: ['frustrated', 'disappointed', 'waiting forever', 'still waiting', 'never received', 'wrong item', 'damaged', 'broken', 'scam', 'ripped off', 'refund', 'return'],
    patterns: [/been waiting (for |so )?long/i, /still (haven't|have not|waiting)/i, /(never|didn't|did not) (receive|get|arrive)/i, /want (a |my )?(refund|money back)/i, /(very |so )?(frustrated|disappointed|upset|angry)/i, /this is (wrong|broken|damaged)/i]
  },

  // LOW PRIORITY - Hype/excitement (engagement, not purchase intent)
  hype: {
    exact: ['fire', 'heat', 'grail', 'amazing', 'love it', 'beautiful', 'gorgeous', 'sick', 'dope', 'nice', 'clean', 'fresh', 'lit', 'insane', 'crazy', 'omg', 'wow'],
    patterns: [/🔥+/, /this is (fire|heat|sick|dope|insane)/i, /so (fire|sick|dope|clean|fresh)/i, /(love|want|need) (this|it|that) so (bad|much)/i, /omg+/i, /wow+/i]
  },

  // LOW PRIORITY - General questions
  question: {
    exact: [],
    patterns: [/^(what|where|when|why|how|who|which|can you|do you|is there|are there)/i, /\?$/]
  }
};

// Sentiment indicators
const SENTIMENT_INDICATORS = {
  positive: {
    words: ['love', 'amazing', 'beautiful', 'great', 'awesome', 'perfect', 'excellent', 'fantastic', 'wonderful', 'incredible', 'best', 'favorite', 'thanks', 'thank you', 'appreciate', 'excited', 'happy', 'glad', 'yes', 'yay', 'cool', 'nice', 'sweet'],
    emojis: ['❤️', '😍', '🔥', '💯', '👏', '🙌', '💪', '✨', '⭐', '🌟', '😊', '😄', '🥰', '💕', '👍', '🎉', '💖']
  },
  negative: {
    words: ['hate', 'terrible', 'awful', 'horrible', 'worst', 'bad', 'disappointed', 'frustrated', 'angry', 'upset', 'annoyed', 'scam', 'fake', 'never', 'wrong', 'broken', 'damaged', 'slow', 'late', 'waiting', 'refund', 'return', 'complaint', 'problem', 'issue'],
    emojis: ['😡', '😤', '😠', '👎', '💔', '😢', '😭', '🙄', '😒', '😞', '😔', '🤬']
  }
};

/**
 * Analyzes a single message for intent, sentiment, and priority
 * @param {string} message - The chat message to analyze
 * @returns {Object} Analysis result with priority, intent, sentiment, requiresResponse
 */
function analyzeMessageSentiment(message) {
  if (!message || typeof message !== 'string') {
    return { priority: 'low', intent: 'other', sentiment: 'neutral', requiresResponse: false };
  }

  const normalizedMsg = message.toLowerCase().trim();
  let detectedIntent = 'other';
  let priority = 'low';
  let requiresResponse = false;

  // Check for purchase intent (HIGHEST PRIORITY)
  if (matchesPattern(normalizedMsg, INTENT_PATTERNS.purchase)) {
    detectedIntent = 'purchase';
    priority = 'high';
    requiresResponse = true;
  }
  // Check for price questions (HIGH PRIORITY)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.priceQuestion)) {
    detectedIntent = 'question';
    priority = 'high';
    requiresResponse = true;
  }
  // Check for availability (HIGH PRIORITY)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.availability)) {
    detectedIntent = 'question';
    priority = 'high';
    requiresResponse = true;
  }
  // Check for shipping questions (MEDIUM-HIGH)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.shipping)) {
    detectedIntent = 'question';
    priority = 'medium';
    requiresResponse = true;
  }
  // Check for size/fit questions (MEDIUM)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.sizeQuestion)) {
    detectedIntent = 'question';
    priority = 'medium';
    requiresResponse = true;
  }
  // Check for condition questions (MEDIUM)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.condition)) {
    detectedIntent = 'question';
    priority = 'medium';
    requiresResponse = true;
  }
  // Check for complaints (MEDIUM - need attention)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.complaint)) {
    detectedIntent = 'complaint';
    priority = 'medium';
    requiresResponse = true;
  }
  // Check for hype/excitement (LOW - engagement only)
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.hype)) {
    detectedIntent = 'hype';
    priority = 'low';
    requiresResponse = false;
  }
  // Check for general questions
  else if (matchesPattern(normalizedMsg, INTENT_PATTERNS.question)) {
    detectedIntent = 'question';
    priority = 'low';
    requiresResponse = true;
  }

  // Analyze sentiment
  const sentiment = analyzeSentiment(message);

  // Boost priority for negative sentiment with questions/complaints
  if (sentiment === 'negative' && (detectedIntent === 'question' || detectedIntent === 'complaint')) {
    priority = priority === 'low' ? 'medium' : 'high';
    requiresResponse = true;
  }

  return {
    priority,
    intent: detectedIntent,
    sentiment,
    requiresResponse,
    // Include raw scores for debugging/analytics
    _meta: {
      originalMessage: message.slice(0, 100),
      matchedPatterns: getMatchedPatterns(normalizedMsg)
    }
  };
}

/**
 * Check if message matches any pattern in a category
 */
function matchesPattern(message, patternGroup) {
  // Check exact matches
  if (patternGroup.exact?.some(phrase => message.includes(phrase))) {
    return true;
  }
  // Check regex patterns
  if (patternGroup.patterns?.some(pattern => pattern.test(message))) {
    return true;
  }
  return false;
}

/**
 * Get list of all matched pattern categories (for debugging)
 */
function getMatchedPatterns(message) {
  const matched = [];
  for (const [category, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (matchesPattern(message, patterns)) {
      matched.push(category);
    }
  }
  return matched;
}

/**
 * Analyze message sentiment (positive/neutral/negative)
 */
function analyzeSentiment(message) {
  let positiveScore = 0;
  let negativeScore = 0;
  const lowerMsg = message.toLowerCase();

  // Count positive indicators
  SENTIMENT_INDICATORS.positive.words.forEach(word => {
    if (lowerMsg.includes(word)) positiveScore++;
  });
  SENTIMENT_INDICATORS.positive.emojis.forEach(emoji => {
    if (message.includes(emoji)) positiveScore += 2; // Emojis are strong signals
  });

  // Count negative indicators
  SENTIMENT_INDICATORS.negative.words.forEach(word => {
    if (lowerMsg.includes(word)) negativeScore++;
  });
  SENTIMENT_INDICATORS.negative.emojis.forEach(emoji => {
    if (message.includes(emoji)) negativeScore += 2;
  });

  // Determine overall sentiment
  if (positiveScore > negativeScore && positiveScore >= 2) return 'positive';
  if (negativeScore > positiveScore && negativeScore >= 2) return 'negative';
  if (positiveScore > 0 && negativeScore === 0) return 'positive';
  if (negativeScore > 0 && positiveScore === 0) return 'negative';
  return 'neutral';
}

/**
 * Batch analyze multiple messages and return prioritized list
 * @param {Array} messages - Array of {username, text, timestamp} objects
 * @returns {Array} Sorted array with analysis added to each message
 */
function batchAnalyzeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map(msg => ({
      ...msg,
      analysis: analyzeMessageSentiment(msg.text || msg.message || '')
    }))
    .sort((a, b) => {
      // Sort by priority: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.analysis.priority] - priorityOrder[b.analysis.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by requiresResponse
      if (a.analysis.requiresResponse !== b.analysis.requiresResponse) {
        return a.analysis.requiresResponse ? -1 : 1;
      }

      // Finally, sort by recency (newer first)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

// =============================================================================
// ENHANCED AI SYSTEM PROMPT
// =============================================================================

function buildAISystemPrompt(context, tone) {
  const toneStyle = AI_TONE_STYLES[tone] || AI_TONE_STYLES.friendly;

  let prompt = `You are an expert chat assistant for a live selling stream. You deeply UNDERSTAND buyer psychology and can recognize purchase intent from conversation context, not just keywords.

## YOUR ROLE
Help the seller by crafting responses that:
1. Prioritize BUYERS (people ready to purchase) over lurkers
2. Recognize purchase signals and act on them quickly
3. Keep the energy high and sales flowing
4. Handle complaints gracefully to prevent escalation

## TONE
${toneStyle}

## CONTEXT`;

  if (context.platform) prompt += `\n- Platform: ${context.platform}`;
  if (context.sellerName) prompt += `\n- Seller name: ${context.sellerName}`;
  if (context.currentItem) prompt += `\n- Currently selling: ${context.currentItem}`;
  if (context.itemPrice) prompt += `\n- Price: ${context.itemPrice}`;
  if (context.additionalContext) prompt += `\n- Additional info: ${context.additionalContext}`;

  prompt += `

## BUYER INTENT RECOGNITION
Recognize these signals and respond appropriately:

**PURCHASE INTENT (URGENT - respond fast!):**
- "I'll take it", "sold", "mine", "claiming", "want this", "need this"
- → Acknowledge immediately, confirm the claim, create urgency

**PRICE QUESTIONS (serious buyer):**
- "How much?", "price?", "what's it going for?", "cost?"
- → Point to listing/stream, don't give specific numbers

**AVAILABILITY (ready to buy):**
- "Still available?", "any left?", "is this gone?"
- → Confirm availability, create urgency if low stock

**SHIPPING QUESTIONS (considering purchase):**
- "Ship to [location]?", "shipping cost?", "international?"
- → Confirm general shipping, redirect to listing for specifics

**SIZE/FIT QUESTIONS (comparing options):**
- "What size?", "TTS?", "runs small/big?"
- → Give general guidance, suggest asking in chat

**COMPLAINTS (damage control):**
- Frustrated language, refund requests, negative sentiment
- → Acknowledge, empathize, offer to help resolve privately

**HYPE (engagement, not sales):**
- "Fire 🔥", "love it", "amazing"
- → Quick acknowledgment, keep momentum going

## CRITICAL RULES
1. Keep responses under 100 characters (this is live chat!)
2. NEVER mention you are AI, a bot, or automated
3. NEVER give specific prices - say "Check the listing!" or "Posted!"
4. NEVER give specific shipping costs - say "Depends on location!"
5. NEVER make promises about inventory or availability you can't verify
6. Be genuinely helpful and engaging
7. Match the fast, casual tone of live stream chat
8. If someone seems upset, de-escalate with empathy
9. When someone claims an item, celebrate it! Keep the hype going
10. If unsure, redirect to the seller or listing`;

  return prompt;
}

/**
 * Build a specialized prompt for batch chat analysis
 */
function buildBatchAnalysisPrompt(context) {
  return `You are analyzing a batch of live stream chat messages to help the seller prioritize responses.

## YOUR TASK
Review these messages and identify:
1. **Buyers** - People actively trying to purchase (HIGHEST PRIORITY)
2. **Serious Questions** - Price, shipping, availability, size queries
3. **Complaints** - Negative sentiment needing attention
4. **General Engagement** - Hype, excitement, casual chat

## CONTEXT
${context.platform ? `Platform: ${context.platform}` : ''}
${context.sellerName ? `Seller: ${context.sellerName}` : ''}
${context.currentItem ? `Current Item: ${context.currentItem}` : ''}

## OUTPUT FORMAT
Return a JSON array with this structure for each message that needs attention:
[
  {
    "username": "the_user",
    "priority": "high|medium|low",
    "intent": "purchase|question|complaint|hype|other",
    "suggestedResponse": "Brief response under 100 chars",
    "reason": "Why this needs attention"
  }
]

Only include messages that need a response. Skip pure hype/lurker messages unless they contain questions.
Focus on actionable messages that could lead to sales or need damage control.`;
}

async function handleAIRequest(payload) {
  const { userMessage, context = {}, tone = 'friendly', apiKey } = payload;

  if (!apiKey || !userMessage) {
    return { error: 'Missing required fields' };
  }

  const systemPrompt = buildAISystemPrompt(context, tone);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) return { error: 'Invalid API key' };
      if (response.status === 429) return { error: 'Rate limited - too many requests' };
      if (response.status === 400) return { error: errorData.error?.message || 'Bad request' };
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const responseText = (data.content?.[0]?.text || '').trim().slice(0, 150);

    return {
      text: responseText,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') return { error: 'Request timed out' };
    return { error: error.message || 'Unknown AI error' };
  }
}

/**
 * Handle batch chat analysis request
 * Combines local pattern matching with optional Claude AI for deeper understanding
 * @param {Object} payload - { messages, context, apiKey, useAI }
 */
async function handleAnalyzeChatRequest(payload) {
  const { messages = [], context = {}, apiKey, useAI = false } = payload;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: 'No messages provided', messages: [] };
  }

  // Step 1: Always do local analysis first (fast, free)
  const localAnalysis = batchAnalyzeMessages(messages);

  // If AI is not requested or no API key, return local analysis
  if (!useAI || !apiKey) {
    return {
      messages: localAnalysis,
      method: 'local',
      highPriority: localAnalysis.filter(m => m.analysis.priority === 'high'),
      mediumPriority: localAnalysis.filter(m => m.analysis.priority === 'medium'),
      stats: getAnalysisStats(localAnalysis)
    };
  }

  // Step 2: Use AI for enhanced analysis on high-priority messages
  try {
    const highPriorityMessages = localAnalysis.filter(
      m => m.analysis.priority === 'high' || m.analysis.priority === 'medium'
    ).slice(0, 10); // Limit to 10 to control API costs

    if (highPriorityMessages.length === 0) {
      return {
        messages: localAnalysis,
        method: 'local',
        highPriority: [],
        mediumPriority: [],
        stats: getAnalysisStats(localAnalysis)
      };
    }

    // Format messages for AI analysis
    const messagesText = highPriorityMessages
      .map(m => `[${m.username || 'Anonymous'}]: ${m.text || m.message}`)
      .join('\n');

    const systemPrompt = buildBatchAnalysisPrompt(context);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for batch

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Analyze these chat messages and suggest responses:\n\n${messagesText}`
        }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fall back to local analysis if AI fails
      console.warn('[BuzzChat] AI batch analysis failed, using local:', response.status);
      return {
        messages: localAnalysis,
        method: 'local-fallback',
        highPriority: localAnalysis.filter(m => m.analysis.priority === 'high'),
        mediumPriority: localAnalysis.filter(m => m.analysis.priority === 'medium'),
        stats: getAnalysisStats(localAnalysis)
      };
    }

    const data = await response.json();
    const aiResponseText = data.content?.[0]?.text || '';

    // Parse AI suggestions and merge with local analysis
    const aiSuggestions = parseAISuggestions(aiResponseText);
    const enhancedMessages = mergeAIWithLocal(localAnalysis, aiSuggestions);

    return {
      messages: enhancedMessages,
      method: 'ai-enhanced',
      highPriority: enhancedMessages.filter(m => m.analysis.priority === 'high'),
      mediumPriority: enhancedMessages.filter(m => m.analysis.priority === 'medium'),
      aiSuggestions: aiSuggestions,
      stats: getAnalysisStats(enhancedMessages),
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };

  } catch (error) {
    console.error('[BuzzChat] AI analysis error:', error);
    // Fall back to local analysis
    return {
      messages: localAnalysis,
      method: 'local-fallback',
      error: error.message,
      highPriority: localAnalysis.filter(m => m.analysis.priority === 'high'),
      mediumPriority: localAnalysis.filter(m => m.analysis.priority === 'medium'),
      stats: getAnalysisStats(localAnalysis)
    };
  }
}

/**
 * Parse AI suggestions from response text
 */
function parseAISuggestions(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (e) {
    console.warn('[BuzzChat] Failed to parse AI suggestions:', e);
    return [];
  }
}

/**
 * Merge AI suggestions with local analysis
 */
function mergeAIWithLocal(localAnalysis, aiSuggestions) {
  if (!aiSuggestions || aiSuggestions.length === 0) {
    return localAnalysis;
  }

  // Create a map of AI suggestions by username
  const aiMap = new Map();
  aiSuggestions.forEach(suggestion => {
    if (suggestion.username) {
      aiMap.set(suggestion.username.toLowerCase(), suggestion);
    }
  });

  // Merge AI suggestions into local analysis
  return localAnalysis.map(msg => {
    const username = (msg.username || '').toLowerCase();
    const aiSuggestion = aiMap.get(username);

    if (aiSuggestion) {
      return {
        ...msg,
        analysis: {
          ...msg.analysis,
          aiEnhanced: true,
          suggestedResponse: aiSuggestion.suggestedResponse,
          aiReason: aiSuggestion.reason,
          // Override priority if AI suggests higher
          priority: getPriorityLevel(aiSuggestion.priority) < getPriorityLevel(msg.analysis.priority)
            ? aiSuggestion.priority
            : msg.analysis.priority
        }
      };
    }
    return msg;
  });
}

/**
 * Get numeric priority level (lower = higher priority)
 */
function getPriorityLevel(priority) {
  const levels = { high: 0, medium: 1, low: 2 };
  return levels[priority] ?? 2;
}

/**
 * Get statistics about analyzed messages
 */
function getAnalysisStats(messages) {
  const stats = {
    total: messages.length,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    intents: {},
    sentiments: { positive: 0, neutral: 0, negative: 0 },
    requiresResponse: 0
  };

  messages.forEach(msg => {
    const a = msg.analysis;
    if (a.priority === 'high') stats.highPriority++;
    else if (a.priority === 'medium') stats.mediumPriority++;
    else stats.lowPriority++;

    stats.intents[a.intent] = (stats.intents[a.intent] || 0) + 1;
    stats.sentiments[a.sentiment]++;
    if (a.requiresResponse) stats.requiresResponse++;
  });

  return stats;
}

// License verification configuration
const LICENSE_CONFIG = {
  TRIAL_DAYS: 7,
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000 // 24 hours
};

// Tier-specific limits (Claude-style pricing model)
// Free: Generous to compete with free bots (Nightbot, etc.)
// Tier Limits - Updated Feb 2026
// Free: Try before you buy
// Pro ($4.99): Serious sellers - unlimited AI + smart features
// Seller+ ($12.99): Power sellers - dashboard + inventory + buyer profiles
// Team ($29.99): Businesses - unlimited seats + API + custom training
function getTierLimits(tier) {
  switch(tier) {
    case 'team':
      return {
        aiResponses: Infinity,
        faqRules: Infinity,
        timers: Infinity,
        templates: Infinity,
        historyDays: 365,
        configs: Infinity,
        teamSeats: Infinity,
        smartQueue: true,
        intentDetection: true,
        liveDashboard: true,
        inventory: true,
        soldDetection: true,
        buyerProfiles: true,
        apiAccess: true,
        customAiTraining: true,
        whiteLabel: true
      };
    case 'sellerplus':
    case 'seller+':
    case 'max': // Legacy
    case 'business': // Legacy
      return {
        aiResponses: Infinity,
        faqRules: Infinity,
        timers: Infinity,
        templates: Infinity,
        historyDays: 90,
        configs: 5,
        teamSeats: 3,
        smartQueue: true,
        intentDetection: true,
        liveDashboard: true,
        inventory: true,
        soldDetection: true,
        buyerProfiles: true,
        apiAccess: false,
        customAiTraining: false,
        whiteLabel: false
      };
    case 'pro':
      return {
        aiResponses: Infinity,
        faqRules: Infinity,
        timers: Infinity,
        templates: Infinity,
        historyDays: 30,
        configs: 1,
        teamSeats: 0,
        smartQueue: true,
        intentDetection: true,
        liveDashboard: false,
        inventory: false,
        soldDetection: false,
        buyerProfiles: false,
        apiAccess: false,
        customAiTraining: false,
        whiteLabel: false
      };
    default: // 'free'
      return {
        aiResponses: 50, // Per day
        faqRules: 3,
        timers: 2,
        templates: 5,
        historyDays: 7,
        configs: 1,
        teamSeats: 0,
        smartQueue: false,
        intentDetection: false,
        liveDashboard: false,
        inventory: false,
        soldDetection: false,
        buyerProfiles: false,
        apiAccess: false,
        customAiTraining: false,
        whiteLabel: false
      };
  }
}

// Verify and sync license on startup
async function verifyLicense() {
  try {
    // Get user data and settings from sync storage (settings + license sync across devices)
    let syncData;
    try {
      syncData = await browserAPI.storage.sync.get(['extensionpay_user', 'buzzchatLicense', 'buzzchatSettings']);
    } catch (e) {
      console.error('[BuzzChat] Failed to get sync storage:', e);
      syncData = {};
    }
    const user = syncData.extensionpay_user;
    const _cachedLicense = syncData.buzzchatLicense;
    const settings = syncData.buzzchatSettings || {};

    let license = { tier: 'free', paid: false, trialActive: false };

    if (user) {
      if (user.paid) {
        // Paid user
        // SECURITY: Don't store email/customerId in sync storage - only store tier info
        license = {
          tier: user.planId === 'business' ? 'business' : 'pro',
          paid: true,
          trialActive: false,
          // Email and customerId are available from ExtensionPay when needed
          hasAccount: true
        };
      } else if (user.trialStartedAt) {
        // Check if trial is still active
        const trialStart = new Date(user.trialStartedAt);
        const trialEnd = new Date(trialStart.getTime() + (LICENSE_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000));

        if (new Date() < trialEnd) {
          license = {
            tier: 'pro',
            paid: false,
            trialActive: true,
            trialEndsAt: trialEnd.toISOString()
          };
        } else {
          // Trial expired - revert to free
          license = { tier: 'free', paid: false, trialActive: false, trialExpired: true };
        }
      }
    }

    // Cache the license (sync storage for cross-device sync)
    await browserAPI.storage.sync.set({
      buzzchatLicense: { ...license, cachedAt: Date.now() }
    });

    // Sync tier with settings and apply tier-specific limits
    if (settings.tier !== license.tier) {
      const limits = getTierLimits(license.tier);
      settings.tier = license.tier;
      settings.messagesLimit = limits.messages;
      settings.faqRulesLimit = limits.faqRules;
      settings.timersLimit = limits.timers;
      settings.templatesLimit = limits.templates;
      await browserAPI.storage.sync.set({ buzzchatSettings: settings });
      console.log('[BuzzChat] License synced:', license.tier, 'limits:', limits);
    }

    return license;

  } catch (error) {
    console.error('[BuzzChat] License verification failed:', error);
    return { tier: 'free', paid: false, trialActive: false };
  }
}

// Initialize on install
browserAPI.runtime.onInstalled.addListener((details) => {
  console.log('[BuzzChat] Extension installed:', details.reason);

  // Set default settings if new install (sync storage for cross-device sync)
  if (details.reason === 'install') {
    const freeLimits = getTierLimits('free');
    browserAPI.storage.sync.set({
      buzzchatSettings: {
        tier: 'free',
        messagesUsed: 0,
        messagesLimit: freeLimits.messages, // Per-show limit based on tier
        faqRulesLimit: freeLimits.faqRules,
        timersLimit: freeLimits.timers,
        templatesLimit: freeLimits.templates,
        referralBonus: 0, // Bonus messages from referrals
        masterEnabled: false,
        welcome: {
          enabled: false,
          message: 'Hey {username}! Welcome to the stream!',
          delay: 5
        },
        timer: {
          enabled: false,
          messages: []
        },
        faq: {
          enabled: false,
          rules: [
            {
              triggers: ['shipping', 'ship', 'deliver'],
              reply: 'We ship within 2-3 business days! US shipping is free over $50.',
              caseSensitive: false
            },
            {
              triggers: ['payment', 'pay', 'credit card'],
              reply: 'We accept all major credit cards and PayPal!',
              caseSensitive: false
            }
          ]
        },
        moderation: {
          enabled: false,
          blockedWords: [],
          blockRepeatedMessages: false,
          maxRepeatCount: 3
        },
        giveaway: {
          enabled: false,
          keywords: ['entered', 'entry', 'enter'],
          entries: [],
          uniqueOnly: true
        },
        templates: [
          {
            name: 'Shipping Info',
            text: 'Free shipping on orders over $50! US orders ship within 2-3 business days.'
          },
          {
            name: 'Follow Reminder',
            text: 'Make sure to follow me for more amazing deals! New items added daily!'
          }
        ],
        commands: {
          enabled: false,
          list: []
        },
        quickReply: {
          enabled: true,
          minimized: false,
          buttons: [
            { text: 'SOLD!', emoji: '🔥' },
            { text: 'Next item!', emoji: '➡️' },
            { text: '5 min break', emoji: '⏰' },
            { text: 'Thanks for watching!', emoji: '🙏' }
          ]
        },
        settings: {
          chatSelector: '',
          soundNotifications: true,
          showMessageCount: true,
          darkMode: false,
          watermark: false
        }
      }
    });

    console.log('[BuzzChat] Default settings initialized');
  }
});

// Listen for messages from content scripts and popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BuzzChat] Received message:', message.type);

  // Handle MCP bridge messages
  if (message && message.source === 'mcp-bridge') {
    handleNativeMessage(message).then(sendResponse);
    return true;
  }

  switch (message.type) {
    case 'MESSAGE_SENT':
      // Forward to popup to update counter
      forwardToPopup(message);
      break;

    case 'GET_SETTINGS':
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        sendResponse(result.buzzchatSettings);
      });
      return true; // Keep channel open for async response

    case 'RESET_MESSAGE_COUNT':
      // Reset daily message count (for free tier)
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        if (result.buzzchatSettings) {
          result.buzzchatSettings.messagesUsed = 0;
          browserAPI.storage.sync.set({ buzzchatSettings: result.buzzchatSettings });
          sendResponse({ success: true });
        }
      });
      return true;

    case 'VERIFY_LICENSE':
      // Verify and return current license
      verifyLicense().then(license => {
        sendResponse(license);
      });
      return true;

    case 'GET_LICENSE':
      // Get cached license (from sync storage for cross-device sync)
      browserAPI.storage.sync.get(['buzzchatLicense'], (result) => {
        sendResponse(result.buzzchatLicense || { tier: 'free', paid: false });
      });
      return true;

    case 'GET_TIER_LIMITS':
      // Get limits for a specific tier (or current tier if not specified)
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        const tier = message.tier || result.buzzchatSettings?.tier || 'free';
        const limits = getTierLimits(tier);
        sendResponse({ tier, limits });
      });
      return true;

    case 'GET_AI_CREDITS':
    case 'getAICredits':
      // Get AI credits for Max tier users
      getAICredits().then(credits => {
        sendResponse(credits);
      }).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    case 'AI_GENERATE_RESPONSE':
      // SECURE AI PROXY: Handle AI requests from content scripts
      // The API key stays in the background worker's network traffic only
      handleAIRequest(message.payload).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    case 'ANALYZE_MESSAGE':
      // Quick local sentiment/intent analysis (no API call)
      {
        const analysis = analyzeMessageSentiment(message.payload?.message || '');
        sendResponse(analysis);
      }
      return true;

    case 'ANALYZE_CHAT':
    case 'analyzeChat':
      // Batch analyze chat messages with optional AI enhancement
      handleAnalyzeChatRequest(message.payload).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    case 'BATCH_ANALYZE':
      // Quick local batch analysis (no API call)
      {
        const results = batchAnalyzeMessages(message.payload?.messages || []);
        sendResponse({ messages: results, method: 'local' });
      }
      return true;

    default:
      // Also handle action-based messages for backward compatibility
      if (message.action === 'getAICredits') {
        getAICredits().then(credits => {
          sendResponse(credits);
        }).catch(err => {
          sendResponse({ error: err.message });
        });
        return true;
      }
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Get AI credits from storage
async function getAICredits() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchat_ai_credits'], (result) => {
      const data = result.buzzchat_ai_credits || {};
      const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
      const MONTHLY_ALLOWANCE = 500;

      // Reset if new month
      if (data.month !== currentMonth) {
        resolve({
          remaining: MONTHLY_ALLOWANCE,
          used: 0,
          month: currentMonth,
          resetDate: getNextResetDate()
        });
        return;
      }

      resolve({
        remaining: Math.max(0, MONTHLY_ALLOWANCE - (data.used || 0)),
        used: data.used || 0,
        month: currentMonth,
        resetDate: getNextResetDate()
      });
    });
  });
}

// Get next reset date (1st of next month)
function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

// Forward message to popup
function forwardToPopup(message) {
  browserAPI.runtime.sendMessage(message).catch(err => {
    // Popup might not be open - only log unexpected errors
    if (err?.message && !err.message.includes('Receiving end does not exist')) {
      console.warn('[BuzzChat] Forward to popup failed:', err.message);
    }
  });
}

// Set up daily alarm to reset message count for free tier
browserAPI.alarms.create('resetDailyMessages', {
  periodInMinutes: 1440 // 24 hours
});

// Set up daily alarm for analytics cleanup
browserAPI.alarms.create('cleanupAnalytics', {
  periodInMinutes: 1440 // 24 hours
});

browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyMessages') {
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.buzzchatSettings && result.buzzchatSettings.tier === 'free') {
        result.buzzchatSettings.messagesUsed = 0;
        browserAPI.storage.sync.set({ buzzchatSettings: result.buzzchatSettings }, () => {
          if (browserAPI.runtime.lastError) {
            console.error('[BuzzChat] Storage set error:', browserAPI.runtime.lastError);
          } else {
            console.log('[BuzzChat] Daily message count reset');
          }
        });
      }
    });
  }

  if (alarm.name === 'cleanupAnalytics') {
    // Clean up old analytics data (keep last 90 days)
    browserAPI.storage.local.get(['buzzchatAnalytics'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.buzzchatAnalytics && result.buzzchatAnalytics.dailyStats) {
        const data = result.buzzchatAnalytics;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffKey = cutoffDate.toISOString().split('T')[0];

        let cleaned = false;
        Object.keys(data.dailyStats).forEach(key => {
          if (key < cutoffKey) {
            delete data.dailyStats[key];
            cleaned = true;
          }
        });

        if (cleaned) {
          browserAPI.storage.local.set({ buzzchatAnalytics: data }, () => {
            if (browserAPI.runtime.lastError) {
              console.error('[BuzzChat] Analytics cleanup error:', browserAPI.runtime.lastError);
            } else {
              console.log('[BuzzChat] Analytics data cleaned up');
            }
          });
        }
      }
    });
  }
});

// Handle extension icon click
browserAPI.action.onClicked.addListener((_tab) => {
  // Open popup - this is handled by default_popup in manifest
  // This listener is for when there's no popup defined
});

// Monitor tab updates to inject content script if needed
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('whatnot.com')) {
    console.log('[BuzzChat] Whatnot tab detected:', tab.url);
  }
});

// Set up license verification alarm (every 6 hours)
browserAPI.alarms.create('verifyLicense', {
  periodInMinutes: 360 // 6 hours
});

// Add license verification to alarm handler
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'verifyLicense') {
    verifyLicense().then(license => {
      console.log('[BuzzChat] License verified:', license.tier);
    });
  }
});

// Verify license on startup
verifyLicense().then(license => {
  console.log('[BuzzChat] Initial license verification:', license.tier);
});

// Initialize native messaging for MCP server communication
initNativeMessaging();

console.log('[BuzzChat] Background service worker started');
