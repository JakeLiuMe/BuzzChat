// BuzzChat - Moderation Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { state } from '../state.js';

// Check if message should be blocked (moderation)
export function isMessageBlocked(messageText, username) {
  const moderation = state.settings?.moderation;
  if (!moderation) return false;

  const lowerMessage = messageText.toLowerCase();

  // Check blocked words
  if (moderation.blockedWords?.length > 0) {
    for (const word of moderation.blockedWords) {
      if (lowerMessage.includes(word.toLowerCase())) {
        console.log(`[BuzzChat] Blocked word detected: "${word}"`);
        return true;
      }
    }
  }

  // Check for repeated messages
  if (moderation.blockRepeatedMessages) {
    const userHistory = state.userMessageHistory.get(username) || [];
    const recentDuplicates = userHistory.filter(msg =>
      msg.text === messageText && Date.now() - msg.timestamp < 60000 // Within last minute
    ).length;

    // Add current message to history
    userHistory.push({ text: messageText, timestamp: Date.now() });
    // Keep only last 10 messages per user
    if (userHistory.length > 10) userHistory.shift();
    state.userMessageHistory.set(username, userHistory);

    if (recentDuplicates >= (moderation.maxRepeatCount || 3)) {
      console.log(`[BuzzChat] Repeated message detected from ${username}`);
      return true;
    }
  }

  return false;
}
