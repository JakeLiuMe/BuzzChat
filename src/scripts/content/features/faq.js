// BuzzChat - FAQ Auto-Reply Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { state } from '../state.js';
import { canSendMessage } from '../rateLimit.js';
import { sendChatMessage } from '../sender.js';
import { safeTrackAnalytics } from '../analytics.js';

// Get AI service if available (loaded as global from content scripts)
const getAIService = () => typeof window !== 'undefined' && window.AIService ? window.AIService : null;
const getAnthropicKeyManager = () => typeof window !== 'undefined' && window.AnthropicKeyManager ? window.AnthropicKeyManager : null;

/**
 * Generate an AI-powered response for a FAQ rule
 * @param {string} userMessage - The user's message that triggered the rule
 * @param {Object} rule - The FAQ rule with AI settings
 * @returns {Promise<string|null>} AI response or null if failed
 */
async function generateAIFaqResponse(userMessage, rule) {
  const AIService = getAIService();
  const AnthropicKeyManager = getAnthropicKeyManager();

  if (!AIService || !AnthropicKeyManager) {
    console.warn('[BuzzChat] AI service not available');
    return null;
  }

  // Check if user is Max tier
  if (state.settings?.tier !== 'max') {
    return null;
  }

  try {
    const apiKey = await AnthropicKeyManager.getKey();
    if (!apiKey) {
      console.warn('[BuzzChat] No Anthropic API key configured');
      return null;
    }

    const context = {
      platform: state.platform?.name || 'live stream',
      sellerName: state.settings?.sellerName || null,
      currentItem: state.currentItem || null,
      additionalContext: rule.aiContext || null
    };

    const result = await AIService.generateAIResponse({
      userMessage,
      context,
      tone: rule.aiTone || 'friendly',
      apiKey
    });

    // Track AI usage for credit system
    safeTrackAnalytics('ai_response', {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      trigger: rule.triggers?.[0] || 'unknown'
    });

    return result.text;
  } catch (error) {
    console.error('[BuzzChat] AI response failed:', error.message);
    return null;
  }
}

// Check FAQ triggers
export async function checkFaqTriggers(messageText, username) {
  const rules = state.settings?.faq?.rules || [];

  for (const rule of rules) {
    // Validate rule object structure
    if (!rule || typeof rule !== 'object') continue;
    if (!Array.isArray(rule.triggers) || rule.triggers.length === 0) continue;

    // For AI rules, reply can be empty (AI generates it)
    // For template rules, reply is required
    const hasTemplateReply = typeof rule.reply === 'string' && rule.reply.trim();
    const hasAIEnabled = rule.useAI === true;

    if (!hasTemplateReply && !hasAIEnabled) continue;

    const textToCheck = rule.caseSensitive ? messageText : messageText.toLowerCase();

    for (const trigger of rule.triggers) {
      const triggerToCheck = rule.caseSensitive ? trigger : trigger.toLowerCase();

      if (textToCheck.includes(triggerToCheck)) {
        console.log(`[BuzzChat] FAQ trigger matched: ${trigger}`);

        if (canSendMessage()) {
          let reply;

          // Try AI response first if enabled
          if (hasAIEnabled && state.settings?.tier === 'max') {
            reply = await generateAIFaqResponse(messageText, rule);
          }

          // Fall back to template reply if AI failed or not enabled
          if (!reply && hasTemplateReply) {
            // Safe string replacement - no regex to avoid injection
            reply = rule.reply.split('{username}').join(username);
          }

          if (reply) {
            sendChatMessage(reply);
            // Track analytics with trigger keyword
            safeTrackAnalytics('faq', {
              trigger: trigger.toLowerCase(),
              aiGenerated: hasAIEnabled && reply !== rule.reply
            });
          }
        }

        return; // Only send one reply per message
      }
    }
  }
}
