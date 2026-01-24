// Remote Selector Management for BuzzChat
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// Allows updating selectors without releasing a new extension version

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SelectorManager = {
  // SECURITY: Verification marker to confirm this is the legitimate extension module
  __BUZZCHAT_VERIFIED: true,

  // Configuration - Remote selector updates disabled for initial release
  // To enable: Create a GitHub Gist with selectors.json and set the raw URL below
  // GIST_URL: 'https://gist.githubusercontent.com/YOUR_USERNAME/YOUR_GIST_ID/raw/selectors.json',
  GIST_URL: null, // Remote updates disabled - using bundled defaults only

  // Cache duration (24 hours)
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,

  // Default bundled selectors (fallback)
  DEFAULT_SELECTORS: {
    version: '1.0.0',
    lastUpdated: '2026-01-22T00:00:00Z',
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
        '[class*="chat-input"] input'
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
        '[class*="live-tag"]',
        'span:contains("LIVE")'
      ]
    }
  },

  // Get selectors (from cache or fetch new)
  async getSelectors() {
    try {
      // Check cache first
      const cached = await this.getCachedSelectors();

      if (cached && !this.isCacheExpired(cached)) {
        console.log('[BuzzChat] Using cached selectors v' + cached.version);
        return cached.selectors;
      }

      // Try to fetch remote selectors
      const remote = await this.fetchRemoteSelectors();

      if (remote) {
        // Check if remote is newer
        if (!cached || this.isNewer(remote.version, cached.version)) {
          await this.cacheSelectors(remote);
          console.log('[BuzzChat] Updated to remote selectors v' + remote.version);
          return remote.selectors;
        }
      }

      // Return cached or default
      if (cached) {
        return cached.selectors;
      }

      console.log('[BuzzChat] Using default bundled selectors');
      return this.DEFAULT_SELECTORS.selectors;

    } catch (error) {
      console.error('[BuzzChat] Error getting selectors:', error);
      return this.DEFAULT_SELECTORS.selectors;
    }
  },

  // Get cached selectors from storage
  async getCachedSelectors() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get(['whatnotBotSelectors'], (result) => {
        resolve(result.whatnotBotSelectors || null);
      });
    });
  },

  // Cache selectors in storage
  async cacheSelectors(selectorsData) {
    return new Promise((resolve) => {
      browserAPI.storage.local.set({
        whatnotBotSelectors: {
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
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectorManager;
}
