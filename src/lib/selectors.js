// Remote Selector Management for BuzzChat
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// Allows updating selectors without releasing a new extension version
// Supports multiple platforms: Whatnot, YouTube, eBay, Twitch, Kick

/* global BuzzChatAnalytics */

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SelectorManager = {
  // SECURITY: Verification marker to confirm this is the legitimate extension module
  __BUZZCHAT_VERIFIED: true,

  // Current platform (set by init)
  currentPlatform: null,

  // Configuration - Remote selector updates disabled for initial release
  // To enable: Create a GitHub Gist with selectors.json and set the raw URL below
  // GIST_URL: 'https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/selectors.json',
  GIST_URL: null, // Remote updates disabled - using bundled defaults only

  // Cache duration (24 hours)
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,

  // Platform-specific selectors
  PLATFORM_SELECTORS: {
    // Whatnot - Primary platform
    whatnot: {
      chatInput: [
        'textarea[placeholder*="chat"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Send"]',
        '[data-testid="chat-input"]',
        '.chat-input textarea',
        '[class*="ChatInput"] textarea'
      ],
      chatContainer: [
        '[data-testid="chat-messages"]',
        '[data-testid="chat-container"]',
        '.chat-messages',
        '[class*="ChatMessages"]',
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
        '[class*="live-indicator"]'
      ]
    },

    // YouTube Live
    youtube: {
      chatInput: [
        '#input[contenteditable="true"]',
        'yt-live-chat-text-input-field-renderer #input',
        '[id="input"][contenteditable="true"]',
        'div[contenteditable="true"][aria-label*="chat"]'
      ],
      chatContainer: [
        'yt-live-chat-item-list-renderer #items',
        '#chat-messages',
        'yt-live-chat-renderer #items',
        '[id="items"]'
      ],
      sendButton: [
        '#send-button button',
        'yt-live-chat-text-input-field-renderer #send-button',
        'button[aria-label*="Send"]',
        '#button[aria-label*="send"]'
      ],
      messageItem: [
        'yt-live-chat-text-message-renderer',
        'yt-live-chat-paid-message-renderer',
        '[class*="yt-live-chat"][class*="message"]'
      ],
      username: [
        '#author-name',
        'yt-live-chat-author-chip #author-name',
        '[id="author-name"]',
        'span[class*="author"]'
      ],
      messageText: [
        '#message',
        'yt-live-chat-text-message-renderer #message',
        '[id="message"]'
      ],
      liveIndicator: [
        '.ytp-live-badge',
        '[class*="live-badge"]',
        'span[class*="live"]'
      ]
    },

    // eBay Live
    ebay: {
      chatInput: [
        'textarea[placeholder*="comment"]',
        'textarea[placeholder*="message"]',
        'input[placeholder*="comment"]',
        '[class*="comment-input"]',
        '[class*="chat-input"]'
      ],
      chatContainer: [
        '[class*="chat-container"]',
        '[class*="comments-list"]',
        '[class*="live-comments"]',
        '[class*="ChatContainer"]'
      ],
      sendButton: [
        'button[type="submit"]',
        '[class*="send-button"]',
        '[class*="submit-comment"]',
        'button[aria-label*="send"]'
      ],
      messageItem: [
        '[class*="comment-item"]',
        '[class*="chat-message"]',
        '[class*="live-comment"]'
      ],
      username: [
        '[class*="username"]',
        '[class*="commenter-name"]',
        '[class*="author"]'
      ],
      messageText: [
        '[class*="comment-text"]',
        '[class*="message-content"]',
        '[class*="comment-body"]'
      ],
      liveIndicator: [
        '[class*="live-badge"]',
        '[class*="live-indicator"]',
        'span[class*="LIVE"]'
      ]
    },

    // Twitch
    twitch: {
      chatInput: [
        'textarea[data-a-target="chat-input"]',
        '[data-test-selector="chat-input"]',
        '.chat-input textarea',
        '[class*="chat-input"] textarea'
      ],
      chatContainer: [
        '[data-test-selector="chat-scrollable-area__message-container"]',
        '.chat-scrollable-area__message-container',
        '[class*="chat-list"]',
        '[class*="ChatList"]'
      ],
      sendButton: [
        'button[data-a-target="chat-send-button"]',
        '[data-test-selector="chat-send-button"]',
        'button[aria-label="Send message"]'
      ],
      messageItem: [
        '[data-a-target="chat-line-message"]',
        '.chat-line__message',
        '[class*="chat-line"]'
      ],
      username: [
        '[data-a-target="chat-message-username"]',
        '.chat-author__display-name',
        '[class*="chat-author"]',
        '[class*="username"]'
      ],
      messageText: [
        '[data-a-target="chat-message-text"]',
        '.text-fragment',
        '[class*="message-text"]'
      ],
      liveIndicator: [
        '[data-a-target="player-state-button"]',
        '.live-indicator',
        '[class*="live-indicator"]'
      ]
    },

    // Kick
    kick: {
      chatInput: [
        'textarea[placeholder*="Send"]',
        'textarea[placeholder*="message"]',
        '[class*="chat-input"] textarea',
        'div[contenteditable="true"]'
      ],
      chatContainer: [
        '[class*="chat-messages"]',
        '[class*="chat-container"]',
        '[class*="ChatMessages"]',
        '[id="chatroom"]'
      ],
      sendButton: [
        'button[type="submit"]',
        '[class*="send-button"]',
        'button[aria-label*="Send"]'
      ],
      messageItem: [
        '[class*="chat-message"]',
        '[class*="ChatMessage"]',
        '[class*="message-item"]'
      ],
      username: [
        '[class*="chat-username"]',
        '[class*="username"]',
        '[class*="author"]'
      ],
      messageText: [
        '[class*="chat-text"]',
        '[class*="message-text"]',
        '[class*="message-content"]'
      ],
      liveIndicator: [
        '[class*="live-badge"]',
        '[class*="live-indicator"]',
        '[class*="LIVE"]'
      ]
    }
  },

  // Default/fallback selectors (generic patterns that work across platforms)
  DEFAULT_SELECTORS: {
    version: '2.0.0',
    lastUpdated: '2026-01-27T00:00:00Z',
    selectors: {
      chatInput: [
        'textarea[placeholder*="chat"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Send"]',
        'input[placeholder*="chat"]',
        'input[placeholder*="message"]',
        '[data-testid="chat-input"]',
        '.chat-input textarea',
        '.chat-input input',
        '[class*="ChatInput"] textarea',
        '[class*="ChatInput"] input',
        '[class*="chat-input"] textarea',
        '[class*="chat-input"] input',
        'div[contenteditable="true"]'
      ],
      chatContainer: [
        '[data-testid="chat-messages"]',
        '[data-testid="chat-container"]',
        '.chat-messages',
        '[class*="ChatMessages"]',
        '[class*="chat-container"]',
        '[class*="ChatContainer"]',
        '[class*="LiveChat"]',
        '[class*="chat-list"]',
        '[class*="message-list"]'
      ],
      sendButton: [
        'button[type="submit"]',
        '[data-testid="send-button"]',
        '.chat-send-button',
        '[class*="SendButton"]',
        'button[aria-label*="send"]',
        'button[aria-label*="Send"]',
        '[class*="send-button"]',
        '[class*="submit-button"]'
      ],
      messageItem: [
        '[data-testid="chat-message"]',
        '.chat-message',
        '[class*="ChatMessage"]',
        '[class*="message-item"]',
        '[class*="chat-message"]',
        '[class*="Message_"]'
      ],
      username: [
        '[data-testid="username"]',
        '.username',
        '[class*="Username"]',
        '[class*="user-name"]',
        '[class*="author"]',
        'span[class*="name"]',
        '[class*="displayName"]'
      ],
      messageText: [
        '[data-testid="message-text"]',
        '.message-text',
        '[class*="MessageText"]',
        '[class*="message-content"]',
        '[class*="chat-text"]',
        '[class*="messageBody"]'
      ],
      liveIndicator: [
        '[data-testid="live-indicator"]',
        '.live-badge',
        '[class*="LiveBadge"]',
        '[class*="live-indicator"]',
        '[class*="live-tag"]'
      ]
    }
  },

  // Set the current platform
  setPlatform(platformId) {
    this.currentPlatform = platformId;
    console.log('[BuzzChat] SelectorManager platform set to:', platformId);
  },

  // Get selectors for a specific platform
  getSelectorsForPlatform(platformId) {
    const platformSelectors = this.PLATFORM_SELECTORS[platformId];
    if (platformSelectors) {
      return platformSelectors;
    }
    // Fallback to default selectors if platform not found
    console.log('[BuzzChat] Unknown platform, using default selectors');
    return this.DEFAULT_SELECTORS.selectors;
  },

  // Get selectors (platform-aware, from cache or fetch new)
  async getSelectors(platformId) {
    // Use provided platform or current platform
    const platform = platformId || this.currentPlatform;

    try {
      // If we have a known platform, use platform-specific selectors first
      if (platform && this.PLATFORM_SELECTORS[platform]) {
        // Try to get remote updates for this platform
        const cached = await this.getCachedSelectors();
        if (cached && cached.platforms && cached.platforms[platform] && !this.isCacheExpired(cached)) {
          console.log('[BuzzChat] Using cached selectors for ' + platform + ' v' + cached.version);
          return cached.platforms[platform];
        }

        // Try to fetch remote selectors
        const remote = await this.fetchRemoteSelectors();
        if (remote && remote.platforms && remote.platforms[platform]) {
          if (!cached || this.isNewer(remote.version, cached.version)) {
            await this.cacheSelectors(remote);
            console.log('[BuzzChat] Updated to remote selectors for ' + platform + ' v' + remote.version);
            return remote.platforms[platform];
          }
        }

        // Use bundled platform-specific selectors
        console.log('[BuzzChat] Using bundled selectors for ' + platform);
        return this.PLATFORM_SELECTORS[platform];
      }

      // Fallback: generic selector logic (backward compatible)
      const cached = await this.getCachedSelectors();

      if (cached && !this.isCacheExpired(cached)) {
        console.log('[BuzzChat] Using cached selectors v' + cached.version);
        return cached.selectors || this.DEFAULT_SELECTORS.selectors;
      }

      // Try to fetch remote selectors
      const remote = await this.fetchRemoteSelectors();

      if (remote) {
        // Check if remote is newer
        if (!cached || this.isNewer(remote.version, cached.version)) {
          await this.cacheSelectors(remote);
          console.log('[BuzzChat] Updated to remote selectors v' + remote.version);
          return remote.selectors || this.DEFAULT_SELECTORS.selectors;
        }
      }

      // Return cached or default
      if (cached) {
        return cached.selectors || this.DEFAULT_SELECTORS.selectors;
      }

      console.log('[BuzzChat] Using default bundled selectors');
      return this.DEFAULT_SELECTORS.selectors;

    } catch (error) {
      console.error('[BuzzChat] Error getting selectors:', error);
      // Return platform-specific or default
      if (platform && this.PLATFORM_SELECTORS[platform]) {
        return this.PLATFORM_SELECTORS[platform];
      }
      return this.DEFAULT_SELECTORS.selectors;
    }
  },

  // Synchronous selector getter for when platform is already known
  getSelectorsSync(platformId) {
    const platform = platformId || this.currentPlatform;
    if (platform && this.PLATFORM_SELECTORS[platform]) {
      return this.PLATFORM_SELECTORS[platform];
    }
    return this.DEFAULT_SELECTORS.selectors;
  },

  // Get cached selectors from storage
  async getCachedSelectors() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(['buzzchatSelectors'], (result) => {
        resolve(result.buzzchatSelectors || null);
      });
    });
  },

  // Cache selectors in storage
  async cacheSelectors(selectorsData) {
    return new Promise((resolve) => {
      browserAPI.storage.local.set({
        buzzchatSelectors: {
          ...selectorsData,
          cachedAt: Date.now()
        }
      }, resolve);
    });
  },

  // Check if cache is expired
  isCacheExpired(cached) {
    if (!cached?.cachedAt) return true;
    return Date.now() - cached.cachedAt > this.CACHE_DURATION_MS;
  },

  // Compare version strings (semver-like)
  isNewer(newVersion, oldVersion) {
    if (!oldVersion) return true;
    if (!newVersion) return false;

    const newParts = newVersion.split('.').map(Number);
    const oldParts = oldVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, oldParts.length); i++) {
      const newPart = newParts[i] || 0;
      const oldPart = oldParts[i] || 0;

      if (newPart > oldPart) return true;
      if (newPart < oldPart) return false;
    }

    return false;
  },

  // Fetch timeout in milliseconds
  FETCH_TIMEOUT_MS: 5000,

  // Fetch selectors from remote source (GitHub Gist)
  async fetchRemoteSelectors() {
    try {
      // Skip if no URL configured (remote updates disabled)
      if (!this.GIST_URL || this.GIST_URL.includes('YOUR_USERNAME')) {
        console.log('[BuzzChat] Remote selector updates disabled, using defaults');
        return null;
      }

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(this.GIST_URL, {
          cache: 'no-store', // Always get fresh data
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Validate the data structure
        if (!data.version || !data.selectors) {
          throw new Error('Invalid selectors format');
        }

        return data;
      } finally {
        clearTimeout(timeoutId);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[BuzzChat] Remote selectors fetch timed out');
      } else {
        console.warn('[BuzzChat] Failed to fetch remote selectors:', error.message);
      }
      return null;
    }
  },

  // Get selectors for a specific element type
  async getSelectorsFor(elementType) {
    const selectors = await this.getSelectors();
    return selectors[elementType] || [];
  },

  // Find an element using selector list with fallbacks
  findElement(selectorList) {
    for (const selector of selectorList) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector, continue to next
      }
    }
    return null;
  },

  // Force refresh selectors from remote
  async forceRefresh() {
    const remote = await this.fetchRemoteSelectors();
    if (remote) {
      await this.cacheSelectors(remote);
      console.log('[BuzzChat] Force refreshed to v' + remote.version);
      return remote.selectors;
    }
    return this.DEFAULT_SELECTORS.selectors;
  },

  // Get current selector version
  async getVersion() {
    const cached = await this.getCachedSelectors();
    return cached?.version || this.DEFAULT_SELECTORS.version;
  },

  // ============================================
  // SELF-HEALING SELECTOR SYSTEM
  // ============================================

  // Track selector health status
  healthStatus: {},
  lastHealthCheck: 0,
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds between health checks

  /**
   * Check health of all selectors for a platform
   * Returns which selectors are working and which are broken
   */
  checkSelectorHealth(platformId) {
    const selectors = this.getSelectorsSync(platformId);
    const health = {};
    const broken = [];

    for (const [selectorType, selectorList] of Object.entries(selectors)) {
      const element = this.findElement(selectorList);
      health[selectorType] = {
        found: !!element,
        workingSelector: element ? this.findWorkingSelector(selectorList) : null,
        timestamp: Date.now()
      };

      if (!element) {
        broken.push(selectorType);
      }
    }

    this.healthStatus[platformId] = health;
    this.lastHealthCheck = Date.now();

    // Log broken selectors
    if (broken.length > 0) {
      console.warn('[BuzzChat] Broken selectors for ' + platformId + ':', broken.join(', '));
    } else {
      console.log('[BuzzChat] All selectors healthy for ' + platformId);
    }

    return { health, broken };
  },

  /**
   * Find which specific selector in a list works
   */
  findWorkingSelector(selectorList) {
    for (const selector of selectorList) {
      try {
        if (document.querySelector(selector)) {
          return selector;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }
    return null;
  },

  /**
   * Auto-discover selectors using heuristics when standard selectors fail
   * This is the "self-healing" part - tries to find elements by common patterns
   */
  discoverSelectors() {
    const discoveries = {};

    // Discover chat container
    const chatContainerCandidates = document.querySelectorAll(
      '[class*="chat"], [class*="Chat"], [class*="message"], [class*="Message"], [id*="chat"]'
    );
    for (const el of chatContainerCandidates) {
      // Look for scrollable container with multiple children (chat messages)
      if (el.children.length > 3 &&
          (el.scrollHeight > el.clientHeight || el.style.overflowY === 'scroll' || el.style.overflowY === 'auto')) {
        discoveries.chatContainer = this.generateSelector(el);
        console.log('[BuzzChat] Discovered chat container:', discoveries.chatContainer);
        break;
      }
    }

    // Discover chat input
    const inputCandidates = document.querySelectorAll(
      'textarea, input[type="text"], [contenteditable="true"]'
    );
    for (const el of inputCandidates) {
      const placeholder = (el.placeholder || el.getAttribute('aria-label') || '').toLowerCase();
      const isInChatContext = el.closest('[class*="chat"], [class*="Chat"], [id*="chat"]');

      if (placeholder.includes('chat') ||
          placeholder.includes('message') ||
          placeholder.includes('send') ||
          placeholder.includes('comment') ||
          isInChatContext) {
        discoveries.chatInput = this.generateSelector(el);
        console.log('[BuzzChat] Discovered chat input:', discoveries.chatInput);
        break;
      }
    }

    // Discover send button
    const buttonCandidates = document.querySelectorAll(
      'button[type="submit"], button[aria-label*="send" i], button[aria-label*="Send"], [class*="send"], [class*="Send"]'
    );
    for (const el of buttonCandidates) {
      const isInChatContext = el.closest('[class*="chat"], [class*="Chat"], [id*="chat"]');
      if (isInChatContext) {
        discoveries.sendButton = this.generateSelector(el);
        console.log('[BuzzChat] Discovered send button:', discoveries.sendButton);
        break;
      }
    }

    return discoveries;
  },

  /**
   * Generate a CSS selector for an element
   * Tries to create a unique, stable selector
   */
  generateSelector(element) {
    // Try ID first (most stable)
    if (element.id) {
      return '#' + element.id;
    }

    // Try data-testid or similar test attributes
    const testId = element.getAttribute('data-testid') ||
                   element.getAttribute('data-test') ||
                   element.getAttribute('data-a-target');
    if (testId) {
      return '[data-testid="' + testId + '"]';
    }

    // Build a class-based selector
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c && !c.match(/^[0-9]/) && c.length < 50)
        .slice(0, 2);
      if (classes.length > 0) {
        return element.tagName.toLowerCase() + '.' + classes.join('.');
      }
    }

    // Fall back to tag with parent context
    const parent = element.parentElement;
    if (parent && parent.className && typeof parent.className === 'string') {
      const parentClass = parent.className.split(' ')[0];
      if (parentClass) {
        return '.' + parentClass + ' > ' + element.tagName.toLowerCase();
      }
    }

    // Last resort: just the tag name
    return element.tagName.toLowerCase();
  },

  /**
   * Self-heal: try to recover when selectors are broken
   * Returns patched selectors with discoveries merged in
   */
  selfHeal(platformId) {
    console.log('[BuzzChat] Attempting self-heal for ' + platformId);

    // Check current health
    const { health: _health, broken } = this.checkSelectorHealth(platformId);

    if (broken.length === 0) {
      console.log('[BuzzChat] No broken selectors, self-heal not needed');
      return null;
    }

    // Discover missing selectors
    const discoveries = this.discoverSelectors();

    if (Object.keys(discoveries).length === 0) {
      console.log('[BuzzChat] Self-heal failed - could not discover any selectors');
      return null;
    }

    // Merge discoveries into current selectors
    const currentSelectors = this.getSelectorsSync(platformId);
    const healedSelectors = { ...currentSelectors };

    for (const [selectorType, discoveredSelector] of Object.entries(discoveries)) {
      if (broken.includes(selectorType)) {
        // Prepend discovered selector to the list
        healedSelectors[selectorType] = [discoveredSelector, ...currentSelectors[selectorType]];
        console.log('[BuzzChat] Healed ' + selectorType + ' with: ' + discoveredSelector);
      }
    }

    // Cache the healed selectors temporarily
    this.healedSelectors = this.healedSelectors || {};
    this.healedSelectors[platformId] = healedSelectors;

    return healedSelectors;
  },

  /**
   * Get selectors with self-healing applied
   */
  getHealedSelectors(platformId) {
    if (this.healedSelectors && this.healedSelectors[platformId]) {
      return this.healedSelectors[platformId];
    }
    return this.getSelectorsSync(platformId);
  },

  /**
   * Report selector health to analytics (if enabled)
   */
  reportSelectorHealth(platformId, health) {
    // Only report if analytics is available
    if (typeof BuzzChatAnalytics !== 'undefined' && BuzzChatAnalytics.trackEvent) {
      const broken = Object.entries(health)
        .filter(([_, h]) => !h.found)
        .map(([key]) => key);

      if (broken.length > 0) {
        BuzzChatAnalytics.trackEvent('selector_health', {
          platform: platformId,
          broken: broken,
          total: Object.keys(health).length
        });
      }
    }
  },

  /**
   * Run periodic health check and self-heal if needed
   */
  runHealthCheck(platformId) {
    // Don't run too frequently
    if (Date.now() - this.lastHealthCheck < this.HEALTH_CHECK_INTERVAL) {
      return;
    }

    const { health, broken } = this.checkSelectorHealth(platformId);

    // Report health
    this.reportSelectorHealth(platformId, health);

    // Self-heal if needed
    if (broken.length > 0) {
      this.selfHeal(platformId);
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectorManager;
}
