// BuzzChat - Background Service Worker
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Unauthorized copying, modification, or distribution is strictly prohibited.
// This software is protected by copyright law and international treaties.
// Handles alarms, cross-tab communication, persistent state, and license verification

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Import native messaging handler for MCP server communication
import { initNativeMessaging, handleNativeMessage } from './nativeMessaging.js';

// =============================================================================
// SECURE AI PROXY
// =============================================================================
// All Anthropic API calls are routed through this background worker so that
// API keys never appear in content-script network traffic (DevTools safe).

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const HAIKU_MODEL = 'claude-3-haiku-20240307';
const AI_MAX_TOKENS = 100;
const AI_TIMEOUT_MS = 5000;

const AI_TONE_STYLES = {
  friendly: 'warm, casual, use emojis sparingly, helpful and approachable',
  professional: 'polite, clear, businesslike, courteous',
  hype: 'excited, energetic, lots of enthusiasm, occasional emojis like fire and sparkles',
  chill: 'relaxed, laid-back, conversational, easygoing'
};

function buildAISystemPrompt(context, tone) {
  const toneStyle = AI_TONE_STYLES[tone] || AI_TONE_STYLES.friendly;
  let prompt = `You are a chat assistant for a live selling stream. Your job is to respond helpfully to viewer questions while keeping the energy positive.\n\nTone: ${toneStyle}\n\nContext:`;
  if (context.platform) prompt += `\n- Platform: ${context.platform}`;
  if (context.sellerName) prompt += `\n- Seller name: ${context.sellerName}`;
  if (context.currentItem) prompt += `\n- Currently selling: ${context.currentItem}`;
  if (context.additionalContext) prompt += `\n- Topic: ${context.additionalContext}`;
  prompt += '\n\nCRITICAL RULES:\n1. Keep responses under 100 characters (this is live chat!)\n2. NEVER mention you are AI, a bot, or automated\n3. NEVER give specific prices - say "Check the listing!" or "Posted in chat!"\n4. NEVER give specific shipping costs - say "Depends on location, check listing!"\n5. Be genuinely helpful and engaging\n6. Match the casual tone of live stream chat\n7. If unsure about item details, redirect to the stream or listing';
  return prompt;
}

async function handleAIRequest(payload) {
  const { userMessage, context = {}, tone = 'friendly', apiKey } = payload;

  if (!apiKey || !userMessage) {
    return { error: 'Missing required fields' };
  }

  const systemPrompt = buildAISystemPrompt(context, tone);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) return { error: 'Invalid API key' };
      if (response.status === 429) return { error: 'Rate limited - too many requests' };
      if (response.status === 400) return { error: errorData.error?.message || 'Bad request' };
      return { error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const responseText = (data.content?.[0]?.text || '').trim().slice(0, 150);

    return {
      text: responseText,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') return { error: 'Request timed out' };
    return { error: error.message || 'Unknown AI error' };
  }
}

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
      syncData = await browserAPI.storage.sync.get(['extensionpay_user', 'buzzchatLicense', 'buzzchatSettings']);
    } catch (e) {
      console.error('[BuzzChat] Failed to get sync storage:', e);
      syncData = {};
    }
    const user = syncData.extensionpay_user;
    const _cachedLicense = syncData.buzzchatLicense;
    const settings = syncData.buzzchatSettings || {};

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
      buzzchatLicense: { ...license, cachedAt: Date.now() }
    });

    // Sync tier with settings and apply tier-specific limits
    if (settings.tier !== license.tier) {
      const limits = getTierLimits(license.tier);
      settings.tier = license.tier;
      settings.messagesLimit = limits.messages;
      settings.faqRulesLimit = limits.faqRules;
      settings.timersLimit = limits.timers;
      settings.templatesLimit = limits.templates;
      await browserAPI.storage.sync.set({ buzzchatSettings: settings });
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
      buzzchatSettings: {
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
  console.log('[BuzzChat] Received message:', message.type);

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
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        sendResponse(result.buzzchatSettings);
      });
      return true; // Keep channel open for async response

    case 'RESET_MESSAGE_COUNT':
      // Reset daily message count (for free tier)
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        if (result.buzzchatSettings) {
          result.buzzchatSettings.messagesUsed = 0;
          browserAPI.storage.sync.set({ buzzchatSettings: result.buzzchatSettings });
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
      browserAPI.storage.sync.get(['buzzchatLicense'], (result) => {
        sendResponse(result.buzzchatLicense || { tier: 'free', paid: false });
      });
      return true;

    case 'GET_TIER_LIMITS':
      // Get limits for a specific tier (or current tier if not specified)
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        const tier = message.tier || result.buzzchatSettings?.tier || 'free';
        const limits = getTierLimits(tier);
        sendResponse({ tier, limits });
      });
      return true;

    case 'GET_AI_CREDITS':
    case 'getAICredits':
      // Get AI credits for Max tier users
      getAICredits().then(credits => {
        sendResponse(credits);
      }).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    case 'AI_GENERATE_RESPONSE':
      // SECURE AI PROXY: Handle AI requests from content scripts
      // The API key stays in the background worker's network traffic only
      handleAIRequest(message.payload).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ error: err.message });
      });
      return true;

    default:
      // Also handle action-based messages for backward compatibility
      if (message.action === 'getAICredits') {
        getAICredits().then(credits => {
          sendResponse(credits);
        }).catch(err => {
          sendResponse({ error: err.message });
        });
        return true;
      }
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Get AI credits from storage
async function getAICredits() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchat_ai_credits'], (result) => {
      const data = result.buzzchat_ai_credits || {};
      const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"
      const MONTHLY_ALLOWANCE = 500;

      // Reset if new month
      if (data.month !== currentMonth) {
        resolve({
          remaining: MONTHLY_ALLOWANCE,
          used: 0,
          month: currentMonth,
          resetDate: getNextResetDate()
        });
        return;
      }

      resolve({
        remaining: Math.max(0, MONTHLY_ALLOWANCE - (data.used || 0)),
        used: data.used || 0,
        month: currentMonth,
        resetDate: getNextResetDate()
      });
    });
  });
}

// Get next reset date (1st of next month)
function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

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
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.buzzchatSettings && result.buzzchatSettings.tier === 'free') {
        result.buzzchatSettings.messagesUsed = 0;
        browserAPI.storage.sync.set({ buzzchatSettings: result.buzzchatSettings }, () => {
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
    browserAPI.storage.local.get(['buzzchatAnalytics'], (result) => {
      if (browserAPI.runtime.lastError) {
        console.error('[BuzzChat] Storage error:', browserAPI.runtime.lastError);
        return;
      }
      if (result.buzzchatAnalytics && result.buzzchatAnalytics.dailyStats) {
        const data = result.buzzchatAnalytics;
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
          browserAPI.storage.local.set({ buzzchatAnalytics: data }, () => {
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
browserAPI.action.onClicked.addListener((_tab) => {
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
