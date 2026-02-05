// BuzzChat - Subscription Management
// ExtensionPay integration for Pro/Business tiers

import { browserAPI } from '../core/config.js';
import { settings, setSettings } from '../core/state.js';
import { saveSettings } from '../core/storage.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { updateTierBanner } from '../ui/theme.js';
import { initUI } from '../ui/init.js';

// ExtensionPay Configuration
export const ExtensionPay = {
  EXTENSION_ID: 'buzzchat',
  TRIAL_DAYS: 7,
  CACHE_EXPIRY_MS: 24 * 60 * 60 * 1000,

  async getCachedLicense() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['buzzchatLicense'], (result) => {
        resolve(result.buzzchatLicense || null);
      });
    });
  },

  async cacheLicense(license) {
    return new Promise((resolve) => {
      browserAPI.storage.sync.set({
        buzzchatLicense: { ...license, cachedAt: Date.now() }
      }, resolve);
    });
  },

  async getUser() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['extensionpay_user'], (result) => {
        resolve(result.extensionpay_user || null);
      });
    });
  },

  async openPaymentPage(planId = 'pro', isAnnual = false) {
    const baseUrl = `https://extensionpay.com/pay/${this.EXTENSION_ID}`;
    let url = baseUrl;
    const params = [];

    if (planId === 'business') {
      params.push('plan=business');
    }
    if (isAnnual) {
      params.push('billing=annual');
    }

    if (params.length > 0) {
      url = `${baseUrl}?${params.join('&')}`;
    }
    browserAPI.tabs.create({ url });
  },

  async startTrial() {
    const trialData = {
      trialStartedAt: new Date().toISOString(),
      extensionId: this.EXTENSION_ID
    };

    await new Promise((resolve) => {
      browserAPI.storage.sync.set({ extensionpay_user: trialData }, resolve);
    });

    const license = {
      tier: 'pro',
      paid: false,
      trialActive: true,
      trialEndsAt: new Date(Date.now() + (this.TRIAL_DAYS * 24 * 60 * 60 * 1000)).toISOString()
    };

    await this.cacheLicense(license);

    // Update settings - Pro tier gets 250 messages/show
    settings.tier = 'pro';
    settings.messagesLimit = 250; // Pro tier limit (synced by background.js)
    await saveSettings();

    return license;
  },

  async canStartTrial() {
    const user = await this.getUser();
    return !user || !user.trialStartedAt;
  },

  async openManagementPage() {
    browserAPI.tabs.create({
      url: `https://extensionpay.com/manage/${this.EXTENSION_ID}`
    });
  },

  formatTrialRemaining(trialEndsAt) {
    if (!trialEndsAt) return null;
    const endDate = new Date(trialEndsAt);
    const now = new Date();
    const diffMs = endDate - now;
    if (diffMs <= 0) return 'Trial expired';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  }
};

// Subscribe - Opens ExtensionPay payment page
export async function subscribe(plan, isAnnual = false) {
  Loading.show(plan === 'pro' ? elements.subscribePro : elements.subscribeBusiness);

  try {
    await ExtensionPay.openPaymentPage(plan, isAnnual);
    Toast.success('Opening payment page...');
    elements.upgradeModal.classList.remove('active');
  } catch (error) {
    console.error('[BuzzChat] Failed to open payment page:', error);
    Toast.error('Failed to open payment page. Please try again.');
  }

  Loading.hide(plan === 'pro' ? elements.subscribePro : elements.subscribeBusiness);
}

// Start free trial
export async function startTrial() {
  Loading.show(elements.startTrialBtn);

  try {
    const canTrial = await ExtensionPay.canStartTrial();

    if (!canTrial) {
      Toast.warning('You have already used your free trial.');
      return;
    }

    await ExtensionPay.startTrial();
    Toast.success('7-day Pro trial activated!');
    elements.upgradeModal.classList.remove('active');
    updateTierBanner();
    initUI();
  } catch (error) {
    console.error('[BuzzChat] Failed to start trial:', error);
    Toast.error('Failed to start trial. Please try again.');
  } finally {
    Loading.hide(elements.startTrialBtn);
  }
}

// Manage subscription
export async function manageSubscription() {
  await ExtensionPay.openManagementPage();
}

// Check if trial is available and update UI
export async function checkTrialAvailability() {
  const canTrial = await ExtensionPay.canStartTrial();
  const license = await ExtensionPay.getCachedLicense();

  if (elements.trialBanner) {
    // Hide trial banner if already used trial or is paid user
    if (!canTrial || (license && (license.paid || license.trialActive))) {
      elements.trialBanner.classList.add('hidden');
    } else {
      elements.trialBanner.classList.remove('hidden');
    }
  }

  // Update tier banner if trial is active
  if (license?.trialActive) {
    const remaining = ExtensionPay.formatTrialRemaining(license.trialEndsAt);
    const tierUsage = elements.tierBanner?.querySelector('.tier-usage');
    if (tierUsage && remaining) {
      tierUsage.textContent = `Trial: ${remaining}`;
    }
  }
}

// Toggle pricing display between monthly and annual
export function togglePricingDisplay(isAnnual) {
  if (elements.proPrice) {
    elements.proPrice.style.display = isAnnual ? 'none' : 'block';
  }
  if (elements.proPriceAnnual) {
    elements.proPriceAnnual.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.proPriceNote) {
    elements.proPriceNote.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.businessPrice) {
    elements.businessPrice.style.display = isAnnual ? 'none' : 'block';
  }
  if (elements.businessPriceAnnual) {
    elements.businessPriceAnnual.style.display = isAnnual ? 'block' : 'none';
  }
  if (elements.businessPriceNote) {
    elements.businessPriceNote.style.display = isAnnual ? 'block' : 'none';
  }
}

// Update message limit with watermark bonus + referral bonus
export function updateMessageLimitWithBonus() {
  // Message limits are managed by background.js via getTierLimits()
  // This function preserved for backwards compatibility but no longer overrides limits
}
