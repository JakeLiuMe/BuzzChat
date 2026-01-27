// BuzzChat - Content Script
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.
// Handles all chat automation on live selling platforms

(function() {
  'use strict';

  // Browser API compatibility - works on both Chrome and Firefox
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  // Use security module if available
  const Security = typeof BuzzChatSecurity !== 'undefined' ? BuzzChatSecurity : null;
  const Logger = Security ? Security.Logger : console;

  // Verify security module integrity on load
  if (Security && !Security.isIntact()) {
    console.error('[BuzzChat] Security integrity check failed');
  }

  // Global error handler for uncaught errors
  window.addEventListener('error', function(event) {
    if (Security) {
      Security.wrapError(event.error || new Error(event.message), 'global');
    }
  });

  // Promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    if (Security) {
      Security.wrapError(event.reason || new Error('Unhandled rejection'), 'promise');
    }
  });

  // Configuration constants
  const CONFIG = {
    MAX_MESSAGES_PER_MINUTE: 10,
    MESSAGE_COOLDOWN_MS: 6000, // 6 seconds between messages
    MAX_MESSAGE_LENGTH: 500,
    MAX_WELCOMED_USERS: 500,
    MAX_PROCESSED_MESSAGES: 1000,
    MAX_USERNAME_LENGTH: 50,
    SEND_DELAY_MS: 100,
    MAX_USER_HISTORY: 500,        // Max unique users to track message history
    MAX_GIVEAWAY_ENTRIES: 5000,   // Max giveaway entries to track
    MAX_UNIQUE_CHATTERS: 10000    // Max unique chatters per session
  };

  // LRU Cache class for efficient memory management
  class LRUSet {
    constructor(maxSize) {
      this.maxSize = maxSize;
      this.cache = new Map();
    }

    add(key) {
      // If key exists, delete it first to update its position
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      // Add to end (most recently used)
      this.cache.set(key, true);
      // Evict oldest if over capacity
      if (this.cache.size > this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    has(key) {
      return this.cache.has(key);
    }

    get size() {
      return this.cache.size;
    }

    clear() {
      this.cache.clear();
    }
  }

  // LRU Map class for key-value pairs with size limit
  class LRUMap {
    constructor(maxSize) {
      this.maxSize = maxSize;
      this.cache = new Map();
    }

    set(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      this.cache.set(key, value);
      if (this.cache.size > this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    get(key) {
      if (!this.cache.has(key)) return undefined;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    has(key) {
      return this.cache.has(key);
    }

    delete(key) {
      return this.cache.delete(key);
    }

    get size() {
      return this.cache.size;
    }

    clear() {
      this.cache.clear();
    }

    keys() {
      return this.cache.keys();
    }

    values() {
      return this.cache.values();
    }

    entries() {
      return this.cache.entries();
    }
  }

  // Rate limiting configuration (legacy alias)
  const RATE_LIMIT = {
    MAX_MESSAGES_PER_MINUTE: CONFIG.MAX_MESSAGES_PER_MINUTE,
    MESSAGE_COOLDOWN_MS: CONFIG.MESSAGE_COOLDOWN_MS,
    MAX_MESSAGE_LENGTH: CONFIG.MAX_MESSAGE_LENGTH
  };

  // Utility: Debounce function for performance optimization
  function debounce(fn, delay) {
    let timeoutId = null;
    return function(...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Utility: Validate CSS selector to prevent injection attacks
  function isValidCSSSelector(selector) {
    if (!selector || typeof selector !== 'string') return false;
    // Limit selector length to prevent DoS
    if (selector.length > 200) return false;
    // Block potentially dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /expression\(/i,
      /url\s*\(/i,
      /<script/i,
      /on\w+\s*=/i,
      /behavior\s*:/i,
      /-moz-binding/i
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) return false;
    }
    // Try to validate by parsing
    try {
      document.createDocumentFragment().querySelector(selector);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Batched storage writer to reduce storage operations
  // Uses sync storage for settings (cross-device sync)
  const StorageWriter = {
    pendingWrites: {},
    writeScheduled: false,
    BATCH_DELAY_MS: 1000, // Batch writes over 1 second

    // Queue a storage write
    queue(key, value) {
      this.pendingWrites[key] = value;

      if (!this.writeScheduled) {
        this.writeScheduled = true;
        setTimeout(() => this.flush(), this.BATCH_DELAY_MS);
      }
    },

    // Flush all pending writes
    flush() {
      this.writeScheduled = false;
      const writes = { ...this.pendingWrites };
      this.pendingWrites = {};

      if (Object.keys(writes).length > 0) {
        // Use sync storage for settings (cross-device sync)
        browserAPI.storage.sync.set(writes, () => {
          if (browserAPI.runtime.lastError) {
            console.error('[BuzzChat] Storage write error:', browserAPI.runtime.lastError);
          }
        });
      }
    },

    // Immediate write (for critical data)
    writeNow(key, value) {
      browserAPI.storage.sync.set({ [key]: value });
    }
  };

  // Bot state
  const state = {
    settings: null,
    isLiveStream: false,
    chatInput: null,
    chatContainer: null,
    sendButton: null,
    welcomedUsers: new LRUSet(CONFIG.MAX_WELCOMED_USERS),
    processedMessages: new LRUSet(CONFIG.MAX_PROCESSED_MESSAGES),
    timerIntervals: [],
    observer: null,
    initialized: false,
    isStartingTimers: false, // Guard flag for timer duplication
    selectors: null, // Will be loaded from SelectorManager
    sessionStartTime: Date.now(), // For {uptime} variable calculation
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
    },
    // Chat history for export
    chatHistory: [],
    // Bid alerts tracking
    recentBids: [],
    // Viewer engagement tracking
    viewers: new LRUMap(500) // username -> { messageCount, firstSeen, lastSeen }
  };

  // Fallback selectors if SelectorManager is not available
  const FALLBACK_SELECTORS = {
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
  const selectorCache = {
    chatInput: null,
    chatContainer: null,
    sendButton: null,
    messageItem: null,
    username: null,
    messageText: null,
    liveIndicator: null
  };

  // Get current selectors (from SelectorManager or fallback)
  function getSelectors() {
    return state.selectors || FALLBACK_SELECTORS;
  }

  // Clear selector cache (useful when page structure changes)
  function clearSelectorCache() {
    for (const key in selectorCache) {
      selectorCache[key] = null;
    }
  }

  // Message variable replacement
  // Replaces dynamic variables like {username}, {time}, {date}, {viewers} in messages
  function replaceVariables(text, context = {}) {
    if (!text || typeof text !== 'string') return text;

    // Safe string replacement - no regex to avoid injection
    let result = text;

    // {username} - triggering user (most common)
    if (context.username) {
      result = result.split('{username}').join(context.username);
    }

    // {count} - command/rule usage count
    if (typeof context.count === 'number') {
      result = result.split('{count}').join(String(context.count));
    }

    // {time} - current time (e.g., "3:45 PM")
    const now = new Date();
    result = result.split('{time}').join(now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }));

    // {date} - current date (e.g., "Jan 27, 2026")
    result = result.split('{date}').join(now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }));

    // {uptime} - stream duration (if available)
    if (context.uptime) {
      result = result.split('{uptime}').join(context.uptime);
    } else {
      // Calculate uptime from session start
      const uptimeMs = Date.now() - (state.sessionStartTime || Date.now());
      const hours = Math.floor(uptimeMs / 3600000);
      const minutes = Math.floor((uptimeMs % 3600000) / 60000);
      const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      result = result.split('{uptime}').join(uptimeStr);
    }

    // {platform} - current platform
    const platform = detectPlatform();
    result = result.split('{platform}').join(platform || 'Live');

    // {viewers} - current viewer count (from chat metrics)
    const viewerCount = state.chatMetrics?.uniqueChattersThisSession?.size || 0;
    result = result.split('{viewers}').join(String(viewerCount));

    return result;
  }

  // Detect current platform from URL
  function detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('whatnot.com')) return 'Whatnot';
    if (hostname.includes('tiktok.com')) return 'TikTok';
    if (hostname.includes('facebook.com')) return 'Facebook';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('youtube.com')) return 'YouTube';
    return null;
  }

  // SECURITY: Safe analytics tracking wrapper
  // Only uses Analytics if it's from trusted extension context
  function safeTrackAnalytics(type, metadata = {}) {
    // Verify Analytics module is from extension (has verification marker)
    if (typeof Analytics !== 'undefined' &&
        typeof Analytics.trackMessage === 'function' &&
        Analytics.__BUZZCHAT_VERIFIED === true) {
      try {
        // Sanitize type and metadata before passing
        const safeType = String(type).slice(0, 50);
        const safeMetadata = {};
        if (metadata && typeof metadata === 'object') {
          for (const [key, value] of Object.entries(metadata)) {
            if (typeof key === 'string' && key.length < 50) {
              safeMetadata[key] = typeof value === 'string' ? value.slice(0, 200) : value;
            }
          }
        }
        Analytics.trackMessage(safeType, safeMetadata);
      } catch (e) {
        console.warn('[BuzzChat] Analytics tracking failed:', e);
      }
    }
  }

  // Initialize the bot
  async function init() {
    if (state.initialized) return;

    console.log('[BuzzChat] Initializing...');

    // SECURITY: Load selectors only from trusted extension-defined SelectorManager
    // Verify SelectorManager has expected structure before using
    if (typeof SelectorManager !== 'undefined' &&
        typeof SelectorManager.getSelectors === 'function' &&
        typeof SelectorManager.getVersion === 'function' &&
        SelectorManager.__BUZZCHAT_VERIFIED === true) {
      try {
        const loadedSelectors = await SelectorManager.getSelectors();
        // Validate selector structure before using
        if (isValidSelectorObject(loadedSelectors)) {
          state.selectors = loadedSelectors;
          const version = await SelectorManager.getVersion();
          console.log('[BuzzChat] Loaded selectors v' + version);
        } else {
          console.warn('[BuzzChat] Invalid selector format, using fallback');
          state.selectors = FALLBACK_SELECTORS;
        }
      } catch (e) {
        console.warn('[BuzzChat] Failed to load remote selectors, using fallback');
        state.selectors = FALLBACK_SELECTORS;
      }
    } else {
      state.selectors = FALLBACK_SELECTORS;
    }

    // Validate selector object structure
    function isValidSelectorObject(obj) {
      if (!obj || typeof obj !== 'object') return false;
      const requiredKeys = ['chatInput', 'chatContainer', 'sendButton'];
      for (const key of requiredKeys) {
        if (!Array.isArray(obj[key])) return false;
        // Ensure all selectors are strings
        if (!obj[key].every(s => typeof s === 'string' && s.length < 500)) return false;
      }
      return true;
    }

    // Load settings
    await loadSettings();

    // Check if we're on a live stream page
    detectLiveStream();

    // Setup message listener for popup communication
    browserAPI.runtime.onMessage.addListener(handleMessage);

    // Start observing the page for changes
    startPageObserver();

    // Setup quick reply hotkeys (Ctrl+1-9)
    setupQuickReplyHotkeys();

    state.initialized = true;
    console.log('[BuzzChat] Initialized successfully');
  }

  // Load settings from storage (sync storage for cross-device sync)
  async function loadSettings() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        state.settings = result.whatnotBotSettings || getDefaultSettings();
        resolve();
      });
    });
  }

  // Get default settings
  function getDefaultSettings() {
    return {
      tier: 'free',
      messagesUsed: 0,
      messagesLimit: 50, // Free tier default (overridden by stored settings)
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
      }
    };
  }

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

  // Find element using multiple selectors with caching
  function findElement(selectorList, cacheKey = null) {
    // If we have a cached working selector, try it first
    if (cacheKey && selectorCache[cacheKey]) {
      try {
        const element = document.querySelector(selectorCache[cacheKey]);
        if (element) return element;
        // Cached selector no longer works, clear it
        selectorCache[cacheKey] = null;
      } catch (e) {
        selectorCache[cacheKey] = null;
      }
    }

    // Try each selector in the list
    for (const selector of selectorList) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          // Cache this working selector for future use
          if (cacheKey) {
            selectorCache[cacheKey] = selector;
          }
          return element;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    return null;
  }

  // Detect if we're on a live stream page
  function detectLiveStream() {
    const selectors = getSelectors();

    // Try to find chat elements (with caching)
    state.chatInput = findElement(selectors.chatInput, 'chatInput');
    state.chatContainer = findElement(selectors.chatContainer, 'chatContainer');
    state.sendButton = findElement(selectors.sendButton, 'sendButton');

    // Check for live indicator
    const liveIndicator = findElement(selectors.liveIndicator, 'liveIndicator');

    // Determine if this is a live stream
    state.isLiveStream = !!(state.chatInput || state.chatContainer || liveIndicator);

    if (state.isLiveStream) {
      console.log('[BuzzChat] Live stream detected');
      showStatusIndicator(true);

      if (state.settings?.masterEnabled) {
        startBot();
      }
    } else {
      console.log('[BuzzChat] Not a live stream page');
      showStatusIndicator(false);
    }
  }

  // Start the bot
  function startBot() {
    if (!state.isLiveStream || !state.settings?.masterEnabled) return;

    console.log('[BuzzChat] Starting bot...');

    // Start chat observer for welcome messages and FAQ
    startChatObserver();

    // Start timer messages
    startTimerMessages();

    // Show quick reply bar
    showQuickReplyBar();

    showNotification('BuzzChat is now active!');
  }

  // Stop the bot
  function stopBot() {
    console.log('[BuzzChat] Stopping bot...');

    // Clear timer intervals
    state.timerIntervals.forEach(clearInterval);
    state.timerIntervals = [];

    // Disconnect chat observer
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    // Remove quick reply bar
    removeQuickReplyBar();

    showNotification('BuzzChat stopped');
  }

  // Start observing the page for dynamic content
  function startPageObserver() {
    // Debounced detection to prevent CPU spikes from rapid DOM changes
    const debouncedDetect = debounce(() => {
      if (!state.chatInput || !state.chatContainer) {
        detectLiveStream();
      }
    }, 250); // 250ms debounce

    const pageObserver = new MutationObserver((mutations) => {
      // Only trigger detection for relevant mutations (added nodes)
      const hasRelevantMutation = mutations.some(mutation =>
        mutation.addedNodes.length > 0
      );

      if (hasRelevantMutation) {
        debouncedDetect();
      }
    });

    pageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Start observing chat for new messages
  function startChatObserver() {
    const selectors = getSelectors();

    if (!state.chatContainer) {
      // Try to find it again (with caching)
      state.chatContainer = findElement(selectors.chatContainer, 'chatContainer');
      if (!state.chatContainer) {
        console.warn('[BuzzChat] Chat container not found');
        return;
      }
    }

    // Disconnect existing observer
    if (state.observer) {
      state.observer.disconnect();
    }

    // Message processing queue for batching
    let pendingMessages = [];
    let processingScheduled = false;

    const processBatch = () => {
      processingScheduled = false;
      const messagesToProcess = pendingMessages.splice(0, pendingMessages.length);

      for (const node of messagesToProcess) {
        try {
          processNewMessage(node);
        } catch (error) {
          console.error('[BuzzChat] Error processing message:', error);
        }
      }
    };

    state.observer = new MutationObserver((mutations) => {
      // Collect all added element nodes
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingMessages.push(node);
          }
        }
      }

      // Schedule batch processing if not already scheduled
      if (pendingMessages.length > 0 && !processingScheduled) {
        processingScheduled = true;
        // Use requestAnimationFrame for smooth batching
        requestAnimationFrame(processBatch);
      }
    });

    state.observer.observe(state.chatContainer, {
      childList: true,
      subtree: true
    });

    console.log('[BuzzChat] Chat observer started');
  }

  // Process a new chat message
  function processNewMessage(element) {
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

    // Store message in chat history for export
    storeChatMessage(username, messageText);

    // Track viewer engagement
    trackViewer(username);

    // Update chat engagement metrics
    updateChatMetrics(username);

    // Check for keyword alerts
    checkKeywordAlerts(messageText, username);

    // Check for bid alerts
    checkBidAlerts(messageText, username);

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
  }

  // Check and respond to custom commands
  function checkCustomCommand(messageText, username) {
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

    // Update usage count before variable replacement
    command.usageCount = (command.usageCount || 0) + 1;

    // Replace variables with context (includes {username}, {count}, {time}, etc.)
    const response = replaceVariables(command.response, {
      username,
      count: command.usageCount
    });

    sendChatMessage(response);

    // Track analytics
    safeTrackAnalytics('command', { trigger: commandTrigger });

    // Persist updated usage count to storage
    StorageWriter.queue('whatnotBotSettings', state.settings);

    // Notify popup of command usage update (popup may not be open)
    browserAPI.runtime.sendMessage({
      type: 'COMMAND_USED',
      trigger: commandTrigger,
      usageCount: command.usageCount
    }).catch(err => {
      // Expected to fail if popup is not open - only warn if unexpected error
      if (err?.message && !err.message.includes('Receiving end does not exist')) {
        console.warn('[BuzzChat] Command notification failed:', err.message);
      }
    });

    console.log(`[BuzzChat] Command !${commandTrigger} executed for ${username}`);
    return true;
  }

  // Check if message should be blocked (moderation)
  function isMessageBlocked(messageText, username) {
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

  // Check if message is a giveaway entry
  function checkGiveawayEntry(messageText, username) {
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
  function updateChatMetrics(username) {
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

  // Send welcome message
  function sendWelcomeMessage(username) {
    if (!canSendMessage()) return;

    // Mark user as welcomed BEFORE queuing to prevent duplicate sends during delay
    // This is intentional - we want to prevent race conditions where multiple
    // messages from the same user trigger multiple welcome messages
    state.welcomedUsers.add(username);
    // LRUSet automatically handles size limits - no manual cleanup needed

    const message = replaceVariables(state.settings.welcome.message, { username });

    // Add delay to avoid spam
    setTimeout(() => {
      sendChatMessage(message);
      // Track analytics
      safeTrackAnalytics('welcome');
    }, (state.settings.welcome.delay || 5) * 1000);

    console.log(`[BuzzChat] Queued welcome message for ${username}`);
  }

  // Check FAQ triggers
  function checkFaqTriggers(messageText, username) {
    const rules = state.settings?.faq?.rules || [];

    for (const rule of rules) {
      // Validate rule object structure
      if (!rule || typeof rule !== 'object') continue;
      if (!Array.isArray(rule.triggers) || rule.triggers.length === 0) continue;
      if (typeof rule.reply !== 'string' || !rule.reply.trim()) continue;

      const textToCheck = rule.caseSensitive ? messageText : messageText.toLowerCase();

      for (const trigger of rule.triggers) {
        const triggerToCheck = rule.caseSensitive ? trigger : trigger.toLowerCase();

        if (textToCheck.includes(triggerToCheck)) {
          console.log(`[BuzzChat] FAQ trigger matched: ${trigger}`);

          if (canSendMessage()) {
            // Track usage count for {count} variable
            rule.usageCount = (rule.usageCount || 0) + 1;
            // Replace variables with context
            const reply = replaceVariables(rule.reply, {
              username,
              count: rule.usageCount
            });
            sendChatMessage(reply);
            // Track analytics with trigger keyword
            safeTrackAnalytics('faq', { trigger: trigger.toLowerCase() });
            // Persist updated usage count to storage
            StorageWriter.queue('whatnotBotSettings', state.settings);
          }

          return; // Only send one reply per message
        }
      }
    }
  }

  // Start timer messages
  function startTimerMessages() {
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
          // Replace variables (timer messages support {time}, {date}, {uptime}, {platform}, {viewers})
          const processedText = replaceVariables(msg.text, {});
          sendChatMessage(processedText);
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

  // Check rate limiting
  function checkRateLimit() {
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
  function recordMessageSent() {
    const now = Date.now();
    state.messageTimestamps.push(now);
    state.lastMessageTime = now;
  }

  // Check if we can send a message (tier limits + rate limits)
  function canSendMessage() {
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

  // Send a chat message
  function sendChatMessage(message) {
    if (!message) return false;

    // Validate and truncate message length
    let sanitizedMessage = message.trim();

    // Add watermark if enabled (free tier viral growth feature)
    if (state.settings?.settings?.watermark && state.settings.tier === 'free') {
      const watermark = ' - BuzzChat';
      const maxLengthWithWatermark = RATE_LIMIT.MAX_MESSAGE_LENGTH - watermark.length;
      if (sanitizedMessage.length > maxLengthWithWatermark) {
        sanitizedMessage = sanitizedMessage.substring(0, maxLengthWithWatermark);
      }
      sanitizedMessage += watermark;
    } else if (sanitizedMessage.length > RATE_LIMIT.MAX_MESSAGE_LENGTH) {
      console.warn(`[BuzzChat] Message truncated from ${sanitizedMessage.length} to ${RATE_LIMIT.MAX_MESSAGE_LENGTH} chars`);
      sanitizedMessage = sanitizedMessage.substring(0, RATE_LIMIT.MAX_MESSAGE_LENGTH);
    }

    if (!sanitizedMessage) return false;

    const selectors = getSelectors();

    // Try to find chat input if not already found (with caching)
    if (!state.chatInput) {
      state.chatInput = findElement(selectors.chatInput, 'chatInput');
      const customSelector = state.settings?.settings?.chatSelector;
      if (customSelector && isValidCSSSelector(customSelector)) {
        try {
          state.chatInput = document.querySelector(customSelector) || state.chatInput;
        } catch (e) {
          console.warn('[BuzzChat] Custom selector failed:', e.message);
        }
      }
    }

    if (!state.chatInput) {
      console.error('[BuzzChat] Chat input not found');
      return false;
    }

    // Set the message value
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(state.chatInput, sanitizedMessage);
    } else {
      state.chatInput.value = sanitizedMessage;
    }

    // Record message for rate limiting
    recordMessageSent();

    // Update message count BEFORE sending (prevents race condition)
    if (state.settings.tier === 'free') {
      state.settings.messagesUsed++;
      // Use batched storage writer to reduce I/O
      StorageWriter.queue('whatnotBotSettings', state.settings);
      browserAPI.runtime.sendMessage({ type: 'MESSAGE_SENT' });
    }

    // Dispatch input event
    state.chatInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Try to send the message
    setTimeout(() => {
      // Try clicking send button (with caching)
      state.sendButton = findElement(selectors.sendButton, 'sendButton');
      if (state.sendButton) {
        state.sendButton.click();
      } else {
        // Try Enter key
        state.chatInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));

        state.chatInput.dispatchEvent(new KeyboardEvent('keypress', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));

        state.chatInput.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }

      console.log(`[BuzzChat] Message sent: ${sanitizedMessage.substring(0, 50)}...`);
    }, CONFIG.SEND_DELAY_MS);

    return true;
  }

  // Validate message schema
  function isValidMessage(message) {
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
      'SEND_QUICK_REPLY',
      // 10/10 features
      'GET_RECENT_BIDS',
      'RESET_BIDS',
      'GET_TOP_VIEWERS',
      'RESET_VIEWERS',
      'GET_CHAT_HISTORY',
      'EXPORT_CHAT_CSV',
      'CLEAR_CHAT_HISTORY'
    ];
    return allowedTypes.includes(message.type);
  }

  // Validate settings object structure
  function validateSettingsObject(settings) {
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
      } : { chatSelector: '', soundNotifications: true, showMessageCount: true, darkMode: false, watermark: false },
      // 10/10 Features settings
      quickReplies: Array.isArray(settings.quickReplies)
        ? settings.quickReplies.slice(0, 9).map(r => typeof r === 'string' ? r.slice(0, 200) : '')
        : [],
      keywordAlerts: settings.keywordAlerts ? {
        enabled: Boolean(settings.keywordAlerts.enabled),
        keywords: Array.isArray(settings.keywordAlerts.keywords)
          ? settings.keywordAlerts.keywords.slice(0, 20).map(k => typeof k === 'string' ? k.slice(0, 50) : '')
          : [],
        soundEnabled: Boolean(settings.keywordAlerts.soundEnabled)
      } : { enabled: false, keywords: [], soundEnabled: true },
      bidAlerts: settings.bidAlerts ? {
        enabled: Boolean(settings.bidAlerts.enabled),
        soundEnabled: Boolean(settings.bidAlerts.soundEnabled),
        minAmount: typeof settings.bidAlerts.minAmount === 'number' ? Math.max(0, settings.bidAlerts.minAmount) : 0
      } : { enabled: false, soundEnabled: true, minAmount: 0 }
    };
  }

  // Handle messages from popup (with security validation)
  function handleMessage(message, sender, sendResponse) {
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

      // 10/10 Features: Bid Alerts
      case 'GET_RECENT_BIDS':
        sendResponse({
          success: true,
          bids: state.recentBids.slice(-20), // Last 20 bids
          totalBids: state.recentBids.length
        });
        break;

      case 'RESET_BIDS':
        state.recentBids = [];
        console.log('[BuzzChat] Bids reset');
        sendResponse({ success: true });
        break;

      // 10/10 Features: Viewer Tracking
      case 'GET_TOP_VIEWERS': {
        const limit = typeof message.limit === 'number' ? Math.min(message.limit, 50) : 10;
        sendResponse({
          success: true,
          viewers: getTopViewers(limit),
          totalViewers: state.viewers.size
        });
        break;
      }

      case 'RESET_VIEWERS':
        state.viewers.clear();
        console.log('[BuzzChat] Viewer tracking reset');
        sendResponse({ success: true });
        break;

      // 10/10 Features: Chat Export
      case 'GET_CHAT_HISTORY': {
        const historyLimit = typeof message.limit === 'number' ? Math.min(message.limit, 500) : 100;
        sendResponse({
          success: true,
          messages: state.chatHistory.slice(-historyLimit),
          totalMessages: state.chatHistory.length
        });
        break;
      }

      case 'EXPORT_CHAT_CSV': {
        const csvData = exportChatCSV();
        sendResponse({
          success: csvData !== null,
          csv: csvData,
          messageCount: state.chatHistory.length
        });
        break;
      }

      case 'CLEAR_CHAT_HISTORY':
        state.chatHistory = [];
        console.log('[BuzzChat] Chat history cleared');
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true;
  }

  // Show status indicator on page (safe DOM construction - no innerHTML)
  function showStatusIndicator(isActive) {
    let indicator = document.getElementById('buzzchat-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'buzzchat-indicator';
      document.body.appendChild(indicator);
    }

    // Clear existing content safely
    while (indicator.firstChild) {
      indicator.removeChild(indicator.firstChild);
    }

    // Create inner container using safe DOM methods
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 8px 16px;
      background: ${isActive ? '#7c3aed' : '#6b7280'};
      color: white;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s;
    `;

    // Create status dot
    const statusDot = document.createElement('span');
    statusDot.style.cssText = `
      width: 8px;
      height: 8px;
      background: ${state.settings?.masterEnabled ? '#10b981' : '#ef4444'};
      border-radius: 50%;
    `;

    // Create text node (safe - no HTML parsing)
    const statusText = document.createTextNode(
      'BuzzChat ' + (state.settings?.masterEnabled ? 'Active' : 'Inactive')
    );

    container.appendChild(statusDot);
    container.appendChild(statusText);
    indicator.appendChild(container);

    container.addEventListener('click', () => {
      console.log('[BuzzChat] Click the extension icon to open settings');
    });
  }

  // Show notification
  function showNotification(message) {
    if (!state.settings?.settings?.soundNotifications) return;

    // Create toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #1f2937;
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 10001;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    // Add animation keyframes
    if (!document.getElementById('buzzchat-animations')) {
      const style = document.createElement('style');
      style.id = 'buzzchat-animations';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ===============================================
  // 10/10 FEATURES: Quick Reply Hotkeys
  // ===============================================

  // Global hotkey listener for quick replies (Ctrl+1-9)
  function setupQuickReplyHotkeys() {
    document.addEventListener('keydown', (e) => {
      // Only process if bot is enabled and on live stream
      if (!state.settings?.masterEnabled || !state.isLiveStream) return;

      // Check for Ctrl+1 through Ctrl+9
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        const replies = state.settings.quickReplies || [];

        if (replies[index]) {
          e.preventDefault();
          if (canSendMessage()) {
            sendChatMessage(replies[index]);
            safeTrackAnalytics('quickReplyHotkey', { key: e.key });
            showNotification(`Quick reply sent: ${replies[index].substring(0, 30)}...`);
          }
        }
      }
    });

    console.log('[BuzzChat] Quick reply hotkeys initialized (Ctrl+1-9)');
  }

  // ===============================================
  // 10/10 FEATURES: Keyword Mention Alerts
  // ===============================================

  // Check message for keyword alerts
  function checkKeywordAlerts(messageText, username) {
    const alertSettings = state.settings?.keywordAlerts;
    if (!alertSettings?.enabled) return;

    const keywords = alertSettings.keywords || [];
    if (keywords.length === 0) return;

    const lowerMessage = messageText.toLowerCase();

    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        showKeywordAlert(username, messageText, keyword);
        break; // Only one alert per message
      }
    }
  }

  // Display keyword alert notification
  function showKeywordAlert(username, message, keyword) {
    const alertSettings = state.settings?.keywordAlerts;

    // Create alert notification
    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;

    const title = document.createElement('div');
    title.style.cssText = 'font-weight: 600; margin-bottom: 4px;';
    title.textContent = `"${keyword}" mentioned`;

    const content = document.createElement('div');
    content.style.cssText = 'font-size: 12px; opacity: 0.9;';
    content.textContent = `${username}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;

    alert.appendChild(title);
    alert.appendChild(content);
    document.body.appendChild(alert);

    // Optional sound
    if (alertSettings?.soundEnabled) {
      playNotificationSound();
    }

    // Notify popup
    browserAPI.runtime.sendMessage({
      type: 'KEYWORD_ALERT',
      username,
      keyword,
      message: message.substring(0, 200)
    }).catch(() => {});

    // Remove after 5 seconds
    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  }

  // Play notification sound
  function playNotificationSound() {
    try {
      // Use Web Audio API for a simple beep
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  // ===============================================
  // 10/10 FEATURES: Bid Alerts
  // ===============================================

  // Bid detection patterns
  const BID_PATTERNS = [
    /\$(\d+(?:\.\d{2})?)/,        // $45 or $45.00
    /bid\s*\$?(\d+)/i,            // bid 45, bid $45
    /(\d+)\s*dollars?/i           // 45 dollars
  ];

  // Detect bid in message
  function detectBid(message) {
    for (const pattern of BID_PATTERNS) {
      const match = message.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  // Check message for bids
  function checkBidAlerts(messageText, username) {
    const bidSettings = state.settings?.bidAlerts;
    if (!bidSettings?.enabled) return;

    const bidAmount = detectBid(messageText);
    if (bidAmount === null) return;

    const minAmount = bidSettings.minAmount || 0;
    if (bidAmount < minAmount) return;

    // Record bid
    const bid = {
      username,
      amount: bidAmount,
      message: messageText.substring(0, 100),
      timestamp: Date.now()
    };

    state.recentBids.push(bid);

    // Keep last 50 bids
    if (state.recentBids.length > 50) {
      state.recentBids.shift();
    }

    // Show alert
    showBidAlert(bid);

    // Notify popup
    browserAPI.runtime.sendMessage({
      type: 'BID_ALERT',
      bid,
      totalBids: state.recentBids.length
    }).catch(() => {});
  }

  // Display bid alert notification
  function showBidAlert(bid) {
    const bidSettings = state.settings?.bidAlerts;

    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      top: 140px;
      right: 20px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      animation: slideIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    content.textContent = `💰 ${bid.username} bid $${bid.amount.toFixed(2)}`;

    alert.appendChild(content);
    document.body.appendChild(alert);

    // Optional sound
    if (bidSettings?.soundEnabled) {
      playNotificationSound();
    }

    // Remove after 4 seconds
    setTimeout(() => {
      alert.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => alert.remove(), 300);
    }, 4000);

    console.log(`[BuzzChat] Bid detected: ${bid.username} - $${bid.amount}`);
  }

  // ===============================================
  // 10/10 FEATURES: Viewer Engagement Tracking
  // ===============================================

  // Track viewer message activity
  function trackViewer(username) {
    const now = Date.now();

    if (!state.viewers.has(username)) {
      state.viewers.set(username, {
        messageCount: 0,
        firstSeen: now,
        lastSeen: now
      });
    }

    const viewer = state.viewers.get(username);
    viewer.messageCount++;
    viewer.lastSeen = now;
    state.viewers.set(username, viewer); // Update in LRU
  }

  // Get top viewers by message count
  function getTopViewers(limit = 10) {
    const viewers = [];
    for (const [username, stats] of state.viewers.entries()) {
      viewers.push({ username, ...stats });
    }

    return viewers
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);
  }

  // ===============================================
  // 10/10 FEATURES: Chat History & Export
  // ===============================================

  // Store message in chat history
  function storeChatMessage(username, message) {
    state.chatHistory.push({
      timestamp: Date.now(),
      username,
      message
    });

    // Keep last 5000 messages
    if (state.chatHistory.length > 5000) {
      state.chatHistory = state.chatHistory.slice(-5000);
    }
  }

  // Escape CSV field
  function escapeCSV(str) {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Export chat history to CSV
  function exportChatCSV() {
    if (state.chatHistory.length === 0) {
      return null;
    }

    const headers = 'Timestamp,Username,Message\n';
    const rows = state.chatHistory.map(m => {
      const ts = new Date(m.timestamp).toISOString();
      const user = escapeCSV(m.username);
      const msg = escapeCSV(m.message);
      return `${ts},${user},${msg}`;
    }).join('\n');

    return headers + rows;
  }

  // Quick Reply Floating Bar
  function showQuickReplyBar() {
    if (!state.isLiveStream) return;

    const quickReply = state.settings?.quickReply;
    if (!quickReply?.enabled) {
      removeQuickReplyBar();
      return;
    }

    let bar = document.getElementById('buzzchat-quick-reply');

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'buzzchat-quick-reply';
      document.body.appendChild(bar);

      // Add styles
      if (!document.getElementById('buzzchat-quickreply-styles')) {
        const style = document.createElement('style');
        style.id = 'buzzchat-quickreply-styles';
        style.textContent = `
          #buzzchat-quick-reply {
            position: fixed;
            bottom: 80px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 9999;
            transition: all 0.3s ease;
          }
          #buzzchat-quick-reply.minimized .quick-reply-buttons {
            display: none;
          }
          #buzzchat-quick-reply .quick-reply-toggle {
            align-self: flex-end;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #7c3aed;
            color: white;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            transition: all 0.2s;
          }
          #buzzchat-quick-reply .quick-reply-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
          }
          #buzzchat-quick-reply .quick-reply-buttons {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          #buzzchat-quick-reply .quick-reply-btn {
            padding: 10px 16px;
            background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
            transition: all 0.2s;
            white-space: nowrap;
          }
          #buzzchat-quick-reply .quick-reply-btn:hover {
            transform: translateX(-5px);
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
          }
          #buzzchat-quick-reply .quick-reply-btn:active {
            transform: scale(0.95);
          }
          #buzzchat-quick-reply .quick-reply-btn.sending {
            opacity: 0.7;
            pointer-events: none;
          }
          #buzzchat-quick-reply .quick-reply-emoji {
            font-size: 16px;
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Clear bar safely - remove all children to avoid memory leaks
    while (bar.firstChild) {
      bar.removeChild(bar.firstChild);
    }

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'quick-reply-toggle';
    toggleBtn.textContent = quickReply.minimized ? '💬' : '✕';
    toggleBtn.title = quickReply.minimized ? 'Show quick replies' : 'Hide quick replies';
    toggleBtn.dataset.action = 'toggle';
    bar.appendChild(toggleBtn);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'quick-reply-buttons';

    const buttons = quickReply.buttons || [];
    buttons.forEach((btn, index) => {
      const button = document.createElement('button');
      button.className = 'quick-reply-btn';
      button.dataset.action = 'send';
      button.dataset.index = index;
      button.dataset.text = btn.text || '';

      if (btn.emoji) {
        const emoji = document.createElement('span');
        emoji.className = 'quick-reply-emoji';
        emoji.textContent = btn.emoji;
        button.appendChild(emoji);
      }

      const text = document.createTextNode(btn.text || '');
      button.appendChild(text);

      buttonsContainer.appendChild(button);
    });

    bar.appendChild(buttonsContainer);

    // Use event delegation to prevent memory leaks from individual event listeners
    if (!bar.dataset.delegated) {
      bar.dataset.delegated = 'true';
      bar.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.dataset.action;

        if (action === 'toggle') {
          state.settings.quickReply.minimized = !state.settings.quickReply.minimized;
          bar.classList.toggle('minimized');
          target.textContent = state.settings.quickReply.minimized ? '💬' : '✕';
          target.title = state.settings.quickReply.minimized ? 'Show quick replies' : 'Hide quick replies';
          StorageWriter.queue('whatnotBotSettings', state.settings);
        } else if (action === 'send') {
          if (target.classList.contains('sending')) return;
          target.classList.add('sending');

          const msgText = target.dataset.text;
          if (msgText && canSendMessage()) {
            sendChatMessage(msgText);
            safeTrackAnalytics('quickReply');
          }

          setTimeout(() => {
            target.classList.remove('sending');
          }, 1000);
        }
      });
    }

    // Apply minimized state
    if (quickReply.minimized) {
      bar.classList.add('minimized');
    }
  }

  // Remove quick reply bar
  function removeQuickReplyBar() {
    const bar = document.getElementById('buzzchat-quick-reply');
    if (bar) {
      bar.remove();
    }
  }

  // Smart initialization with retry for dynamic content
  const InitManager = {
    MAX_RETRIES: 3,
    RETRY_DELAYS: [0, 2000, 5000],
    retryCount: 0,

    async start() {
      // Wait for DOM if still loading
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }

      // Try to initialize
      await this.tryInit();
    },

    async tryInit() {
      if (state.initialized) return;

      try {
        await init();

        // If we found chat elements, we're done
        if (state.chatContainer || state.chatInput) {
          console.log('[BuzzChat] Successfully initialized with chat elements');
          return;
        }

        // If no chat elements found and we have retries left, schedule retry
        if (this.retryCount < this.MAX_RETRIES - 1) {
          this.retryCount++;
          const delay = this.RETRY_DELAYS[this.retryCount];
          console.log(`[BuzzChat] Chat elements not found, retrying in ${delay}ms (attempt ${this.retryCount + 1}/${this.MAX_RETRIES})`);

          // Reset initialized flag to allow retry
          state.initialized = false;

          setTimeout(() => this.tryInit(), delay);
        } else {
          console.log('[BuzzChat] Initialized (chat elements may load dynamically)');
        }
      } catch (error) {
        console.error('[BuzzChat] Initialization error:', error);
      }
    }
  };

  // Start initialization
  InitManager.start();

})();
