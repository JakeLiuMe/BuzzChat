// BuzzChat - Background Service Worker
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.
// Handles alarms, cross-tab communication, persistent state, and license verification

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Import native messaging handler for MCP server communication
import { initNativeMessaging, handleNativeMessage } from './nativeMessaging.js';

// License verification configuration
const LICENSE_CONFIG = {
  TRIAL_DAYS: 7,
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000 // 24 hours
};

// Tier-specific limits (Claude-style pricing model)
// Free: Generous to compete with free bots (Nightbot, etc.)
// Pro: Power users - more capacity
// Max: Premium with AI features (future)
function getTierLimits(tier) {
  switch(tier) {
    case 'max':
      return {
        messages: Infinity,
        faqRules: Infinity,
        timers: Infinity,
        templates: Infinity,
        aiCredits: 500  // Monthly AI credits (future feature)
      };
    case 'pro':
    case 'business': // Legacy tier name
      return {
        messages: 250,  // Per show
        faqRules: Infinity,
        timers: Infinity,
        templates: Infinity,
        aiCredits: 0
      };
    default: // 'free'
      return {
        messages: 50,   // Per show (generous - beats "crippled free tier" trap)
        faqRules: 3,    // Enough to be useful
        timers: 2,      // Basic functionality
        templates: 5,   // Starter pack
        aiCredits: 0
      };
  }
}

// Verify and sync license on startup
async function verifyLicense() {
  try {
    // Get user data and settings from sync storage (settings + license sync across devices)
    let syncData;
    try {
      syncData = await browserAPI.storage.sync.get(['extensionpay_user', 'whatnotBotLicense', 'whatnotBotSettings']);
    } catch (e) {
      console.error('[BuzzChat] Failed to get sync storage:', e);
      syncData = {};
    }
    const user = syncData.extensionpay_user;
    const cachedLicense = syncData.whatnotBotLicense;
    const settings = syncData.whatnotBotSettings || {};

    let license = { tier: 'free', paid: false, trialActive: false };

    if (user) {
      if (user.paid) {
        // Paid user
        // SECURITY: Don't store email/customerId in sync storage - only store tier info
        license = {
          tier: user.planId === 'business' ? 'business' : 'pro',
          paid: true,
          trialActive: false,
          // Email and customerId are available from ExtensionPay when needed
          hasAccount: true
        };
      } else if (user.trialStartedAt) {
        // Check if trial is still active
        const trialStart = new Date(user.trialStartedAt);
        const trialEnd = new Date(trialStart.getTime() + (LICENSE_CONFIG.TRIAL_DAYS * 24 * 60 * 60 * 1000));

        if (new Date() < trialEnd) {
          license = {
            tier: 'pro',
            paid: false,
            trialActive: true,
            trialEndsAt: trialEnd.toISOString()
          };
        } else {
          // Trial expired - revert to free
          license = { tier: 'free', paid: false, trialActive: false, trialExpired: true };
        }
      }
    }

    // Cache the license (sync storage for cross-device sync)
    await browserAPI.storage.sync.set({
      whatnotBotLicense: { ...license, cachedAt: Date.now() }
    });

    // Sync tier with settings and apply tier-specific limits
    if (settings.tier !== license.tier) {
      const limits = getTierLimits(license.tier);
      settings.tier = license.tier;
      settings.messagesLimit = limits.messages;
      settings.faqRulesLimit = limits.faqRules;
      settings.timersLimit = limits.timers;
      settings.templatesLimit = limits.templates;
      await browserAPI.storage.sync.set({ whatnotBotSettings: settings });
      console.log('[BuzzChat] License synced:', license.tier, 'limits:', limits);
    }

    return license;

  } catch (error) {
    console.error('[BuzzChat] License verification failed:', error);
    return { tier: 'free', paid: false, trialActive: false };
  }
}

// Initialize on install
browserAPI.runtime.onInstalled.addListener((details) => {
  console.log('[BuzzChat] Extension installed:', details.reason);

  // Set default settings if new install (sync storage for cross-device sync)
  if (details.reason === 'install') {
    const freeLimits = getTierLimits('free');
    browserAPI.storage.sync.set({
      whatnotBotSettings: {
        tier: 'free',
        messagesUsed: 0,
        messagesLimit: freeLimits.messages, // Per-show limit based on tier
        faqRulesLimit: freeLimits.faqRules,
        timersLimit: freeLimits.timers,
        templatesLimit: freeLimits.templates,
        referralBonus: 0, // Bonus messages from referrals
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
          rules: [
            {
              triggers: ['shipping', 'ship', 'deliver'],
              reply: 'We ship within 2-3 business days! US shipping is free over $50.',
              caseSensitive: false
            },
            {
              triggers: ['payment', 'pay', 'credit card'],
              reply: 'We accept all major credit cards and PayPal!',
              caseSensitive: false
            }
          ]
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
        templates: [
          {
            name: 'Shipping Info',
            text: 'Free shipping on orders over $50! US orders ship within 2-3 business days.'
          },
          {
            name: 'Follow Reminder',
            text: 'Make sure to follow me for more amazing deals! New items added daily!'
          }
        ],
        commands: {
          enabled: false,
          list: []
        },
        quickReply: {
          enabled: true,
          minimized: false,
          buttons: [
            { text: 'SOLD!', emoji: '🔥' },
            { text: 'Next item!', emoji: '➡️' },
            { text: '5 min break', emoji: '⏰' },
            { text: 'Thanks for watching!', emoji: '🙏' }
          ]
        },
        settings: {
          chatSelector: '',
          soundNotifications: true,
          showMessageCount: true,
          darkMode: false,
          watermark: false
        }
      }
    });

    console.log('[BuzzChat] Default settings initialized');
  }
});

// Listen for messages from content scripts and popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Whatnot Bot Background] Received message:', message.type);

  // Handle MCP bridge messages
  if (message && message.source === 'mcp-bridge') {
    handleNativeMessage(message).then(sendResponse);
    return true;
  }

  switch (message.type) {
    case 'MESSAGE_SENT':
      // Forward to popup to update counter
      forwardToPopup(message);
      break;

    case 'GET_SETTINGS':
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        sendResponse(result.whatnotBotSettings);
      });
      return true; // Keep channel open for async response

    case 'RESET_MESSAGE_COUNT':
      // Reset daily message count (for free tier)
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        if (result.whatnotBotSettings) {
          result.whatnotBotSettings.messagesUsed = 0;
          browserAPI.storage.sync.set({ whatnotBotSettings: result.whatnotBotSettings });
          sendResponse({ success: true });
        }
      });
      return true;

    case 'VERIFY_LICENSE':
      // Verify and return current license
      verifyLicense().then(license => {
        sendResponse(license);
      });
      return true;

    case 'GET_LICENSE':
      // Get cached license (from sync storage for cross-device sync)
      browserAPI.storage.sync.get(['whatnotBotLicense'], (result) => {
        sendResponse(result.whatnotBotLicense || { tier: 'free', paid: false });
      });
      return true;

    case 'GET_TIER_LIMITS':
      // Get limits for a specific tier (or current tier if not specified)
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        const tier = message.tier || result.whatnotBotSettings?.tier || 'free';
        const limits = getTierLimits(tier);
        sendResponse({ tier, limits });
      });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Forward message to popup
function forwardToPopup(message) {
  browserAPI.runtime.sendMessage(message).catch(err => {
    // Popup might not be open - only log unexpected errors
    if (err?.message && !err.message.includes('Receiving end does not exist')) {
      console.warn('[BuzzChat] Forward to popup failed:', err.message);
    }
  });
}

// Set up daily alarm to reset message count for free tier
browserAPI.alarms.create('resetDailyMessages', {
  periodInMinutes: 1440 // 24 hours
});

// Set up daily alarm for analytics cleanup
browserAPI.alarms.create('cleanupAnalytics', {
  periodInMinutes: 1440 // 24 hours
});

browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyMessages') {
    browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.whatnotBotSettings && result.whatnotBotSettings.tier === 'free') {
        result.whatnotBotSettings.messagesUsed = 0;
        browserAPI.storage.sync.set({ whatnotBotSettings: result.whatnotBotSettings }, () => {
          if (browserAPI.runtime.lastError) {
            console.error('[BuzzChat] Storage set error:', browserAPI.runtime.lastError);
          } else {
            console.log('[BuzzChat] Daily message count reset');
          }
        });
      }
    });
  }

  if (alarm.name === 'cleanupAnalytics') {
    // Clean up old analytics data (keep last 90 days)
    browserAPI.storage.local.get(['whatnotBotAnalytics'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.whatnotBotAnalytics && result.whatnotBotAnalytics.dailyStats) {
        const data = result.whatnotBotAnalytics;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffKey = cutoffDate.toISOString().split('T')[0];

        let cleaned = false;
        Object.keys(data.dailyStats).forEach(key => {
          if (key < cutoffKey) {
            delete data.dailyStats[key];
            cleaned = true;
          }
        });

        if (cleaned) {
          browserAPI.storage.local.set({ whatnotBotAnalytics: data }, () => {
            if (browserAPI.runtime.lastError) {
              console.error('[BuzzChat] Analytics cleanup error:', browserAPI.runtime.lastError);
            } else {
              console.log('[BuzzChat] Analytics data cleaned up');
            }
          });
        }
      }
    });
  }
});

// Handle extension icon click
browserAPI.action.onClicked.addListener((tab) => {
  // Open popup - this is handled by default_popup in manifest
  // This listener is for when there's no popup defined
});

// Monitor tab updates to inject content script if needed
browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('whatnot.com')) {
    console.log('[BuzzChat] Whatnot tab detected:', tab.url);
  }
});

// Set up license verification alarm (every 6 hours)
browserAPI.alarms.create('verifyLicense', {
  periodInMinutes: 360 // 6 hours
});

// Add license verification to alarm handler
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'verifyLicense') {
    verifyLicense().then(license => {
      console.log('[BuzzChat] License verified:', license.tier);
    });
  }
});

// Verify license on startup
verifyLicense().then(license => {
  console.log('[BuzzChat] Initial license verification:', license.tier);
});

// Initialize native messaging for MCP server communication
initNativeMessaging();

console.log('[BuzzChat] Background service worker started');
