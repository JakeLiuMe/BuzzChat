// BuzzChat - Referral Feature
// Referral system for bonus messages

import { browserAPI } from '../core/config.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';
import { updateTierBanner } from '../ui/theme.js';

// Referral Module
export const Referral = {
  STORAGE_KEY: 'buzzchatReferral',
  BONUS_PER_REFERRAL: 10,
  CODE_LENGTH: 8,

  // Generate a unique referral code
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // Get or create referral data
  async getData() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        if (result[this.STORAGE_KEY]) {
          resolve(result[this.STORAGE_KEY]);
        } else {
          // Initialize new referral data
          const newData = {
            myCode: this.generateCode(),
            referrals: [], // Users who used my code
            redeemedCode: null, // Code I used (if any)
            bonusMessages: 0,
            createdAt: Date.now()
          };
          browserAPI.storage.local.set({ [this.STORAGE_KEY]: newData });
          resolve(newData);
        }
      });
    });
  },

  // Save referral data
  async saveData(data) {
    return new Promise((resolve) => {
      browserAPI.storage.local.set({ [this.STORAGE_KEY]: data }, resolve);
    });
  },

  // Redeem a referral code
  async redeemCode(code) {
    const data = await this.getData();

    // Validation
    if (!code || typeof code !== 'string') {
      return { success: false, error: 'Please enter a valid code' };
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if already redeemed a code
    if (data.redeemedCode) {
      return { success: false, error: 'You have already redeemed a referral code' };
    }

    // Check if trying to use own code
    if (normalizedCode === data.myCode) {
      return { success: false, error: 'You cannot use your own referral code' };
    }

    // Validate code format
    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      return { success: false, error: 'Invalid code format' };
    }

    // Mark code as redeemed
    data.redeemedCode = normalizedCode;
    data.bonusMessages += this.BONUS_PER_REFERRAL;
    await this.saveData(data);

    // Update settings with bonus
    await this.applyBonus(this.BONUS_PER_REFERRAL);

    return { success: true, bonus: this.BONUS_PER_REFERRAL };
  },

  // Apply bonus messages to settings (sync storage for cross-device sync)
  async applyBonus(amount) {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
        if (result.buzzchatSettings) {
          const settings = result.buzzchatSettings;
          settings.referralBonus = (settings.referralBonus || 0) + amount;
          browserAPI.storage.sync.set({ buzzchatSettings: settings }, resolve);
        } else {
          resolve();
        }
      });
    });
  },

  // Get total bonus (referral bonus for display)
  async getTotalBonus() {
    const data = await this.getData();
    return data.bonusMessages;
  },

  // Get referral count
  async getReferralCount() {
    const data = await this.getData();
    return data.referrals.length;
  }
};

// Initialize referral UI
export async function initReferral() {
  try {
    const data = await Referral.getData();

    // Display user's referral code
    if (elements.referralCode) {
      elements.referralCode.value = data.myCode;
    }

    // Display referral stats
    if (elements.referralCount) {
      elements.referralCount.textContent = data.referrals.length;
    }
    if (elements.referralBonus) {
      elements.referralBonus.textContent = data.bonusMessages;
    }

    // Show/hide redeem section based on whether user already redeemed
    if (data.redeemedCode) {
      if (elements.redeemCode) {
        elements.redeemCode.value = data.redeemedCode;
        elements.redeemCode.disabled = true;
      }
      if (elements.redeemCodeBtn) {
        elements.redeemCodeBtn.disabled = true;
        elements.redeemCodeBtn.textContent = 'Redeemed';
      }
      if (elements.referralRedeemedMsg) {
        elements.referralRedeemedMsg.style.display = 'block';
      }
    }

    // Set up event listeners
    if (elements.copyReferralBtn) {
      elements.copyReferralBtn.addEventListener('click', async () => {
        const code = elements.referralCode?.value;
        if (!code) return;

        try {
          await navigator.clipboard.writeText(code);
          elements.copyReferralBtn.textContent = 'Copied!';
          Toast.success('Referral code copied to clipboard');
          setTimeout(() => {
            elements.copyReferralBtn.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          // Fallback for older browsers
          elements.referralCode.select();
          document.execCommand('copy');
          elements.copyReferralBtn.textContent = 'Copied!';
          Toast.success('Referral code copied');
          setTimeout(() => {
            elements.copyReferralBtn.textContent = 'Copy';
          }, 2000);
        }
      });
    }

    if (elements.redeemCodeBtn) {
      elements.redeemCodeBtn.addEventListener('click', async () => {
        const code = elements.redeemCode?.value?.trim();
        if (!code) {
          Toast.warning('Please enter a referral code');
          return;
        }

        Loading.show(elements.redeemCodeBtn);
        const result = await Referral.redeemCode(code);
        Loading.hide(elements.redeemCodeBtn);

        if (result.success) {
          Toast.success(`Code redeemed! +${result.bonus} bonus messages added`);
          // Update UI
          elements.redeemCode.disabled = true;
          elements.redeemCodeBtn.disabled = true;
          elements.redeemCodeBtn.textContent = 'Redeemed';
          if (elements.referralRedeemedMsg) {
            elements.referralRedeemedMsg.style.display = 'block';
          }
          // Update bonus display
          const newData = await Referral.getData();
          if (elements.referralBonus) {
            elements.referralBonus.textContent = newData.bonusMessages;
          }
          // Update tier banner to reflect new bonus
          updateTierBanner();
        } else {
          Toast.error(result.error);
        }
      });
    }

  } catch (error) {
    console.error('[BuzzChat] Failed to initialize referral:', error);
  }
}
