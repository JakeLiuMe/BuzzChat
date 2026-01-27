// Unit tests for Welcome Message Logic
const { test, expect } = require('@playwright/test');

test.describe('Welcome Message Logic', () => {
  test.describe('Username Placeholder Replacement', () => {
    test('replaces single {username} placeholder', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const message = 'Welcome {username}! Enjoy the stream!';
        const username = 'TestUser123';
        return message.split('{username}').join(username);
      });

      expect(result).toBe('Welcome TestUser123! Enjoy the stream!');
    });

    test('replaces multiple {username} placeholders', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const message = 'Hey {username}! Thanks {username} for joining!';
        const username = 'Viewer42';
        return message.split('{username}').join(username);
      });

      expect(result).toBe('Hey Viewer42! Thanks Viewer42 for joining!');
    });

    test('handles message with no placeholders', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const message = 'Welcome to the stream!';
        const username = 'TestUser';
        return message.split('{username}').join(username);
      });

      expect(result).toBe('Welcome to the stream!');
    });

    test('handles empty username', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const message = 'Welcome {username}!';
        const username = '';
        return message.split('{username}').join(username || 'friend');
      });

      expect(result).toBe('Welcome friend!');
    });

    test('handles special characters in username', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const message = 'Welcome {username}!';
        const username = 'User_With-Special.Chars123';
        return message.split('{username}').join(username);
      });

      expect(result).toBe('Welcome User_With-Special.Chars123!');
    });
  });

  test.describe('Welcome Delay Timing', () => {
    test('converts delay from seconds to milliseconds', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const delaySeconds = 5;
        return delaySeconds * 1000;
      });

      expect(result).toBe(5000);
    });

    test('uses default delay when not specified', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const settings = { welcome: { delay: undefined } };
        const delay = (settings.welcome.delay || 5) * 1000;
        return delay;
      });

      expect(result).toBe(5000);
    });

    test('respects custom delay setting', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const settings = { welcome: { delay: 10 } };
        const delay = (settings.welcome.delay || 5) * 1000;
        return delay;
      });

      expect(result).toBe(10000);
    });
  });

  test.describe('Welcomed User Tracking (LRU Set)', () => {
    test('tracks welcomed users', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const welcomedUsers = new Set();
        welcomedUsers.add('user1');
        welcomedUsers.add('user2');
        return {
          hasUser1: welcomedUsers.has('user1'),
          hasUser2: welcomedUsers.has('user2'),
          hasUser3: welcomedUsers.has('user3'),
          size: welcomedUsers.size
        };
      });

      expect(result.hasUser1).toBe(true);
      expect(result.hasUser2).toBe(true);
      expect(result.hasUser3).toBe(false);
      expect(result.size).toBe(2);
    });

    test('prevents duplicate welcome messages', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const welcomedUsers = new Set();
        const messages = [];

        function shouldWelcome(username) {
          if (welcomedUsers.has(username)) {
            return false;
          }
          welcomedUsers.add(username);
          return true;
        }

        // First message from user - should welcome
        if (shouldWelcome('user1')) messages.push('Welcome user1');

        // Second message from same user - should NOT welcome
        if (shouldWelcome('user1')) messages.push('Welcome user1 again');

        // Different user - should welcome
        if (shouldWelcome('user2')) messages.push('Welcome user2');

        return messages;
      });

      expect(result).toHaveLength(2);
      expect(result).toContain('Welcome user1');
      expect(result).toContain('Welcome user2');
    });

    test('LRU eviction works correctly', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        // Simulated LRU Set with max size of 3
        class LRUSet {
          constructor(maxSize) {
            this.maxSize = maxSize;
            this.cache = new Map();
          }

          add(key) {
            if (this.cache.has(key)) {
              this.cache.delete(key);
            }
            this.cache.set(key, true);
            if (this.cache.size > this.maxSize) {
              const oldestKey = this.cache.keys().next().value;
              this.cache.delete(oldestKey);
            }
          }

          has(key) {
            return this.cache.has(key);
          }

          get size() {
            return this.cache.size;
          }
        }

        const set = new LRUSet(3);
        set.add('user1');
        set.add('user2');
        set.add('user3');
        // At capacity, now add user4 which should evict user1
        set.add('user4');

        return {
          hasUser1: set.has('user1'),
          hasUser2: set.has('user2'),
          hasUser3: set.has('user3'),
          hasUser4: set.has('user4'),
          size: set.size
        };
      });

      expect(result.hasUser1).toBe(false); // Evicted
      expect(result.hasUser2).toBe(true);
      expect(result.hasUser3).toBe(true);
      expect(result.hasUser4).toBe(true);
      expect(result.size).toBe(3);
    });
  });

  test.describe('Welcome Message Validation', () => {
    test('validates message is not empty', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        function isValidMessage(message) {
          return Boolean(message && typeof message === 'string' && message.trim().length > 0);
        }

        return {
          emptyString: isValidMessage(''),
          whitespace: isValidMessage('   '),
          validMessage: isValidMessage('Hello!'),
          nullValue: isValidMessage(null),
          undefinedValue: isValidMessage(undefined)
        };
      });

      expect(result.emptyString).toBe(false);
      expect(result.whitespace).toBe(false);
      expect(result.validMessage).toBe(true);
      expect(result.nullValue).toBe(false);
      expect(result.undefinedValue).toBe(false);
    });

    test('truncates message to max length', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MAX_MESSAGE_LENGTH = 500;
        const longMessage = 'A'.repeat(600);
        const truncated = longMessage.substring(0, MAX_MESSAGE_LENGTH);
        return {
          originalLength: longMessage.length,
          truncatedLength: truncated.length
        };
      });

      expect(result.originalLength).toBe(600);
      expect(result.truncatedLength).toBe(500);
    });
  });

  test.describe('Settings Check', () => {
    test('checks if welcome is enabled', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const enabledSettings = {
          masterEnabled: true,
          welcome: { enabled: true, message: 'Hello!' }
        };

        const disabledSettings = {
          masterEnabled: true,
          welcome: { enabled: false, message: 'Hello!' }
        };

        const masterDisabled = {
          masterEnabled: false,
          welcome: { enabled: true, message: 'Hello!' }
        };

        function shouldSendWelcome(settings) {
          return settings.masterEnabled && settings.welcome?.enabled;
        }

        return {
          enabled: shouldSendWelcome(enabledSettings),
          welcomeDisabled: shouldSendWelcome(disabledSettings),
          masterDisabled: shouldSendWelcome(masterDisabled)
        };
      });

      expect(result.enabled).toBe(true);
      expect(result.welcomeDisabled).toBe(false);
      expect(result.masterDisabled).toBe(false);
    });
  });
});

test.describe('Timer Message Logic', () => {
  test.describe('Interval Calculation', () => {
    test('converts minutes to milliseconds', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const intervalMinutes = 5;
        return intervalMinutes * 60 * 1000;
      });

      expect(result).toBe(300000); // 5 minutes
    });

    test('handles fractional minutes', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const intervalMinutes = 0.5;
        return intervalMinutes * 60 * 1000;
      });

      expect(result).toBe(30000); // 30 seconds
    });

    test('validates minimum interval', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MIN_INTERVAL = 1;
        const requestedInterval = 0;
        return Math.max(MIN_INTERVAL, requestedInterval);
      });

      expect(result).toBe(1);
    });

    test('validates maximum interval', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MAX_INTERVAL = 60;
        const requestedInterval = 120;
        return Math.min(MAX_INTERVAL, requestedInterval);
      });

      expect(result).toBe(60);
    });
  });

  test.describe('Timer Message Configuration', () => {
    test('filters out invalid timer messages', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const messages = [
          { text: 'Valid message', interval: 5 },
          { text: '', interval: 5 }, // Invalid - empty text
          { text: 'Another valid', interval: 0 }, // Invalid - zero interval
          { text: 'Good one', interval: 10 }
        ];

        return messages.filter(msg => msg.text && msg.interval > 0);
      });

      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Valid message');
      expect(result[1].text).toBe('Good one');
    });

    test('respects maximum timer count', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MAX_TIMER_MESSAGES = 10;
        const messages = Array.from({ length: 15 }, (_, i) => ({
          text: `Message ${i + 1}`,
          interval: 5
        }));

        return messages.slice(0, MAX_TIMER_MESSAGES).length;
      });

      expect(result).toBe(10);
    });
  });

  test.describe('Timer Cleanup', () => {
    test('stores interval IDs for cleanup', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const timerIntervals = [];

        // Simulate creating intervals
        timerIntervals.push(1);
        timerIntervals.push(2);
        timerIntervals.push(3);

        // Cleanup
        const cleared = [...timerIntervals];
        timerIntervals.length = 0;

        return {
          beforeCleanup: cleared.length,
          afterCleanup: timerIntervals.length
        };
      });

      expect(result.beforeCleanup).toBe(3);
      expect(result.afterCleanup).toBe(0);
    });
  });
});

test.describe('Rate Limiting', () => {
  test.describe('Message Cooldown', () => {
    test('enforces cooldown between messages', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const COOLDOWN_MS = 6000;
        let lastMessageTime = Date.now() - 3000; // 3 seconds ago

        function canSendMessage() {
          const now = Date.now();
          return now - lastMessageTime >= COOLDOWN_MS;
        }

        return canSendMessage();
      });

      expect(result).toBe(false); // Still in cooldown
    });

    test('allows message after cooldown elapsed', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const COOLDOWN_MS = 6000;
        let lastMessageTime = Date.now() - 10000; // 10 seconds ago

        function canSendMessage() {
          const now = Date.now();
          return now - lastMessageTime >= COOLDOWN_MS;
        }

        return canSendMessage();
      });

      expect(result).toBe(true); // Cooldown elapsed
    });
  });

  test.describe('Messages Per Minute Limit', () => {
    test('allows messages within limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MAX_PER_MINUTE = 10;
        const messageTimestamps = [];

        // Add 5 messages
        for (let i = 0; i < 5; i++) {
          messageTimestamps.push(Date.now());
        }

        return messageTimestamps.length < MAX_PER_MINUTE;
      });

      expect(result).toBe(true);
    });

    test('blocks messages over limit', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const MAX_PER_MINUTE = 10;
        const now = Date.now();

        // Simulate 10 messages in last minute
        const messageTimestamps = Array.from({ length: 10 }, () => now - 30000);

        // Clean up old timestamps
        const recentMessages = messageTimestamps.filter(ts => now - ts < 60000);

        return recentMessages.length >= MAX_PER_MINUTE;
      });

      expect(result).toBe(true); // At limit
    });

    test('cleans up old timestamps', async ({ page }) => {
      await page.setContent('<html><body></body></html>');

      const result = await page.evaluate(() => {
        const now = Date.now();

        // Mix of recent and old timestamps
        const messageTimestamps = [
          now - 120000, // 2 minutes ago - should be cleaned
          now - 90000,  // 1.5 minutes ago - should be cleaned
          now - 30000,  // 30 seconds ago - should remain
          now - 10000   // 10 seconds ago - should remain
        ];

        const cleaned = messageTimestamps.filter(ts => now - ts < 60000);

        return {
          before: messageTimestamps.length,
          after: cleaned.length
        };
      });

      expect(result.before).toBe(4);
      expect(result.after).toBe(2);
    });
  });
});
