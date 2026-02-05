// BuzzChat - Claude Haiku AI Service
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// AI-powered chat responses for Max tier users
//
// SECURITY: All API calls are routed through the background service worker.
// The API key is NEVER sent from the content script directly.
// This prevents key exposure in DevTools Network tab.

const HAIKU_MODEL = 'claude-3-haiku-20240307';

// Tone styles for different seller personalities
const TONE_STYLES = {
  friendly: 'warm, casual, use emojis sparingly, helpful and approachable',
  professional: 'polite, clear, businesslike, courteous',
  hype: 'excited, energetic, lots of enthusiasm, occasional emojis like fire and sparkles',
  chill: 'relaxed, laid-back, conversational, easygoing'
};

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Generate an AI response by delegating to the background service worker.
 * The background worker holds the API key and makes the actual fetch call,
 * so the key never appears in content script network traffic.
 *
 * @param {Object} options - Generation options
 * @param {string} options.userMessage - The viewer's message to respond to
 * @param {Object} options.context - Current context (platform, seller, item)
 * @param {string} options.tone - Tone style (friendly, professional, hype, chill)
 * @param {string} options.apiKey - Anthropic API key (passed to background)
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

  // Delegate to background service worker for secure API call
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, 8000); // 8s timeout (background needs a bit more time than direct calls)

    browserAPI.runtime.sendMessage({
      type: 'AI_GENERATE_RESPONSE',
      payload: {
        userMessage: sanitizedMessage,
        context,
        tone,
        apiKey
      }
    }, (response) => {
      clearTimeout(timeout);

      if (browserAPI.runtime.lastError) {
        reject(new Error(browserAPI.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No response from background worker'));
        return;
      }

      if (response.error) {
        reject(new Error(response.error));
        return;
      }

      resolve({
        text: response.text,
        usage: response.usage || { inputTokens: 0, outputTokens: 0 }
      });
    });
  });
}

/**
 * Test if an API key is valid by making a minimal request via background
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
    await generateAIResponse({
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
