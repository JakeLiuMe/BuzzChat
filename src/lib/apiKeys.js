// BuzzChat - API Key Manager
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// API key generation and validation for Business tier users
// Enables external control via MCP server and REST API

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const ApiKeyManager = {
  STORAGE_KEY: 'buzzchatApiKeys',
  KEY_PREFIX: 'bz_live_',
  MAX_KEYS: 5,

  // Rate limiting for key validation (prevent brute force)
  _validationAttempts: new Map(), // IP/context -> { count, firstAttempt }
  MAX_VALIDATION_ATTEMPTS: 10,
  VALIDATION_WINDOW_MS: 60 * 1000, // 1 minute window

  // Hash a key for secure storage comparison (SHA-256)
  async hashKey(key) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Generate a cryptographically secure API key
  generateKey() {
    // Use crypto.randomUUID for secure random generation
    const uuid1 = crypto.randomUUID().replace(/-/g, '');
    const uuid2 = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    return this.KEY_PREFIX + uuid1 + uuid2;
  },

  // Generate a key ID (shorter identifier for display)
  generateKeyId() {
    return 'key_' + crypto.randomUUID().slice(0, 8);
  },

  // Get all API keys
  async getKeys() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEY], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to get API keys:', browserAPI.runtime.lastError);
          resolve({});
          return;
        }
        resolve(result[this.STORAGE_KEY] || {});
      });
    });
  },

  // Create a new API key
  async createKey(name) {
    const keys = await this.getKeys();

    // Check key limit
    const keyCount = Object.keys(keys).length;
    if (keyCount >= this.MAX_KEYS) {
      throw new Error(`Maximum of ${this.MAX_KEYS} API keys reached`);
    }

    // Validate name - strict sanitization
    if (!name || typeof name !== 'string') {
      throw new Error('API key name is required');
    }
    // Remove any potentially dangerous characters
    const sanitizedName = name.trim().replace(/[<>"'&\\]/g, '').slice(0, 50);
    if (sanitizedName.length === 0) {
      throw new Error('API key name cannot be empty');
    }

    const id = this.generateKeyId();
    const key = this.generateKey();

    // Hash the key for secure storage - the actual key is only returned once
    const keyHash = await this.hashKey(key);

    const keyData = {
      id,
      name: sanitizedName,
      keyHash, // Store hash, not plaintext
      keyPreview: this.maskKey(key), // Store masked preview for display
      createdAt: Date.now(),
      lastUsed: null
    };

    keys[id] = keyData;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        // Return the full key data including the PLAINTEXT key (only shown once!)
        // The key is NOT stored - only shown to user once on creation
        resolve({ ...keyData, key });
      });
    });
  },

  // Revoke (delete) an API key
  async revokeKey(keyId) {
    const keys = await this.getKeys();

    if (!keys[keyId]) {
      throw new Error(`API key ${keyId} does not exist`);
    }

    delete keys[keyId];

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Check rate limiting for validation attempts
  _checkRateLimit(context = 'default') {
    const now = Date.now();
    const attempts = this._validationAttempts.get(context);

    if (attempts) {
      // Clean up old entries
      if (now - attempts.firstAttempt > this.VALIDATION_WINDOW_MS) {
        this._validationAttempts.delete(context);
      } else if (attempts.count >= this.MAX_VALIDATION_ATTEMPTS) {
        return false; // Rate limited
      }
    }
    return true;
  },

  // Record a validation attempt
  _recordAttempt(context = 'default') {
    const now = Date.now();
    const attempts = this._validationAttempts.get(context) || { count: 0, firstAttempt: now };

    if (now - attempts.firstAttempt > this.VALIDATION_WINDOW_MS) {
      // Reset window
      this._validationAttempts.set(context, { count: 1, firstAttempt: now });
    } else {
      attempts.count++;
      this._validationAttempts.set(context, attempts);
    }
  },

  // Validate an API key (check if it exists and is valid)
  // Uses hash comparison for security - never stores plaintext keys
  async validateKey(key, context = 'default') {
    // Rate limiting check
    if (!this._checkRateLimit(context)) {
      return { valid: false, reason: 'Too many attempts. Please wait.' };
    }

    this._recordAttempt(context);

    if (!key || typeof key !== 'string') {
      return { valid: false, reason: 'Invalid key format' };
    }

    // Check prefix
    if (!key.startsWith(this.KEY_PREFIX)) {
      return { valid: false, reason: 'Invalid key prefix' };
    }

    // Check key length (should be exactly 64 chars: prefix + uuid)
    if (key.length !== 56) { // bz_live_ (8) + 32 + 16 = 56
      return { valid: false, reason: 'Invalid key length' };
    }

    const keys = await this.getKeys();
    const keyHash = await this.hashKey(key);

    // Find the key by comparing hashes (constant-time comparison)
    // SECURITY: Only hash-based comparison - no plaintext support
    for (const keyId in keys) {
      const storedHash = keys[keyId].keyHash;

      // Skip keys without hash (legacy keys that weren't migrated)
      if (!storedHash) {
        console.warn('[BuzzChat] Skipping key without hash - please recreate:', keyId);
        continue;
      }

      if (this._constantTimeCompare(storedHash, keyHash)) {
        // Update last used timestamp
        keys[keyId].lastUsed = Date.now();
        await this.saveKeys(keys);

        return {
          valid: true,
          keyId,
          name: keys[keyId].name
        };
      }
    }

    return { valid: false, reason: 'Key not found' };
  },

  // Constant-time string comparison to prevent timing attacks
  _constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  },

  // Save keys to storage
  async saveKeys(keys) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Get a list of keys for display (masked)
  async getKeyList() {
    const keys = await this.getKeys();

    return Object.values(keys).map(keyData => ({
      id: keyData.id,
      name: keyData.name,
      // Use stored preview (new format) or mask plaintext key (legacy)
      keyPreview: keyData.keyPreview || (keyData.key ? this.maskKey(keyData.key) : 'bz_live_***...****'),
      createdAt: keyData.createdAt,
      lastUsed: keyData.lastUsed
    })).sort((a, b) => b.createdAt - a.createdAt);
  },

  // Mask a key for display (show first and last 4 chars)
  maskKey(key) {
    if (!key || key.length < 16) return '****';
    const prefix = key.slice(0, 11); // bz_live_ + 3 chars
    const suffix = key.slice(-4);
    return `${prefix}...${suffix}`;
  },

  // Rename an API key
  async renameKey(keyId, newName) {
    const keys = await this.getKeys();

    if (!keys[keyId]) {
      throw new Error(`API key ${keyId} does not exist`);
    }

    // Validate name
    if (!newName || typeof newName !== 'string') {
      throw new Error('API key name is required');
    }
    const sanitizedName = newName.trim().slice(0, 50);
    if (sanitizedName.length === 0) {
      throw new Error('API key name cannot be empty');
    }

    keys[keyId].name = sanitizedName;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEY]: keys }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Clean up legacy plaintext keys (run on startup)
  async cleanupLegacyKeys() {
    const keys = await this.getKeys();
    let cleaned = false;

    for (const keyId in keys) {
      // Remove any keys that still have plaintext stored
      if (keys[keyId].key) {
        console.warn('[BuzzChat] Removing legacy plaintext key:', keyId);
        delete keys[keyId].key;
        cleaned = true;
      }
      // Remove keys without hash (unusable)
      if (!keys[keyId].keyHash) {
        console.warn('[BuzzChat] Removing key without hash:', keyId);
        delete keys[keyId];
        cleaned = true;
      }
    }

    if (cleaned) {
      await this.saveKeys(keys);
    }

    return cleaned;
  },

  // Check if any API keys exist
  async hasKeys() {
    const keys = await this.getKeys();
    return Object.keys(keys).length > 0;
  },

  // Get key count
  async getKeyCount() {
    const keys = await this.getKeys();
    return Object.keys(keys).length;
  },

  // Format last used timestamp for display
  formatLastUsed(timestamp) {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return new Date(timestamp).toLocaleDateString();
  }
};

// Export for ES modules (popup) and CommonJS (background)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiKeyManager;
}
