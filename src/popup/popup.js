// BuzzChat - Popup Script
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Toast notification system
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    // Build toast using safe DOM methods (no innerHTML with user data)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || icons.info;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);

    this.container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  },

  success(message) { return this.show(message, 'success'); },
  error(message) { return this.show(message, 'error'); },
  info(message) { return this.show(message, 'info'); },
  warning(message) { return this.show(message, 'warning'); }
};

// Save Indicator
const SaveIndicator = {
  element: null,
  timeout: null,

  init() {
    this.element = document.getElementById('saveIndicator');
  },

  show() {
    if (!this.element) this.init();
    if (!this.element) return;

    // Clear any pending timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Show the indicator
    this.element.classList.add('visible');

    // Hide after 2 seconds
    this.timeout = setTimeout(() => {
      this.element.classList.remove('visible');
    }, 2000);
  }
};

// Modal Focus Trap
const FocusTrap = {
  activeModal: null,
  previouslyFocusedElement: null,

  activate(modal) {
    this.activeModal = modal;
    this.previouslyFocusedElement = document.activeElement;

    // Focus first focusable element
    const focusable = this.getFocusableElements(modal);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
  },

  deactivate() {
    document.removeEventListener('keydown', this.handleKeyDown);

    // Return focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }

    this.activeModal = null;
    this.previouslyFocusedElement = null;
  },

  getFocusableElements(container) {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(container.querySelectorAll(selectors.join(', ')));
  },

  handleKeyDown: function(e) {
    if (!FocusTrap.activeModal) return;

    // Escape to close
    if (e.key === 'Escape') {
      FocusTrap.activeModal.classList.remove('active');
      FocusTrap.deactivate();
      return;
    }

    // Tab trap
    if (e.key === 'Tab') {
      const focusable = FocusTrap.getFocusableElements(FocusTrap.activeModal);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
};

// Event Listener Manager - tracks and cleans up event listeners
const EventManager = {
  listeners: new Map(), // Map<element, Map<event, Set<handler>>>

  // Add an event listener with tracking
  add(element, event, handler, options) {
    if (!element) return;

    element.addEventListener(event, handler, options);

    // Track the listener
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }
    const elementMap = this.listeners.get(element);
    if (!elementMap.has(event)) {
      elementMap.set(event, new Set());
    }
    elementMap.get(event).add(handler);
  },

  // Remove a specific listener
  remove(element, event, handler, options) {
    if (!element) return;

    element.removeEventListener(event, handler, options);

    // Remove from tracking
    const elementMap = this.listeners.get(element);
    if (elementMap && elementMap.has(event)) {
      elementMap.get(event).delete(handler);
    }
  },

  // Remove all listeners for an element
  cleanupElement(element) {
    if (!element) return;

    const elementMap = this.listeners.get(element);
    if (!elementMap) return;

    for (const [event, handlers] of elementMap) {
      for (const handler of handlers) {
        element.removeEventListener(event, handler);
      }
    }

    this.listeners.delete(element);
  },

  // Remove all listeners within a container (useful for modal cleanup)
  cleanupContainer(container) {
    if (!container) return;

    for (const [element] of this.listeners) {
      if (container.contains(element)) {
        this.cleanupElement(element);
      }
    }
  },

  // Remove all tracked listeners (for cleanup)
  cleanupAll() {
    for (const [element, elementMap] of this.listeners) {
      for (const [event, handlers] of elementMap) {
        for (const handler of handlers) {
          element.removeEventListener(event, handler);
        }
      }
    }
    this.listeners.clear();
  }
};

// Storage error handler - notifies user of storage failures
const StorageErrorHandler = {
  lastError: null,
  errorCount: 0,
  MAX_ERRORS_BEFORE_NOTIFY: 3,

  handleError(error, operation = 'storage') {
    this.errorCount++;
    this.lastError = error;

    console.error(`[BuzzChat] ${operation} error:`, error);

    // Only notify user after repeated failures
    if (this.errorCount >= this.MAX_ERRORS_BEFORE_NOTIFY) {
      Toast.error(`Settings may not be saving. Please refresh and try again.`);
      this.errorCount = 0; // Reset counter
    }
  },

  reset() {
    this.lastError = null;
    this.errorCount = 0;
  }
};

// Loading state helpers
const Loading = {
  show(button) {
    if (!button) return;
    button.classList.add('loading');
    button.disabled = true;
  },

  hide(button) {
    if (!button) return;
    button.classList.remove('loading');
    button.disabled = false;
  }
};

// Input validation limits
const VALIDATION = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_TIMER_MESSAGES: 10,
  MAX_FAQ_RULES: 20, // Pro/Business limit
  MAX_FAQ_RULES_FREE: 3, // Free tier limit (research: 3 rules to show value, upgrade path)
  MAX_COMMANDS: 50, // Pro/Business limit
  MAX_COMMANDS_FREE: 5, // Free tier limit (research: 5 commands to show value)
  MAX_TEMPLATES: 20,
  MAX_FAQ_TRIGGERS: 10,
  MIN_TIMER_INTERVAL: 1,
  MAX_TIMER_INTERVAL: 60,
  MIN_WELCOME_DELAY: 1,
  MAX_WELCOME_DELAY: 60
};

// Default settings
const DEFAULT_SETTINGS = {
  tier: 'free',
  messagesUsed: 0,
  messagesLimit: 50, // Free tier default (overridden by stored settings)
  referralBonus: 0, // Bonus messages from referrals
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
  // 10/10 Features
  quickReplies: [
    'Thanks for watching!',
    'Shipping is $5 flat rate',
    'Check out our other items!'
  ],
  keywordAlerts: {
    enabled: false,
    keywords: ['shipping', 'returns'],
    soundEnabled: true
  },
  bidAlerts: {
    enabled: false,
    soundEnabled: true,
    minAmount: 0
  }
};

// Account Manager (inline for popup context)
const AccountManager = {
  STORAGE_KEYS: {
    ACCOUNTS: 'whatnotBotAccounts',
    ACTIVE_ID: 'whatnotBotActiveAccountId'
  },
  MAX_ACCOUNTS: 10,

  createDefaultAccount(id = 'default', name = 'Default') {
    return {
      id,
      name,
      createdAt: Date.now(),
      settings: { ...DEFAULT_SETTINGS }
    };
  },

  generateAccountId() {
    return 'account_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  async getAccounts() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEYS.ACCOUNTS], (result) => {
        resolve(result[this.STORAGE_KEYS.ACCOUNTS] || {});
      });
    });
  },

  async getActiveAccountId() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEYS.ACTIVE_ID], (result) => {
        resolve(result[this.STORAGE_KEYS.ACTIVE_ID] || 'default');
      });
    });
  },

  async setActiveAccount(id) {
    const accounts = await this.getAccounts();
    if (!accounts[id]) throw new Error(`Account ${id} does not exist`);
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACTIVE_ID]: id }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve();
      });
    });
  },

  async createAccount(name) {
    const accounts = await this.getAccounts();
    if (Object.keys(accounts).length >= this.MAX_ACCOUNTS) {
      throw new Error(`Maximum of ${this.MAX_ACCOUNTS} accounts reached`);
    }
    const sanitizedName = (name || '').trim().slice(0, 50);
    if (!sanitizedName) throw new Error('Account name cannot be empty');

    const id = this.generateAccountId();
    const account = this.createDefaultAccount(id, sanitizedName);
    accounts[id] = account;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve(account);
      });
    });
  },

  async deleteAccount(id) {
    if (id === 'default') throw new Error('Cannot delete the default account');
    const accounts = await this.getAccounts();
    if (!accounts[id]) throw new Error(`Account ${id} does not exist`);

    delete accounts[id];
    const activeId = await this.getActiveAccountId();
    const updates = { [this.STORAGE_KEYS.ACCOUNTS]: accounts };
    if (activeId === id) updates[this.STORAGE_KEYS.ACTIVE_ID] = 'default';

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set(updates, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve();
      });
    });
  },

  async renameAccount(id, newName) {
    const accounts = await this.getAccounts();
    if (!accounts[id]) throw new Error(`Account ${id} does not exist`);
    const sanitizedName = (newName || '').trim().slice(0, 50);
    if (!sanitizedName) throw new Error('Account name cannot be empty');

    accounts[id].name = sanitizedName;
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve();
      });
    });
  },

  async getActiveSettings() {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();
    if (Object.keys(accounts).length === 0) return null;
    return accounts[activeId]?.settings || accounts['default']?.settings || null;
  },

  async updateActiveSettings(updates) {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();
    if (!accounts[activeId]) throw new Error('No active account found');

    accounts[activeId].settings = this.deepMerge(accounts[activeId].settings, updates);
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve(accounts[activeId].settings);
      });
    });
  },

  async migrateFromLegacy() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotSettings', this.STORAGE_KEYS.ACCOUNTS], async (result) => {
        if (result[this.STORAGE_KEYS.ACCOUNTS] && Object.keys(result[this.STORAGE_KEYS.ACCOUNTS]).length > 0) {
          resolve(false);
          return;
        }
        const legacySettings = result.whatnotBotSettings;
        const defaultAccount = this.createDefaultAccount('default', 'Default');
        if (legacySettings) {
          defaultAccount.settings = this.deepMerge(defaultAccount.settings, legacySettings);
        }
        browserAPI.storage.sync.set({
          [this.STORAGE_KEYS.ACCOUNTS]: { 'default': defaultAccount },
          [this.STORAGE_KEYS.ACTIVE_ID]: 'default'
        }, () => resolve(true));
      });
    });
  },

  async getAccountList() {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();
    return Object.values(accounts).map(a => ({
      id: a.id, name: a.name, createdAt: a.createdAt, isActive: a.id === activeId
    })).sort((a, b) => {
      if (a.id === 'default') return -1;
      if (b.id === 'default') return 1;
      return a.createdAt - b.createdAt;
    });
  },

  deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;
    const result = { ...target };
    for (const key in source) {
      const sv = source[key], tv = result[key];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
        result[key] = this.deepMerge(tv, sv);
      } else if (sv !== undefined) {
        result[key] = sv;
      }
    }
    return result;
  }
};

// API Key Manager (inline for popup context)
const ApiKeyManager = {
  STORAGE_KEY: 'whatnotBotApiKeys',
  KEY_PREFIX: 'bz_live_',
  MAX_KEYS: 5,

  generateKey() {
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    return this.KEY_PREFIX + uuid1 + uuid2;
  },

  generateKeyId() {
    return 'key_' + crypto.randomUUID().slice(0, 8);
  },

  async getKeys() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || {});
      });
    });
  },

  async createKey(name) {
    const keys = await this.getKeys();
    if (Object.keys(keys).length >= this.MAX_KEYS) {
      throw new Error(`Maximum of ${this.MAX_KEYS} API keys reached`);
    }
    const sanitizedName = (name || '').trim().slice(0, 50);
    if (!sanitizedName) throw new Error('API key name cannot be empty');

    const id = this.generateKeyId();
    const key = this.generateKey();
    const keyData = { id, name: sanitizedName, key, createdAt: Date.now(), lastUsed: null };
    keys[id] = keyData;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve(keyData);
      });
    });
  },

  async revokeKey(keyId) {
    const keys = await this.getKeys();
    if (!keys[keyId]) throw new Error(`API key ${keyId} does not exist`);
    delete keys[keyId];
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) reject(browserAPI.runtime.lastError);
        else resolve();
      });
    });
  },

  async getKeyList() {
    const keys = await this.getKeys();
    return Object.values(keys).map(k => ({
      id: k.id,
      name: k.name,
      keyPreview: this.maskKey(k.key),
      createdAt: k.createdAt,
      lastUsed: k.lastUsed
    })).sort((a, b) => b.createdAt - a.createdAt);
  },

  maskKey(key) {
    if (!key || key.length < 16) return '****';
    return `${key.slice(0, 11)}...${key.slice(-4)}`;
  },

  formatLastUsed(timestamp) {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  }
};

// State
let settings = { ...DEFAULT_SETTINGS };
let useAccountManager = false; // True if Business tier

// DOM Elements
const elements = {
  masterToggle: document.getElementById('masterToggle'),
  statusBadge: document.getElementById('statusBadge'),
  tierBanner: document.getElementById('tierBanner'),

  // Platform Badge
  platformBadge: document.getElementById('platformBadge'),
  platformIcon: document.getElementById('platformIcon'),
  platformName: document.getElementById('platformName'),

  // Welcome
  welcomeToggle: document.getElementById('welcomeToggle'),
  welcomeMessage: document.getElementById('welcomeMessage'),
  welcomeDelay: document.getElementById('welcomeDelay'),

  // Timer
  timerToggle: document.getElementById('timerToggle'),
  timerMessages: document.getElementById('timerMessages'),
  addTimerBtn: document.getElementById('addTimerBtn'),
  timerMessageTemplate: document.getElementById('timerMessageTemplate'),

  // FAQ
  faqToggle: document.getElementById('faqToggle'),
  faqItems: document.getElementById('faqItems'),
  addFaqBtn: document.getElementById('addFaqBtn'),
  faqTemplate: document.getElementById('faqTemplate'),

  // Templates
  templatesList: document.getElementById('templatesList'),
  addTemplateBtn: document.getElementById('addTemplateBtn'),
  templateTemplate: document.getElementById('templateTemplate'),

  // Modals
  settingsModal: document.getElementById('settingsModal'),
  settingsBtn: document.getElementById('settingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  upgradeModal: document.getElementById('upgradeModal'),
  upgradeBtn: document.getElementById('upgradeBtn'),
  closeUpgradeBtn: document.getElementById('closeUpgradeBtn'),
  helpModal: document.getElementById('helpModal'),
  helpBtn: document.getElementById('helpBtn'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),

  // Settings
  chatSelector: document.getElementById('chatSelector'),
  soundNotifications: document.getElementById('soundNotifications'),
  showMessageCount: document.getElementById('showMessageCount'),
  darkModeToggle: document.getElementById('darkModeToggle'),
  exportSettingsBtn: document.getElementById('exportSettingsBtn'),
  importSettingsBtn: document.getElementById('importSettingsBtn'),
  importFile: document.getElementById('importFile'),

  // Upgrade
  subscribePro: document.getElementById('subscribePro'),
  subscribeBusiness: document.getElementById('subscribeBusiness'),
  startTrialBtn: document.getElementById('startTrialBtn'),
  trialBanner: document.getElementById('trialBanner'),
  annualBillingToggle: document.getElementById('annualBillingToggle'),
  proPrice: document.getElementById('proPrice'),
  proPriceAnnual: document.getElementById('proPriceAnnual'),
  proPriceNote: document.getElementById('proPriceNote'),
  businessPrice: document.getElementById('businessPrice'),
  businessPriceAnnual: document.getElementById('businessPriceAnnual'),
  businessPriceNote: document.getElementById('businessPriceNote'),
  watermarkToggle: document.getElementById('watermarkToggle'),

  // Onboarding (3-step wizard)
  onboardingModal: document.getElementById('onboardingModal'),
  acceptTerms: document.getElementById('acceptTerms'),
  onboardingPrevBtn: document.getElementById('onboardingPrevBtn'),
  onboardingNextBtn: document.getElementById('onboardingNextBtn'),
  onboardingMessage: document.getElementById('onboardingMessage'),
  messagePreview: document.getElementById('messagePreview'),
  setupWelcome: document.getElementById('setupWelcome'),
  setupTimer: document.getElementById('setupTimer'),
  setupFaq: document.getElementById('setupFaq'),

  // Save Indicator
  saveIndicator: document.getElementById('saveIndicator'),

  // Moderation
  moderationToggle: document.getElementById('moderationToggle'),
  blockedWords: document.getElementById('blockedWords'),
  blockRepeatedToggle: document.getElementById('blockRepeatedToggle'),
  maxRepeatCount: document.getElementById('maxRepeatCount'),

  // Giveaway
  giveawayToggle: document.getElementById('giveawayToggle'),
  giveawayKeywords: document.getElementById('giveawayKeywords'),
  giveawayUniqueToggle: document.getElementById('giveawayUniqueToggle'),
  giveawayEntryCount: document.getElementById('giveawayEntryCount'),
  giveawayEntriesList: document.getElementById('giveawayEntriesList'),
  refreshGiveawayBtn: document.getElementById('refreshGiveawayBtn'),
  resetGiveawayBtn: document.getElementById('resetGiveawayBtn'),

  // Live Metrics
  metricMessagesPerMin: document.getElementById('metricMessagesPerMin'),
  metricUniqueChatters: document.getElementById('metricUniqueChatters'),
  metricPeakMsgs: document.getElementById('metricPeakMsgs'),
  refreshMetricsBtn: document.getElementById('refreshMetricsBtn'),

  // Analytics
  analyticsLocked: document.getElementById('analyticsLocked'),
  analyticsContent: document.getElementById('analyticsContent'),
  unlockAnalyticsBtn: document.getElementById('unlockAnalyticsBtn'),
  exportAnalyticsBtn: document.getElementById('exportAnalyticsBtn'),
  statTotalMessages: document.getElementById('statTotalMessages'),
  statTodayMessages: document.getElementById('statTodayMessages'),
  statPeakHour: document.getElementById('statPeakHour'),
  weeklyChart: document.getElementById('weeklyChart'),
  typePieChart: document.getElementById('typePieChart'),
  legendWelcome: document.getElementById('legendWelcome'),
  legendFaq: document.getElementById('legendFaq'),
  legendTimer: document.getElementById('legendTimer'),
  legendTemplate: document.getElementById('legendTemplate'),
  faqTriggersList: document.getElementById('faqTriggersList'),

  // Referral
  referralCode: document.getElementById('referralCode'),
  copyReferralBtn: document.getElementById('copyReferralBtn'),
  referralCount: document.getElementById('referralCount'),
  referralBonus: document.getElementById('referralBonus'),
  redeemCode: document.getElementById('redeemCode'),
  redeemCodeBtn: document.getElementById('redeemCodeBtn'),
  referralRedeemedMsg: document.getElementById('referralRedeemedMsg'),

  // Account Selector (Business tier)
  accountSelectorContainer: document.getElementById('accountSelectorContainer'),
  accountSelect: document.getElementById('accountSelect'),
  newAccountBtn: document.getElementById('newAccountBtn'),
  manageAccountsBtn: document.getElementById('manageAccountsBtn'),

  // Account Manager Modal
  accountManagerModal: document.getElementById('accountManagerModal'),
  closeAccountManagerBtn: document.getElementById('closeAccountManagerBtn'),
  accountsList: document.getElementById('accountsList'),
  createAccountModalBtn: document.getElementById('createAccountModalBtn'),
  createAccountForm: document.getElementById('createAccountForm'),
  newAccountName: document.getElementById('newAccountName'),
  confirmCreateAccountBtn: document.getElementById('confirmCreateAccountBtn'),
  cancelCreateAccountBtn: document.getElementById('cancelCreateAccountBtn'),

  // API Access (Business tier)
  apiSection: document.getElementById('apiSection'),
  apiLocked: document.getElementById('apiLocked'),
  apiKeysList: document.getElementById('apiKeysList'),
  emptyKeysMessage: document.getElementById('emptyKeysMessage'),
  createApiKeyBtn: document.getElementById('createApiKeyBtn'),
  apiKeyCreated: document.getElementById('apiKeyCreated'),
  newApiKeyValue: document.getElementById('newApiKeyValue'),
  copyNewApiKeyBtn: document.getElementById('copyNewApiKeyBtn'),
  closeApiKeyCreatedBtn: document.getElementById('closeApiKeyCreatedBtn'),
  unlockApiBtn: document.getElementById('unlockApiBtn'),

  // Commands
  commandsToggle: document.getElementById('commandsToggle'),
  commandsList: document.getElementById('commandsList'),
  addCommandBtn: document.getElementById('addCommandBtn'),
  commandTemplate: document.getElementById('commandTemplate'),
  exportCommandsBtn: document.getElementById('exportCommandsBtn'),
  importCommandsBtn: document.getElementById('importCommandsBtn'),
  importCommandsFile: document.getElementById('importCommandsFile'),

  // Giveaway Wheel
  spinWheelBtn: document.getElementById('spinWheelBtn'),
  winnerCount: document.getElementById('winnerCount'),
  winnerDisplay: document.getElementById('winnerDisplay'),
  winnerNames: document.getElementById('winnerNames'),
  announceWinnerBtn: document.getElementById('announceWinnerBtn'),
  rerollWinnerBtn: document.getElementById('rerollWinnerBtn'),
  closeWinnerBtn: document.getElementById('closeWinnerBtn'),
  wheelOverlay: document.getElementById('wheelOverlay'),
  spinningWheel: document.getElementById('spinningWheel'),
  wheelStatus: document.getElementById('wheelStatus'),
  confettiCanvas: document.getElementById('confettiCanvas'),

  // Quick Reply Settings
  quickReplyToggle: document.getElementById('quickReplyToggle'),
  quickReplyButtonsList: document.getElementById('quickReplyButtonsList'),
  addQuickReplyBtn: document.getElementById('addQuickReplyBtn'),
  quickReplyTemplate: document.getElementById('quickReplyTemplate'),

  // 10/10 Features: Hotkeys
  hotkeyList: document.getElementById('hotkeyList'),
  hotkeySlotTemplate: document.getElementById('hotkeySlotTemplate'),

  // 10/10 Features: Keyword Alerts
  keywordAlertsToggle: document.getElementById('keywordAlertsToggle'),
  keywordAlertsList: document.getElementById('keywordAlertsList'),
  keywordAlertsSoundToggle: document.getElementById('keywordAlertsSoundToggle'),

  // 10/10 Features: Bid Alerts
  bidAlertsToggle: document.getElementById('bidAlertsToggle'),
  bidAlertsMinAmount: document.getElementById('bidAlertsMinAmount'),
  bidAlertsSoundToggle: document.getElementById('bidAlertsSoundToggle'),

  // 10/10 Features: Viewer Leaderboard
  viewerLeaderboard: document.getElementById('viewerLeaderboard'),
  refreshViewersBtn: document.getElementById('refreshViewersBtn'),
  resetViewersBtn: document.getElementById('resetViewersBtn'),

  // 10/10 Features: Recent Bids
  recentBidsList: document.getElementById('recentBidsList'),
  refreshBidsBtn: document.getElementById('refreshBidsBtn'),
  resetBidsBtn: document.getElementById('resetBidsBtn'),

  // 10/10 Features: Chat Export
  chatHistoryCount: document.getElementById('chatHistoryCount'),
  exportChatBtn: document.getElementById('exportChatBtn'),
  clearChatHistoryBtn: document.getElementById('clearChatHistoryBtn')
};

// Platform detection for popup badge
const PLATFORM_PATTERNS = {
  whatnot: { hosts: ['whatnot.com'], name: 'Whatnot', icon: '🛒', color: '#FF6B35' },
  youtube: { hosts: ['youtube.com'], paths: ['/live', '/watch'], name: 'YouTube', icon: '▶️', color: '#FF0000' },
  ebay: { hosts: ['ebay.com'], paths: ['/live'], name: 'eBay', icon: '🏷️', color: '#E53238' },
  twitch: { hosts: ['twitch.tv'], name: 'Twitch', icon: '🎮', color: '#9146FF' },
  kick: { hosts: ['kick.com'], name: 'Kick', icon: '🎬', color: '#53FC18' }
};

function detectPlatformFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = urlObj.pathname.toLowerCase();

    for (const [platformId, config] of Object.entries(PLATFORM_PATTERNS)) {
      const hostMatch = config.hosts.some(h => hostname === h || hostname.endsWith('.' + h));
      if (hostMatch) {
        // Check path patterns if defined
        if (config.paths) {
          const pathMatch = config.paths.some(p => pathname.startsWith(p));
          if (!pathMatch) continue;
        }
        return { id: platformId, ...config };
      }
    }
  } catch (e) {
    console.log('[BuzzChat] Platform detection error:', e);
  }
  return null;
}

function updatePlatformBadge(platform) {
  if (!elements.platformBadge) return;

  if (platform) {
    elements.platformBadge.setAttribute('data-platform', platform.id);
    elements.platformBadge.classList.add('detected');
    if (elements.platformIcon) elements.platformIcon.textContent = platform.icon;
    if (elements.platformName) elements.platformName.textContent = platform.name;
    elements.platformBadge.title = `Detected: ${platform.name}`;
  } else {
    elements.platformBadge.setAttribute('data-platform', 'unsupported');
    elements.platformBadge.classList.remove('detected');
    if (elements.platformIcon) elements.platformIcon.textContent = '❓';
    if (elements.platformName) elements.platformName.textContent = 'Not Detected';
    elements.platformBadge.title = 'No supported platform detected on this page';
  }
}

function detectAndDisplayPlatform() {
  // Query the active tab to get its URL
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      const platform = detectPlatformFromUrl(tabs[0].url);
      updatePlatformBadge(platform);
    } else {
      updatePlatformBadge(null);
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  detectAndDisplayPlatform(); // Detect current platform from active tab
  initUI();
  initEventListeners();
  init10x10Features(); // 10/10 Features initialization
  initReferral();
  checkOnboarding();

  // Signal that popup is fully initialized (for testing)
  window.__POPUP_INITIALIZED__ = true;

  // Check for milestone celebrations after a short delay (let UI settle)
  setTimeout(() => {
    checkMilestones();
  }, 1000);
});

// Onboarding Wizard State
const Onboarding = {
  currentStep: 1,
  totalSteps: 3,

  async check() {
    const result = await browserAPI.storage.sync.get(['whatnotBotOnboarded']);
    if (!result.whatnotBotOnboarded && elements.onboardingModal) {
      elements.onboardingModal.classList.add('active');
      FocusTrap.activate(elements.onboardingModal);
      this.updateUI();
    }
  },

  updateUI() {
    // Update step indicators
    document.querySelectorAll('.onboarding-step').forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed');
      if (stepNum === this.currentStep) {
        step.classList.add('active');
      } else if (stepNum < this.currentStep) {
        step.classList.add('completed');
      }
    });

    // Update panels
    document.querySelectorAll('.onboarding-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const currentPanel = document.getElementById(`onboarding-step-${this.currentStep}`);
    if (currentPanel) {
      currentPanel.classList.add('active');
    }

    // Update buttons
    if (elements.onboardingPrevBtn) {
      elements.onboardingPrevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    }

    if (elements.onboardingNextBtn) {
      elements.onboardingNextBtn.textContent = this.currentStep === this.totalSteps ? 'Get Started' : 'Next';
      this.updateNextButtonState();
    }
  },

  updateNextButtonState() {
    if (!elements.onboardingNextBtn) return;

    if (this.currentStep === 1) {
      // Step 1: Must accept terms
      elements.onboardingNextBtn.disabled = !elements.acceptTerms?.checked;
    } else {
      // Steps 2 and 3: Always enabled
      elements.onboardingNextBtn.disabled = false;
    }
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateUI();
    } else {
      this.complete();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  },

  updateMessagePreview() {
    if (elements.onboardingMessage && elements.messagePreview) {
      const message = elements.onboardingMessage.value || '';
      const preview = message.replace(/{username}/gi, 'StreamViewer');
      elements.messagePreview.textContent = preview || 'Your message preview will appear here...';
    }
  },

  async complete() {
    // Apply settings from wizard
    if (elements.setupWelcome?.checked) {
      settings.welcome.enabled = true;
      if (elements.onboardingMessage?.value) {
        settings.welcome.message = elements.onboardingMessage.value;
      }
    }
    if (elements.setupTimer?.checked) {
      settings.timer.enabled = true;
    }
    if (elements.setupFaq?.checked) {
      settings.faq.enabled = true;
    }

    await saveSettings();
    await browserAPI.storage.sync.set({ whatnotBotOnboarded: true });

    if (elements.onboardingModal) {
      elements.onboardingModal.classList.remove('active');
      FocusTrap.deactivate();
    }

    // Refresh UI with new settings
    initUI();
    Toast.success('You\'re all set! Enable the bot when you\'re ready to go live.');
  }
};

// Legacy function for backwards compatibility
async function checkOnboarding() {
  await Onboarding.check();
}

async function completeOnboarding() {
  await Onboarding.complete();
}

// Load settings from storage (sync storage for cross-device sync)
async function loadSettings() {
  // First, check if we need to migrate from legacy storage
  await AccountManager.migrateFromLegacy();

  // Try to load from AccountManager (for multi-account support)
  const accountSettings = await AccountManager.getActiveSettings();
  if (accountSettings) {
    settings = { ...DEFAULT_SETTINGS, ...accountSettings };
    useAccountManager = true;
    return;
  }

  // Fallback to legacy storage
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Failed to load settings:', browserAPI.runtime.lastError);
        resolve();
        return;
      }
      if (result.whatnotBotSettings) {
        settings = { ...DEFAULT_SETTINGS, ...result.whatnotBotSettings };
      }
      resolve();
    });
  });
}

// Save settings to storage (sync storage for cross-device sync)
async function saveSettings(showToast = false) {
  // Use AccountManager if initialized
  if (useAccountManager) {
    try {
      await AccountManager.updateActiveSettings(settings);

      // Notify content script of settings change
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: settings
          }).catch(() => {});
        }
      });

      SaveIndicator.show();
      if (showToast) Toast.success('Settings saved');
      return;
    } catch (error) {
      console.error('[BuzzChat] Failed to save settings:', error);
      Toast.error('Failed to save settings');
      return;
    }
  }

  // Fallback to legacy storage
  return new Promise((resolve) => {
    browserAPI.storage.sync.set({ whatnotBotSettings: settings }, () => {
      if (browserAPI.runtime.lastError) {
        StorageErrorHandler.handleError(browserAPI.runtime.lastError, 'save settings');
        resolve();
        return;
      }

      // Reset error count on successful save
      StorageErrorHandler.reset();

      // Notify content script of settings change
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: settings
          }).catch(() => {});
        }
      });

      // Show save indicator
      SaveIndicator.show();

      if (showToast) {
        Toast.success('Settings saved');
      }
      resolve();
    });
  });
}

// Initialize UI with current settings
function initUI() {
  // Master toggle
  elements.masterToggle.checked = settings.masterEnabled;
  updateStatusBadge();

  // Tier banner
  updateTierBanner();

  // Welcome
  elements.welcomeToggle.checked = settings.welcome.enabled;
  elements.welcomeMessage.value = settings.welcome.message;
  elements.welcomeDelay.value = settings.welcome.delay;

  // Timer
  elements.timerToggle.checked = settings.timer.enabled;
  renderTimerMessages();

  // FAQ
  elements.faqToggle.checked = settings.faq.enabled;
  renderFaqRules();

  // Templates
  renderTemplates();

  // Commands
  if (elements.commandsToggle) {
    elements.commandsToggle.checked = settings.commands?.enabled || false;
  }
  renderCommands();

  // Quick Reply
  if (elements.quickReplyToggle) {
    elements.quickReplyToggle.checked = settings.quickReply?.enabled !== false;
  }
  renderQuickReplyButtons();

  // Moderation
  if (elements.moderationToggle) {
    elements.moderationToggle.checked = settings.moderation?.enabled || false;
  }
  if (elements.blockedWords) {
    elements.blockedWords.value = (settings.moderation?.blockedWords || []).join(', ');
  }
  if (elements.blockRepeatedToggle) {
    elements.blockRepeatedToggle.checked = settings.moderation?.blockRepeatedMessages || false;
  }
  if (elements.maxRepeatCount) {
    elements.maxRepeatCount.value = settings.moderation?.maxRepeatCount || 3;
  }

  // Giveaway
  if (elements.giveawayToggle) {
    elements.giveawayToggle.checked = settings.giveaway?.enabled || false;
  }
  if (elements.giveawayKeywords) {
    elements.giveawayKeywords.value = (settings.giveaway?.keywords || ['entered', 'entry', 'enter']).join(', ');
  }
  if (elements.giveawayUniqueToggle) {
    elements.giveawayUniqueToggle.checked = settings.giveaway?.uniqueOnly !== false;
  }

  // Load giveaway data and metrics
  loadGiveawayData();
  loadChatMetrics();

  // Settings
  elements.chatSelector.value = settings.settings.chatSelector;
  elements.soundNotifications.checked = settings.settings.soundNotifications;
  elements.showMessageCount.checked = settings.settings.showMessageCount;

  // Dark mode
  if (elements.darkModeToggle) {
    elements.darkModeToggle.checked = settings.settings.darkMode;
    applyDarkMode(settings.settings.darkMode);
  }

  // Watermark toggle
  if (elements.watermarkToggle) {
    elements.watermarkToggle.checked = settings.settings.watermark || false;
  }

  // Initialize analytics (async, don't await)
  initAnalytics();

  // Initialize Business tier features (account selector & API access)
  initBusinessFeatures();

  // Initialize help tooltips
  initHelpTooltips();
}

// Apply dark mode to the document
function applyDarkMode(enabled) {
  if (enabled) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Update status badge
function updateStatusBadge() {
  if (settings.masterEnabled) {
    elements.statusBadge.classList.add('active');
    elements.statusBadge.querySelector('.status-text').textContent = 'Active';
  } else {
    elements.statusBadge.classList.remove('active');
    elements.statusBadge.querySelector('.status-text').textContent = 'Inactive';
  }
}

// Update tier banner with VIP styling
async function updateTierBanner() {
  const tierLabel = elements.tierBanner.querySelector('.tier-label');
  const tierUsage = elements.tierBanner.querySelector('.tier-usage');
  const vipBadge = document.getElementById('vipBadge');
  const vipTierText = vipBadge?.querySelector('.vip-tier-text');
  const memberSince = document.getElementById('memberSince');

  // Clear previous tier classes
  elements.tierBanner.classList.remove('pro', 'vip-pro', 'vip-business');

  // Check for premium tiers (max is the highest tier with AI features)
  const isPremium = settings.tier === 'pro' || settings.tier === 'business' || settings.tier === 'max';
  const isMaxTier = settings.tier === 'max' || settings.tier === 'business';

  if (isPremium) {
    // Add VIP styling based on tier
    const vipClass = isMaxTier ? 'vip-business' : 'vip-pro';
    elements.tierBanner.classList.add(vipClass);

    // Show and configure VIP badge
    if (vipBadge) {
      vipBadge.style.display = 'inline-flex';
      if (vipTierText) {
        vipTierText.textContent = isMaxTier ? 'MAX' : 'PRO';
      }
      // Use diamond icon for max tier (safe SVG creation)
      const vipIcon = vipBadge.querySelector('.vip-icon');
      if (vipIcon && isMaxTier) {
        while (vipIcon.firstChild) vipIcon.removeChild(vipIcon.firstChild);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5');
        vipIcon.appendChild(path);
      }
    }

    // Show membership date if available
    if (memberSince && settings.memberSince) {
      const date = new Date(settings.memberSince);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      memberSince.textContent = `Member since ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      memberSince.style.display = 'inline';
    } else if (memberSince) {
      // If no memberSince date, set it now for new Pro users
      if (!settings.memberSince) {
        settings.memberSince = new Date().toISOString();
        saveSettings();
      }
      memberSince.style.display = 'none';
    }

    tierLabel.textContent = isMaxTier ? 'Max' : 'Pro';
    tierUsage.textContent = isMaxTier ? 'AI-powered + Unlimited features' : 'Unlimited features + Analytics';

    // Show AI credits for Max tier
    if (isMaxTier) {
      updateAICreditsDisplay();
    }
  } else {
    // Free tier
    if (vipBadge) vipBadge.style.display = 'none';
    if (memberSince) memberSince.style.display = 'none';

    tierLabel.textContent = 'Free Plan';

    // Free tier has 50 messages/show (limits managed by background.js)
    // Don't override - use what's set in storage from license verification

    // Show feature limits instead of message count
    const faqRulesUsed = settings.faq?.rules?.length || 0;
    const commandsUsed = settings.commands?.list?.length || 0;
    const faqLimit = VALIDATION.MAX_FAQ_RULES_FREE;
    const cmdLimit = VALIDATION.MAX_COMMANDS_FREE;

    // Show what they get with Pro
    if (faqRulesUsed >= faqLimit || commandsUsed >= cmdLimit) {
      tierUsage.textContent = 'Upgrade to Pro for unlimited rules & analytics';
    } else {
      tierUsage.textContent = `${faqLimit - faqRulesUsed} FAQ rules, ${cmdLimit - commandsUsed} commands left`;
    }
  }

  // Hide credits section for non-max tiers
  const creditsSection = document.getElementById('aiCreditsSection');
  if (creditsSection && !isMaxTier) {
    creditsSection.style.display = 'none';
  }
}

// Update AI Credits display (Max tier only)
async function updateAICreditsDisplay() {
  const creditsSection = document.getElementById('aiCreditsSection');
  const creditsFill = document.getElementById('creditsFill');
  const creditsRemaining = document.getElementById('creditsRemaining');
  const creditsResetDate = document.getElementById('creditsResetDate');

  if (!creditsSection) return;

  try {
    // Get credits from storage via background message
    const response = await new Promise((resolve) => {
      browserAPI.runtime.sendMessage({ action: 'getAICredits' }, resolve);
    });

    if (!response || response.error) {
      // Fallback: show default values
      creditsSection.style.display = 'block';
      if (creditsFill) creditsFill.style.width = '100%';
      if (creditsRemaining) creditsRemaining.textContent = '500';
      return;
    }

    const { remaining, resetDate } = response;
    const percentage = Math.round((remaining / 500) * 100);

    // Show the credits section
    creditsSection.style.display = 'block';

    // Update the fill bar
    if (creditsFill) {
      creditsFill.style.width = `${percentage}%`;
    }

    // Update remaining count
    if (creditsRemaining) {
      creditsRemaining.textContent = remaining;
    }

    // Update reset date
    if (creditsResetDate && resetDate) {
      const date = new Date(resetDate);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      creditsResetDate.textContent = `${monthNames[date.getMonth()]} ${date.getDate()}`;
    }

    // Add warning classes based on remaining credits
    creditsSection.classList.remove('credits-warning', 'credits-critical');
    if (remaining <= 10) {
      creditsSection.classList.add('credits-critical');
    } else if (remaining <= 50) {
      creditsSection.classList.add('credits-warning');
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to update credits display:', error);
    // Show section with defaults on error
    creditsSection.style.display = 'block';
  }
}

// Initialize Quick Actions Bar
function initQuickActions() {
  const quickToggle = document.getElementById('quickToggle');
  const quickTemplate = document.getElementById('quickTemplate');
  const quickGiveaway = document.getElementById('quickGiveaway');

  // Update quick toggle state based on master toggle
  function updateQuickToggleState() {
    if (!quickToggle) return;
    const isActive = settings.masterEnabled;
    quickToggle.classList.toggle('active', isActive);
    quickToggle.querySelector('.quick-label').textContent = isActive ? 'Active' : 'Go Live';
  }

  // Quick toggle - syncs with master toggle
  if (quickToggle) {
    quickToggle.addEventListener('click', async () => {
      settings.masterEnabled = !settings.masterEnabled;
      elements.masterToggle.checked = settings.masterEnabled;
      updateQuickToggleState();
      updateStatusBadge();
      await saveSettings();
      Toast.success(settings.masterEnabled ? 'Bot activated' : 'Bot deactivated');
    });
    updateQuickToggleState();
  }

  // Quick template - opens messages tab for quick access
  if (quickTemplate) {
    quickTemplate.addEventListener('click', () => {
      // Switch to messages tab
      const messagesTab = document.querySelector('[data-tab="messages"]');
      if (messagesTab) {
        messagesTab.click();
        // Focus on quick reply buttons section
        const quickReplySection = document.getElementById('quickReplySection');
        if (quickReplySection) {
          quickReplySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      Toast.info('Set up your quick messages here');
    });
  }

  // Quick giveaway - opens giveaway tab
  if (quickGiveaway) {
    quickGiveaway.addEventListener('click', () => {
      // Switch to giveaway tab
      const giveawayTab = document.querySelector('[data-tab="giveaway"]');
      if (giveawayTab) {
        giveawayTab.click();
        Toast.info('Manage your giveaway here');
      }
    });
  }

  // Update quick toggle when master toggle changes
  if (elements.masterToggle) {
    elements.masterToggle.addEventListener('change', updateQuickToggleState);
  }
}

// Initialize Help Tooltips
function initHelpTooltips() {
  const HELP_TOOLTIPS = {
    '#masterToggle': 'Turn on when you start streaming',
    '#welcomeDelay': 'Wait time before greeting new viewers',
    '#faqToggle': 'Auto-reply when viewers ask questions',
    '#giveawayToggle': 'Track entries for giveaways',
    '#timerToggle': 'Send scheduled messages'
  };

  for (const [selector, text] of Object.entries(HELP_TOOLTIPS)) {
    const el = document.querySelector(selector);
    if (el) {
      // Find the parent label or container
      const container = el.closest('.toggle-label') || el.parentElement;
      if (container) {
        container.setAttribute('data-tooltip', text);
        container.classList.add('has-tooltip');
      }
    }
  }
}

// Tab navigation with ARIA support
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Update tab buttons
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      // Update tab panels
      tabPanels.forEach(p => p.classList.remove('active'));

      // Activate selected tab
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const panel = document.getElementById(`${tabId}-panel`);
      if (panel) {
        panel.classList.add('active');
      }
    });

    // Keyboard navigation for tabs
    btn.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabBtns);
      const currentIndex = tabs.indexOf(btn);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        tabs[prevIndex].focus();
        tabs[prevIndex].click();
      }
    });
  });
}

// Initialize event listeners
function initEventListeners() {
  initTabNavigation();

  // Master toggle
  elements.masterToggle.addEventListener('change', async () => {
    settings.masterEnabled = elements.masterToggle.checked;
    updateStatusBadge();
    await saveSettings();
    Toast.success(settings.masterEnabled ? 'Bot activated' : 'Bot deactivated');
  });

  // Welcome settings
  elements.welcomeToggle.addEventListener('change', async () => {
    settings.welcome.enabled = elements.welcomeToggle.checked;
    await saveSettings();
  });

  elements.welcomeMessage.addEventListener('input', debounce(async () => {
    settings.welcome.message = validateText(elements.welcomeMessage.value);
    await saveSettings();
  }, 500));

  elements.welcomeDelay.addEventListener('change', async () => {
    const validated = validateNumber(
      elements.welcomeDelay.value,
      VALIDATION.MIN_WELCOME_DELAY,
      VALIDATION.MAX_WELCOME_DELAY,
      5
    );
    settings.welcome.delay = validated;
    elements.welcomeDelay.value = validated;
    await saveSettings();
  });

  // Timer settings
  elements.timerToggle.addEventListener('change', async () => {
    settings.timer.enabled = elements.timerToggle.checked;
    await saveSettings();
  });

  elements.addTimerBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addTimerMessage();
  });

  // FAQ settings
  elements.faqToggle.addEventListener('change', async () => {
    settings.faq.enabled = elements.faqToggle.checked;
    await saveSettings();
  });

  elements.addFaqBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addFaqRule();
  });

  // Moderation settings
  if (elements.moderationToggle) {
    elements.moderationToggle.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.enabled = elements.moderationToggle.checked;
      await saveSettings();
    });
  }

  if (elements.blockedWords) {
    elements.blockedWords.addEventListener('input', debounce(async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.blockedWords = elements.blockedWords.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      await saveSettings();
    }, 500));
  }

  if (elements.blockRepeatedToggle) {
    elements.blockRepeatedToggle.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.blockRepeatedMessages = elements.blockRepeatedToggle.checked;
      await saveSettings();
    });
  }

  if (elements.maxRepeatCount) {
    elements.maxRepeatCount.addEventListener('change', async () => {
      if (!settings.moderation) settings.moderation = {};
      settings.moderation.maxRepeatCount = validateNumber(
        elements.maxRepeatCount.value, 2, 10, 3
      );
      elements.maxRepeatCount.value = settings.moderation.maxRepeatCount;
      await saveSettings();
    });
  }

  // Giveaway settings
  if (elements.giveawayToggle) {
    elements.giveawayToggle.addEventListener('change', async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.enabled = elements.giveawayToggle.checked;
      await saveSettings();
    });
  }

  if (elements.giveawayKeywords) {
    elements.giveawayKeywords.addEventListener('input', debounce(async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.keywords = elements.giveawayKeywords.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w.length > 0);
      await saveSettings();
    }, 500));
  }

  if (elements.giveawayUniqueToggle) {
    elements.giveawayUniqueToggle.addEventListener('change', async () => {
      if (!settings.giveaway) settings.giveaway = {};
      settings.giveaway.uniqueOnly = elements.giveawayUniqueToggle.checked;
      await saveSettings();
    });
  }

  if (elements.refreshGiveawayBtn) {
    elements.refreshGiveawayBtn.addEventListener('click', loadGiveawayData);
  }

  if (elements.resetGiveawayBtn) {
    elements.resetGiveawayBtn.addEventListener('click', async () => {
      if (!confirm('Reset all giveaway entries? This cannot be undone.')) return;
      await sendMessageToContent('RESET_GIVEAWAY');
      loadGiveawayData();
      Toast.success('Giveaway entries reset');
    });
  }

  if (elements.refreshMetricsBtn) {
    elements.refreshMetricsBtn.addEventListener('click', loadChatMetrics);
  }

  // Giveaway Wheel - support both click and keyboard (Enter/Space)
  if (elements.spinWheelBtn) {
    elements.spinWheelBtn.addEventListener('click', spinGiveawayWheel);
    elements.spinWheelBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        spinGiveawayWheel();
      }
    });
  }

  if (elements.announceWinnerBtn) {
    elements.announceWinnerBtn.addEventListener('click', announceWinners);
  }

  if (elements.rerollWinnerBtn) {
    elements.rerollWinnerBtn.addEventListener('click', () => {
      hideWinnerDisplay();
      spinGiveawayWheel();
    });
  }

  if (elements.closeWinnerBtn) {
    elements.closeWinnerBtn.addEventListener('click', hideWinnerDisplay);
  }

  // Templates
  elements.addTemplateBtn.addEventListener('click', () => {
    if (!canAddFeature()) return;
    addTemplate();
  });

  // Commands
  if (elements.commandsToggle) {
    elements.commandsToggle.addEventListener('change', async () => {
      if (!settings.commands) settings.commands = { enabled: false, list: [] };
      settings.commands.enabled = elements.commandsToggle.checked;
      await saveSettings();
    });
  }

  if (elements.addCommandBtn) {
    elements.addCommandBtn.addEventListener('click', () => {
      if (!canAddFeature()) return;
      addCommand();
    });
  }

  if (elements.exportCommandsBtn) {
    elements.exportCommandsBtn.addEventListener('click', exportCommands);
  }

  if (elements.importCommandsBtn) {
    elements.importCommandsBtn.addEventListener('click', () => {
      elements.importCommandsFile?.click();
    });
  }

  if (elements.importCommandsFile) {
    elements.importCommandsFile.addEventListener('change', importCommands);
  }

  // Quick Reply Settings
  if (elements.quickReplyToggle) {
    elements.quickReplyToggle.addEventListener('change', async () => {
      if (!settings.quickReply) settings.quickReply = { enabled: true, minimized: false, buttons: [] };
      settings.quickReply.enabled = elements.quickReplyToggle.checked;
      await saveSettings();
    });
  }

  if (elements.addQuickReplyBtn) {
    elements.addQuickReplyBtn.addEventListener('click', addQuickReplyButton);
  }

  // Settings modal with focus trap
  elements.settingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.add('active');
    FocusTrap.activate(elements.settingsModal);
  });

  elements.closeSettingsBtn.addEventListener('click', () => {
    elements.settingsModal.classList.remove('active');
    FocusTrap.deactivate();
  });

  // Upgrade modal with focus trap
  elements.upgradeBtn.addEventListener('click', () => {
    elements.upgradeModal.classList.add('active');
    FocusTrap.activate(elements.upgradeModal);
  });

  elements.closeUpgradeBtn.addEventListener('click', () => {
    elements.upgradeModal.classList.remove('active');
    FocusTrap.deactivate();
  });

  // Help modal with focus trap
  if (elements.helpBtn) {
    elements.helpBtn.addEventListener('click', () => {
      elements.helpModal.classList.add('active');
      FocusTrap.activate(elements.helpModal);
    });
  }

  if (elements.closeHelpBtn) {
    elements.closeHelpBtn.addEventListener('click', () => {
      elements.helpModal.classList.remove('active');
      FocusTrap.deactivate();
    });
  }

  // Settings inputs
  elements.chatSelector.addEventListener('input', debounce(async () => {
    settings.settings.chatSelector = elements.chatSelector.value;
    await saveSettings();
  }, 500));

  elements.soundNotifications.addEventListener('change', async () => {
    settings.settings.soundNotifications = elements.soundNotifications.checked;
    await saveSettings();
  });

  elements.showMessageCount.addEventListener('change', async () => {
    settings.settings.showMessageCount = elements.showMessageCount.checked;
    await saveSettings();
  });

  // Dark mode toggle
  if (elements.darkModeToggle) {
    elements.darkModeToggle.addEventListener('change', async () => {
      settings.settings.darkMode = elements.darkModeToggle.checked;
      applyDarkMode(settings.settings.darkMode);
      await saveSettings();
    });
  }

  // Export/Import
  elements.exportSettingsBtn.addEventListener('click', exportSettings);
  elements.importSettingsBtn.addEventListener('click', () => elements.importFile.click());
  elements.importFile.addEventListener('change', importSettings);

  // Annual billing toggle
  if (elements.annualBillingToggle) {
    elements.annualBillingToggle.addEventListener('change', () => {
      const isAnnual = elements.annualBillingToggle.checked;
      togglePricingDisplay(isAnnual);
    });
  }

  // Watermark toggle
  if (elements.watermarkToggle) {
    elements.watermarkToggle.addEventListener('change', async () => {
      settings.settings.watermark = elements.watermarkToggle.checked;
      // Update message limit with watermark bonus
      await saveSettings();
      Toast.success(settings.settings.watermark ?
        'Watermark enabled - help spread the word!' :
        'Watermark disabled.');
      updateTierBanner();
    });
  }

  // Subscribe buttons
  elements.subscribePro.addEventListener('click', () => subscribe('pro', elements.annualBillingToggle?.checked));
  elements.subscribeBusiness.addEventListener('click', () => subscribe('business', elements.annualBillingToggle?.checked));

  // Trial button
  if (elements.startTrialBtn) {
    elements.startTrialBtn.addEventListener('click', startTrial);
  }

  // Check if trial is available and update UI
  checkTrialAvailability();

  // Onboarding wizard
  if (elements.acceptTerms) {
    elements.acceptTerms.addEventListener('change', () => {
      Onboarding.updateNextButtonState();
    });
  }

  if (elements.onboardingNextBtn) {
    elements.onboardingNextBtn.addEventListener('click', () => {
      Onboarding.nextStep();
    });
  }

  if (elements.onboardingPrevBtn) {
    elements.onboardingPrevBtn.addEventListener('click', () => {
      Onboarding.prevStep();
    });
  }

  if (elements.onboardingMessage) {
    elements.onboardingMessage.addEventListener('input', () => {
      Onboarding.updateMessagePreview();
    });
  }

  // Analytics
  if (elements.unlockAnalyticsBtn) {
    elements.unlockAnalyticsBtn.addEventListener('click', () => {
      elements.upgradeModal.classList.add('active');
    });
  }

  if (elements.exportAnalyticsBtn) {
    elements.exportAnalyticsBtn.addEventListener('click', async () => {
      Loading.show(elements.exportAnalyticsBtn);
      try {
        await Analytics.exportCSV();
        Toast.success('Analytics exported to CSV');
      } catch (error) {
        Toast.error('Failed to export analytics');
      }
      Loading.hide(elements.exportAnalyticsBtn);
    });
  }

  // Quick Actions Bar
  initQuickActions();

  // Close modals on backdrop click
  [elements.settingsModal, elements.upgradeModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        FocusTrap.deactivate();
      }
    });
  });

  // Listen for messages from content script (with security validation)
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // SECURITY: Verify sender is from this extension
    if (!sender || sender.id !== browserAPI.runtime.id) {
      console.warn('[BuzzChat] Message from unknown sender rejected');
      return;
    }

    // SECURITY: Validate message has expected structure
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      console.warn('[BuzzChat] Invalid message format rejected');
      return;
    }

    // Whitelist of allowed incoming message types
    const allowedTypes = ['MESSAGE_SENT', 'GIVEAWAY_ENTRY', 'CHAT_METRICS_UPDATE', 'COMMAND_USED'];
    if (!allowedTypes.includes(message.type)) {
      console.warn('[BuzzChat] Unknown message type rejected:', message.type);
      return;
    }

    if (message.type === 'MESSAGE_SENT') {
      settings.messagesUsed++;
      updateTierBanner();
      saveSettings();
    } else if (message.type === 'COMMAND_USED') {
      // Update command usage count in settings
      if (settings.commands?.list && typeof message.trigger === 'string') {
        const cmd = settings.commands.list.find(c => c.trigger === message.trigger);
        if (cmd && typeof message.usageCount === 'number') {
          cmd.usageCount = message.usageCount;
          renderCommands(); // Refresh display
        }
      }
    } else if (message.type === 'GIVEAWAY_ENTRY') {
      // Update giveaway count live (validate totalEntries is a number)
      if (elements.giveawayEntryCount && typeof message.totalEntries === 'number') {
        elements.giveawayEntryCount.textContent = Math.max(0, Math.floor(message.totalEntries));
      }
      // Refresh full list
      loadGiveawayData();
    } else if (message.type === 'CHAT_METRICS_UPDATE') {
      // Update metrics display (validate metrics object)
      if (message.metrics && typeof message.metrics === 'object') {
        updateMetricsDisplay(message.metrics);
      }
    }
  });
}

// Timer messages
function renderTimerMessages() {
  elements.timerMessages.innerHTML = '';

  if (settings.timer.messages.length === 0) {
    const emptyState = createEmptyState(
      '⏰',
      'No Timer Messages Yet',
      'Add timed promotions that repeat during your stream',
      'Add Your First Timer',
      () => { if (canAddFeature()) addTimerMessage(); }
    );
    elements.timerMessages.appendChild(emptyState);
    return;
  }

  settings.timer.messages.forEach((msg, index) => {
    const item = createTimerMessageItem(msg, index);
    elements.timerMessages.appendChild(item);
  });
}

function createTimerMessageItem(msg, index) {
  const template = elements.timerMessageTemplate.content.cloneNode(true);
  const item = template.querySelector('.timer-message-item');

  const textInput = item.querySelector('.timer-text');
  const intervalInput = item.querySelector('.timer-interval');
  const removeBtn = item.querySelector('.remove-timer-btn');

  textInput.value = msg.text || '';
  intervalInput.value = msg.interval || 5;

  textInput.addEventListener('input', debounce(async () => {
    settings.timer.messages[index].text = validateText(textInput.value);
    await saveSettings();
  }, 500));

  intervalInput.addEventListener('change', async () => {
    const validated = validateNumber(
      intervalInput.value,
      VALIDATION.MIN_TIMER_INTERVAL,
      VALIDATION.MAX_TIMER_INTERVAL,
      5
    );
    settings.timer.messages[index].interval = validated;
    intervalInput.value = validated;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this timer message? This cannot be undone.')) return;
    settings.timer.messages.splice(index, 1);
    renderTimerMessages();
    await saveSettings();
    Toast.success('Timer message deleted');
  });

  return item;
}

function addTimerMessage() {
  if (!canAddItem('timer')) return;
  settings.timer.messages.push({ text: '', interval: 5 });
  renderTimerMessages();
  saveSettings();
}

// FAQ rules
function renderFaqRules() {
  elements.faqItems.innerHTML = '';

  if (settings.faq.rules.length === 0) {
    const emptyState = createEmptyState(
      '❓',
      'No FAQ Rules Yet',
      'Auto-reply to common questions like "shipping?" or "payment?"',
      'Add Your First FAQ',
      () => { if (canAddFeature()) addFaqRule(); }
    );
    elements.faqItems.appendChild(emptyState);
    return;
  }

  settings.faq.rules.forEach((rule, index) => {
    const item = createFaqItem(rule, index);
    elements.faqItems.appendChild(item);
  });
}

function createFaqItem(rule, index) {
  const template = elements.faqTemplate.content.cloneNode(true);
  const item = template.querySelector('.faq-item');

  const triggersInput = item.querySelector('.faq-triggers');
  const replyInput = item.querySelector('.faq-reply');
  const caseSensitiveInput = item.querySelector('.faq-case-sensitive');
  const removeBtn = item.querySelector('.remove-faq-btn');
  const aiToggleGroup = item.querySelector('.faq-ai-toggle-group');
  const useAiInput = item.querySelector('.faq-use-ai');

  triggersInput.value = rule.triggers?.join(', ') || '';
  replyInput.value = rule.reply || '';
  caseSensitiveInput.checked = rule.caseSensitive || false;

  // Show AI toggle only for Max tier users
  const isMaxTier = settings.tier === 'max' || settings.tier === 'business';
  if (isMaxTier && aiToggleGroup) {
    aiToggleGroup.style.display = 'block';
    useAiInput.checked = rule.useAI || false;

    useAiInput.addEventListener('change', async () => {
      settings.faq.rules[index].useAI = useAiInput.checked;
      await saveSettings();
      if (useAiInput.checked) {
        Toast.success('AI responses enabled for this rule');
      }
    });
  }

  triggersInput.addEventListener('input', debounce(async () => {
    let triggers = triggersInput.value.split(',').map(t => t.trim()).filter(t => t);
    // Limit number of triggers per rule
    if (triggers.length > VALIDATION.MAX_FAQ_TRIGGERS) {
      triggers = triggers.slice(0, VALIDATION.MAX_FAQ_TRIGGERS);
      Toast.warning(`Maximum of ${VALIDATION.MAX_FAQ_TRIGGERS} triggers per rule`);
    }
    settings.faq.rules[index].triggers = triggers;
    await saveSettings();
  }, 500));

  replyInput.addEventListener('input', debounce(async () => {
    settings.faq.rules[index].reply = validateText(replyInput.value);
    await saveSettings();
  }, 500));

  caseSensitiveInput.addEventListener('change', async () => {
    settings.faq.rules[index].caseSensitive = caseSensitiveInput.checked;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this FAQ rule? This cannot be undone.')) return;
    settings.faq.rules.splice(index, 1);
    renderFaqRules();
    await saveSettings();
    Toast.success('FAQ rule deleted');
  });

  return item;
}

function addFaqRule() {
  if (!canAddItem('faq')) return;
  settings.faq.rules.push({ triggers: [], reply: '', caseSensitive: false, useAI: false });
  renderFaqRules();
  saveSettings();
}

// Templates
function renderTemplates() {
  elements.templatesList.innerHTML = '';

  if (settings.templates.length === 0) {
    const emptyState = createEmptyState(
      '📝',
      'No Templates Yet',
      'Save frequently used messages for quick sending',
      'Add Your First Template',
      () => { if (canAddFeature()) addTemplate(); }
    );
    elements.templatesList.appendChild(emptyState);
    return;
  }

  settings.templates.forEach((template, index) => {
    const item = createTemplateItem(template, index);
    elements.templatesList.appendChild(item);
  });
}

function createTemplateItem(template, index) {
  const templateEl = elements.templateTemplate.content.cloneNode(true);
  const item = templateEl.querySelector('.template-item');

  const nameInput = item.querySelector('.template-name');
  const textInput = item.querySelector('.template-text');
  const sendBtn = item.querySelector('.send-template-btn');
  const removeBtn = item.querySelector('.remove-template-btn');

  nameInput.value = template.name || '';
  textInput.value = template.text || '';

  nameInput.addEventListener('input', debounce(async () => {
    settings.templates[index].name = validateText(nameInput.value, 50); // Short name limit
    await saveSettings();
  }, 500));

  textInput.addEventListener('input', debounce(async () => {
    settings.templates[index].text = validateText(textInput.value);
    await saveSettings();
  }, 500));

  sendBtn.addEventListener('click', async () => {
    if (!textInput.value.trim()) {
      Toast.warning('Template is empty');
      return;
    }
    Loading.show(sendBtn);
    const success = await sendMessageToContent('SEND_TEMPLATE', { text: textInput.value });
    Loading.hide(sendBtn);
    if (success) {
      Toast.success('Template sent');
    }
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    settings.templates.splice(index, 1);
    renderTemplates();
    await saveSettings();
    Toast.success('Template deleted');
  });

  return item;
}

function addTemplate() {
  if (!canAddItem('template')) return;
  settings.templates.push({ name: '', text: '' });
  renderTemplates();
  saveSettings();
}

// Commands
function renderCommands() {
  if (!elements.commandsList) return;
  elements.commandsList.innerHTML = '';

  const commands = settings.commands?.list || [];

  if (commands.length === 0) {
    const emptyState = createEmptyState(
      '⌨️',
      'No Commands Yet',
      'Create chat commands like !shipping or !payment',
      'Add Your First Command',
      () => { if (canAddFeature()) addCommand(); }
    );
    elements.commandsList.appendChild(emptyState);
    return;
  }

  commands.forEach((cmd, index) => {
    const item = createCommandItem(cmd, index);
    elements.commandsList.appendChild(item);
  });
}

function createCommandItem(cmd, index) {
  const template = elements.commandTemplate.content.cloneNode(true);
  const item = template.querySelector('.command-item');

  const triggerInput = item.querySelector('.command-trigger');
  const responseInput = item.querySelector('.command-response');
  const cooldownInput = item.querySelector('.command-cooldown');
  const usageCount = item.querySelector('.command-usage-count');
  const removeBtn = item.querySelector('.remove-command-btn');

  triggerInput.value = cmd.trigger || '';
  responseInput.value = cmd.response || '';
  cooldownInput.value = cmd.cooldown || 30;
  usageCount.textContent = `${cmd.usageCount || 0} uses`;

  triggerInput.addEventListener('input', debounce(async () => {
    // Remove ! prefix if user types it
    let trigger = triggerInput.value.replace(/^!+/, '').toLowerCase();
    // Only allow alphanumeric and underscore
    trigger = trigger.replace(/[^a-z0-9_]/g, '');
    triggerInput.value = trigger;
    settings.commands.list[index].trigger = trigger;
    await saveSettings();
  }, 500));

  responseInput.addEventListener('input', debounce(async () => {
    settings.commands.list[index].response = validateText(responseInput.value);
    await saveSettings();
  }, 500));

  cooldownInput.addEventListener('change', async () => {
    const validated = validateNumber(cooldownInput.value, 0, 300, 30);
    settings.commands.list[index].cooldown = validated;
    cooldownInput.value = validated;
    await saveSettings();
  });

  removeBtn.addEventListener('click', async () => {
    if (!confirm('Delete this command? This cannot be undone.')) return;
    settings.commands.list.splice(index, 1);
    renderCommands();
    await saveSettings();
    Toast.success('Command deleted');
  });

  return item;
}

function addCommand() {
  if (!canAddItem('command')) return;
  if (!settings.commands) settings.commands = { enabled: false, list: [] };
  settings.commands.list.push({
    trigger: '',
    response: '',
    cooldown: 30,
    usageCount: 0
  });
  renderCommands();
  saveSettings();
}

function exportCommands() {
  const commands = settings.commands?.list || [];
  if (commands.length === 0) {
    Toast.warning('No commands to export');
    return;
  }

  try {
    const data = JSON.stringify(commands, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'buzzchat-commands.json';
    a.click();

    URL.revokeObjectURL(url);
    Toast.success('Commands exported');
  } catch (e) {
    Toast.error('Export failed');
  }
}

async function importCommands(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    // Validate structure
    if (!Array.isArray(imported)) {
      Toast.error('Invalid commands file format');
      event.target.value = '';
      return;
    }

    // Validate and sanitize each command
    const validCommands = imported
      .filter(cmd => cmd && typeof cmd === 'object')
      .map(cmd => ({
        trigger: String(cmd.trigger || '').replace(/^!+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20),
        response: String(cmd.response || '').slice(0, 500),
        cooldown: Math.min(300, Math.max(0, parseInt(cmd.cooldown) || 30)),
        usageCount: 0 // Reset usage count on import
      }))
      .filter(cmd => cmd.trigger && cmd.response);

    if (validCommands.length === 0) {
      Toast.error('No valid commands found in file');
      event.target.value = '';
      return;
    }

    if (!settings.commands) settings.commands = { enabled: false, list: [] };
    settings.commands.list = [...settings.commands.list, ...validCommands];
    await saveSettings();
    renderCommands();
    Toast.success(`Imported ${validCommands.length} commands`);
  } catch (e) {
    Toast.error('Failed to parse commands file');
  }

  event.target.value = '';
}

// ===========================================
// Giveaway Wheel Functions
// ===========================================

// Store current winners for announce/reroll
let currentWinners = [];
let giveawayEntries = [];

// Spin the giveaway wheel (or random pick for free tier)
async function spinGiveawayWheel() {
  // Prevent double-click during spin
  if (elements.spinWheelBtn?.classList.contains('loading')) return;

  Loading.show(elements.spinWheelBtn);

  try {
    // Get entries from content script
    const response = await sendMessageToContent('GET_GIVEAWAY_ENTRIES');
    if (!response || !response.entries || response.entries.length === 0) {
      Toast.warning('No entries yet! Wait for viewers to enter.');
      Loading.hide(elements.spinWheelBtn);
      return;
    }

    giveawayEntries = response.entries.slice(0, 1000).map(e => e.username);
    const numWinners = Math.max(1, Math.min(10, parseInt(elements.winnerCount?.value || '1')));

    if (giveawayEntries.length < numWinners) {
      Toast.warning(`Only ${giveawayEntries.length} entries. Need at least ${numWinners} to pick ${numWinners} winner(s).`);
      Loading.hide(elements.spinWheelBtn);
      return;
    }

    // Check tier: Free tier gets random pick, Pro/Business get animated wheel
    const isPro = settings.tier === 'pro' || settings.tier === 'business';

    if (isPro) {
      // Pro/Business: Show animated wheel spinner
      showWheelOverlay(giveawayEntries);
      await animateWheel(giveawayEntries, numWinners);
    } else {
      // Free tier: Simple random pick (no animation)
      await randomPickWinners(giveawayEntries, numWinners);
    }
  } finally {
    Loading.hide(elements.spinWheelBtn);
  }
}

// Simple random pick for free tier (no wheel animation)
async function randomPickWinners(entries, numWinners) {
  return new Promise(resolve => {
    // Pick random winners
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    currentWinners = shuffled.slice(0, numWinners);

    // Brief delay for UX feedback
    setTimeout(() => {
      showWinnerDisplay(currentWinners);
      Toast.info('Upgrade to Pro for the animated spinner wheel!');
      resolve();
    }, 500);
  });
}

// Show the wheel overlay with segments
function showWheelOverlay(entries) {
  if (!elements.wheelOverlay || !elements.spinningWheel) return;

  // Build wheel segments (max 12 for visibility)
  const displayEntries = entries.slice(0, 12);
  const segmentAngle = 360 / displayEntries.length;

  elements.spinningWheel.innerHTML = '';
  elements.spinningWheel.style.transform = 'rotate(0deg)';

  displayEntries.forEach((name, index) => {
    const segment = document.createElement('div');
    segment.className = 'wheel-segment';
    segment.style.transform = `rotate(${index * segmentAngle - 90}deg) skewY(${90 - segmentAngle}deg)`;

    const inner = document.createElement('div');
    inner.className = 'wheel-segment-inner';
    inner.style.transform = `skewY(${segmentAngle - 90}deg)`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name.slice(0, 10);
    inner.appendChild(nameSpan);

    segment.appendChild(inner);
    elements.spinningWheel.appendChild(segment);
  });

  elements.wheelStatus.textContent = 'Spinning...';
  elements.wheelOverlay.classList.add('active');
  elements.wheelOverlay.setAttribute('aria-busy', 'true');
}

// Animate the wheel spinning
async function animateWheel(entries, numWinners) {
  return new Promise(resolve => {
    // Pick random winners
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    currentWinners = shuffled.slice(0, numWinners);

    // Calculate spin rotation (multiple full rotations + random offset)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const targetRotation = spins * 360 + Math.random() * 360;

    // Animate
    if (elements.spinningWheel) {
      elements.spinningWheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      elements.spinningWheel.style.transform = `rotate(${targetRotation}deg)`;
    }

    // After spin completes
    setTimeout(() => {
      hideWheelOverlay();
      showWinnerDisplay(currentWinners);
      triggerConfetti();
      resolve();
    }, 4200);
  });
}

// Hide wheel overlay
function hideWheelOverlay() {
  if (elements.wheelOverlay) {
    elements.wheelOverlay.classList.remove('active');
    elements.wheelOverlay.setAttribute('aria-busy', 'false');
  }
}

// Show winner display
function showWinnerDisplay(winners) {
  if (!elements.winnerDisplay || !elements.winnerNames) return;

  elements.winnerNames.innerHTML = '';
  const title = elements.winnerDisplay.querySelector('.winner-title');
  if (title) {
    title.textContent = winners.length > 1 ? 'Winners!' : 'Winner!';
  }

  winners.forEach(winner => {
    const nameEl = document.createElement('div');
    nameEl.className = 'winner-name';
    nameEl.textContent = winner;
    elements.winnerNames.appendChild(nameEl);
  });

  elements.winnerDisplay.style.display = 'flex';
}

// Hide winner display
function hideWinnerDisplay() {
  if (elements.winnerDisplay) {
    elements.winnerDisplay.style.display = 'none';
  }
}

// Announce winners in chat
async function announceWinners() {
  if (currentWinners.length === 0) return;

  Loading.show(elements.announceWinnerBtn);

  try {
    const winnerList = currentWinners.join(', ');
    const message = currentWinners.length > 1
      ? `🎉 GIVEAWAY WINNERS: ${winnerList}! Congratulations! 🎉`
      : `🎉 GIVEAWAY WINNER: ${winnerList}! Congratulations! 🎉`;

    const success = await sendMessageToContent('SEND_TEMPLATE', { text: message });
    if (success) {
      Toast.success('Winners announced in chat!');
    }
  } finally {
    Loading.hide(elements.announceWinnerBtn);
  }
}

// Trigger confetti animation
function triggerConfetti() {
  const canvas = elements.confettiCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  // Cap canvas size at 1920x1080 to prevent excessive memory usage on 4K displays
  canvas.width = Math.min(window.innerWidth, 1920);
  canvas.height = Math.min(window.innerHeight, 1080);

  const confettiPieces = [];
  // Use CSS variables for theme-aware confetti colors
  const computedStyle = getComputedStyle(document.documentElement);
  const colors = [
    computedStyle.getPropertyValue('--confetti-1').trim() || '#e74c3c',
    computedStyle.getPropertyValue('--confetti-2').trim() || '#3498db',
    computedStyle.getPropertyValue('--confetti-3').trim() || '#2ecc71',
    computedStyle.getPropertyValue('--confetti-4').trim() || '#f39c12',
    computedStyle.getPropertyValue('--confetti-5').trim() || '#9b59b6',
    computedStyle.getPropertyValue('--confetti-6').trim() || '#1abc9c',
    computedStyle.getPropertyValue('--confetti-7').trim() || '#e91e63',
    computedStyle.getPropertyValue('--confetti-8').trim() || '#00bcd4'
  ];

  // Create confetti pieces
  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }

  let animationFrame;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    confettiPieces.forEach(piece => {
      if (piece.y < canvas.height + 20) {
        activeCount++;
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotation += piece.rotationSpeed;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate((piece.rotation * Math.PI) / 180);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
        ctx.restore();
      }
    });

    if (activeCount > 0) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  animate();

  // Clean up after 5 seconds
  setTimeout(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 5000);
}

// ===========================================
// Quick Reply Button Settings
// ===========================================

function renderQuickReplyButtons() {
  if (!elements.quickReplyButtonsList) return;
  elements.quickReplyButtonsList.innerHTML = '';

  const buttons = settings.quickReply?.buttons || [];

  if (buttons.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'help-text';
    empty.textContent = 'No buttons configured. Add some quick reply buttons!';
    elements.quickReplyButtonsList.appendChild(empty);
    return;
  }

  buttons.forEach((btn, index) => {
    const item = createQuickReplyEditItem(btn, index);
    elements.quickReplyButtonsList.appendChild(item);
  });
}

function createQuickReplyEditItem(btn, index) {
  const template = elements.quickReplyTemplate.content.cloneNode(true);
  const item = template.querySelector('.quick-reply-edit-item');

  const emojiInput = item.querySelector('.quick-reply-emoji-input');
  const textInput = item.querySelector('.quick-reply-text-input');
  const removeBtn = item.querySelector('.remove-quick-reply-btn');

  emojiInput.value = btn.emoji || '';
  textInput.value = btn.text || '';

  emojiInput.addEventListener('input', debounce(async () => {
    // Basic emoji validation - allow only emoji characters (strip other input)
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Presentation}]*$/u;
    let value = emojiInput.value.slice(0, 2);
    // If input contains non-emoji characters, try to extract emoji or clear
    if (value && !emojiRegex.test(value)) {
      // Extract any emoji characters
      const emojiMatch = value.match(/[\p{Emoji}\p{Emoji_Presentation}]/gu);
      value = emojiMatch ? emojiMatch.slice(0, 1).join('') : '';
      emojiInput.value = value;
    }
    settings.quickReply.buttons[index].emoji = value;
    await saveSettings();
  }, 500));

  textInput.addEventListener('input', debounce(async () => {
    settings.quickReply.buttons[index].text = textInput.value.slice(0, 100);
    await saveSettings();
  }, 500));

  removeBtn.addEventListener('click', async () => {
    settings.quickReply.buttons.splice(index, 1);
    renderQuickReplyButtons();
    await saveSettings();
    Toast.success('Button removed');
  });

  return item;
}

function addQuickReplyButton() {
  if (!settings.quickReply) {
    settings.quickReply = { enabled: true, minimized: false, buttons: [] };
  }

  if (settings.quickReply.buttons.length >= 10) {
    Toast.warning('Maximum of 10 quick reply buttons');
    return;
  }

  settings.quickReply.buttons.push({ text: '', emoji: '' });
  renderQuickReplyButtons();
  saveSettings();
}

// ===============================================
// 10/10 FEATURES: Hotkey Slots Renderer
// ===============================================
function renderHotkeySlots() {
  if (!elements.hotkeyList) return;
  elements.hotkeyList.innerHTML = '';

  const replies = settings.quickReplies || [];

  // Render 9 hotkey slots (Ctrl+1 through Ctrl+9)
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotkey-slot';
    slot.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

    const label = document.createElement('span');
    label.className = 'hotkey-label';
    label.style.cssText = 'min-width: 60px; font-family: monospace; font-size: 12px; color: var(--gray-500);';
    label.textContent = `Ctrl+${i + 1}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'hotkey-message';
    input.placeholder = 'Enter message...';
    input.maxLength = 200;
    input.value = replies[i] || '';
    input.style.cssText = 'flex: 1;';

    const index = i;
    input.addEventListener('input', debounce(async () => {
      if (!settings.quickReplies) {
        settings.quickReplies = [];
      }
      // Pad array if needed
      while (settings.quickReplies.length <= index) {
        settings.quickReplies.push('');
      }
      settings.quickReplies[index] = input.value.slice(0, 200);
      await saveSettings();
    }, 500));

    slot.appendChild(label);
    slot.appendChild(input);
    elements.hotkeyList.appendChild(slot);
  }
}

// ===============================================
// 10/10 FEATURES: Viewer Leaderboard Renderer
// ===============================================
async function loadViewerLeaderboard() {
  if (!elements.viewerLeaderboard) return;

  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const response = await browserAPI.tabs.sendMessage(tabs[0].id, {
      type: 'GET_TOP_VIEWERS',
      limit: 10
    });

    if (response?.success && response.viewers?.length > 0) {
      renderViewerLeaderboard(response.viewers);
    } else {
      elements.viewerLeaderboard.innerHTML = `
        <div class="empty-state-inline">
          <span class="empty-icon">👥</span>
          <p class="empty-entries">No viewers tracked yet</p>
          <p class="empty-hint">Viewer activity will appear here as chat messages come in.</p>
        </div>
      `;
    }
  } catch (e) {
    // Content script not active
  }
}

function renderViewerLeaderboard(viewers) {
  if (!elements.viewerLeaderboard) return;
  elements.viewerLeaderboard.innerHTML = '';

  viewers.forEach((viewer, index) => {
    const item = document.createElement('div');
    item.className = 'viewer-item';
    item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid var(--gray-200);';

    const rank = document.createElement('span');
    rank.className = 'viewer-rank';
    rank.style.cssText = 'min-width: 24px; font-weight: 600; color: var(--gray-500);';
    rank.textContent = `#${index + 1}`;

    const name = document.createElement('span');
    name.className = 'viewer-name';
    name.style.cssText = 'flex: 1; font-weight: 500;';
    name.textContent = viewer.username;

    const count = document.createElement('span');
    count.className = 'viewer-count';
    count.style.cssText = 'color: var(--primary); font-weight: 600;';
    count.textContent = `${viewer.messageCount} msgs`;

    item.appendChild(rank);
    item.appendChild(name);
    item.appendChild(count);
    elements.viewerLeaderboard.appendChild(item);
  });
}

// ===============================================
// 10/10 FEATURES: Recent Bids Renderer
// ===============================================
async function loadRecentBids() {
  if (!elements.recentBidsList) return;

  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const response = await browserAPI.tabs.sendMessage(tabs[0].id, {
      type: 'GET_RECENT_BIDS'
    });

    if (response?.success && response.bids?.length > 0) {
      renderRecentBids(response.bids);
    } else {
      elements.recentBidsList.innerHTML = `
        <div class="empty-state-inline">
          <span class="empty-icon">💰</span>
          <p class="empty-entries">No bids detected</p>
          <p class="empty-hint">Enable Bid Alerts in Settings to track bids.</p>
        </div>
      `;
    }
  } catch (e) {
    // Content script not active
  }
}

function renderRecentBids(bids) {
  if (!elements.recentBidsList) return;
  elements.recentBidsList.innerHTML = '';

  // Show most recent first
  const recentBids = [...bids].reverse().slice(0, 10);

  recentBids.forEach(bid => {
    const item = document.createElement('div');
    item.className = 'bid-item';
    item.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid var(--gray-200);';

    const amount = document.createElement('span');
    amount.className = 'bid-amount';
    amount.style.cssText = 'min-width: 60px; font-weight: 600; color: var(--success);';
    amount.textContent = `$${bid.amount.toFixed(2)}`;

    const name = document.createElement('span');
    name.className = 'bid-username';
    name.style.cssText = 'flex: 1; font-weight: 500;';
    name.textContent = bid.username;

    const time = document.createElement('span');
    time.className = 'bid-time';
    time.style.cssText = 'color: var(--gray-500); font-size: 12px;';
    time.textContent = formatTimeAgo(bid.timestamp);

    item.appendChild(amount);
    item.appendChild(name);
    item.appendChild(time);
    elements.recentBidsList.appendChild(item);
  });
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ===============================================
// 10/10 FEATURES: Chat Export Functions
// ===============================================
async function loadChatHistoryCount() {
  if (!elements.chatHistoryCount) return;

  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const response = await browserAPI.tabs.sendMessage(tabs[0].id, {
      type: 'GET_CHAT_HISTORY',
      limit: 1
    });

    if (response?.success) {
      elements.chatHistoryCount.textContent = response.totalMessages || 0;
    }
  } catch (e) {
    elements.chatHistoryCount.textContent = '0';
  }
}

async function exportChatHistory() {
  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      Toast.error('No active tab found');
      return;
    }

    const response = await browserAPI.tabs.sendMessage(tabs[0].id, {
      type: 'EXPORT_CHAT_CSV'
    });

    if (response?.success && response.csv) {
      // Create and download CSV file
      const blob = new Blob([response.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `buzzchat-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Toast.success(`Exported ${response.messageCount} messages`);
    } else {
      Toast.warning('No chat messages to export');
    }
  } catch (e) {
    Toast.error('Unable to export chat history');
  }
}

async function clearChatHistory() {
  if (!confirm('Clear all captured chat messages? This cannot be undone.')) return;

  try {
    const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    await browserAPI.tabs.sendMessage(tabs[0].id, {
      type: 'CLEAR_CHAT_HISTORY'
    });

    if (elements.chatHistoryCount) {
      elements.chatHistoryCount.textContent = '0';
    }

    Toast.success('Chat history cleared');
  } catch (e) {
    Toast.error('Unable to clear chat history');
  }
}

// ===============================================
// 10/10 FEATURES: Event Listeners Setup
// ===============================================
function init10x10Features() {
  // Render hotkey slots
  renderHotkeySlots();

  // Initialize keyword alerts settings
  if (elements.keywordAlertsToggle) {
    elements.keywordAlertsToggle.checked = settings.keywordAlerts?.enabled || false;
    elements.keywordAlertsToggle.addEventListener('change', async () => {
      if (!settings.keywordAlerts) settings.keywordAlerts = { enabled: false, keywords: [], soundEnabled: true };
      settings.keywordAlerts.enabled = elements.keywordAlertsToggle.checked;
      await saveSettings();
    });
  }

  if (elements.keywordAlertsList) {
    elements.keywordAlertsList.value = (settings.keywordAlerts?.keywords || []).join(', ');
    elements.keywordAlertsList.addEventListener('input', debounce(async () => {
      if (!settings.keywordAlerts) settings.keywordAlerts = { enabled: false, keywords: [], soundEnabled: true };
      settings.keywordAlerts.keywords = elements.keywordAlertsList.value
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      await saveSettings();
    }, 500));
  }

  if (elements.keywordAlertsSoundToggle) {
    elements.keywordAlertsSoundToggle.checked = settings.keywordAlerts?.soundEnabled !== false;
    elements.keywordAlertsSoundToggle.addEventListener('change', async () => {
      if (!settings.keywordAlerts) settings.keywordAlerts = { enabled: false, keywords: [], soundEnabled: true };
      settings.keywordAlerts.soundEnabled = elements.keywordAlertsSoundToggle.checked;
      await saveSettings();
    });
  }

  // Initialize bid alerts settings
  if (elements.bidAlertsToggle) {
    elements.bidAlertsToggle.checked = settings.bidAlerts?.enabled || false;
    elements.bidAlertsToggle.addEventListener('change', async () => {
      if (!settings.bidAlerts) settings.bidAlerts = { enabled: false, soundEnabled: true, minAmount: 0 };
      settings.bidAlerts.enabled = elements.bidAlertsToggle.checked;
      await saveSettings();
    });
  }

  if (elements.bidAlertsMinAmount) {
    elements.bidAlertsMinAmount.value = settings.bidAlerts?.minAmount || 0;
    elements.bidAlertsMinAmount.addEventListener('change', async () => {
      if (!settings.bidAlerts) settings.bidAlerts = { enabled: false, soundEnabled: true, minAmount: 0 };
      settings.bidAlerts.minAmount = Math.max(0, parseInt(elements.bidAlertsMinAmount.value) || 0);
      await saveSettings();
    });
  }

  if (elements.bidAlertsSoundToggle) {
    elements.bidAlertsSoundToggle.checked = settings.bidAlerts?.soundEnabled !== false;
    elements.bidAlertsSoundToggle.addEventListener('change', async () => {
      if (!settings.bidAlerts) settings.bidAlerts = { enabled: false, soundEnabled: true, minAmount: 0 };
      settings.bidAlerts.soundEnabled = elements.bidAlertsSoundToggle.checked;
      await saveSettings();
    });
  }

  // Viewer leaderboard buttons
  if (elements.refreshViewersBtn) {
    elements.refreshViewersBtn.addEventListener('click', loadViewerLeaderboard);
  }

  if (elements.resetViewersBtn) {
    elements.resetViewersBtn.addEventListener('click', async () => {
      if (!confirm('Reset viewer tracking? This cannot be undone.')) return;
      try {
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          await browserAPI.tabs.sendMessage(tabs[0].id, { type: 'RESET_VIEWERS' });
          loadViewerLeaderboard();
          Toast.success('Viewer tracking reset');
        }
      } catch (e) {
        Toast.error('Unable to reset viewers');
      }
    });
  }

  // Recent bids buttons
  if (elements.refreshBidsBtn) {
    elements.refreshBidsBtn.addEventListener('click', loadRecentBids);
  }

  if (elements.resetBidsBtn) {
    elements.resetBidsBtn.addEventListener('click', async () => {
      if (!confirm('Clear all detected bids? This cannot be undone.')) return;
      try {
        const tabs = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          await browserAPI.tabs.sendMessage(tabs[0].id, { type: 'RESET_BIDS' });
          loadRecentBids();
          Toast.success('Bids cleared');
        }
      } catch (e) {
        Toast.error('Unable to reset bids');
      }
    });
  }

  // Chat export buttons
  if (elements.exportChatBtn) {
    elements.exportChatBtn.addEventListener('click', exportChatHistory);
  }

  if (elements.clearChatHistoryBtn) {
    elements.clearChatHistoryBtn.addEventListener('click', clearChatHistory);
  }

  // Load initial data
  loadViewerLeaderboard();
  loadRecentBids();
  loadChatHistoryCount();
}

// Check if user can add more features (tier check)
// NOTE: Free tier now has access to ALL features - only message count is limited
// This encourages users to experience the full "aha moment" before upgrading
function canAddFeature() {
  // All tiers can add features - the limit is on message count, not feature count
  return true;
}

// Send message to content script
async function sendMessageToContent(type, data = {}) {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        browserAPI.tabs.sendMessage(tabs[0].id, { type, ...data })
          .then(() => resolve(true))
          .catch(() => {
            Toast.error('Please navigate to a live stream first');
            resolve(false);
          });
      } else {
        Toast.error('No active tab found');
        resolve(false);
      }
    });
  });
}

// Export settings
function exportSettings() {
  Loading.show(elements.exportSettingsBtn);

  try {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'buzzchat-settings.json';
    a.click();

    URL.revokeObjectURL(url);
    Toast.success('Settings exported');
  } catch (e) {
    Toast.error('Export failed');
  }

  Loading.hide(elements.exportSettingsBtn);
}

// Validate imported settings schema
function validateSettingsSchema(imported) {
  // SECURITY: Comprehensive settings validation to prevent malicious imports

  // Check required top-level structure
  if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
    return { valid: false, error: 'Invalid settings format' };
  }

  // Check for dangerous prototype pollution attempts
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const checkForDangerousKeys = (obj, path = '') => {
    if (typeof obj !== 'object' || obj === null) return true;
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return false;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (!checkForDangerousKeys(obj[key], `${path}.${key}`)) {
          return false;
        }
      }
    }
    return true;
  };

  if (!checkForDangerousKeys(imported)) {
    return { valid: false, error: 'Settings contain unsafe properties' };
  }

  // Size limits to prevent DoS
  const MAX_STRING_LENGTH = 1000;
  const MAX_ARRAY_LENGTH = 100;
  const MAX_OBJECT_DEPTH = 5;

  const checkLimits = (obj, depth = 0) => {
    if (depth > MAX_OBJECT_DEPTH) return false;
    if (typeof obj === 'string' && obj.length > MAX_STRING_LENGTH) return false;
    if (Array.isArray(obj) && obj.length > MAX_ARRAY_LENGTH) return false;
    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        if (!checkLimits(value, depth + 1)) return false;
      }
    }
    return true;
  };

  if (!checkLimits(imported)) {
    return { valid: false, error: 'Settings exceed size limits' };
  }

  // Validate welcome settings
  if (imported.welcome && typeof imported.welcome !== 'object') {
    return { valid: false, error: 'Invalid welcome settings' };
  }

  // Validate timer settings
  if (imported.timer) {
    if (typeof imported.timer !== 'object') {
      return { valid: false, error: 'Invalid timer settings' };
    }
    if (imported.timer.messages && !Array.isArray(imported.timer.messages)) {
      return { valid: false, error: 'Timer messages must be an array' };
    }
  }

  // Validate FAQ settings
  if (imported.faq) {
    if (typeof imported.faq !== 'object') {
      return { valid: false, error: 'Invalid FAQ settings' };
    }
    if (imported.faq.rules && !Array.isArray(imported.faq.rules)) {
      return { valid: false, error: 'FAQ rules must be an array' };
    }
  }

  // Validate templates
  if (imported.templates && !Array.isArray(imported.templates)) {
    return { valid: false, error: 'Templates must be an array' };
  }

  // Validate commands
  if (imported.commands) {
    if (typeof imported.commands !== 'object') {
      return { valid: false, error: 'Invalid commands settings' };
    }
    if (imported.commands.list && !Array.isArray(imported.commands.list)) {
      return { valid: false, error: 'Commands list must be an array' };
    }
  }

  // Validate quickReply
  if (imported.quickReply) {
    if (typeof imported.quickReply !== 'object') {
      return { valid: false, error: 'Invalid quickReply settings' };
    }
    if (imported.quickReply.buttons && !Array.isArray(imported.quickReply.buttons)) {
      return { valid: false, error: 'Quick reply buttons must be an array' };
    }
  }

  // Strip any unexpected top-level keys (whitelist approach)
  const allowedKeys = [
    'tier', 'messagesUsed', 'messagesLimit', 'referralBonus', 'masterEnabled',
    'welcome', 'timer', 'faq', 'moderation', 'giveaway', 'templates',
    'commands', 'quickReply', 'settings'
  ];

  for (const key of Object.keys(imported)) {
    if (!allowedKeys.includes(key)) {
      delete imported[key];
    }
  }

  return { valid: true };
}

// Import settings
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  Loading.show(elements.importSettingsBtn);

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    // Validate schema before importing
    const validation = validateSettingsSchema(imported);
    if (!validation.valid) {
      Toast.error(validation.error);
      Loading.hide(elements.importSettingsBtn);
      event.target.value = '';
      return;
    }

    settings = { ...DEFAULT_SETTINGS, ...imported };
    await saveSettings();
    initUI();
    Toast.success('Settings imported successfully');
  } catch (e) {
    Toast.error('Invalid settings file');
  }

  Loading.hide(elements.importSettingsBtn);
  event.target.value = '';
}

// ExtensionPay Configuration
const ExtensionPay = {
  EXTENSION_ID: 'buzzchat',
  TRIAL_DAYS: 7,
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000,

  async getCachedLicense() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotLicense'], (result) => {
        resolve(result.whatnotBotLicense || null);
      });
    });
  },

  async cacheLicense(license) {
    return new Promise((resolve) => {
      browserAPI.storage.sync.set({
        whatnotBotLicense: { ...license, cachedAt: Date.now() }
      }, resolve);
    });
  },

  async getUser() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['extensionpay_user'], (result) => {
        resolve(result.extensionpay_user || null);
      });
    });
  },

  async openPaymentPage(planId = 'pro', isAnnual = false) {
    const baseUrl = `https://extensionpay.com/pay/${this.EXTENSION_ID}`;
    let url = baseUrl;
    const params = [];

    if (planId === 'business') {
      params.push('plan=business');
    }
    if (isAnnual) {
      params.push('billing=annual');
    }

    if (params.length > 0) {
      url = `${baseUrl}?${params.join('&')}`;
    }
    browserAPI.tabs.create({ url });
  },

  async startTrial() {
    const trialData = {
      trialStartedAt: new Date().toISOString(),
      extensionId: this.EXTENSION_ID
    };

    await new Promise((resolve) => {
      browserAPI.storage.sync.set({ extensionpay_user: trialData }, resolve);
    });

    const license = {
      tier: 'pro',
      paid: false,
      trialActive: true,
      trialEndsAt: new Date(Date.now() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString()
    };

    await this.cacheLicense(license);

    // Update settings - Pro tier gets 250 messages/show
    settings.tier = 'pro';
    settings.messagesLimit = 250; // Pro tier limit (will be synced by background.js)
    await saveSettings();

    return license;
  },

  async canStartTrial() {
    const user = await this.getUser();
    return !user || !user.trialStartedAt;
  },

  async openManagementPage() {
    browserAPI.tabs.create({
      url: `https://extensionpay.com/manage/${this.EXTENSION_ID}`
    });
  },

  formatTrialRemaining(trialEndsAt) {
    if (!trialEndsAt) return null;
    const endDate = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = endDate - now;
    if (diffMs <= 0) return 'Trial expired';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  }
};

// Subscribe - Opens ExtensionPay payment page
async function subscribe(plan, isAnnual = false) {
  Loading.show(plan === 'pro' ? elements.subscribePro : elements.subscribeBusiness);

  try {
    await ExtensionPay.openPaymentPage(plan, isAnnual);
    Toast.success('Opening payment page...');
    elements.upgradeModal.classList.remove('active');
  } catch (error) {
    console.error('[BuzzChat] Failed to open payment page:', error);
    Toast.error('Failed to open payment page. Please try again.');
  }

  Loading.hide(plan === 'pro' ? elements.subscribePro : elements.subscribeBusiness);
}

// Start free trial
async function startTrial() {
  const canTrial = await ExtensionPay.canStartTrial();

  if (!canTrial) {
    Toast.warning('You have already used your free trial.');
    return;
  }

  try {
    await ExtensionPay.startTrial();
    Toast.success('7-day Pro trial activated!');
    elements.upgradeModal.classList.remove('active');
    updateTierBanner();
    initUI();
  } catch (error) {
    console.error('[BuzzChat] Failed to start trial:', error);
    Toast.error('Failed to start trial. Please try again.');
  }
}

// Manage subscription
async function manageSubscription() {
  await ExtensionPay.openManagementPage();
}

// Check if trial is available and update UI
async function checkTrialAvailability() {
  const canTrial = await ExtensionPay.canStartTrial();
  const license = await ExtensionPay.getCachedLicense();

  if (elements.trialBanner) {
    // Hide trial banner if already used trial or is paid user
    if (!canTrial || (license && (license.paid || license.trialActive))) {
      elements.trialBanner.classList.add('hidden');
    } else {
      elements.trialBanner.classList.remove('hidden');
    }
  }

  // Update tier banner if trial is active
  if (license?.trialActive) {
    const remaining = ExtensionPay.formatTrialRemaining(license.trialEndsAt);
    const tierUsage = elements.tierBanner?.querySelector('.tier-usage');
    if (tierUsage && remaining) {
      tierUsage.textContent = `Trial: ${remaining}`;
    }
  }
}

// Toggle pricing display between monthly and annual
function togglePricingDisplay(isAnnual) {
  if (elements.proPrice) {
    elements.proPrice.style.display = isAnnual ? 'none' : 'block';
  }
  if (elements.proPriceAnnual) {
    elements.proPriceAnnual.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.proPriceNote) {
    elements.proPriceNote.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.businessPrice) {
    elements.businessPrice.style.display = isAnnual ? 'none' : 'block';
  }
  if (elements.businessPriceAnnual) {
    elements.businessPriceAnnual.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.businessPriceNote) {
    elements.businessPriceNote.style.display = isAnnual ? 'block' : 'none';
  }
}

// Update message limit with watermark bonus + referral bonus
function updateMessageLimitWithBonus() {
  // Message limits are managed by background.js via getTierLimits()
  // This function preserved for backwards compatibility but no longer overrides limits
  // Bonuses could add to the base limit: settings.messagesLimit + settings.referralBonus
}

// Utility functions
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Safe empty state creator - no innerHTML with dynamic content
function createEmptyState(icon, title, description, ctaText, ctaCallback) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'empty-state-icon';
  iconDiv.textContent = icon;

  const h4 = document.createElement('h4');
  h4.textContent = title;

  const p = document.createElement('p');
  p.textContent = description;

  container.appendChild(iconDiv);
  container.appendChild(h4);
  container.appendChild(p);

  if (ctaText && ctaCallback) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary empty-state-cta';
    btn.textContent = ctaText;
    btn.addEventListener('click', ctaCallback);
    container.appendChild(btn);
  }

  return container;
}

// Retry utility for failed async operations
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 1000, backoff = 2, onRetry = null } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);

        if (onRetry) {
          onRetry(attempt, waitTime, error);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

// Validate and truncate text input
function validateText(text, maxLength = VALIDATION.MAX_MESSAGE_LENGTH) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    Toast.warning(`Text truncated to ${maxLength} characters`);
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

// Validate number input within range
function validateNumber(value, min, max, defaultValue) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
}

// Check if can add more items (with specific limits)
function canAddItem(type) {
  let count, max, name;
  const isPro = settings.tier === 'pro' || settings.tier === 'business';

  switch (type) {
    case 'timer':
      count = settings.timer.messages.length;
      max = VALIDATION.MAX_TIMER_MESSAGES;
      name = 'timer messages';
      break;
    case 'faq':
      count = settings.faq.rules.length;
      // Free tier gets 3 FAQ rules, Pro/Business get 20
      max = isPro ? VALIDATION.MAX_FAQ_RULES : VALIDATION.MAX_FAQ_RULES_FREE;
      name = 'FAQ rules';
      break;
    case 'command':
      count = settings.commands?.list?.length || 0;
      // Free tier gets 5 commands, Pro/Business get 50
      max = isPro ? VALIDATION.MAX_COMMANDS : VALIDATION.MAX_COMMANDS_FREE;
      name = 'commands';
      break;
    case 'template':
      count = settings.templates.length;
      max = VALIDATION.MAX_TEMPLATES;
      name = 'templates';
      break;
    default:
      return true;
  }

  if (count >= max) {
    if ((type === 'faq' || type === 'command') && !isPro) {
      Toast.warning(`Free plan allows ${max} ${name}. Upgrade to Pro for unlimited!`);
    } else {
      Toast.warning(`Maximum of ${max} ${name} reached`);
    }
    // Update tier banner to show upgrade prompt
    updateTierBanner();
    return false;
  }
  return true;
}

// Referral Module
const Referral = {
  STORAGE_KEY: 'whatnotBotReferral',
  BONUS_PER_REFERRAL: 10,
  CODE_LENGTH: 8,

  // Generate a unique referral code
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // Get or create referral data
  async getData() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        if (result[this.STORAGE_KEY]) {
          resolve(result[this.STORAGE_KEY]);
        } else {
          // Initialize new referral data
          const newData = {
            myCode: this.generateCode(),
            referrals: [], // Users who used my code
            redeemedCode: null, // Code I used (if any)
            bonusMessages: 0,
            createdAt: Date.now()
          };
          browserAPI.storage.local.set({ [this.STORAGE_KEY]: newData });
          resolve(newData);
        }
      });
    });
  },

  // Save referral data
  async saveData(data) {
    return new Promise((resolve) => {
      browserAPI.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
    });
  },

  // Redeem a referral code
  async redeemCode(code) {
    const data = await this.getData();

    // Validation
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Please enter a valid code' };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if already redeemed a code
    if (data.redeemedCode) {
      return { success: false, error: 'You have already redeemed a referral code' };
    }

    // Check if trying to use own code
    if (normalizedCode === data.myCode) {
      return { success: false, error: 'You cannot use your own referral code' };
    }

    // Validate code format
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      return { success: false, error: 'Invalid code format' };
    }

    // Mark code as redeemed (we can't verify other users in a local-only system)
    // In a real system, this would hit a backend API
    data.redeemedCode = normalizedCode;
    data.bonusMessages += this.BONUS_PER_REFERRAL;
    await this.saveData(data);

    // Update settings with bonus
    await this.applyBonus(this.BONUS_PER_REFERRAL);

    return { success: true, bonus: this.BONUS_PER_REFERRAL };
  },

  // Apply bonus messages to settings (sync storage for cross-device sync)
  async applyBonus(amount) {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        if (result.whatnotBotSettings) {
          const settings = result.whatnotBotSettings;
          settings.referralBonus = (settings.referralBonus || 0) + amount;
          browserAPI.storage.sync.set({ whatnotBotSettings: settings }, resolve);
        } else {
          resolve();
        }
      });
    });
  },

  // Get total bonus (referral bonus for display)
  async getTotalBonus() {
    const data = await this.getData();
    return data.bonusMessages;
  },

  // Get referral count
  async getReferralCount() {
    const data = await this.getData();
    return data.referrals.length;
  }
};

// Analytics Module (inline for popup context)
const Analytics = {
  STORAGE_KEY: 'whatnotBotAnalytics',

  getDefaultData() {
    return {
      totalMessagesSent: 0,
      welcomeMessagesSent: 0,
      faqRepliesSent: 0,
      timerMessagesSent: 0,
      templatesSent: 0,
      sessionsCount: 0,
      lastSessionDate: null,
      dailyStats: {},
      hourlyActivity: new Array(24).fill(0),
      topFaqTriggers: {}
    };
  },

  async load() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        resolve(result[this.STORAGE_KEY] || this.getDefaultData());
      });
    });
  },

  getTodayKey() {
    return new Date().toISOString().split('T')[0];
  },

  async getSummary() {
    const data = await this.load();
    const today = this.getTodayKey();
    const todayStats = data.dailyStats[today] || { messages: 0, welcomes: 0, faqs: 0, timers: 0, templates: 0 };

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      last7Days.push({
        date: key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        ...(data.dailyStats[key] || { messages: 0, welcomes: 0, faqs: 0, timers: 0, templates: 0 })
      });
    }

    const topTriggers = Object.entries(data.topFaqTriggers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trigger, count]) => ({ trigger, count }));

    const peakHour = data.hourlyActivity.indexOf(Math.max(...data.hourlyActivity));
    const peakHourLabel = peakHour === 0 ? '12 AM' :
                          peakHour < 12 ? `${peakHour} AM` :
                          peakHour === 12 ? '12 PM' :
                          `${peakHour - 12} PM`;

    return {
      totalMessages: data.totalMessagesSent,
      todayMessages: todayStats.messages,
      welcomesSent: data.welcomeMessagesSent,
      faqReplies: data.faqRepliesSent,
      timerMessages: data.timerMessagesSent,
      templatesSent: data.templatesSent,
      sessionsCount: data.sessionsCount,
      last7Days,
      hourlyActivity: data.hourlyActivity,
      topTriggers,
      peakHour: peakHourLabel
    };
  },

  generateWeeklyChart(data, width = 300, height = 100) {
    const maxValue = Math.max(...data.map(d => d.messages), 1);
    const barWidth = (width - 60) / 7;
    const bars = data.map((d, i) => {
      const barHeight = (d.messages / maxValue) * (height - 30);
      const x = 30 + i * barWidth + barWidth * 0.1;
      const y = height - 20 - barHeight;
      return `
        <rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}"
              fill="#7c3aed" rx="2"/>
        <text x="${x + barWidth * 0.4}" y="${height - 5}"
              text-anchor="middle" font-size="10" fill="currentColor">${d.label}</text>
        <text x="${x + barWidth * 0.4}" y="${y - 5}"
              text-anchor="middle" font-size="9" fill="currentColor">${d.messages || ''}</text>
      `;
    }).join('');

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <line x1="30" y1="0" x2="30" y2="${height - 20}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
        <line x1="30" y1="${height - 20}" x2="${width}" y2="${height - 20}" stroke="currentColor" stroke-opacity="0.2" stroke-width="1"/>
        ${bars}
      </svg>
    `;
  },

  generateTypePieChart(data, size = 120) {
    const total = data.welcomesSent + data.faqReplies + data.timerMessages + data.templatesSent;
    if (total === 0) {
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="#e5e7eb"/>
          <text x="${size/2}" y="${size/2}" text-anchor="middle" dy="4" font-size="12" fill="#6b7280">No data</text>
        </svg>
      `;
    }

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    const segments = [
      { value: data.welcomesSent, color: '#10b981', label: 'Welcome' },
      { value: data.faqReplies, color: '#f59e0b', label: 'FAQ' },
      { value: data.timerMessages, color: '#7c3aed', label: 'Timer' },
      { value: data.templatesSent, color: '#3b82f6', label: 'Template' }
    ].filter(s => s.value > 0);

    let currentAngle = -90;
    const paths = segments.map(segment => {
      const angle = (segment.value / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);

      const largeArc = angle > 180 ? 1 : 0;
      currentAngle = endAngle;

      return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z"
                    fill="${segment.color}"/>`;
    }).join('');

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        ${paths}
      </svg>
    `;
  },

  async exportCSV() {
    const data = await this.load();
    const rows = [['Date', 'Messages', 'Welcomes', 'FAQs', 'Timers', 'Templates']];

    Object.entries(data.dailyStats)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, stats]) => {
        rows.push([
          date,
          stats.messages,
          stats.welcomes,
          stats.faqs,
          stats.timers,
          stats.templates || 0
        ]);
      });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `buzzchat-analytics-${this.getTodayKey()}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }
};

// Initialize analytics tab
// NOTE: Free users now get basic analytics (7-day history)
// Pro users get full analytics (90-day history + export)
async function initAnalytics() {
  const isPro = settings.tier === 'pro' || settings.tier === 'business';

  if (elements.analyticsLocked && elements.analyticsContent) {
    // Show analytics for all users - free users get limited view
    elements.analyticsLocked.style.display = 'none';
    elements.analyticsContent.style.display = 'block';
    await loadAnalyticsData();

    // Hide export button for free users (Pro feature)
    if (elements.exportAnalyticsBtn) {
      elements.exportAnalyticsBtn.style.display = isPro ? 'inline-flex' : 'none';
    }
  }
}

// Load giveaway entries from content script (using safe DOM methods)
async function loadGiveawayData() {
  try {
    const response = await new Promise((resolve) => {
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, { type: 'GET_GIVEAWAY_ENTRIES' })
            .then(resolve)
            .catch(() => resolve({ success: false }));
        } else {
          resolve({ success: false });
        }
      });
    });

    if (response?.success) {
      // Update entry count (safe - textContent)
      if (elements.giveawayEntryCount) {
        elements.giveawayEntryCount.textContent = response.totalEntries || 0;
      }

      // Update entries list using safe DOM methods (no innerHTML)
      if (elements.giveawayEntriesList) {
        // Clear existing content safely
        while (elements.giveawayEntriesList.firstChild) {
          elements.giveawayEntriesList.removeChild(elements.giveawayEntriesList.firstChild);
        }

        if (response.entries && response.entries.length > 0) {
          const sortedEntries = response.entries
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);

          // Build entries using safe DOM construction
          for (const entry of sortedEntries) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-item';

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'entry-username';
            usernameSpan.textContent = sanitizeUsername(entry.username);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'entry-time';
            timeSpan.textContent = formatTime(entry.timestamp);

            entryDiv.appendChild(usernameSpan);
            entryDiv.appendChild(timeSpan);
            elements.giveawayEntriesList.appendChild(entryDiv);
          }
        } else {
          const emptyMsg = document.createElement('p');
          emptyMsg.className = 'empty-entries';
          emptyMsg.textContent = 'No entries yet. Entries will appear here when viewers type your keywords.';
          elements.giveawayEntriesList.appendChild(emptyMsg);
        }
      }
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load giveaway data:', error);
  }
}

// Sanitize username to prevent injection (whitelist approach)
function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  // Allow alphanumeric, underscore, dash, spaces - max 50 chars
  return String(username)
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9_\- ]/g, '');
}

// Load chat metrics from content script
async function loadChatMetrics() {
  try {
    const response = await new Promise((resolve) => {
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, { type: 'GET_CHAT_METRICS' })
            .then(resolve)
            .catch(() => resolve({ success: false }));
        } else {
          resolve({ success: false });
        }
      });
    });

    if (response?.success && response.metrics) {
      updateMetricsDisplay(response.metrics);
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load chat metrics:', error);
  }
}

// Update metrics display
function updateMetricsDisplay(metrics) {
  if (elements.metricMessagesPerMin) {
    elements.metricMessagesPerMin.textContent = metrics.messagesPerMinute || 0;
  }
  if (elements.metricUniqueChatters) {
    elements.metricUniqueChatters.textContent = metrics.uniqueChatters || 0;
  }
  if (elements.metricPeakMsgs) {
    elements.metricPeakMsgs.textContent = metrics.peakMessagesPerMinute || 0;
  }
}

// Format timestamp for display
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Load and display analytics data
async function loadAnalyticsData() {
  try {
    const summary = await Analytics.getSummary();

    // Update stat cards
    if (elements.statTotalMessages) {
      elements.statTotalMessages.textContent = summary.totalMessages.toLocaleString();
    }
    if (elements.statTodayMessages) {
      elements.statTodayMessages.textContent = summary.todayMessages.toLocaleString();
    }
    if (elements.statPeakHour) {
      elements.statPeakHour.textContent = summary.totalMessages > 0 ? summary.peakHour : '--';
    }

    // Generate weekly chart
    if (elements.weeklyChart) {
      elements.weeklyChart.innerHTML = Analytics.generateWeeklyChart(summary.last7Days);
    }

    // Generate pie chart
    if (elements.typePieChart) {
      elements.typePieChart.innerHTML = Analytics.generateTypePieChart(summary);
    }

    // Update legend
    if (elements.legendWelcome) elements.legendWelcome.textContent = summary.welcomesSent;
    if (elements.legendFaq) elements.legendFaq.textContent = summary.faqReplies;
    if (elements.legendTimer) elements.legendTimer.textContent = summary.timerMessages;
    if (elements.legendTemplate) elements.legendTemplate.textContent = summary.templatesSent;

    // Update top FAQ triggers using safe DOM methods
    if (elements.faqTriggersList) {
      // Clear existing content safely
      while (elements.faqTriggersList.firstChild) {
        elements.faqTriggersList.removeChild(elements.faqTriggersList.firstChild);
      }

      if (summary.topTriggers.length > 0) {
        summary.topTriggers.forEach(t => {
          const item = document.createElement('div');
          item.className = 'trigger-item';

          const keywordSpan = document.createElement('span');
          keywordSpan.className = 'trigger-keyword';
          keywordSpan.textContent = t.trigger;

          const countSpan = document.createElement('span');
          countSpan.className = 'trigger-count';
          countSpan.textContent = t.count;

          item.appendChild(keywordSpan);
          item.appendChild(countSpan);
          elements.faqTriggersList.appendChild(item);
        });
      } else {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-triggers';
        emptyMsg.textContent = 'No FAQ triggers yet';
        elements.faqTriggersList.appendChild(emptyMsg);
      }
    }

    // Load impact summary for VIP users
    await loadImpactSummary();
  } catch (error) {
    console.error('[BuzzChat] Failed to load analytics data:', error);
  }
}

// Check and celebrate milestones
async function checkMilestones() {
  try {
    const newMilestones = await Analytics.checkMilestones();

    if (newMilestones.length > 0) {
      // Celebrate the first milestone (most important one)
      const milestone = newMilestones[0];

      // Show confetti!
      triggerConfetti();

      // Show celebratory toast
      Toast.success(`${milestone.title} ${milestone.message}`);

      // If multiple milestones, show a note
      if (newMilestones.length > 1) {
        setTimeout(() => {
          Toast.info(`+${newMilestones.length - 1} more milestone${newMilestones.length > 2 ? 's' : ''} unlocked!`);
        }, 3000);
      }
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to check milestones:', error);
  }
}

// Load emotionally rewarding impact summary for VIP users
async function loadImpactSummary() {
  const isPro = settings.tier === 'pro' || settings.tier === 'business';
  const impactSummary = document.getElementById('impactSummary');

  if (!impactSummary) return;

  // Only show impact summary for Pro/Business users
  if (!isPro) {
    impactSummary.style.display = 'none';
    return;
  }

  impactSummary.style.display = 'block';

  try {
    const impact = await Analytics.getImpactSummary();

    // Update impact values
    const impactViewers = document.getElementById('impactViewers');
    const impactTimeSaved = document.getElementById('impactTimeSaved');
    const impactTimeLabel = document.getElementById('impactTimeLabel');
    const impactQuestions = document.getElementById('impactQuestions');
    const impactGrowth = document.getElementById('impactGrowth');

    if (impactViewers) {
      impactViewers.textContent = impact.viewersEngaged.toLocaleString();
    }

    if (impactTimeSaved) {
      impactTimeSaved.textContent = impact.hoursSaved;
    }

    if (impactTimeLabel) {
      impactTimeLabel.textContent = `${impact.hoursSavedUnit} Saved`;
    }

    if (impactQuestions) {
      impactQuestions.textContent = impact.questionsAnswered.toLocaleString();
    }

    // Show growth indicator if we have comparison data
    if (impactGrowth && impact.growthPercent !== 0) {
      impactGrowth.style.display = 'inline';
      impactGrowth.className = `impact-growth ${impact.isGrowing ? 'positive' : 'negative'}`;
      impactGrowth.textContent = `${impact.isGrowing ? '+' : ''}${impact.growthPercent}% vs last month`;
    } else if (impactGrowth) {
      impactGrowth.style.display = 'none';
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load impact summary:', error);
  }
}

// Initialize referral UI
async function initReferral() {
  try {
    const data = await Referral.getData();

    // Display user's referral code
    if (elements.referralCode) {
      elements.referralCode.value = data.myCode;
    }

    // Display referral stats
    if (elements.referralCount) {
      elements.referralCount.textContent = data.referrals.length;
    }
    if (elements.referralBonus) {
      elements.referralBonus.textContent = data.bonusMessages;
    }

    // Show/hide redeem section based on whether user already redeemed
    if (data.redeemedCode) {
      if (elements.redeemCode) {
        elements.redeemCode.value = data.redeemedCode;
        elements.redeemCode.disabled = true;
      }
      if (elements.redeemCodeBtn) {
        elements.redeemCodeBtn.disabled = true;
        elements.redeemCodeBtn.textContent = 'Redeemed';
      }
      if (elements.referralRedeemedMsg) {
        elements.referralRedeemedMsg.style.display = 'block';
      }
    }

    // Set up event listeners
    if (elements.copyReferralBtn) {
      elements.copyReferralBtn.addEventListener('click', async () => {
        const code = elements.referralCode?.value;
        if (!code) return;

        try {
          await navigator.clipboard.writeText(code);
          elements.copyReferralBtn.textContent = 'Copied!';
          Toast.success('Referral code copied to clipboard');
          setTimeout(() => {
            elements.copyReferralBtn.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          // Fallback for older browsers
          elements.referralCode.select();
          document.execCommand('copy');
          elements.copyReferralBtn.textContent = 'Copied!';
          Toast.success('Referral code copied');
          setTimeout(() => {
            elements.copyReferralBtn.textContent = 'Copy';
          }, 2000);
        }
      });
    }

    if (elements.redeemCodeBtn) {
      elements.redeemCodeBtn.addEventListener('click', async () => {
        const code = elements.redeemCode?.value?.trim();
        if (!code) {
          Toast.warning('Please enter a referral code');
          return;
        }

        Loading.show(elements.redeemCodeBtn);
        const result = await Referral.redeemCode(code);
        Loading.hide(elements.redeemCodeBtn);

        if (result.success) {
          Toast.success(`Code redeemed! +${result.bonus} bonus messages added`);
          // Update UI
          elements.redeemCode.disabled = true;
          elements.redeemCodeBtn.disabled = true;
          elements.redeemCodeBtn.textContent = 'Redeemed';
          if (elements.referralRedeemedMsg) {
            elements.referralRedeemedMsg.style.display = 'block';
          }
          // Update bonus display
          const newData = await Referral.getData();
          if (elements.referralBonus) {
            elements.referralBonus.textContent = newData.bonusMessages;
          }
          // Update tier banner to reflect new bonus
          updateTierBanner();
        } else {
          Toast.error(result.error);
        }
      });
    }

  } catch (error) {
    console.error('[BuzzChat] Failed to initialize referral:', error);
  }
}

// ============================================
// BUSINESS TIER FEATURES
// ============================================

// Initialize Business tier features (account selector & API access)
async function initBusinessFeatures() {
  const isBusiness = settings.tier === 'business';

  // Account Selector
  if (elements.accountSelectorContainer) {
    if (isBusiness) {
      elements.accountSelectorContainer.style.display = 'flex';
      await refreshAccountSelector();
    } else {
      elements.accountSelectorContainer.style.display = 'none';
    }
  }

  // API Access Section
  if (elements.apiSection && elements.apiLocked) {
    if (isBusiness) {
      elements.apiSection.style.display = 'block';
      elements.apiLocked.style.display = 'none';
      await refreshApiKeysList();
    } else {
      elements.apiSection.style.display = 'none';
      elements.apiLocked.style.display = 'block';
    }
  }

  // Set up event listeners for Business features
  initBusinessEventListeners();
}

// Initialize Business tier event listeners
function initBusinessEventListeners() {
  // Account Selector events
  if (elements.accountSelect) {
    elements.accountSelect.addEventListener('change', async () => {
      const newAccountId = elements.accountSelect.value;
      try {
        await AccountManager.setActiveAccount(newAccountId);
        await loadSettings();
        initUI();
        Toast.success('Switched setup');
      } catch (error) {
        Toast.error('Failed to switch setup');
        console.error('[BuzzChat] Account switch error:', error);
      }
    });
  }

  if (elements.newAccountBtn) {
    elements.newAccountBtn.addEventListener('click', async () => {
      const name = prompt('Enter a name for the new setup:', 'My New Setup');
      if (!name) return;

      try {
        const account = await AccountManager.createAccount(name);
        await AccountManager.setActiveAccount(account.id);
        await loadSettings();
        initUI();
        Toast.success(`Created "${account.name}"`);
      } catch (error) {
        Toast.error(error.message || 'Failed to create setup');
        console.error('[BuzzChat] Account create error:', error);
      }
    });
  }

  if (elements.manageAccountsBtn) {
    elements.manageAccountsBtn.addEventListener('click', async () => {
      await refreshAccountsList();
      elements.accountManagerModal?.classList.add('active');
    });
  }

  if (elements.closeAccountManagerBtn) {
    elements.closeAccountManagerBtn.addEventListener('click', () => {
      elements.accountManagerModal?.classList.remove('active');
    });
  }

  if (elements.createAccountModalBtn) {
    elements.createAccountModalBtn.addEventListener('click', () => {
      if (elements.createAccountForm) {
        elements.createAccountForm.style.display = 'block';
        elements.createAccountModalBtn.style.display = 'none';
        elements.newAccountName?.focus();
      }
    });
  }

  if (elements.cancelCreateAccountBtn) {
    elements.cancelCreateAccountBtn.addEventListener('click', () => {
      if (elements.createAccountForm) {
        elements.createAccountForm.style.display = 'none';
        elements.createAccountModalBtn.style.display = 'block';
        if (elements.newAccountName) elements.newAccountName.value = '';
      }
    });
  }

  if (elements.confirmCreateAccountBtn) {
    elements.confirmCreateAccountBtn.addEventListener('click', async () => {
      const name = elements.newAccountName?.value?.trim();
      if (!name) {
        Toast.warning('Please enter a setup name');
        return;
      }

      try {
        Loading.show(elements.confirmCreateAccountBtn);
        const account = await AccountManager.createAccount(name);
        await refreshAccountsList();
        await refreshAccountSelector();

        elements.createAccountForm.style.display = 'none';
        elements.createAccountModalBtn.style.display = 'block';
        elements.newAccountName.value = '';

        Toast.success(`Created "${account.name}"`);
      } catch (error) {
        Toast.error(error.message || 'Failed to create setup');
      } finally {
        Loading.hide(elements.confirmCreateAccountBtn);
      }
    });
  }

  // API Key events
  if (elements.createApiKeyBtn) {
    elements.createApiKeyBtn.addEventListener('click', async () => {
      const name = prompt('Enter a name for this API key:', 'My API Key');
      if (!name) return;

      try {
        Loading.show(elements.createApiKeyBtn);
        const keyData = await ApiKeyManager.createKey(name);

        // Show the key to the user (only time they'll see it)
        if (elements.newApiKeyValue) {
          elements.newApiKeyValue.textContent = keyData.key;
        }
        if (elements.apiKeyCreated) {
          elements.apiKeyCreated.style.display = 'block';
        }

        await refreshApiKeysList();
        Toast.success('API key created');
      } catch (error) {
        Toast.error(error.message || 'Failed to create API key');
      } finally {
        Loading.hide(elements.createApiKeyBtn);
      }
    });
  }

  if (elements.copyNewApiKeyBtn) {
    elements.copyNewApiKeyBtn.addEventListener('click', async () => {
      const key = elements.newApiKeyValue?.textContent;
      if (!key) return;

      try {
        await navigator.clipboard.writeText(key);
        elements.copyNewApiKeyBtn.textContent = 'Copied!';
        Toast.success('API key copied to clipboard');
        setTimeout(() => {
          elements.copyNewApiKeyBtn.textContent = 'Copy';
        }, 2000);
      } catch (err) {
        Toast.error('Failed to copy to clipboard');
      }
    });
  }

  if (elements.closeApiKeyCreatedBtn) {
    elements.closeApiKeyCreatedBtn.addEventListener('click', () => {
      if (elements.apiKeyCreated) {
        elements.apiKeyCreated.style.display = 'none';
      }
      if (elements.newApiKeyValue) {
        elements.newApiKeyValue.textContent = '';
      }
    });
  }

  if (elements.unlockApiBtn) {
    elements.unlockApiBtn.addEventListener('click', () => {
      elements.upgradeModal?.classList.add('active');
    });
  }
}

// Refresh account selector dropdown
async function refreshAccountSelector() {
  if (!elements.accountSelect) return;

  const accountList = await AccountManager.getAccountList();

  // Clear existing options safely
  while (elements.accountSelect.firstChild) {
    elements.accountSelect.removeChild(elements.accountSelect.firstChild);
  }

  // Build options using safe DOM methods
  accountList.forEach(account => {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = account.name;
    if (account.isActive) {
      option.selected = true;
    }
    elements.accountSelect.appendChild(option);
  });
}

// Refresh accounts list in modal
async function refreshAccountsList() {
  if (!elements.accountsList) return;

  const accountList = await AccountManager.getAccountList();

  // Clear existing content safely
  while (elements.accountsList.firstChild) {
    elements.accountsList.removeChild(elements.accountsList.firstChild);
  }

  // Build account items using safe DOM methods
  accountList.forEach(account => {
    const item = document.createElement('div');
    item.className = `account-item ${account.isActive ? 'active' : ''}`;
    item.dataset.accountId = account.id;

    // Account info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'account-item-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'account-item-name';
    nameDiv.textContent = account.name;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'account-item-meta';
    metaDiv.textContent = `Created ${formatAccountDate(account.createdAt)}`;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(metaDiv);
    item.appendChild(infoDiv);

    // Active badge
    if (account.isActive) {
      const badge = document.createElement('span');
      badge.className = 'account-item-badge';
      badge.textContent = 'Active';
      item.appendChild(badge);
    }

    // Actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'account-item-actions';

    // Switch button (only for non-active accounts)
    if (!account.isActive) {
      const switchBtn = document.createElement('button');
      switchBtn.className = 'icon-btn switch-account-btn';
      switchBtn.title = 'Switch to this setup';
      switchBtn.dataset.id = account.id;
      switchBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
      actionsDiv.appendChild(switchBtn);
    }

    // Delete button (only for non-default accounts)
    if (account.id !== 'default') {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn danger delete-account-btn';
      deleteBtn.title = 'Delete setup';
      deleteBtn.dataset.id = account.id;
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
      actionsDiv.appendChild(deleteBtn);
    }

    item.appendChild(actionsDiv);
    elements.accountsList.appendChild(item);
  });

  // Attach event listeners
  elements.accountsList.querySelectorAll('.switch-account-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const accountId = btn.dataset.id;
      try {
        await AccountManager.setActiveAccount(accountId);
        await loadSettings();
        initUI();
        await refreshAccountsList();
        await refreshAccountSelector();
        Toast.success('Switched setup');
      } catch (error) {
        Toast.error('Failed to switch setup');
      }
    });
  });

  elements.accountsList.querySelectorAll('.delete-account-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const accountId = btn.dataset.id;
      if (!confirm('Delete this setup? All settings will be lost. This cannot be undone.')) return;

      try {
        await AccountManager.deleteAccount(accountId);
        await loadSettings();
        initUI();
        await refreshAccountsList();
        await refreshAccountSelector();
        Toast.success('Setup deleted');
      } catch (error) {
        Toast.error(error.message || 'Failed to delete setup');
      }
    });
  });
}

// Refresh API keys list
async function refreshApiKeysList() {
  if (!elements.apiKeysList) return;

  const keyList = await ApiKeyManager.getKeyList();

  // Clear existing content safely
  while (elements.apiKeysList.firstChild) {
    elements.apiKeysList.removeChild(elements.apiKeysList.firstChild);
  }

  if (keyList.length === 0) {
    if (elements.emptyKeysMessage) {
      elements.emptyKeysMessage.style.display = 'block';
    }
    return;
  }

  if (elements.emptyKeysMessage) {
    elements.emptyKeysMessage.style.display = 'none';
  }

  // Build API key items using safe DOM methods
  keyList.forEach(key => {
    const item = document.createElement('div');
    item.className = 'api-key-item';
    item.dataset.keyId = key.id;

    // Key info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'api-key-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'api-key-name';
    nameDiv.textContent = key.name;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'api-key-preview';
    previewDiv.textContent = key.keyPreview;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'api-key-meta';
    metaDiv.textContent = `Last used: ${ApiKeyManager.formatLastUsed(key.lastUsed)}`;

    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(previewDiv);
    infoDiv.appendChild(metaDiv);
    item.appendChild(infoDiv);

    // Actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'api-key-actions';

    const revokeBtn = document.createElement('button');
    revokeBtn.className = 'btn btn-danger btn-sm revoke-key-btn';
    revokeBtn.dataset.id = key.id;
    revokeBtn.textContent = 'Revoke';

    actionsDiv.appendChild(revokeBtn);
    item.appendChild(actionsDiv);

    elements.apiKeysList.appendChild(item);
  });

  // Attach event listeners
  elements.apiKeysList.querySelectorAll('.revoke-key-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const keyId = btn.dataset.id;
      if (!confirm('Revoke this API key? Any applications using it will stop working.')) return;

      try {
        Loading.show(btn);
        await ApiKeyManager.revokeKey(keyId);
        await refreshApiKeysList();
        Toast.success('API key revoked');
      } catch (error) {
        Toast.error(error.message || 'Failed to revoke API key');
      } finally {
        Loading.hide(btn);
      }
    });
  });
}

// Format account creation date
function formatAccountDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 86400000) return 'today';
  if (diff < 172800000) return 'yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

  return date.toLocaleDateString();
}
