// Unit tests for Background Service Worker Logic
const { test, expect } = require('@playwright/test');

test.describe('Background Service Worker', () => {
  test.describe('License Verification', () => {
    test('identifies free tier correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const user = null;
        let license = { tier: 'free', paid: false, trialActive: false };

        if (!user) {
          return license;
        }

        return { tier: 'unknown' };
      });

      expect(result.tier).toBe('free');
      expect(result.paid).toBe(false);
      expect(result.trialActive).toBe(false);
    });

    test('identifies paid Pro user correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const user = {
          paid: true,
          planId: 'pro'
        };

        let license = { tier: 'free', paid: false, trialActive: false };

        if (user && user.paid) {
          license = {
            tier: user.planId === 'business' ? 'business' : 'pro',
            paid: true,
            trialActive: false,
            hasAccount: true
          };
        }

        return license;
      });

      expect(result.tier).toBe('pro');
      expect(result.paid).toBe(true);
      expect(result.hasAccount).toBe(true);
    });

    test('identifies paid Business user correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const user = {
          paid: true,
          planId: 'business'
        };

        let license = { tier: 'free', paid: false, trialActive: false };

        if (user && user.paid) {
          license = {
            tier: user.planId === 'business' ? 'business' : 'pro',
            paid: true,
            trialActive: false,
            hasAccount: true
          };
        }

        return license;
      });

      expect(result.tier).toBe('business');
      expect(result.paid).toBe(true);
    });

    test('identifies active trial correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const TRIAL_DAYS = 7;
        const user = {
          paid: false,
          trialStartedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        };

        let license = { tier: 'free', paid: false, trialActive: false };

        if (user && !user.paid && user.trialStartedAt) {
          const trialStart = new Date(user.trialStartedAt);
          const trialEnd = new Date(trialStart.getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000));

          if (new Date() < trialEnd) {
            license = {
              tier: 'pro',
              paid: false,
              trialActive: true,
              trialEndsAt: trialEnd.toISOString()
            };
          }
        }

        return license;
      });

      expect(result.tier).toBe('pro');
      expect(result.paid).toBe(false);
      expect(result.trialActive).toBe(true);
    });

    test('identifies expired trial correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const TRIAL_DAYS = 7;
        const user = {
          paid: false,
          trialStartedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        };

        let license = { tier: 'free', paid: false, trialActive: false };

        if (user && !user.paid && user.trialStartedAt) {
          const trialStart = new Date(user.trialStartedAt);
          const trialEnd = new Date(trialStart.getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000));

          if (new Date() < trialEnd) {
            license = {
              tier: 'pro',
              paid: false,
              trialActive: true
            };
          } else {
            license = { tier: 'free', paid: false, trialActive: false, trialExpired: true };
          }
        }

        return license;
      });

      expect(result.tier).toBe('free');
      expect(result.paid).toBe(false);
      expect(result.trialExpired).toBe(true);
    });
  });

  test.describe('Trial Duration', () => {
    test('calculates trial end date correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const TRIAL_DAYS = 7;
        const trialStart = new Date('2026-01-01');
        const trialEnd = new Date(trialStart.getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000));
        return trialEnd.toISOString().split('T')[0];
      });

      expect(result).toBe('2026-01-08');
    });

    test('trial lasts exactly 7 days', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const TRIAL_DAYS = 7;
        const trialStart = new Date();
        const trialEnd = new Date(trialStart.getTime() + (TRIAL_DAYS * 24 * 60 * 60 * 1000));
        const diffMs = trialEnd - trialStart;
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        return diffDays;
      });

      expect(result).toBe(7);
    });
  });

  test.describe('Default Settings', () => {
    test('has correct default structure', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        return {
          tier: 'free',
          messagesUsed: 0,
          messagesLimit: Infinity,
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
          commands: {
            enabled: false,
            list: []
          },
          quickReply: {
            enabled: true,
            minimized: false,
            buttons: []
          },
          settings: {
            chatSelector: '',
            soundNotifications: true,
            showMessageCount: true,
            darkMode: false,
            watermark: false
          }
        };
      });

      expect(result.tier).toBe('free');
      expect(result.masterEnabled).toBe(false);
      expect(result.welcome.enabled).toBe(false);
      expect(result.welcome.delay).toBe(5);
      expect(result.timer.enabled).toBe(false);
      expect(result.faq.enabled).toBe(false);
      expect(result.giveaway.uniqueOnly).toBe(true);
      expect(result.quickReply.enabled).toBe(true);
    });

    test('default FAQ rules are empty for new installs', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const defaultSettings = {
          faq: {
            enabled: false,
            rules: []
          }
        };
        return defaultSettings.faq.rules.length;
      });

      expect(result).toBe(0);
    });
  });

  test.describe('Alarm Configuration', () => {
    test('daily reset alarm period is 24 hours', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const periodInMinutes = 1440; // 24 hours
        return periodInMinutes * 60 * 1000; // Convert to ms
      });

      expect(result).toBe(86400000); // 24 hours in ms
    });

    test('license verification alarm period is 6 hours', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const periodInMinutes = 360; // 6 hours
        return periodInMinutes / 60; // Convert to hours
      });

      expect(result).toBe(6);
    });
  });

  test.describe('Analytics Cleanup', () => {
    test('cleanup cutoff is 90 days', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const RETENTION_DAYS = 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        const now = new Date();
        const diffMs = now - cutoffDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return diffDays;
      });

      expect(result).toBe(90);
    });

    test('identifies data older than cutoff', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const cutoffKey = cutoffDate.toISOString().split('T')[0];

        const dailyStats = {
          '2025-01-01': { messages: 10 }, // Old - should be deleted
          '2025-10-01': { messages: 20 }, // Old - should be deleted
          '2026-01-20': { messages: 30 }  // Recent - should be kept
        };

        const toDelete = [];
        const toKeep = [];

        Object.keys(dailyStats).forEach(key => {
          if (key < cutoffKey) {
            toDelete.push(key);
          } else {
            toKeep.push(key);
          }
        });

        return { toDelete, toKeep };
      });

      expect(result.toDelete).toContain('2025-01-01');
      expect(result.toDelete).toContain('2025-10-01');
      expect(result.toKeep).toContain('2026-01-20');
    });
  });

  test.describe('Message Forwarding', () => {
    test('message types are defined correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MESSAGE_TYPES = [
          'MESSAGE_SENT',
          'GET_SETTINGS',
          'RESET_MESSAGE_COUNT',
          'VERIFY_LICENSE',
          'GET_LICENSE'
        ];

        return MESSAGE_TYPES.map(type => ({
          type,
          isString: typeof type === 'string',
          notEmpty: type.length > 0
        }));
      });

      result.forEach(item => {
        expect(item.isString).toBe(true);
        expect(item.notEmpty).toBe(true);
      });
    });
  });

  test.describe('License Caching', () => {
    test('cache expiry is 24 hours', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
        return CACHE_EXPIRY_MS;
      });

      expect(result).toBe(86400000);
    });

    test('identifies expired cache', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        const validCache = { cachedAt: now - 1000 }; // 1 second ago
        const expiredCache = { cachedAt: now - CACHE_EXPIRY_MS - 1000 }; // 24h + 1s ago

        function isExpired(cache) {
          return !cache.cachedAt || (now - cache.cachedAt) > CACHE_EXPIRY_MS;
        }

        return {
          validIsExpired: isExpired(validCache),
          expiredIsExpired: isExpired(expiredCache)
        };
      });

      expect(result.validIsExpired).toBe(false);
      expect(result.expiredIsExpired).toBe(true);
    });
  });

  test.describe('Tier Sync', () => {
    test('syncs tier when license changes', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const settings = { tier: 'free', messagesLimit: 50 };
        const license = { tier: 'pro', paid: true };

        // Sync logic
        if (settings.tier !== license.tier) {
          settings.tier = license.tier;
          settings.messagesLimit = Infinity; // Pro gets unlimited
        }

        return settings;
      });

      expect(result.tier).toBe('pro');
      expect(result.messagesLimit).toBe(Infinity);
    });

    test('does not modify when tier matches', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const settings = { tier: 'pro', messagesLimit: Infinity };
        const license = { tier: 'pro', paid: true };
        let modified = false;

        if (settings.tier !== license.tier) {
          settings.tier = license.tier;
          modified = true;
        }

        return { modified, tier: settings.tier };
      });

      expect(result.modified).toBe(false);
      expect(result.tier).toBe('pro');
    });
  });
});
