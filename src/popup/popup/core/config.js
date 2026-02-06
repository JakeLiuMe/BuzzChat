// BuzzChat - Popup Configuration
// Core configuration constants and default settings

// Browser API compatibility - works on both Chrome and Firefox
export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Input validation limits
export const VALIDATION = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_TIMER_MESSAGES: 10,
  MAX_FAQ_RULES: 20, // Pro/Business limit
  MAX_FAQ_RULES_FREE: 3, // Free tier limit
  MAX_COMMANDS: 50, // Pro/Business limit
  MAX_COMMANDS_FREE: 5, // Free tier limit
  MIN_TIMER_INTERVAL: 1,
  MAX_TIMER_INTERVAL: 60,
  MIN_WELCOME_DELAY: 1,
  MAX_WELCOME_DELAY: 60,
  MAX_TEMPLATES: 20,
  MAX_FAQ_TRIGGERS: 10
};

// Default settings
export const DEFAULT_SETTINGS = {
  tier: 'free',
  messagesUsed: 0,
  messagesLimit: 50, // Free tier default
  referralBonus: 0,
  masterEnabled: false,
  welcome: {
    enabled: false,
    message: 'Hey {username}! Welcome to the stream!',
    delay: 5
  },
  timer: {
    enabled: false,
    messages: []
  },
  faq: {
    enabled: false,
    rules: []
  },
  moderation: {
    enabled: false,
    blockedWords: [],
    blockRepeatedMessages: false,
    maxRepeatCount: 3
  },
  giveaway: {
    enabled: false,
    keywords: ['entered', 'entry', 'enter'],
    entries: [],
    uniqueOnly: true
  },
  templates: [],
  commands: {
    enabled: false,
    list: []
  },
  quickReply: {
    enabled: true,
    minimized: false,
    buttons: [
      { text: 'SOLD!', emoji: '🔥' },
      { text: 'Next item!', emoji: '➡️' },
      { text: '5 min break', emoji: '⏰' },
      { text: 'Thanks for watching!', emoji: '🙏' }
    ]
  },
  settings: {
    chatSelector: '',
    soundNotifications: true,
    showMessageCount: true,
    darkMode: false,
    watermark: false
  },
  inventory: {
    enabled: true,
    autoDetectSold: true, // Auto-detect "sold", "mine", etc. in chat
    lowStockThreshold: 2
  }
};
