/**
 * BuzzChat API Server
 * 
 * Revenue-generating API for live commerce automation.
 * 
 * Pricing:
 * - Developer: $29/mo (10K requests)
 * - Startup: $99/mo (100K requests)
 * - Enterprise: $499/mo (unlimited)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// API Key storage (in production, use Redis/PostgreSQL)
const apiKeys = new Map();
const usageTracking = new Map();

// Tier configurations
const TIERS = {
  developer: { requestsPerMonth: 10000, ratePerMinute: 60, price: 29 },
  startup: { requestsPerMonth: 100000, ratePerMinute: 300, price: 99 },
  enterprise: { requestsPerMonth: Infinity, ratePerMinute: 1000, price: 499 }
};

// Rate limiters per tier
const rateLimiters = {
  developer: new RateLimiterMemory({ points: 60, duration: 60 }),
  startup: new RateLimiterMemory({ points: 300, duration: 60 }),
  enterprise: new RateLimiterMemory({ points: 1000, duration: 60 })
};

// Demo API keys (for testing)
apiKeys.set('bz_live_demo_developer', { tier: 'developer', owner: 'demo', created: Date.now() });
apiKeys.set('bz_live_demo_startup', { tier: 'startup', owner: 'demo', created: Date.now() });

// ============================================================================
// Authentication Middleware
// ============================================================================

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing or invalid Authorization header. Use: Bearer bz_live_xxx'
    });
  }

  const apiKey = authHeader.slice(7);
  const keyData = apiKeys.get(apiKey);

  if (!keyData) {
    return res.status(401).json({
      error: 'invalid_api_key',
      message: 'Invalid API key. Get one at https://buzzchat.app/api'
    });
  }

  req.apiKey = apiKey;
  req.keyData = keyData;
  next();
}

// ============================================================================
// Rate Limiting Middleware
// ============================================================================

async function rateLimit(req, res, next) {
  const tier = req.keyData.tier;
  const limiter = rateLimiters[tier];

  try {
    await limiter.consume(req.apiKey);
    
    // Track usage
    const currentUsage = usageTracking.get(req.apiKey) || { requests: 0, month: new Date().getMonth() };
    const currentMonth = new Date().getMonth();
    
    if (currentUsage.month !== currentMonth) {
      currentUsage.requests = 0;
      currentUsage.month = currentMonth;
    }
    
    currentUsage.requests++;
    usageTracking.set(req.apiKey, currentUsage);
    
    // Check monthly limit
    const monthlyLimit = TIERS[tier].requestsPerMonth;
    if (currentUsage.requests > monthlyLimit) {
      return res.status(429).json({
        error: 'monthly_limit_exceeded',
        message: `You've exceeded your ${tier} tier limit of ${monthlyLimit.toLocaleString()} requests/month. Upgrade at https://buzzchat.app/pricing`,
        usage: currentUsage.requests,
        limit: monthlyLimit
      });
    }

    // Add usage headers
    res.setHeader('X-RateLimit-Limit', TIERS[tier].ratePerMinute);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, TIERS[tier].ratePerMinute - 1));
    res.setHeader('X-Monthly-Usage', currentUsage.requests);
    res.setHeader('X-Monthly-Limit', monthlyLimit === Infinity ? 'unlimited' : monthlyLimit);

    next();
  } catch (rateLimiterRes) {
    res.status(429).json({
      error: 'rate_limited',
      message: `Too many requests. ${tier} tier allows ${TIERS[tier].ratePerMinute} requests/minute.`,
      retryAfter: Math.ceil(rateLimiterRes.msBeforeNext / 1000)
    });
  }
}

// ============================================================================
// API Routes
// ============================================================================

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: Date.now() });
});

// API info (no auth required)
app.get('/v1', (req, res) => {
  res.json({
    name: 'BuzzChat API',
    version: '1.0.0',
    docs: 'https://docs.buzzchat.app',
    pricing: 'https://buzzchat.app/pricing',
    endpoints: [
      'POST /v1/messages/generate',
      'POST /v1/templates/match',
      'GET /v1/analytics/summary',
      'POST /v1/webhooks'
    ]
  });
});

// ============================================================================
// Messages API
// ============================================================================

app.post('/v1/messages/generate', authenticate, rateLimit, async (req, res) => {
  try {
    const { message, context = {}, tone = 'friendly' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Required field: message (string)'
      });
    }

    // Validate tone
    const validTones = ['friendly', 'professional', 'hype', 'chill'];
    if (!validTones.includes(tone)) {
      return res.status(400).json({
        error: 'invalid_tone',
        message: `Tone must be one of: ${validTones.join(', ')}`
      });
    }

    // Generate response (in production, call Claude API)
    const response = generateSmartResponse(message, context, tone);

    res.json({
      id: uuidv4(),
      response: response.text,
      tone,
      tokens_used: response.tokens,
      model: 'claude-3-haiku',
      created: Date.now()
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to generate response' });
  }
});

// ============================================================================
// Templates API
// ============================================================================

app.post('/v1/templates/match', authenticate, rateLimit, (req, res) => {
  try {
    const { message, templates = [] } = req.body;

    if (!message || !Array.isArray(templates)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Required fields: message (string), templates (array)'
      });
    }

    const matches = findTemplateMatches(message, templates);

    res.json({
      id: uuidv4(),
      matches,
      total_templates: templates.length,
      created: Date.now()
    });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to match templates' });
  }
});

// ============================================================================
// Analytics API
// ============================================================================

app.get('/v1/analytics/summary', authenticate, rateLimit, (req, res) => {
  // Return mock analytics (in production, query real data)
  res.json({
    id: uuidv4(),
    period: 'last_7_days',
    metrics: {
      total_messages: Math.floor(Math.random() * 10000) + 1000,
      ai_responses: Math.floor(Math.random() * 500) + 100,
      avg_response_time_ms: Math.floor(Math.random() * 200) + 50,
      top_questions: ['shipping', 'price', 'availability', 'returns', 'size'],
      sentiment_breakdown: {
        positive: 0.65,
        neutral: 0.28,
        negative: 0.07
      }
    },
    created: Date.now()
  });
});

// ============================================================================
// Webhooks API
// ============================================================================

const webhooks = new Map();

app.post('/v1/webhooks', authenticate, rateLimit, (req, res) => {
  try {
    const { url, events = [] } = req.body;

    if (!url || !url.startsWith('https://')) {
      return res.status(400).json({
        error: 'invalid_url',
        message: 'Webhook URL must be HTTPS'
      });
    }

    const validEvents = ['message.received', 'sale.detected', 'question.repeated', 'sentiment.shift'];
    const invalidEvents = events.filter(e => !validEvents.includes(e));
    
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'invalid_events',
        message: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}`
      });
    }

    const webhookId = uuidv4();
    webhooks.set(webhookId, { url, events, apiKey: req.apiKey, created: Date.now() });

    res.json({
      id: webhookId,
      url,
      events,
      status: 'active',
      created: Date.now()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'internal_error', message: 'Failed to create webhook' });
  }
});

app.get('/v1/webhooks', authenticate, rateLimit, (req, res) => {
  const userWebhooks = [];
  webhooks.forEach((webhook, id) => {
    if (webhook.apiKey === req.apiKey) {
      userWebhooks.push({ id, ...webhook });
    }
  });
  res.json({ webhooks: userWebhooks });
});

app.delete('/v1/webhooks/:id', authenticate, rateLimit, (req, res) => {
  const webhook = webhooks.get(req.params.id);
  
  if (!webhook || webhook.apiKey !== req.apiKey) {
    return res.status(404).json({ error: 'not_found', message: 'Webhook not found' });
  }

  webhooks.delete(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

// ============================================================================
// API Key Management (Admin)
// ============================================================================

app.post('/v1/keys/create', (req, res) => {
  const { adminSecret, tier = 'developer', owner } = req.body;

  // Simple admin auth (use proper auth in production)
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'forbidden', message: 'Invalid admin secret' });
  }

  if (!TIERS[tier]) {
    return res.status(400).json({ error: 'invalid_tier', message: 'Invalid tier' });
  }

  const apiKey = `bz_live_${uuidv4().replace(/-/g, '')}`;
  apiKeys.set(apiKey, { tier, owner: owner || 'unknown', created: Date.now() });

  res.json({
    apiKey,
    tier,
    limits: TIERS[tier],
    message: 'Store this key securely. It will not be shown again.'
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateSmartResponse(message, context, tone) {
  const lowerMessage = message.toLowerCase();
  
  // Smart template responses based on common questions
  const responses = {
    shipping: {
      friendly: "Hey! We ship within 1-2 business days. $5 flat rate, free over $50! 📦",
      professional: "Shipping is processed within 1-2 business days. Standard rate is $5, complimentary for orders over $50.",
      hype: "We ship FAST! 1-2 days and it's on the way! Only $5 or FREE over $50! 🚀📦",
      chill: "Yeah we ship pretty quick, like 1-2 days. $5 or free if you grab $50+ worth."
    },
    price: {
      friendly: "Great question! Check the listing for the current price, or ask and I'll let you know! 💰",
      professional: "Pricing is displayed on each listing. Please let me know if you need specific pricing information.",
      hype: "Prices are CRAZY good right now! Check the listing - you won't believe these deals! 🔥💰",
      chill: "Price is on the listing. Pretty fair deal if you ask me."
    },
    returns: {
      friendly: "We've got a 30-day return policy! No worries if it's not quite right. 😊",
      professional: "Our return policy allows returns within 30 days of receipt for a full refund.",
      hype: "30 days to return, no questions asked! We got you covered! ✨",
      chill: "30 days to return if it's not your vibe. Easy."
    }
  };

  // Find matching category
  let category = null;
  if (lowerMessage.includes('ship') || lowerMessage.includes('deliver')) category = 'shipping';
  else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) category = 'price';
  else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) category = 'returns';

  if (category && responses[category]) {
    return { text: responses[category][tone], tokens: 25 };
  }

  // Default response
  const defaults = {
    friendly: "Thanks for your question! I'll get back to you in just a sec! 😊",
    professional: "Thank you for your inquiry. I will respond shortly.",
    hype: "Great question! Give me just a moment! 🔥",
    chill: "Good question, one sec..."
  };

  return { text: defaults[tone], tokens: 15 };
}

function findTemplateMatches(message, templates) {
  const lowerMessage = message.toLowerCase();
  const matches = [];

  for (const template of templates) {
    const trigger = (template.trigger || '').toLowerCase();
    if (trigger && lowerMessage.includes(trigger)) {
      matches.push({
        trigger: template.trigger,
        response: template.response,
        confidence: calculateConfidence(lowerMessage, trigger)
      });
    }
  }

  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence);
}

function calculateConfidence(message, trigger) {
  // Simple confidence based on match position and length
  const position = message.indexOf(trigger);
  const lengthRatio = trigger.length / message.length;
  return Math.min(0.99, 0.5 + (lengthRatio * 0.3) + (position === 0 ? 0.2 : 0));
}

// ============================================================================
// Error Handling
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Something went wrong' });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.path} not found. See docs at https://docs.buzzchat.app`
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
🐝 BuzzChat API Server
━━━━━━━━━━━━━━━━━━━━━━
Port: ${PORT}
Docs: https://docs.buzzchat.app
━━━━━━━━━━━━━━━━━━━━━━

Revenue Tiers:
  Developer: $29/mo  (10K requests)
  Startup:   $99/mo  (100K requests)
  Enterprise: $499/mo (unlimited)

Ready to make money! 💰
  `);
});

module.exports = app;
