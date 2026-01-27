// BuzzChat - Anthropic API Key Storage
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Secure storage for user's Anthropic API key (Max tier feature)

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const STORAGE_KEY = 'buzzchat_anthropic_key';

/**
 * Anthropic API Key Manager
 * Stores the user's personal Anthropic API key for AI features
 * Uses local storage (not sync) for security - keys stay on device
 */
const AnthropicKeyManager = {
  /**
   * Store an Anthropic API key
   * @param {string} apiKey - The API key to store
   * @throws {Error} If key format is invalid
   */
  async storeKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('API key is required');
    }

    // Validate key format
    const trimmedKey = apiKey.trim();
    if (!trimmedKey.startsWith('sk-ant-')) {
      throw new Error('Invalid API key format. Anthropic keys start with sk-ant-');
    }

    // Basic obfuscation (not encryption, but prevents casual viewing)
    // Real security comes from Chrome's storage isolation
    const encoded = btoa(trimmedKey);

    return new Promise((resolve, reject) => {
      browserAPI.storage.local.set({ [STORAGE_KEY]: encoded }, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error('Failed to store API key: ' + browserAPI.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  },

  /**
   * Retrieve the stored Anthropic API key
   * @returns {Promise<string|null>} The API key or null if not set
   */
  async getKey() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([STORAGE_KEY], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to get API key:', browserAPI.runtime.lastError);
          resolve(null);
          return;
        }

        const encoded = result[STORAGE_KEY];
        if (!encoded) {
          resolve(null);
          return;
        }

        try {
          resolve(atob(encoded));
        } catch (e) {
          console.error('[BuzzChat] Failed to decode API key');
          resolve(null);
        }
      });
    });
  },

  /**
   * Check if an API key is stored
   * @returns {Promise<boolean>}
   */
  async hasKey() {
    const key = await this.getKey();
    return !!key;
  },

  /**
   * Clear the stored API key
   * @returns {Promise<void>}
   */
  async clearKey() {
    return new Promise((resolve, reject) => {
      browserAPI.storage.local.remove([STORAGE_KEY], () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error('Failed to clear API key: ' + browserAPI.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  },

  /**
   * Get a masked version of the key for display
   * @returns {Promise<string>} Masked key like "sk-ant-***...abc"
   */
  async getMaskedKey() {
    const key = await this.getKey();
    if (!key) return null;

    // Show first 7 chars and last 4
    const prefix = key.slice(0, 7);
    const suffix = key.slice(-4);
    return `${prefix}***...${suffix}`;
  },

  /**
   * Update the stored key (convenience method)
   * @param {string} newKey - The new API key
   */
  async updateKey(newKey) {
    await this.storeKey(newKey);
  }
};

// Export for ES modules and content scripts
if (typeof window !== 'undefined') {
  window.AnthropicKeyManager = AnthropicKeyManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnthropicKeyManager;
}
