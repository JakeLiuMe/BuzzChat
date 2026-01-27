// BuzzChat - Custom Commands Feature
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { browserAPI, StorageWriter } from '../config.js';
import { state } from '../state.js';
import { canSendMessage } from '../rateLimit.js';
import { sendChatMessage } from '../sender.js';
import { safeTrackAnalytics } from '../analytics.js';

// Command cooldown tracking with periodic cleanup
const commandCooldowns = new Map(); // command trigger -> last used timestamp
const COOLDOWN_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const COOLDOWN_MAX_AGE_MS = 60 * 60 * 1000; // Entries older than 1 hour are cleaned up

// Periodic cleanup of stale cooldown entries to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [trigger, timestamp] of commandCooldowns.entries()) {
    if (now - timestamp > COOLDOWN_MAX_AGE_MS) {
      commandCooldowns.delete(trigger);
    }
  }
}, COOLDOWN_CLEANUP_INTERVAL_MS);

// Check and respond to custom commands
export function checkCustomCommand(messageText, username) {
  const commands = state.settings?.commands?.list || [];
  if (commands.length === 0) return false;

  // Extract command from message (first word without !)
  const match = messageText.match(/^!(\w+)/);
  if (!match) return false;

  const commandTrigger = match[1].toLowerCase();

  // Find matching command
  const command = commands.find(cmd => cmd.trigger?.toLowerCase() === commandTrigger);
  if (!command || !command.response) return false;

  // Check cooldown
  const lastUsed = commandCooldowns.get(commandTrigger) || 0;
  const cooldownMs = (command.cooldown || 30) * 1000;
  const now = Date.now();

  if (now - lastUsed < cooldownMs) {
    console.log(`[BuzzChat] Command !${commandTrigger} on cooldown (${Math.ceil((cooldownMs - (now - lastUsed)) / 1000)}s remaining)`);
    return true; // Return true to indicate it was handled (just on cooldown)
  }

  if (!canSendMessage()) return false;

  // Update cooldown
  commandCooldowns.set(commandTrigger, now);

  // Replace {username} placeholder (safe string replacement - no regex to avoid injection)
  const response = command.response.split('{username}').join(username);

  sendChatMessage(response);

  // Track analytics
  safeTrackAnalytics('command', { trigger: commandTrigger });

  // Update usage count (persist to storage)
  command.usageCount = (command.usageCount || 0) + 1;
  StorageWriter.queue('whatnotBotSettings', state.settings);

  // Notify popup of command usage update
  browserAPI.runtime.sendMessage({
    type: 'COMMAND_USED',
    trigger: commandTrigger,
    usageCount: command.usageCount
  }).catch(() => {});

  console.log(`[BuzzChat] Command !${commandTrigger} executed for ${username}`);
  return true;
}
