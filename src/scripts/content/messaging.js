// BuzzChat - Message Processing & Handling
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

import { browserAPI, CONFIG, LRUSet } from './config.js';
import { state, getSelectors } from './state.js';
import { sendChatMessage } from './sender.js';
import { safeTrackAnalytics } from './analytics.js';
import { sendWelcomeMessage } from './features/welcome.js';
import { checkFaqTriggers } from './features/faq.js';
import { checkCustomCommand } from './features/commands.js';
import { isMessageBlocked } from './features/moderation.js';
import { checkGiveawayEntry, updateChatMetrics } from './features/giveaway.js';
import { analyzeMessage } from './features/insights.js';
import { checkWaitlistTrigger } from './features/waitlist.js';

// Get Security module if available
const Security = typeof BuzzChatSecurity !== 'undefined' ? BuzzChatSecurity : null;

// Process a new chat message
export function processNewMessage(element) {
  const selectors = getSelectors();

  // Find username and message text
  const usernameEl = element.querySelector?.(selectors.username.join(',')) ||
                     element.matches?.(selectors.username.join(',')) ? element : null;
  const messageEl = element.querySelector?.(selectors.messageText.join(',')) ||
                    element.matches?.(selectors.messageText.join(',')) ? element : null;

  // Try to extract from element content if specific selectors fail
  let username = '';
  let messageText = '';

  if (usernameEl) {
    username = usernameEl.textContent?.trim() || '';
  }

  if (messageEl) {
    messageText = messageEl.textContent?.trim() || '';
  }

  // Fallback: try to parse from element text
  if (!username && !messageText && element.textContent) {
    const text = element.textContent.trim();
    // Common format: "username: message" - use indexOf to handle colons in usernames
    const colonIndex = text.indexOf(': ');
    if (colonIndex > 0 && colonIndex < CONFIG.MAX_USERNAME_LENGTH) {
      username = text.substring(0, colonIndex).trim();
      messageText = text.substring(colonIndex + 2).trim();
    }
  }

  if (!username || !messageText) return;

  // Create unique ID for this message
  const messageId = `${username}-${messageText}-${Date.now()}`;
  if (state.processedMessages.has(messageId)) return;
  state.processedMessages.add(messageId);
  // LRUSet automatically handles size limits - no manual cleanup needed

  console.log(`[BuzzChat] New message from ${username}: ${messageText}`);

  // Update chat engagement metrics
  updateChatMetrics(username);

  // Analyze for insights (pattern detection)
  analyzeMessage(messageText, username);

  // Check moderation - blocked words filter
  if (state.settings?.moderation?.enabled) {
    if (isMessageBlocked(messageText, username)) {
      console.log(`[BuzzChat] Message blocked from ${username}`);
      return; // Don't process further (no welcome, no FAQ reply)
    }
  }

  // Track giveaway entries
  if (state.settings?.giveaway?.enabled) {
    checkGiveawayEntry(messageText, username);
  }

  // Handle welcome message
  if (state.settings?.welcome?.enabled && !state.welcomedUsers.has(username)) {
    sendWelcomeMessage(username);
  }

  // Handle custom commands (check first, before FAQ)
  if (state.settings?.commands?.enabled && messageText.startsWith('!')) {
    const handled = checkCustomCommand(messageText, username);
    if (handled) return; // Don't process FAQ if command was handled
  }

  // Handle FAQ auto-reply
  if (state.settings?.faq?.enabled) {
    checkFaqTriggers(messageText, username);
  }
  
  // Check for waitlist triggers (availability queries on sold-out items)
  if (state.settings?.inventory?.enabled) {
    checkWaitlistTrigger(messageText, username);
  }
}

// Validate message schema
export function isValidMessage(message) {
  if (!message || typeof message !== 'object') return false;
  if (!message.type || typeof message.type !== 'string') return false;
  // Whitelist of allowed message types
  const allowedTypes = [
    'SETTINGS_UPDATED',
    'SEND_TEMPLATE',
    'GET_GIVEAWAY_ENTRIES',
    'RESET_GIVEAWAY',
    'GET_CHAT_METRICS',
    'RESET_CHAT_METRICS',
    'SEND_QUICK_REPLY'
  ];
  return allowedTypes.includes(message.type);
}

// Validate settings object structure
export function validateSettingsObject(settings) {
  if (!settings || typeof settings !== 'object') return null;
  // Return a sanitized copy with only expected fields
  return {
    tier: ['free', 'pro', 'business'].includes(settings.tier) ? settings.tier : 'free',
    messagesUsed: typeof settings.messagesUsed === 'number' ? Math.max(0, settings.messagesUsed) : 0,
    messagesLimit: typeof settings.messagesLimit === 'number' ? settings.messagesLimit : 50, // Default to free tier
    masterEnabled: Boolean(settings.masterEnabled),
    welcome: settings.welcome ? {
      enabled: Boolean(settings.welcome.enabled),
      message: typeof settings.welcome.message === 'string' ? settings.welcome.message.slice(0, 500) : '',
      delay: typeof settings.welcome.delay === 'number' ? Math.min(60, Math.max(1, settings.welcome.delay)) : 5
    } : { enabled: false, message: '', delay: 5 },
    timer: settings.timer ? {
      enabled: Boolean(settings.timer.enabled),
      messages: Array.isArray(settings.timer.messages) ? settings.timer.messages.slice(0, 20) : []
    } : { enabled: false, messages: [] },
    faq: settings.faq ? {
      enabled: Boolean(settings.faq.enabled),
      rules: Array.isArray(settings.faq.rules) ? settings.faq.rules.slice(0, 100) : []
    } : { enabled: false, rules: [] },
    moderation: settings.moderation ? {
      enabled: Boolean(settings.moderation.enabled),
      blockedWords: Array.isArray(settings.moderation.blockedWords) ? settings.moderation.blockedWords.slice(0, 200) : [],
      blockRepeatedMessages: Boolean(settings.moderation.blockRepeatedMessages),
      maxRepeatCount: typeof settings.moderation.maxRepeatCount === 'number' ? Math.min(10, Math.max(2, settings.moderation.maxRepeatCount)) : 3
    } : { enabled: false, blockedWords: [], blockRepeatedMessages: false, maxRepeatCount: 3 },
    giveaway: settings.giveaway ? {
      enabled: Boolean(settings.giveaway.enabled),
      keywords: Array.isArray(settings.giveaway.keywords) ? settings.giveaway.keywords.slice(0, 20) : ['entered'],
      uniqueOnly: settings.giveaway.uniqueOnly !== false
    } : { enabled: false, keywords: ['entered'], uniqueOnly: true },
    templates: Array.isArray(settings.templates) ? settings.templates.slice(0, 50) : [],
    commands: settings.commands ? {
      enabled: Boolean(settings.commands.enabled),
      list: Array.isArray(settings.commands.list) ? settings.commands.list.slice(0, 50) : []
    } : { enabled: false, list: [] },
    quickReply: settings.quickReply ? {
      enabled: settings.quickReply.enabled !== false,
      minimized: Boolean(settings.quickReply.minimized),
      // Preserve empty arrays (user intentionally removed all buttons)
      buttons: Array.isArray(settings.quickReply.buttons) ? settings.quickReply.buttons.slice(0, 10) : [
        { text: 'SOLD!', emoji: '🔥' },
        { text: 'Next item!', emoji: '➡️' },
        { text: '5 min break', emoji: '⏰' },
        { text: 'Thanks for watching!', emoji: '🙏' }
      ]
    } : { enabled: true, minimized: false, buttons: [
      { text: 'SOLD!', emoji: '🔥' },
      { text: 'Next item!', emoji: '➡️' },
      { text: '5 min break', emoji: '⏰' },
      { text: 'Thanks for watching!', emoji: '🙏' }
    ]},
    settings: settings.settings ? {
      chatSelector: typeof settings.settings.chatSelector === 'string' ? settings.settings.chatSelector.slice(0, 200) : '',
      soundNotifications: Boolean(settings.settings.soundNotifications),
      showMessageCount: Boolean(settings.settings.showMessageCount),
      darkMode: Boolean(settings.settings.darkMode),
      watermark: Boolean(settings.settings.watermark)
    } : { chatSelector: '', soundNotifications: true, showMessageCount: true, darkMode: false, watermark: false }
  };
}

// Handle messages from popup (with security validation)
export function handleMessage(message, sender, sendResponse, { startBot, stopBot, showQuickReplyBar }) {
  // SECURITY: Use security module validation if available
  if (Security) {
    if (!Security.validateMessageOrigin(sender)) {
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return true;
    }
  } else {
    // Fallback validation
    if (!sender || sender.id !== browserAPI.runtime.id) {
      console.warn('[BuzzChat] Message from unknown sender rejected');
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return true;
    }
  }

  // SECURITY: Validate message schema
  if (!isValidMessage(message)) {
    console.warn('[BuzzChat] Invalid message format rejected');
    sendResponse({ success: false, error: 'Invalid message format' });
    return true;
  }

  console.log('[BuzzChat] Received message:', message.type);

  switch (message.type) {
    case 'SETTINGS_UPDATED': {
      // SECURITY: Validate and sanitize settings object
      const validatedSettings = validateSettingsObject(message.settings);
      if (!validatedSettings) {
        sendResponse({ success: false, error: 'Invalid settings object' });
        return true;
      }
      state.settings = validatedSettings;
      if (state.settings.masterEnabled) {
        startBot();
      } else {
        stopBot();
      }
      // Refresh quick reply bar with new settings
      if (state.isLiveStream && state.settings.masterEnabled) {
        showQuickReplyBar();
      }
      sendResponse({ success: true });
      break;
    }

    case 'SEND_TEMPLATE':
      if (message.text) {
        sendChatMessage(message.text);
        // Track analytics
        safeTrackAnalytics('template');
      }
      sendResponse({ success: true });
      break;

    case 'GET_GIVEAWAY_ENTRIES':
      sendResponse({
        success: true,
        entries: Array.from(state.giveawayEntries.entries()).map(([username, timestamp]) => ({
          username,
          timestamp
        })),
        totalEntries: state.giveawayEntries.size
      });
      break;

    case 'RESET_GIVEAWAY':
      state.giveawayEntries.clear();
      console.log('[BuzzChat] Giveaway entries reset');
      sendResponse({ success: true });
      break;

    case 'GET_CHAT_METRICS':
      sendResponse({
        success: true,
        metrics: {
          messagesPerMinute: state.chatMetrics.messagesThisMinute,
          uniqueChatters: state.chatMetrics.uniqueChattersThisSession.size,
          peakMessagesPerMinute: state.chatMetrics.peakMessagesPerMinute
        }
      });
      break;

    case 'RESET_CHAT_METRICS':
      state.chatMetrics = {
        messagesThisMinute: 0,
        uniqueChattersThisSession: new LRUSet(CONFIG.MAX_UNIQUE_CHATTERS),
        messageTimestamps: [],
        peakMessagesPerMinute: 0
      };
      console.log('[BuzzChat] Chat metrics reset');
      sendResponse({ success: true });
      break;

    case 'SEND_QUICK_REPLY':
      if (message.text && typeof message.text === 'string') {
        const sent = sendChatMessage(message.text.slice(0, 500));
        if (sent) {
          safeTrackAnalytics('quickReply');
        }
        sendResponse({ success: sent });
      } else {
        sendResponse({ success: false, error: 'Invalid message text' });
      }
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
}
