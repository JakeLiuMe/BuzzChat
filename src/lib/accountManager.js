// BuzzChat - Account Manager
// Multi-account support for Business tier users
// Allows saving/switching between multiple configurations

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const AccountManager = {
  STORAGE_KEYS: {
    ACCOUNTS: 'whatnotBotAccounts',
    ACTIVE_ID: 'whatnotBotActiveAccountId'
  },

  MAX_ACCOUNTS: 10,

  // Default account structure
  createDefaultAccount(id = 'default', name = 'Default') {
    return {
      id,
      name,
      createdAt: Date.now(),
      settings: {
        tier: 'free',
        messagesUsed: 0,
        messagesLimit: 25,
        referralBonus: 0,
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
        settings: {
          chatSelector: '',
          soundNotifications: true,
          showMessageCount: true,
          darkMode: false,
          watermark: false
        }
      }
    };
  },

  // Generate a unique account ID
  generateAccountId() {
    return 'account_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // Get all accounts
  async getAccounts() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEYS.ACCOUNTS], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to get accounts:', browserAPI.runtime.lastError);
          resolve({});
          return;
        }
        resolve(result[this.STORAGE_KEYS.ACCOUNTS] || {});
      });
    });
  },

  // Get the active account ID
  async getActiveAccountId() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([this.STORAGE_KEYS.ACTIVE_ID], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to get active account ID:', browserAPI.runtime.lastError);
          resolve('default');
          return;
        }
        resolve(result[this.STORAGE_KEYS.ACTIVE_ID] || 'default');
      });
    });
  },

  // Set the active account
  async setActiveAccount(id) {
    const accounts = await this.getAccounts();
    if (!accounts[id]) {
      throw new Error(`Account ${id} does not exist`);
    }

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACTIVE_ID]: id }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Create a new account
  async createAccount(name) {
    const accounts = await this.getAccounts();

    // Check account limit
    const accountCount = Object.keys(accounts).length;
    if (accountCount >= this.MAX_ACCOUNTS) {
      throw new Error(`Maximum of ${this.MAX_ACCOUNTS} accounts reached`);
    }

    // Validate name
    if (!name || typeof name !== 'string') {
      throw new Error('Account name is required');
    }
    const sanitizedName = name.trim().slice(0, 50);
    if (sanitizedName.length === 0) {
      throw new Error('Account name cannot be empty');
    }

    const id = this.generateAccountId();
    const account = this.createDefaultAccount(id, sanitizedName);

    accounts[id] = account;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve(account);
      });
    });
  },

  // Delete an account
  async deleteAccount(id) {
    if (id === 'default') {
      throw new Error('Cannot delete the default account');
    }

    const accounts = await this.getAccounts();
    if (!accounts[id]) {
      throw new Error(`Account ${id} does not exist`);
    }

    delete accounts[id];

    // If we deleted the active account, switch to default
    const activeId = await this.getActiveAccountId();
    const updates = { [this.STORAGE_KEYS.ACCOUNTS]: accounts };
    if (activeId === id) {
      updates[this.STORAGE_KEYS.ACTIVE_ID] = 'default';
    }

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set(updates, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Rename an account
  async renameAccount(id, newName) {
    const accounts = await this.getAccounts();
    if (!accounts[id]) {
      throw new Error(`Account ${id} does not exist`);
    }

    // Validate name
    if (!newName || typeof newName !== 'string') {
      throw new Error('Account name is required');
    }
    const sanitizedName = newName.trim().slice(0, 50);
    if (sanitizedName.length === 0) {
      throw new Error('Account name cannot be empty');
    }

    accounts[id].name = sanitizedName;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  // Get the active account's settings
  async getActiveSettings() {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();

    // If no accounts exist yet, return null to trigger migration
    if (Object.keys(accounts).length === 0) {
      return null;
    }

    const account = accounts[activeId];
    if (!account) {
      // Active account doesn't exist, fallback to default
      return accounts['default']?.settings || null;
    }

    return account.settings;
  },

  // Update the active account's settings
  async updateActiveSettings(updates) {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();

    if (!accounts[activeId]) {
      throw new Error('No active account found');
    }

    // Deep merge updates into settings
    accounts[activeId].settings = this.deepMerge(accounts[activeId].settings, updates);

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve(accounts[activeId].settings);
      });
    });
  },

  // Migrate from legacy flat storage to namespaced accounts
  async migrateFromLegacy() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotSettings', this.STORAGE_KEYS.ACCOUNTS], async (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Migration read error:', browserAPI.runtime.lastError);
          resolve(false);
          return;
        }

        // If accounts already exist, no migration needed
        if (result[this.STORAGE_KEYS.ACCOUNTS] && Object.keys(result[this.STORAGE_KEYS.ACCOUNTS]).length > 0) {
          console.log('[BuzzChat] Accounts already exist, skipping migration');
          resolve(false);
          return;
        }

        // Create default account from legacy settings or fresh defaults
        const legacySettings = result.whatnotBotSettings;
        const defaultAccount = this.createDefaultAccount('default', 'Default');

        if (legacySettings) {
          // Merge legacy settings into default account
          defaultAccount.settings = this.deepMerge(defaultAccount.settings, legacySettings);
          console.log('[BuzzChat] Migrating legacy settings to default account');
        }

        const accounts = { 'default': defaultAccount };

        browserAPI.storage.sync.set({
          [this.STORAGE_KEYS.ACCOUNTS]: accounts,
          [this.STORAGE_KEYS.ACTIVE_ID]: 'default'
        }, () => {
          if (browserAPI.runtime.lastError) {
            console.error('[BuzzChat] Migration write error:', browserAPI.runtime.lastError);
            resolve(false);
            return;
          }
          console.log('[BuzzChat] Migration complete');
          resolve(true);
        });
      });
    });
  },

  // Get a list of accounts for display (id, name, createdAt)
  async getAccountList() {
    const accounts = await this.getAccounts();
    const activeId = await this.getActiveAccountId();

    return Object.values(accounts).map(account => ({
      id: account.id,
      name: account.name,
      createdAt: account.createdAt,
      isActive: account.id === activeId
    })).sort((a, b) => {
      // Default always first, then by creation date
      if (a.id === 'default') return -1;
      if (b.id === 'default') return 1;
      return a.createdAt - b.createdAt;
    });
  },

  // Duplicate an account
  async duplicateAccount(sourceId, newName) {
    const accounts = await this.getAccounts();
    const sourceAccount = accounts[sourceId];

    if (!sourceAccount) {
      throw new Error(`Source account ${sourceId} does not exist`);
    }

    // Check account limit
    const accountCount = Object.keys(accounts).length;
    if (accountCount >= this.MAX_ACCOUNTS) {
      throw new Error(`Maximum of ${this.MAX_ACCOUNTS} accounts reached`);
    }

    const id = this.generateAccountId();
    const sanitizedName = (newName || `${sourceAccount.name} (Copy)`).trim().slice(0, 50);

    const newAccount = {
      id,
      name: sanitizedName,
      createdAt: Date.now(),
      settings: JSON.parse(JSON.stringify(sourceAccount.settings)) // Deep copy
    };

    // Reset usage stats for the new account
    newAccount.settings.messagesUsed = 0;

    accounts[id] = newAccount;

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({ [this.STORAGE_KEYS.ACCOUNTS]: accounts }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve(newAccount);
      });
    });
  },

  // Deep merge utility
  deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = this.deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    }

    return result;
  }
};

// Export for ES modules (popup) and CommonJS (background)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccountManager;
}
