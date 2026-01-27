// BuzzChat - FAQ Auto-Reply Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { state } from '../state.js';
import { canSendMessage } from '../rateLimit.js';
import { sendChatMessage } from '../sender.js';
import { safeTrackAnalytics } from '../analytics.js';

// Check FAQ triggers
export function checkFaqTriggers(messageText, username) {
  const rules = state.settings?.faq?.rules || [];

  for (const rule of rules) {
    // Validate rule object structure
    if (!rule || typeof rule !== 'object') continue;
    if (!Array.isArray(rule.triggers) || rule.triggers.length === 0) continue;
    if (typeof rule.reply !== 'string' || !rule.reply.trim()) continue;

    const textToCheck = rule.caseSensitive ? messageText : messageText.toLowerCase();

    for (const trigger of rule.triggers) {
      const triggerToCheck = rule.caseSensitive ? trigger : trigger.toLowerCase();

      if (textToCheck.includes(triggerToCheck)) {
        console.log(`[BuzzChat] FAQ trigger matched: ${trigger}`);

        if (canSendMessage()) {
          // Safe string replacement - no regex to avoid injection
          const reply = rule.reply.split('{username}').join(username);
          sendChatMessage(reply);
          // Track analytics with trigger keyword
          safeTrackAnalytics('faq', { trigger: trigger.toLowerCase() });
        }

        return; // Only send one reply per message
      }
    }
  }
}
