// BuzzChat - Initialization & Lifecycle
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
/* global BuzzChatPlatform, BuzzChatSecurity */

import { browserAPI, debounce } from './config.js';
import { state, FALLBACK_SELECTORS, getSelectors } from './state.js';
import { findElement } from './sender.js';
import { processNewMessage, handleMessage } from './messaging.js';
import { startTimerMessages } from './features/timers.js';
import { showStatusIndicator, showNotification, showQuickReplyBar, removeQuickReplyBar } from './ui.js';

// Platform detection (available globally from manifest content_scripts via BuzzChatPlatform)
const platformDetection = typeof BuzzChatPlatform !== 'undefined' && BuzzChatPlatform.__BUZZCHAT_VERIFIED
  ? BuzzChatPlatform
  : null;

// Get Security module if available
const Security = typeof BuzzChatSecurity !== 'undefined' ? BuzzChatSecurity : null;
const Logger = Security ? Security.Logger : console;

// Get default settings
export function getDefaultSettings() {
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

// Load settings from storage (sync storage for cross-device sync)
export async function loadSettings() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      state.settings = result.buzzchatSettings || getDefaultSettings();
      resolve();
    });
  });
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

// Detect if we're on a live stream page
export function detectLiveStream() {
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

// Start observing the page for dynamic content
export function startPageObserver() {
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
export function startChatObserver() {
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

// Start the bot
export function startBot() {
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
export function stopBot() {
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

// Initialize the bot
export async function init() {
  if (state.initialized) return;

  console.log('[BuzzChat] Initializing...');

  // Detect current platform
  if (platformDetection) {
    state.platform = platformDetection.detectPlatform();
    if (state.platform) {
      console.log(`[BuzzChat] Platform detected: ${state.platform.name}`);
    } else {
      console.log('[BuzzChat] Platform not supported, extension will not activate');
      return; // Don't initialize on unsupported platforms
    }
  } else {
    // Fallback: assume Whatnot for backward compatibility
    state.platform = {
      id: 'whatnot',
      name: 'Whatnot',
      features: ['chat', 'giveaway', 'moderation', 'welcome', 'faq', 'timer', 'commands'],
      detected: true
    };
    console.log('[BuzzChat] Platform detection not available, defaulting to Whatnot');
  }

  // SECURITY: Load selectors only from trusted extension-defined SelectorManager
  // Verify SelectorManager has expected structure before using
  if (typeof SelectorManager !== 'undefined' &&
      typeof SelectorManager.getSelectors === 'function' &&
      typeof SelectorManager.getVersion === 'function' &&
      SelectorManager.__BUZZCHAT_VERIFIED === true) {
    try {
      // Set the platform in SelectorManager for platform-specific selectors
      if (state.platform && state.platform.id) {
        SelectorManager.setPlatform(state.platform.id);
      }

      // Load platform-specific selectors
      const loadedSelectors = await SelectorManager.getSelectors(state.platform?.id);
      // Validate selector structure before using
      if (isValidSelectorObject(loadedSelectors)) {
        state.selectors = loadedSelectors;
        const version = await SelectorManager.getVersion();
        console.log('[BuzzChat] Loaded selectors for ' + (state.platform?.name || 'unknown') + ' v' + version);
      } else {
        console.warn('[BuzzChat] Invalid selector format, using fallback');
        state.selectors = FALLBACK_SELECTORS;
      }
    } catch (e) {
      console.warn('[BuzzChat] Failed to load selectors, using fallback:', e);
      state.selectors = FALLBACK_SELECTORS;
    }
  } else {
    state.selectors = FALLBACK_SELECTORS;
  }

  // Load settings
  await loadSettings();

  // Check if we're on a live stream page
  detectLiveStream();

  // Setup message listener for popup communication
  browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return handleMessage(message, sender, sendResponse, { startBot, stopBot, showQuickReplyBar });
  });

  // Start observing the page for changes
  startPageObserver();

  state.initialized = true;
  console.log('[BuzzChat] Initialized successfully');
}

// Smart initialization with retry for dynamic content
export const InitManager = {
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
