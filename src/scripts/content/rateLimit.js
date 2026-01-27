// BuzzChat - Rate Limiting
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { RATE_LIMIT } from './config.js';
import { state } from './state.js';

// Check rate limiting
export function checkRateLimit() {
  const now = Date.now();

  // Check cooldown between messages
  if (now - state.lastMessageTime < RATE_LIMIT.MESSAGE_COOLDOWN_MS) {
    console.warn('[BuzzChat] Rate limit: Cooldown not elapsed');
    return false;
  }

  // Clean up old timestamps (older than 1 minute)
  state.messageTimestamps = state.messageTimestamps.filter(
    ts => now - ts < 60000
  );

  // Check messages per minute limit
  if (state.messageTimestamps.length >= RATE_LIMIT.MAX_MESSAGES_PER_MINUTE) {
    console.warn('[BuzzChat] Rate limit: Too many messages per minute');
    return false;
  }

  return true;
}

// Record a sent message for rate limiting
export function recordMessageSent() {
  const now = Date.now();
  state.messageTimestamps.push(now);
  state.lastMessageTime = now;
}

// Check if we can send a message (tier limits + rate limits)
export function canSendMessage() {
  if (!state.settings) return false;

  // Always check rate limits first (prevent abuse)
  if (!checkRateLimit()) {
    return false;
  }

  // Pro/Business have unlimited tier messages
  if (state.settings.tier === 'pro' || state.settings.tier === 'business') {
    return true;
  }

  // Free tier limit check
  if (state.settings.messagesUsed >= state.settings.messagesLimit) {
    console.warn('[BuzzChat] Message limit reached. Upgrade to Pro for unlimited messages.');
    return false;
  }

  return true;
}
