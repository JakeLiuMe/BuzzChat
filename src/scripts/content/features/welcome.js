// BuzzChat - Welcome Message Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { state } from '../state.js';
import { canSendMessage } from '../rateLimit.js';
import { sendChatMessage } from '../sender.js';
import { safeTrackAnalytics } from '../analytics.js';

// Send welcome message
export function sendWelcomeMessage(username) {
  if (!canSendMessage()) return;

  // Mark user as welcomed BEFORE queuing to prevent duplicate sends during delay
  // This is intentional - we want to prevent race conditions where multiple
  // messages from the same user trigger multiple welcome messages
  state.welcomedUsers.add(username);
  // LRUSet automatically handles size limits - no manual cleanup needed

  const message = state.settings.welcome.message.split('{username}').join(username);

  // Add delay to avoid spam
  setTimeout(() => {
    sendChatMessage(message);
    // Track analytics
    safeTrackAnalytics('welcome');
  }, (state.settings.welcome.delay || 5) * 1000);

  console.log(`[BuzzChat] Queued welcome message for ${username}`);
}
