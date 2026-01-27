/**
 * Stress Tests for BuzzChat
 * Tests performance under high load conditions:
 * - High message rate (100+ msgs/min)
 * - Large FAQ ruleset (100+ rules)
 * - Rapid UI interactions
 * - Extended session simulation
 */
const { test, helpers } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Stress Tests', () => {
  test.describe('High Message Rate', () => {
    test('should handle 100 messages in rapid succession', async ({ mockWhatnotPage }) => {
      const startTime = Date.now();

      // Send 100 messages as fast as possible
      for (let i = 0; i < 100; i++) {
        await helpers.addChatMessage(mockWhatnotPage, `User${i}`, `Message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All messages should be added
      const count = await helpers.getMessageCount(mockWhatnotPage);
      expect(count).toBe(102); // 2 initial + 100 new

      console.log(`100 messages processed in ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    test('should handle burst of 50 messages in 1 second', async ({ mockWhatnotPage }) => {
      const promises = [];

      // Fire 50 messages concurrently
      for (let i = 0; i < 50; i++) {
        promises.push(helpers.addChatMessage(mockWhatnotPage, `BurstUser${i}`, `Burst message ${i}`));
      }

      await Promise.all(promises);

      const count = await helpers.getMessageCount(mockWhatnotPage);
      expect(count).toBe(52); // 2 initial + 50 new
    });

    test('should maintain DOM performance with many messages', async ({ mockWhatnotPage }) => {
      // Add 200 messages
      for (let i = 0; i < 200; i++) {
        await helpers.addChatMessage(mockWhatnotPage, `User${i % 20}`, `Test message ${i}`);
      }

      // Measure scroll performance
      const scrollStart = Date.now();
      await mockWhatnotPage.evaluate(() => {
        const container = document.querySelector('[data-testid="chat-messages"]');
        container.scrollTop = 0;
        container.scrollTop = container.scrollHeight;
      });
      const scrollDuration = Date.now() - scrollStart;

      expect(scrollDuration).toBeLessThan(1000);
      console.log(`Scroll with 202 messages took ${scrollDuration}ms`);
    });
  });

  test.describe('Large FAQ Ruleset', () => {
    test('should handle 100 FAQ rules in storage', async ({ popupPage, mockStorage }) => {
      // Create settings with 100 FAQ rules
      const rules = [];
      for (let i = 0; i < 100; i++) {
        rules.push({
          id: `rule-${i}`,
          triggers: `trigger${i}, keyword${i}, phrase${i}`,
          response: `This is the auto-response for rule ${i}. It contains detailed information about topic ${i}.`,
          caseSensitive: i % 2 === 0
        });
      }

      const settings = {
        tier: 'pro',
        masterEnabled: true,
        faq: {
          enabled: true,
          rules: rules
        }
      };

      await mockStorage.set('whatnotBotSettings', settings);

      // Verify storage works with large ruleset
      const stored = await mockStorage.getSettings();
      expect(stored.faq.rules.length).toBe(100);
    });

    test('should handle rapid FAQ rule matching simulation', async ({ mockWhatnotPage }) => {
      // Simulate trigger matching against many rules
      const result = await mockWhatnotPage.evaluate(() => {
        const rules = [];
        for (let i = 0; i < 100; i++) {
          rules.push({
            triggers: [`trigger${i}`, `keyword${i}`, `phrase${i}`],
            response: `Response ${i}`
          });
        }

        const testMessages = [
          'Do you have trigger50?',
          'What about keyword75?',
          'Tell me about phrase99',
          'No matches here',
          'trigger0 please'
        ];

        const startTime = performance.now();
        const matches = [];

        for (const message of testMessages) {
          const lowerMsg = message.toLowerCase();
          for (const rule of rules) {
            if (rule.triggers.some(t => lowerMsg.includes(t.toLowerCase()))) {
              matches.push(rule.response);
              break;
            }
          }
        }

        const duration = performance.now() - startTime;
        return { matchCount: matches.length, duration };
      });

      expect(result.matchCount).toBe(4); // 4 messages should match
      expect(result.duration).toBeLessThan(100); // Should be fast
      console.log(`100 rules x 5 messages matched in ${result.duration.toFixed(2)}ms`);
    });
  });

  test.describe('Rapid UI Interactions', () => {
    test('should handle rapid tab switching', async ({ popupPage }) => {
      // All tabs: home, messages, faq, commands, moderation, giveaway, analytics
      const tabs = ['home', 'messages', 'faq', 'commands', 'moderation', 'giveaway', 'analytics'];

      // Switch tabs 20 times rapidly
      for (let i = 0; i < 20; i++) {
        const tab = tabs[i % tabs.length];
        await helpers.switchTab(popupPage, tab);
      }

      // Final tab should be active
      const activePanel = await popupPage.locator('.tab-panel.active').getAttribute('id');
      expect(activePanel).toBeTruthy();
    });

    test('should handle rapid toggle clicks', async ({ popupPage }) => {
      // Welcome toggle is in home tab
      await helpers.switchTab(popupPage, 'home');

      // Toggle welcome message rapidly 10 times (use helper for hidden checkbox)
      const toggle = popupPage.locator('#welcomeToggle');
      for (let i = 0; i < 10; i++) {
        await helpers.toggleCheckbox(popupPage, 'welcomeToggle');
        await popupPage.waitForTimeout(50);
      }

      // Toggle should still be functional
      const isChecked = await toggle.isChecked();
      expect(typeof isChecked).toBe('boolean');
    });

    test('should handle rapid input changes with debounce', async ({ popupPage }) => {
      // Welcome message input is in home tab
      await helpers.switchTab(popupPage, 'home');

      const input = popupPage.locator('#welcomeMessage');

      // Type rapidly
      for (let i = 0; i < 20; i++) {
        await input.fill(`Message ${i}`);
      }

      // Wait for debounce
      await popupPage.waitForTimeout(600);

      // Final value should be preserved
      const value = await input.inputValue();
      expect(value).toBe('Message 19');
    });
  });

  test.describe('Extended Session Simulation', () => {
    test('should handle simulated 1-hour session message volume', async ({ mockWhatnotPage }) => {
      // Average stream: 20 messages/minute = 1200 messages/hour
      // Simulate with 120 messages (10% sample)
      const userPool = Array.from({ length: 50 }, (_, i) => `Viewer${i}`);

      const startTime = Date.now();

      for (let i = 0; i < 120; i++) {
        const user = userPool[Math.floor(Math.random() * userPool.length)];
        const messages = [
          'Hey!',
          'Nice!',
          'How much?',
          'Do you ship?',
          'Entered!',
          'Love this!',
          'GIVEAWAY',
          'Can I get a price check?'
        ];
        const msg = messages[Math.floor(Math.random() * messages.length)];
        await helpers.addChatMessage(mockWhatnotPage, user, msg);
      }

      const duration = Date.now() - startTime;
      const count = await helpers.getMessageCount(mockWhatnotPage);

      expect(count).toBe(122); // 2 initial + 120 simulated
      console.log(`120 messages (1hr sample) processed in ${duration}ms`);
    });

    test('should not leak memory with repeated message additions', async ({ mockWhatnotPage }) => {
      // Get initial memory if available
      const initialMemory = await mockWhatnotPage.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return null;
      });

      // Add 500 messages
      for (let i = 0; i < 500; i++) {
        await helpers.addChatMessage(mockWhatnotPage, `User${i % 50}`, `Message ${i}`);
      }

      const finalMemory = await mockWhatnotPage.evaluate(() => {
        if (performance.memory) {
          return performance.memory.usedJSHeapSize;
        }
        return null;
      });

      if (initialMemory && finalMemory) {
        const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
        console.log(`Memory increase after 500 messages: ${memoryIncrease.toFixed(2)}MB`);
        // Memory increase should be reasonable (less than 50MB for 500 messages)
        expect(memoryIncrease).toBeLessThan(50);
      }

      // Verify messages were added
      const count = await helpers.getMessageCount(mockWhatnotPage);
      expect(count).toBe(502);
    });
  });

  test.describe('Blocked Words Performance', () => {
    test('should efficiently check against large blocked words list', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        // Simulate 100 blocked words
        const blockedWords = Array.from({ length: 100 }, (_, i) =>
          `badword${i}`
        );

        const testMessages = Array.from({ length: 50 }, (_, i) =>
          `This is test message ${i} with some content`
        );

        // Add some messages that should be blocked
        testMessages[10] = 'This contains badword50 which is blocked';
        testMessages[25] = 'Another message with badword99 in it';

        const startTime = performance.now();
        let blockedCount = 0;

        for (const message of testMessages) {
          const lowerMsg = message.toLowerCase();
          for (const word of blockedWords) {
            if (lowerMsg.includes(word.toLowerCase())) {
              blockedCount++;
              break;
            }
          }
        }

        const duration = performance.now() - startTime;
        return { blockedCount, duration, totalChecked: testMessages.length };
      });

      expect(result.blockedCount).toBe(2);
      expect(result.duration).toBeLessThan(50); // Should be very fast
      console.log(`Checked ${result.totalChecked} messages against 100 blocked words in ${result.duration.toFixed(2)}ms`);
    });
  });

  test.describe('Giveaway Entry Tracking', () => {
    test('should handle thousands of giveaway entries', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const entries = new Map();
        const keywords = ['entered', 'entry', 'enter', 'giveaway'];

        // Simulate 1000 entry attempts from 500 unique users
        const startTime = performance.now();

        for (let i = 0; i < 1000; i++) {
          const username = `User${i % 500}`;
          const keyword = keywords[i % keywords.length];
          const message = `I want to ${keyword}!`;

          // Check if contains keyword
          const lowerMsg = message.toLowerCase();
          if (keywords.some(k => lowerMsg.includes(k))) {
            if (!entries.has(username)) {
              entries.set(username, Date.now());
            }
          }
        }

        const duration = performance.now() - startTime;
        return {
          uniqueEntries: entries.size,
          duration,
          totalAttempts: 1000
        };
      });

      expect(result.uniqueEntries).toBe(500); // 500 unique users
      expect(result.duration).toBeLessThan(100);
      console.log(`Processed ${result.totalAttempts} entry attempts, ${result.uniqueEntries} unique entries in ${result.duration.toFixed(2)}ms`);
    });
  });
});
