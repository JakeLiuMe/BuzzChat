// BuzzChat - AI Credit System
// Copyright (c) 2024-2026 BuzzChat. All rights reserved.
// Tracks AI usage credits for Max tier users

// Browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const STORAGE_KEY = 'buzzchat_ai_credits';
const MONTHLY_ALLOWANCE = 500;
const WARNING_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 10;

/**
 * AI Credits Manager
 * Tracks monthly AI usage for Max tier users
 * Credits reset on the 1st of each month
 */
const AICreditsManager = {
  MONTHLY_ALLOWANCE,
  WARNING_THRESHOLD,
  CRITICAL_THRESHOLD,

  /**
   * Get current credit status
   * @returns {Promise<{remaining: number, used: number, month: string, resetDate: string}>}
   */
  async getCredits() {
    return new Promise((resolve) => {
      browserAPI.storage.sync.get([STORAGE_KEY], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to get credits:', browserAPI.runtime.lastError);
          resolve(this._getDefaultCredits());
          return;
        }

        const data = result[STORAGE_KEY] || {};
        const currentMonth = this._getCurrentMonth();

        // Reset if new month
        if (data.month !== currentMonth) {
          resolve({
            remaining: MONTHLY_ALLOWANCE,
            used: 0,
            month: currentMonth,
            resetDate: this._getNextResetDate()
          });
          return;
        }

        resolve({
          remaining: Math.max(0, MONTHLY_ALLOWANCE - (data.used || 0)),
          used: data.used || 0,
          month: currentMonth,
          resetDate: this._getNextResetDate()
        });
      });
    });
  },

  /**
   * Use one AI credit
   * @returns {Promise<number>} Remaining credits after use
   * @throws {Error} If no credits remaining
   */
  async useCredit() {
    const credits = await this.getCredits();

    if (credits.remaining <= 0) {
      throw new Error('No AI credits remaining');
    }

    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({
        [STORAGE_KEY]: {
          used: credits.used + 1,
          month: credits.month
        }
      }, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error('Failed to update credits'));
          return;
        }
        resolve(credits.remaining - 1);
      });
    });
  },

  /**
   * Check if credits are low
   * @returns {Promise<{warning: boolean, level?: 'low'|'critical', message?: string}>}
   */
  async checkCreditWarning() {
    const credits = await this.getCredits();

    if (credits.remaining <= CRITICAL_THRESHOLD) {
      return {
        warning: true,
        level: 'critical',
        message: `Only ${credits.remaining} AI credits left! Resets ${this._formatResetDate()}`
      };
    }

    if (credits.remaining <= WARNING_THRESHOLD) {
      return {
        warning: true,
        level: 'low',
        message: `${credits.remaining} AI credits remaining this month`
      };
    }

    return { warning: false };
  },

  /**
   * Check if user can use AI (has credits)
   * @returns {Promise<boolean>}
   */
  async canUseAI() {
    const credits = await this.getCredits();
    return credits.remaining > 0;
  },

  /**
   * Reset credits (for testing or admin use)
   * @returns {Promise<void>}
   */
  async resetCredits() {
    return new Promise((resolve, reject) => {
      browserAPI.storage.sync.set({
        [STORAGE_KEY]: {
          used: 0,
          month: this._getCurrentMonth()
        }
      }, () => {
        if (browserAPI.runtime.lastError) {
          reject(new Error('Failed to reset credits'));
          return;
        }
        resolve();
      });
    });
  },

  /**
   * Get credits usage percentage (0-100)
   * @returns {Promise<number>}
   */
  async getUsagePercentage() {
    const credits = await this.getCredits();
    return Math.round((credits.remaining / MONTHLY_ALLOWANCE) * 100);
  },

  /**
   * Get default credits object
   * @private
   */
  _getDefaultCredits() {
    return {
      remaining: MONTHLY_ALLOWANCE,
      used: 0,
      month: this._getCurrentMonth(),
      resetDate: this._getNextResetDate()
    };
  },

  /**
   * Get current month in YYYY-MM format
   * @private
   */
  _getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
  },

  /**
   * Get next reset date (1st of next month)
   * @private
   */
  _getNextResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  },

  /**
   * Format reset date for display
   * @private
   */
  _formatResetDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Format credits for display
   * @param {number} credits - Number of credits
   * @returns {string} Formatted string like "450/500"
   */
  formatCredits(credits, total = MONTHLY_ALLOWANCE) {
    return `${credits}/${total}`;
  }
};

// Export for ES modules and content scripts
if (typeof window !== 'undefined') {
  window.AICreditsManager = AICreditsManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AICreditsManager;
}
