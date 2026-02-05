/**
 * BuzzChat Native Messaging Handler
 *
 * Handles communication between the MCP server and the browser extension
 * via Native Messaging protocol. Works on Chrome and Firefox.
 *
 * Message types:
 * - GET_SETTINGS: Returns full settings object
 * - UPDATE_SETTINGS: Merges updates into settings
 * - GET_LICENSE: Returns license information
 * - GET_ANALYTICS: Returns analytics data
 * - UPDATE_ANALYTICS: Merges updates into analytics
 */

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const _NATIVE_HOST_NAME = 'com.buzzchat.mcp';

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'buzzchatSettings',
  LICENSE: 'buzzchatLicense',
  ANALYTICS: 'buzzchatAnalytics'
};

/**
 * Initialize native messaging connection
 */
export function initNativeMessaging() {
  // Check if native messaging is available
  if (!browserAPI.runtime.connectNative) {
    console.log('[BuzzChat] Native messaging not available');
    return;
  }

  console.log('[BuzzChat] Native messaging handler initialized');
}

/**
 * Handle incoming native message
 * @param {Object} message - The message from the native host
 * @returns {Promise<Object>} - Response to send back
 */
export async function handleNativeMessage(message) {
  console.log('[BuzzChat] Received native message:', message.type);

  try {
    switch (message.type) {
      case 'GET_SETTINGS':
        return await getSettings();

      case 'UPDATE_SETTINGS':
        return await updateSettings(message.data);

      case 'GET_LICENSE':
        return await getLicense();

      case 'GET_ANALYTICS':
        return await getAnalytics();

      case 'UPDATE_ANALYTICS':
        return await updateAnalytics(message.data);

      case 'PING':
        return { success: true, pong: true };

      default:
        return {
          success: false,
          error: `Unknown message type: ${message.type}`
        };
    }
  } catch (error) {
    console.error('[BuzzChat] Native message error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Get current settings from storage (sync storage for cross-device sync)
 */
async function getSettings() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
      if (browserAPI.runtime.lastError) {
        resolve({
          success: false,
          error: browserAPI.runtime.lastError.message
        });
        return;
      }

      resolve({
        success: true,
        data: result[STORAGE_KEYS.SETTINGS] || getDefaultSettings()
      });
    });
  });
}

/**
 * Update settings in storage (sync storage for cross-device sync)
 * @param {Object} updates - Partial settings to merge
 */
async function updateSettings(updates) {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
      if (browserAPI.runtime.lastError) {
        resolve({
          success: false,
          error: browserAPI.runtime.lastError.message
        });
        return;
      }

      const current = result[STORAGE_KEYS.SETTINGS] || getDefaultSettings();
      const merged = deepMerge(current, updates);

      browserAPI.storage.sync.set({
        [STORAGE_KEYS.SETTINGS]: merged
      }, () => {
        if (browserAPI.runtime.lastError) {
          resolve({
            success: false,
            error: browserAPI.runtime.lastError.message
          });
          return;
        }

        // Notify any open popups/content scripts of the change
        browserAPI.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          data: merged
        }).catch(() => {
          // Ignore errors if no listeners
        });

        resolve({
          success: true,
          data: merged
        });
      });
    });
  });
}

/**
 * Get license information from storage (sync storage for cross-device sync)
 */
async function getLicense() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get([STORAGE_KEYS.LICENSE], (result) => {
      if (browserAPI.runtime.lastError) {
        resolve({
          success: false,
          error: browserAPI.runtime.lastError.message
        });
        return;
      }

      resolve({
        success: true,
        data: result[STORAGE_KEYS.LICENSE] || {
          tier: 'free',
          paid: false,
          trialActive: false
        }
      });
    });
  });
}

/**
 * Get analytics data from storage
 */
async function getAnalytics() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.ANALYTICS], (result) => {
      if (browserAPI.runtime.lastError) {
        resolve({
          success: false,
          error: browserAPI.runtime.lastError.message
        });
        return;
      }

      resolve({
        success: true,
        data: result[STORAGE_KEYS.ANALYTICS] || {
          dailyStats: {},
          totalMessagesSent: 0,
          activeStreak: 0
        }
      });
    });
  });
}

/**
 * Update analytics data in storage
 * @param {Object} updates - Partial analytics to merge
 */
async function updateAnalytics(updates) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.ANALYTICS], (result) => {
      if (browserAPI.runtime.lastError) {
        resolve({
          success: false,
          error: browserAPI.runtime.lastError.message
        });
        return;
      }

      const current = result[STORAGE_KEYS.ANALYTICS] || {
        dailyStats: {},
        totalMessagesSent: 0,
        activeStreak: 0
      };
      const merged = deepMerge(current, updates);

      browserAPI.storage.local.set({
        [STORAGE_KEYS.ANALYTICS]: merged
      }, () => {
        if (browserAPI.runtime.lastError) {
          resolve({
            success: false,
            error: browserAPI.runtime.lastError.message
          });
          return;
        }

        resolve({
          success: true,
          data: merged
        });
      });
    });
  });
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
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
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return {
    tier: 'free',
    messagesUsed: 0,
    messagesLimit: 50, // Free tier default
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
    templates: [],
    moderation: {
      blockedWords: [],
      repeatBlocking: {
        enabled: false,
        maxCount: 3
      }
    },
    giveaway: {
      keywords: [],
      uniqueOnly: true,
      entries: []
    },
    settings: {
      chatSelector: '',
      soundNotifications: true,
      showMessageCount: true
    }
  };
}

// Listen for messages from external native host
browserAPI.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  if (message && message.type) {
    handleNativeMessage(message).then(sendResponse);
    return true; // Keep channel open for async response
  }
});

// Also handle internal messages that may come from the native host bridge
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.source === 'mcp-bridge') {
    handleNativeMessage(message).then(sendResponse);
    return true;
  }
});

// Initialize on load
initNativeMessaging();
