// BuzzChat - Claude Haiku AI Service
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// AI-powered chat responses for Max tier users

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-3-haiku-20240307';
const MAX_TOKENS = 100; // Keep responses short for live chat
const TIMEOUT_MS = 5000; // 5 second timeout for responsiveness

// Tone styles for different seller personalities
const TONE_STYLES = {
  friendly: 'warm, casual, use emojis sparingly, helpful and approachable',
  professional: 'polite, clear, businesslike, courteous',
  hype: 'excited, energetic, lots of enthusiasm, occasional emojis like fire and sparkles',
  chill: 'relaxed, laid-back, conversational, easygoing'
};

/**
 * Build the system prompt for Claude
 * @param {Object} context - Current context (item, seller name, platform)
 * @param {string} tone - Tone style (friendly, professional, hype, chill)
 * @returns {string} System prompt
 */
function buildSystemPrompt(context, tone) {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.friendly;

  let prompt = `You are a chat assistant for a live selling stream. Your job is to respond helpfully to viewer questions while keeping the energy positive.

Tone: ${toneStyle}

Context:`;

  if (context.platform) {
    prompt += `\n- Platform: ${context.platform}`;
  }
  if (context.sellerName) {
    prompt += `\n- Seller name: ${context.sellerName}`;
  }
  if (context.currentItem) {
    prompt += `\n- Currently selling: ${context.currentItem}`;
  }
  if (context.additionalContext) {
    prompt += `\n- Topic: ${context.additionalContext}`;
  }

  prompt += `

CRITICAL RULES:
1. Keep responses under 100 characters (this is live chat!)
2. NEVER mention you are AI, a bot, or automated
3. NEVER give specific prices - say "Check the listing!" or "Posted in chat!"
4. NEVER give specific shipping costs - say "Depends on location, check listing!"
5. Be genuinely helpful and engaging
6. Match the casual tone of live stream chat
7. If unsure about item details, redirect to the stream or listing`;

  return prompt;
}

/**
 * Generate an AI response using Claude Haiku
 * @param {Object} options - Generation options
 * @param {string} options.userMessage - The viewer's message to respond to
 * @param {Object} options.context - Current context (platform, seller, item)
 * @param {string} options.tone - Tone style (friendly, professional, hype, chill)
 * @param {string} options.apiKey - Anthropic API key
 * @returns {Promise<{text: string, usage: {inputTokens: number, outputTokens: number}}>}
 */
async function generateAIResponse(options) {
  const { userMessage, context = {}, tone = 'friendly', apiKey } = options;

  if (!apiKey) {
    throw new Error('API key required');
  }

  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('User message required');
  }

  // Sanitize the user message (basic XSS prevention for display)
  const sanitizedMessage = userMessage.trim().slice(0, 500);

  const systemPrompt = buildSystemPrompt(context, tone);

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: sanitizedMessage }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      if (response.status === 429) {
        throw new Error('Rate limited - too many requests');
      }
      if (response.status === 400) {
        throw new Error(errorData.error?.message || 'Bad request');
      }

      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract response text
    const responseText = data.content?.[0]?.text || '';

    // Ensure response isn't too long for chat
    const trimmedResponse = responseText.trim().slice(0, 150);

    return {
      text: trimmedResponse,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    throw error;
  }
}

/**
 * Test if an API key is valid by making a minimal request
 * @param {string} apiKey - Anthropic API key to test
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function testApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'No API key provided' };
  }

  // Basic format check
  if (!apiKey.startsWith('sk-ant-')) {
    return { valid: false, error: 'Invalid key format (should start with sk-ant-)' };
  }

  try {
    // Make a minimal test request
    const result = await generateAIResponse({
      userMessage: 'test',
      context: {},
      tone: 'friendly',
      apiKey
    });

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Calculate estimated cost for AI usage
 * Claude Haiku pricing (as of 2024):
 * - Input: $0.25 per million tokens
 * - Output: $1.25 per million tokens
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Cost in USD
 */
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * 0.25;
  const outputCost = (outputTokens / 1_000_000) * 1.25;
  return inputCost + outputCost;
}

/**
 * Generate AI response with credit checking
 * Checks credits before generating and deducts after success
 * @param {Object} options - Same as generateAIResponse
 * @returns {Promise<{text?: string, usage?: Object, error?: string, creditsRemaining?: number, warning?: Object}>}
 */
async function generateAIResponseWithCredits(options) {
  // Get credits manager if available
  const CreditsManager = typeof window !== 'undefined' && window.AICreditsManager
    ? window.AICreditsManager
    : null;

  if (!CreditsManager) {
    // No credits system - just generate response
    return await generateAIResponse(options);
  }

  try {
    // Check credits first
    const credits = await CreditsManager.getCredits();

    if (credits.remaining <= 0) {
      return {
        error: 'NO_CREDITS',
        message: `No AI credits remaining. Resets ${CreditsManager._formatResetDate()}`,
        creditsRemaining: 0
      };
    }

    // Check warning threshold
    const warning = await CreditsManager.checkCreditWarning();

    // Generate response
    const response = await generateAIResponse(options);

    // Deduct credit on success
    const remaining = await CreditsManager.useCredit();

    return {
      ...response,
      creditsRemaining: remaining,
      warning: warning.warning ? warning : null
    };
  } catch (error) {
    // If it's a credit error, pass it through
    if (error.message === 'No AI credits remaining') {
      return {
        error: 'NO_CREDITS',
        message: error.message,
        creditsRemaining: 0
      };
    }
    throw error;
  }
}

// Export for ES modules and content scripts
const AIService = {
  generateAIResponse,
  generateAIResponseWithCredits,
  testApiKey,
  calculateCost,
  TONE_STYLES,
  HAIKU_MODEL
};

// Make available as global for content scripts (IIFE pattern)
if (typeof window !== 'undefined') {
  window.AIService = AIService;
}

// Export for ES modules (popup, background)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
}
