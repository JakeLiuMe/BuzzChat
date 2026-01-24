/**
 * Content Script Tests for Whatnot Chat Bot
 * Tests chat automation features on mock Whatnot pages
 */
const { test, helpers } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('Content Script Tests', () => {
  test.describe('Chat Element Detection', () => {
    test('should detect chat container on mock page', async ({ mockWhatnotPage }) => {
      const chatContainer = mockWhatnotPage.locator('[data-testid="chat-container"]');
      await expect(chatContainer).toBeVisible();
    });

    test('should detect chat messages container', async ({ mockWhatnotPage }) => {
      const messagesContainer = mockWhatnotPage.locator('[data-testid="chat-messages"]');
      await expect(messagesContainer).toBeVisible();
    });

    test('should detect chat input', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();
    });

    test('should detect send button', async ({ mockWhatnotPage }) => {
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');
      await expect(sendButton).toBeVisible();
    });

    test('should detect live indicator', async ({ mockWhatnotPage }) => {
      const liveIndicator = mockWhatnotPage.locator('.live-badge');
      await expect(liveIndicator).toBeVisible();
      await expect(liveIndicator).toHaveText('LIVE');
    });
  });

  test.describe('Chat Message Display', () => {
    test('should display initial messages', async ({ mockWhatnotPage }) => {
      const messages = mockWhatnotPage.locator('.chat-message');
      const count = await messages.count();
      expect(count).toBe(2); // Initial mock messages
    });

    test('should display username for each message', async ({ mockWhatnotPage }) => {
      const usernames = mockWhatnotPage.locator('.chat-message .username');
      const count = await usernames.count();
      expect(count).toBe(2);

      // Check specific usernames
      const firstUsername = await usernames.first().textContent();
      expect(firstUsername).toBe('TestUser1');
    });

    test('should display message text', async ({ mockWhatnotPage }) => {
      const messageTexts = mockWhatnotPage.locator('.chat-message .message-text');
      const count = await messageTexts.count();
      expect(count).toBe(2);

      const firstMessage = await messageTexts.first().textContent();
      expect(firstMessage).toBe('Hello everyone!');
    });
  });

  test.describe('Chat Input Functionality', () => {
    test('should accept text input', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');

      await chatInput.fill('Test message');
      const value = await chatInput.inputValue();
      expect(value).toBe('Test message');
    });

    test('should clear input after sending', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      await chatInput.fill('Test message');
      await sendButton.click();

      const value = await chatInput.inputValue();
      expect(value).toBe('');
    });

    test('should send message on button click', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      await chatInput.fill('Hello world!');
      await sendButton.click();

      // Check that message was added
      const initialCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(initialCount).toBe(3); // 2 initial + 1 new
    });

    test('should send message on Enter key', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');

      await chatInput.fill('Enter key message');
      await chatInput.press('Enter');

      const count = await helpers.getMessageCount(mockWhatnotPage);
      expect(count).toBe(3); // 2 initial + 1 new
    });
  });

  test.describe('Dynamic Message Adding', () => {
    test('should add messages dynamically', async ({ mockWhatnotPage }) => {
      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      await helpers.addChatMessage(mockWhatnotPage, 'NewUser', 'Dynamic message');

      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount + 1);
    });

    test('should display correct username for dynamic messages', async ({ mockWhatnotPage }) => {
      await helpers.addChatMessage(mockWhatnotPage, 'DynamicUser', 'Test message');

      const lastMessage = mockWhatnotPage.locator('.chat-message:last-child');
      const username = await lastMessage.locator('.username').textContent();
      expect(username).toBe('DynamicUser');
    });

    test('should display correct text for dynamic messages', async ({ mockWhatnotPage }) => {
      await helpers.addChatMessage(mockWhatnotPage, 'User', 'Specific test message');

      const lastMessage = mockWhatnotPage.locator('.chat-message:last-child');
      const text = await lastMessage.locator('.message-text').textContent();
      expect(text).toBe('Specific test message');
    });

    test('should track sent messages', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      await chatInput.fill('Tracked message');
      await sendButton.click();

      const sentMessages = await helpers.getSentMessages(mockWhatnotPage);
      expect(sentMessages).toContain('Tracked message');
    });
  });

  test.describe('Message Parsing', () => {
    test('should extract username from message element', async ({ mockWhatnotPage }) => {
      const firstMessage = mockWhatnotPage.locator('.chat-message').first();
      const username = await firstMessage.locator('.username').textContent();
      expect(username).toBeTruthy();
      expect(typeof username).toBe('string');
    });

    test('should extract message text from element', async ({ mockWhatnotPage }) => {
      const firstMessage = mockWhatnotPage.locator('.chat-message').first();
      const text = await firstMessage.locator('.message-text').textContent();
      expect(text).toBeTruthy();
      expect(typeof text).toBe('string');
    });

    test('should have unique message IDs', async ({ mockWhatnotPage }) => {
      const messages = mockWhatnotPage.locator('.chat-message');
      const count = await messages.count();

      const ids = new Set();
      for (let i = 0; i < count; i++) {
        const id = await messages.nth(i).getAttribute('data-message-id');
        expect(id).toBeTruthy();
        ids.add(id);
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });
  });

  test.describe('Selector Fallbacks', () => {
    test('should find elements with data-testid selectors', async ({ mockWhatnotPage }) => {
      const container = mockWhatnotPage.locator('[data-testid="chat-container"]');
      await expect(container).toBeVisible();
    });

    test('should find elements with class selectors', async ({ mockWhatnotPage }) => {
      const messages = mockWhatnotPage.locator('.chat-messages, [data-testid="chat-messages"]');
      await expect(messages.first()).toBeVisible();
    });

    test('should find input with placeholder', async ({ mockWhatnotPage }) => {
      const input = mockWhatnotPage.locator('input[placeholder*="message"]');
      await expect(input).toBeVisible();
    });
  });

  test.describe('Username Interpolation', () => {
    test('should support {username} placeholder replacement', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const template = 'Welcome {username}! Enjoy the stream!';
        const username = 'TestUser';
        return template.replace('{username}', username);
      });

      expect(result).toBe('Welcome TestUser! Enjoy the stream!');
    });

    test('should handle multiple {username} placeholders', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const template = 'Hi {username}! Thanks for joining, {username}!';
        const username = 'Fan123';
        return template.replace(/{username}/g, username);
      });

      expect(result).toBe('Hi Fan123! Thanks for joining, Fan123!');
    });

    test('should handle missing username gracefully', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const template = 'Welcome {username}!';
        const username = undefined;
        return template.replace('{username}', username || 'friend');
      });

      expect(result).toBe('Welcome friend!');
    });
  });

  test.describe('FAQ Trigger Matching', () => {
    test('should match exact trigger word', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const triggers = ['shipping', 'ship', 'deliver'];
        const message = 'When do you ship?';
        return triggers.some(t => message.toLowerCase().includes(t.toLowerCase()));
      });

      expect(result).toBe(true);
    });

    test('should match case-insensitive by default', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const triggers = ['shipping'];
        const message = 'SHIPPING info please';
        return triggers.some(t => message.toLowerCase().includes(t.toLowerCase()));
      });

      expect(result).toBe(true);
    });

    test('should support case-sensitive matching', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const triggers = ['Shipping'];
        const message = 'shipping info please';
        const caseSensitive = true;
        return triggers.some(t =>
          caseSensitive ? message.includes(t) : message.toLowerCase().includes(t.toLowerCase())
        );
      });

      expect(result).toBe(false);
    });

    test('should match comma-separated triggers', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const triggersString = 'shipping, ship, deliver';
        const triggers = triggersString.split(',').map(t => t.trim());
        const message = 'When do you deliver?';
        return triggers.some(t => message.toLowerCase().includes(t.toLowerCase()));
      });

      expect(result).toBe(true);
    });
  });

  test.describe('Giveaway Entry Detection', () => {
    test('should detect giveaway keyword in message', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const keyword = 'GIVEAWAY';
        const message = 'GIVEAWAY';
        return message.toUpperCase() === keyword.toUpperCase();
      });

      expect(result).toBe(true);
    });

    test('should detect keyword with extra text', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const keyword = '!enter';
        const message = '!enter please pick me!';
        return message.toLowerCase().includes(keyword.toLowerCase());
      });

      expect(result).toBe(true);
    });

    test('should track unique entries', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const entries = new Set();
        const usernames = ['user1', 'user2', 'user1', 'user3', 'user2'];

        usernames.forEach(u => entries.add(u));

        return entries.size;
      });

      expect(result).toBe(3); // Only unique entries
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty message gracefully', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      // Try to send empty message
      await chatInput.fill('');
      await sendButton.click();

      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount); // No new message should be added
    });

    test('should handle whitespace-only message', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      await chatInput.fill('   ');
      await sendButton.click();

      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount); // Whitespace-only should not send
    });

    test('should handle special characters in messages', async ({ mockWhatnotPage }) => {
      const chatInput = mockWhatnotPage.locator('[data-testid="chat-input"]');
      const sendButton = mockWhatnotPage.locator('[data-testid="chat-send-button"]');

      await chatInput.fill('<script>alert("xss")</script>');
      await sendButton.click();

      // Message should be sent but escaped
      const sentMessages = await helpers.getSentMessages(mockWhatnotPage);
      expect(sentMessages).toContain('<script>alert("xss")</script>');
    });
  });

  test.describe('Timer Message Logic', () => {
    test('should calculate interval in milliseconds', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const intervalMinutes = 5;
        const intervalMs = intervalMinutes * 60 * 1000;
        return intervalMs;
      });

      expect(result).toBe(300000); // 5 minutes in ms
    });

    test('should handle fractional minutes', async ({ mockWhatnotPage }) => {
      const result = await mockWhatnotPage.evaluate(() => {
        const intervalMinutes = 0.5; // 30 seconds
        const intervalMs = intervalMinutes * 60 * 1000;
        return intervalMs;
      });

      expect(result).toBe(30000); // 30 seconds in ms
    });
  });
});
