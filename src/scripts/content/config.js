// BuzzChat - Content Script Configuration
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.

// Browser API compatibility - works on both Chrome and Firefox
export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Configuration constants
export const CONFIG = {
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

// Rate limiting configuration (legacy alias)
export const RATE_LIMIT = {
  MAX_MESSAGES_PER_MINUTE: CONFIG.MAX_MESSAGES_PER_MINUTE,
  MESSAGE_COOLDOWN_MS: CONFIG.MESSAGE_COOLDOWN_MS,
  MAX_MESSAGE_LENGTH: CONFIG.MAX_MESSAGE_LENGTH
};

// LRU Cache class for efficient memory management
export class LRUSet {
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
export class LRUMap {
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

// Utility: Debounce function for performance optimization
export function debounce(fn, delay) {
  let timeoutId = null;
  return function(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Batched storage writer to reduce storage operations
// Uses sync storage for settings (cross-device sync)
export const StorageWriter = {
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
