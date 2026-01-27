// ExtensionPay Integration for BuzzChat
// Handles subscription management and license verification

// Browser API compatibility - works on both Chrome and Firefox
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const ExtensionPay = {
  // Configuration - UPDATE THESE VALUES after creating ExtensionPay account
  EXTENSION_ID: 'buzzchat', // Your ExtensionPay extension ID

  // Pricing tiers - Competitive pricing to undercut Vendoo/Nifty
  PLANS: {
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 7.99, // $7.99/month
      annualPrice: 59, // $59/year (38% savings)
      features: ['unlimited_messages', 'unlimited_templates', 'unlimited_faq', 'analytics', 'priority_support']
    },
    business: {
      id: 'business',
      name: 'Business',
      price: 19.99, // $19.99/month
      annualPrice: 149, // $149/year (38% savings)
      features: ['unlimited_messages', 'unlimited_templates', 'unlimited_faq', 'analytics', 'priority_support', 'multi_account', 'api_access', 'advanced_analytics']
    }
  },

  // Trial configuration
  TRIAL_DAYS: 7,

  // Cache expiry (24 hours)
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000,

  // Initialize ExtensionPay
  async init() {
    console.log('[BuzzChat] Initializing...');

    // Check for cached license first
    const cachedLicense = await this.getCachedLicense();
    if (cachedLicense && !this.isLicenseExpired(cachedLicense)) {
      console.log('[BuzzChat] Using cached license:', cachedLicense.tier);
      return cachedLicense;
    }

    // Verify license with server
    return await this.verifyLicense();
  },

  // Get cached license from storage (sync storage for cross-device sync)
  async getCachedLicense() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotLicense'], (result) => {
        resolve(result.whatnotBotLicense || null);
      });
    });
  },

  // Cache license in storage (sync storage for cross-device sync)
  async cacheLicense(license) {
    return new Promise((resolve) => {
      browserAPI.storage.sync.set({
        whatnotBotLicense: {
          ...license,
          cachedAt: Date.now()
        }
      }, resolve);
    });
  },

  // Check if cached license is expired
  isLicenseExpired(license) {
    if (!license?.cachedAt) return true;
    return Date.now() - license.cachedAt > this.CACHE_EXPIRY_MS;
  },

  // Verify license with ExtensionPay server
  async verifyLicense() {
    try {
      // Get user info from ExtensionPay
      const user = await this.getUser();

      if (!user) {
        // No user found - free tier
        const freeLicense = { tier: 'free', paid: false, trialActive: false };
        await this.cacheLicense(freeLicense);
        return freeLicense;
      }

      // Check subscription status
      let tier = 'free';
      let paid = false;
      let trialActive = false;
      let trialEndsAt = null;

      if (user.paid) {
        paid = true;
        // Determine tier based on plan
        if (user.planId === 'business') {
          tier = 'business';
        } else {
          tier = 'pro';
        }
      } else if (user.trialStartedAt) {
        // Check if trial is still active
        const trialStart = new Date(user.trialStartedAt);
        const trialEnd = new Date(trialStart.getTime() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000));

        if (new Date() < trialEnd) {
          trialActive = true;
          trialEndsAt = trialEnd.toISOString();
          tier = 'pro'; // Trial gets Pro features
        }
      }

      const license = {
        tier,
        paid,
        trialActive,
        trialEndsAt,
        email: user.email || null,
        customerId: user.id || null
      };

      await this.cacheLicense(license);
      console.log('[BuzzChat] License verified:', license);
      return license;

    } catch (error) {
      console.error('[BuzzChat] License verification failed:', error);

      // Fall back to cached license if available
      const cached = await this.getCachedLicense();
      if (cached) {
        return cached;
      }

      // Default to free tier
      return { tier: 'free', paid: false, trialActive: false };
    }
  },

  // Get user from ExtensionPay
  async getUser() {
    // ExtensionPay stores user data in browserAPI.storage.sync
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['extensionpay_user'], (result) => {
        resolve(result.extensionpay_user || null);
      });
    });
  },

  // Open payment page
  async openPaymentPage(planId = 'pro', isAnnual = false) {
    const baseUrl = `https://extensionpay.com/pay/${this.EXTENSION_ID}`;
    const params = [];

    if (planId === 'business') {
      params.push('plan=business');
    }
    if (isAnnual) {
      params.push('billing=annual');
    }

    const url = params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;

    // Open in new tab
    browserAPI.tabs.create({ url });
  },

  // Start free trial
  async startTrial() {
    try {
      // Record trial start in storage
      const trialData = {
        trialStartedAt: new Date().toISOString(),
        extensionId: this.EXTENSION_ID
      };

      await new Promise((resolve) => {
        browserAPI.storage.sync.set({ extensionpay_user: trialData }, resolve);
      });

      // Update cached license
      const license = {
        tier: 'pro',
        paid: false,
        trialActive: true,
        trialEndsAt: new Date(Date.now() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString()
      };

      await this.cacheLicense(license);
      return license;

    } catch (error) {
      console.error('[BuzzChat] Failed to start trial:', error);
      throw error;
    }
  },

  // Check if user can start a trial
  async canStartTrial() {
    const user = await this.getUser();
    // Can start trial if no user exists or trial hasn't been used
    return !user || !user.trialStartedAt;
  },

  // Open subscription management page
  async openManagementPage() {
    browserAPI.tabs.create({
      url: `https://extensionpay.com/manage/${this.EXTENSION_ID}`
    });
  },

  // Update tier in settings based on license (sync storage for cross-device sync)
  async syncTierWithSettings() {
    const license = await this.getCachedLicense();
    if (!license) return;

    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['whatnotBotSettings'], (result) => {
        const settings = result.whatnotBotSettings || {};
        const newTier = license.tier || 'free';

        if (settings.tier !== newTier) {
          settings.tier = newTier;

          // Tier limits are managed by background.js via getTierLimits()
          // Request limits from background to stay in sync
          browserAPI.runtime.sendMessage({ type: 'GET_TIER_LIMITS', tier: newTier }, (response) => {
            if (response?.limits) {
              settings.messagesLimit = response.limits.messages;
              settings.faqRulesLimit = response.limits.faqRules;
              settings.timersLimit = response.limits.timers;
              settings.templatesLimit = response.limits.templates;
            }
            browserAPI.storage.sync.set({ whatnotBotSettings: settings }, () => {
              console.log('[BuzzChat] Settings synced with tier:', newTier, 'limits:', response?.limits);
              resolve(settings);
            });
          });
        } else {
          resolve(settings);
        }
      });
    });
  },

  // Format trial remaining time
  formatTrialRemaining(trialEndsAt) {
    if (!trialEndsAt) return null;

    const endDate = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = endDate - now;

    if (diffMs <= 0) return 'Trial expired';

    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionPay;
}
