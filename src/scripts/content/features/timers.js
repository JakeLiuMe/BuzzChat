// BuzzChat - Timer Messages Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { state } from '../state.js';
import { canSendMessage } from '../rateLimit.js';
import { sendChatMessage } from '../sender.js';
import { safeTrackAnalytics } from '../analytics.js';

// Start timer messages
export function startTimerMessages() {
  // Guard against duplicate timer starts
  if (state.isStartingTimers) return;
  state.isStartingTimers = true;

  // Clear existing intervals
  state.timerIntervals.forEach(clearInterval);
  state.timerIntervals = [];

  if (!state.settings?.timer?.enabled) {
    state.isStartingTimers = false;
    return;
  }

  const messages = state.settings.timer.messages || [];

  messages.forEach((msg, index) => {
    if (!msg.text || !msg.interval) return;

    const intervalMs = msg.interval * 60 * 1000; // Convert minutes to ms

    const intervalId = setInterval(() => {
      if (canSendMessage()) {
        sendChatMessage(msg.text);
        // Track analytics
        safeTrackAnalytics('timer');
        console.log(`[BuzzChat] Timer message #${index + 1} sent`);
      }
    }, intervalMs);

    state.timerIntervals.push(intervalId);
    console.log(`[BuzzChat] Timer message #${index + 1} scheduled every ${msg.interval} minutes`);
  });

  // Reset guard flag after setup complete
  state.isStartingTimers = false;
}
