// BuzzChat - Account Manager
// Multi-account management for Business tier

import { browserAPI, DEFAULT_SETTINGS } from '../core/config.js';

// Account Manager
export const AccountManager = {
  STORAGE_KEYS: {
    ACCOUNTS: 'buzzchatAccounts',
    ACTIVE_ID: 'buzzchatActiveAccountId'
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
      browserAPI.storage.sync.get(['buzzchatSettings', this.STORAGE_KEYS.ACCOUNTS], async (result) => {
        if (result[this.STORAGE_KEYS.ACCOUNTS] && Object.keys(result[this.STORAGE_KEYS.ACCOUNTS]).length > 0) {
          resolve(false);
          return;
        }
        const legacySettings = result.buzzchatSettings;
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
