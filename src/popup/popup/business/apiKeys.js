// BuzzChat - API Key Manager
// API key CRUD for Business tier

import { browserAPI } from '../core/config.js';

// API Key Manager
export const ApiKeyManager = {
  STORAGE_KEY: 'buzzchatApiKeys',
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
