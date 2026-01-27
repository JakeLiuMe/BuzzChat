// BuzzChat - Giveaway Tracking Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { browserAPI } from '../config.js';
import { state } from '../state.js';

// Check if message is a giveaway entry
export function checkGiveawayEntry(messageText, username) {
  const giveaway = state.settings?.giveaway;
  if (!giveaway?.enabled) return;

  const lowerMessage = messageText.toLowerCase();
  const keywords = giveaway.keywords || ['entered', 'entry', 'enter'];

  for (const keyword of keywords) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      // Check if user already entered (if unique only mode)
      if (giveaway.uniqueOnly && state.giveawayEntries.has(username)) {
        console.log(`[BuzzChat] Duplicate giveaway entry from ${username} (ignored)`);
        return;
      }

      state.giveawayEntries.set(username, Date.now());
      console.log(`[BuzzChat] Giveaway entry recorded: ${username} (total: ${state.giveawayEntries.size})`);

      // Notify popup about new entry
      browserAPI.runtime.sendMessage({
        type: 'GIVEAWAY_ENTRY',
        username: username,
        totalEntries: state.giveawayEntries.size
      }).catch(err => console.warn('[BuzzChat] Giveaway notification failed:', err?.message || 'unknown'));

      return;
    }
  }
}

// Update chat engagement metrics
export function updateChatMetrics(username) {
  const now = Date.now();
  const metrics = state.chatMetrics;

  // Track unique chatters
  metrics.uniqueChattersThisSession.add(username);

  // Track messages per minute
  metrics.messageTimestamps.push(now);
  // Clean up timestamps older than 1 minute
  metrics.messageTimestamps = metrics.messageTimestamps.filter(ts => now - ts < 60000);
  metrics.messagesThisMinute = metrics.messageTimestamps.length;

  // Update peak
  if (metrics.messagesThisMinute > metrics.peakMessagesPerMinute) {
    metrics.peakMessagesPerMinute = metrics.messagesThisMinute;
  }

  // Periodically send metrics to popup (every 10 messages)
  if (metrics.messageTimestamps.length % 10 === 0) {
    browserAPI.runtime.sendMessage({
      type: 'CHAT_METRICS_UPDATE',
      metrics: {
        messagesPerMinute: metrics.messagesThisMinute,
        uniqueChatters: metrics.uniqueChattersThisSession.size,
        peakMessagesPerMinute: metrics.peakMessagesPerMinute
      }
    }).catch(err => console.warn('[BuzzChat] Metrics update failed:', err?.message || 'unknown'));
  }
}
