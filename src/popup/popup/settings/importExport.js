// BuzzChat - Settings Import/Export
// Settings backup and restore functionality

import { DEFAULT_SETTINGS } from '../core/config.js';
import { settings, setSettings } from '../core/state.js';
import { saveSettings } from '../core/storage.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { initUI } from '../ui/init.js';

// Export settings
export function exportSettings() {
  Loading.show(elements.exportSettingsBtn);

  try {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'buzzchat-settings.json';
    a.click();

    URL.revokeObjectURL(url);
    Toast.success('Settings exported');
  } catch (e) {
    Toast.error('Export failed');
  }

  Loading.hide(elements.exportSettingsBtn);
}

// Validate imported settings schema
export function validateSettingsSchema(imported) {
  // SECURITY: Comprehensive settings validation to prevent malicious imports

  // Check required top-level structure
  if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
    return { valid: false, error: 'Invalid settings format' };
  }

  // Check for dangerous prototype pollution attempts
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const checkForDangerousKeys = (obj, path = '') => {
    if (typeof obj !== 'object' || obj === null) return true;
    for (const key of Object.keys(obj)) {
      if (dangerousKeys.includes(key)) {
        return false;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (!checkForDangerousKeys(obj[key], `${path}.${key}`)) {
          return false;
        }
      }
    }
    return true;
  };

  if (!checkForDangerousKeys(imported)) {
    return { valid: false, error: 'Settings contain unsafe properties' };
  }

  // Size limits to prevent DoS
  const MAX_STRING_LENGTH = 1000;
  const MAX_ARRAY_LENGTH = 100;
  const MAX_OBJECT_DEPTH = 5;

  const checkLimits = (obj, depth = 0) => {
    if (depth > MAX_OBJECT_DEPTH) return false;
    if (typeof obj === 'string' && obj.length > MAX_STRING_LENGTH) return false;
    if (Array.isArray(obj) && obj.length > MAX_ARRAY_LENGTH) return false;
    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        if (!checkLimits(value, depth + 1)) return false;
      }
    }
    return true;
  };

  if (!checkLimits(imported)) {
    return { valid: false, error: 'Settings exceed size limits' };
  }

  // Validate welcome settings
  if (imported.welcome && typeof imported.welcome !== 'object') {
    return { valid: false, error: 'Invalid welcome settings' };
  }

  // Validate timer settings
  if (imported.timer) {
    if (typeof imported.timer !== 'object') {
      return { valid: false, error: 'Invalid timer settings' };
    }
    if (imported.timer.messages && !Array.isArray(imported.timer.messages)) {
      return { valid: false, error: 'Timer messages must be an array' };
    }
  }

  // Validate FAQ settings
  if (imported.faq) {
    if (typeof imported.faq !== 'object') {
      return { valid: false, error: 'Invalid FAQ settings' };
    }
    if (imported.faq.rules && !Array.isArray(imported.faq.rules)) {
      return { valid: false, error: 'FAQ rules must be an array' };
    }
  }

  // Validate templates
  if (imported.templates && !Array.isArray(imported.templates)) {
    return { valid: false, error: 'Templates must be an array' };
  }

  // Validate commands
  if (imported.commands) {
    if (typeof imported.commands !== 'object') {
      return { valid: false, error: 'Invalid commands settings' };
    }
    if (imported.commands.list && !Array.isArray(imported.commands.list)) {
      return { valid: false, error: 'Commands list must be an array' };
    }
  }

  // Validate quickReply
  if (imported.quickReply) {
    if (typeof imported.quickReply !== 'object') {
      return { valid: false, error: 'Invalid quickReply settings' };
    }
    if (imported.quickReply.buttons && !Array.isArray(imported.quickReply.buttons)) {
      return { valid: false, error: 'Quick reply buttons must be an array' };
    }
  }

  // Strip any unexpected top-level keys (whitelist approach)
  const allowedKeys = [
    'tier', 'messagesUsed', 'messagesLimit', 'referralBonus', 'masterEnabled',
    'welcome', 'timer', 'faq', 'moderation', 'giveaway', 'templates',
    'commands', 'quickReply', 'settings'
  ];

  for (const key of Object.keys(imported)) {
    if (!allowedKeys.includes(key)) {
      delete imported[key];
    }
  }

  return { valid: true };
}

// Import settings
export async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  Loading.show(elements.importSettingsBtn);

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    // Validate schema before importing
    const validation = validateSettingsSchema(imported);
    if (!validation.valid) {
      Toast.error(validation.error);
      Loading.hide(elements.importSettingsBtn);
      event.target.value = '';
      return;
    }

    setSettings({ ...DEFAULT_SETTINGS, ...imported });
    await saveSettings();
    initUI();
    Toast.success('Settings imported successfully');
  } catch (e) {
    Toast.error('Invalid settings file');
  }

  Loading.hide(elements.importSettingsBtn);
  event.target.value = '';
}
