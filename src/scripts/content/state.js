// BuzzChat - Content Script State Management
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { CONFIG, LRUSet, LRUMap } from './config.js';

// Bot state
export const state = {
  settings: null,
  isLiveStream: false,
  platform: null, // Detected platform (whatnot, youtube, ebay, twitch, kick)
  chatInput: null,
  chatContainer: null,
  sendButton: null,
  welcomedUsers: new LRUSet(CONFIG.MAX_WELCOMED_USERS),
  processedMessages: new LRUSet(CONFIG.MAX_PROCESSED_MESSAGES),
  timerIntervals: [],
  observer: null,
  initialized: false,
  isStartingTimers: false, // Guard flag for timer duplication
  selectors: null, // Will be loaded from SelectorManager (platform-specific)
  // Rate limiting state
  messageTimestamps: [],
  lastMessageTime: 0,
  // Moderation state - track repeated messages by user
  userMessageHistory: new LRUMap(CONFIG.MAX_USER_HISTORY), // username -> array of recent messages
  // Giveaway tracking
  giveawayEntries: new LRUMap(CONFIG.MAX_GIVEAWAY_ENTRIES), // username -> timestamp
  // Chat engagement metrics
  chatMetrics: {
    messagesThisMinute: 0,
    uniqueChattersThisSession: new LRUSet(CONFIG.MAX_UNIQUE_CHATTERS),
    messageTimestamps: [],
    peakMessagesPerMinute: 0
  }
};

// Fallback selectors if SelectorManager is not available
export const FALLBACK_SELECTORS = {
  chatInput: [
    'textarea[placeholder*="chat"]',
    'textarea[placeholder*="message"]',
    'input[placeholder*="chat"]',
    'input[placeholder*="message"]',
    '[data-testid="chat-input"]',
    '.chat-input textarea',
    '.chat-input input',
    '[class*="ChatInput"] textarea',
    '[class*="ChatInput"] input'
  ],
  chatContainer: [
    '[data-testid="chat-messages"]',
    '.chat-messages',
    '[class*="ChatMessages"]',
    '[class*="chat-container"]',
    '[class*="ChatContainer"]',
    '[class*="LiveChat"]'
  ],
  sendButton: [
    'button[type="submit"]',
    '[data-testid="send-button"]',
    '.chat-send-button',
    '[class*="SendButton"]',
    'button[aria-label*="send"]'
  ],
  messageItem: [
    '[data-testid="chat-message"]',
    '.chat-message',
    '[class*="ChatMessage"]',
    '[class*="message-item"]'
  ],
  username: [
    '[data-testid="username"]',
    '.username',
    '[class*="Username"]',
    '[class*="user-name"]',
    'span[class*="name"]'
  ],
  messageText: [
    '[data-testid="message-text"]',
    '.message-text',
    '[class*="MessageText"]',
    '[class*="message-content"]'
  ],
  liveIndicator: [
    '[data-testid="live-indicator"]',
    '.live-badge',
    '[class*="LiveBadge"]',
    '[class*="live-indicator"]',
    'span:contains("LIVE")'
  ]
};

// Selector cache to remember which selectors worked
export const selectorCache = {
  chatInput: null,
  chatContainer: null,
  sendButton: null,
  messageItem: null,
  username: null,
  messageText: null,
  liveIndicator: null
};

// Get current selectors (from SelectorManager or fallback)
export function getSelectors() {
  return state.selectors || FALLBACK_SELECTORS;
}

// Clear selector cache (useful when page structure changes)
export function clearSelectorCache() {
  for (const key in selectorCache) {
    selectorCache[key] = null;
  }
}

// Check if a feature is supported on the current platform
export function isFeatureEnabled(featureName) {
  if (!state.platform || !state.platform.features) {
    return true; // Allow all features if no platform detected (legacy behavior)
  }
  return state.platform.features.includes(featureName);
}

// Get current platform info
export function getCurrentPlatform() {
  return state.platform;
}
