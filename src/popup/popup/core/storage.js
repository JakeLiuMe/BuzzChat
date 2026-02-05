// BuzzChat - Storage Management
// Load and save settings to browser storage

import { browserAPI, DEFAULT_SETTINGS } from './config.js';
import { settings as _settings, setSettings, setUseAccountManager } from './state.js';
import { AccountManager } from '../business/accounts.js';
import { Toast, SaveIndicator } from '../ui/toast.js';

// Load settings from storage (sync storage for cross-device sync)
export async function loadSettings() {
  // First, check if we need to migrate from legacy storage
  await AccountManager.migrateFromLegacy();

  // Try to load from AccountManager (for multi-account support)
  const accountSettings = await AccountManager.getActiveSettings();
  if (accountSettings) {
    setSettings({ ...DEFAULT_SETTINGS, ...accountSettings });
    setUseAccountManager(true);
    return;
  }

  // Fallback to legacy storage
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Failed to load settings:', browserAPI.runtime.lastError);
        resolve();
        return;
      }
      if (result.buzzchatSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.buzzchatSettings });
      }
      resolve();
    });
  });
}

// Save settings to storage (sync storage for cross-device sync)
export async function saveSettings(showToast = false) {
  const { useAccountManager } = await import('./state.js');
  const currentSettings = (await import('./state.js')).settings;

  // Use AccountManager if initialized
  if (useAccountManager) {
    try {
      await AccountManager.updateActiveSettings(currentSettings);

      // Notify content script of settings change
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: currentSettings
          }).catch(() => {});
        }
      });

      SaveIndicator.show();
      if (showToast) Toast.success('Settings saved');
      return;
    } catch (error) {
      console.error('[BuzzChat] Failed to save settings:', error);
      Toast.error('Failed to save settings');
      return;
    }
  }

  // Fallback to legacy storage
  return new Promise((resolve) => {
    browserAPI.storage.sync.set({ buzzchatSettings: currentSettings }, () => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Failed to save settings:', browserAPI.runtime.lastError);
        Toast.error('Failed to save settings');
        resolve();
        return;
      }

      // Notify content script of settings change
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'SETTINGS_UPDATED',
            settings: currentSettings
          }).catch(() => {});
        }
      });

      // Show save indicator
      SaveIndicator.show();

      if (showToast) {
        Toast.success('Settings saved');
      }
      resolve();
    });
  });
}

// Send message to content script
export async function sendMessageToContent(type, data = {}) {
  return new Promise((resolve) => {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        browserAPI.tabs.sendMessage(tabs[0].id, { type, ...data })
          .then(() => resolve(true))
          .catch(() => {
            Toast.error('Please navigate to a live stream first');
            resolve(false);
          });
      } else {
        Toast.error('No active tab found');
        resolve(false);
      }
    });
  });
}
