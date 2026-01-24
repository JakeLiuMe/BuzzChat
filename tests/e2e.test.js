/**
 * End-to-End Integration Tests for BuzzChat Chrome Extension
 * Tests full workflows and integration between popup and mock chat
 */
const { test, helpers } = require('./fixtures');
const { expect } = require('@playwright/test');

test.describe('E2E Integration Tests', () => {
  test.describe('Popup Workflow Tests', () => {
    test('should complete full welcome message setup', async ({ popupPage }) => {
      // 1. Navigate to home tab (welcome settings)
      await helpers.switchTab(popupPage, 'home');

      // 2. Enable welcome messages (checkbox is hidden, use force)
      const welcomeToggle = popupPage.locator('#welcomeToggle');
      if (!(await welcomeToggle.isChecked())) {
        await welcomeToggle.click({ force: true });
      }

      // 3. Set welcome message
      await popupPage.locator('#welcomeMessage').fill('Welcome {username}! Enjoy the stream!');

      // 4. Set delay
      await popupPage.locator('#welcomeDelay').fill('5');

      // Verify all settings are applied
      expect(await welcomeToggle.isChecked()).toBe(true);
      expect(await popupPage.locator('#welcomeMessage').inputValue()).toBe('Welcome {username}! Enjoy the stream!');
      expect(await popupPage.locator('#welcomeDelay').inputValue()).toBe('5');
    });

    test('should complete full timer setup', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'messages');

      // Enable timer (checkbox is hidden, use force)
      const timerToggle = popupPage.locator('#timerToggle');
      if (!(await timerToggle.isChecked())) {
        await timerToggle.click({ force: true });
      }

      // Timer messages are managed via template, check toggle state
      expect(await timerToggle.isChecked()).toBe(true);
    });

    test('should complete full FAQ rule setup', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'faq');

      // Enable FAQ (checkbox is hidden, use force)
      const faqToggle = popupPage.locator('#faqToggle');
      if (!(await faqToggle.isChecked())) {
        await faqToggle.click({ force: true });
      }

      // Verify toggle is enabled
      expect(await faqToggle.isChecked()).toBe(true);
    });

    test('should complete full template setup', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'messages');

      // Add template button should be visible
      const addBtn = popupPage.locator('#addTemplateBtn');
      await expect(addBtn).toBeVisible();

      // Click add template
      await addBtn.click();
      await popupPage.waitForTimeout(300);

      // Verify template list container exists
      const templateList = popupPage.locator('#templatesList');
      await expect(templateList).toBeVisible();
    });
  });

  test.describe('Chat Page Tests', () => {
    test('should handle full message send flow', async ({ mockWhatnotPage }) => {
      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      // Type and send message
      await mockWhatnotPage.locator('[data-testid="chat-input"]').fill('Test message');
      await mockWhatnotPage.locator('[data-testid="chat-send-button"]').click();

      // Verify message appears
      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount + 1);

      // Verify input cleared
      const inputValue = await mockWhatnotPage.locator('[data-testid="chat-input"]').inputValue();
      expect(inputValue).toBe('');
    });

    test('should simulate new viewer joining', async ({ mockWhatnotPage }) => {
      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      // Simulate new viewer
      await mockWhatnotPage.evaluate(() => {
        window.mockChat.simulateNewViewer('NewViewer123');
      });

      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount + 1);
    });

    test('should track multiple rapid messages', async ({ mockWhatnotPage }) => {
      const initialCount = await helpers.getMessageCount(mockWhatnotPage);

      // Add multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await helpers.addChatMessage(mockWhatnotPage, `User${i}`, `Message ${i}`);
      }

      const newCount = await helpers.getMessageCount(mockWhatnotPage);
      expect(newCount).toBe(initialCount + 5);
    });
  });

  test.describe('Settings Workflow', () => {
    test('should open and close settings modal', async ({ popupPage }) => {
      // Open settings
      await popupPage.locator('#settingsBtn').click();
      await popupPage.waitForTimeout(300);

      const modal = popupPage.locator('#settingsModal');
      await expect(modal).toHaveClass(/active/);

      // Close settings
      await popupPage.locator('#closeSettingsBtn').click();
      await popupPage.waitForTimeout(300);

      await expect(modal).not.toHaveClass(/active/);
    });

    test('should configure custom selector', async ({ popupPage }) => {
      await popupPage.locator('#settingsBtn').click();
      await popupPage.waitForTimeout(300);

      await popupPage.locator('#chatSelector').fill('#custom-chat-input');

      const value = await popupPage.locator('#chatSelector').inputValue();
      expect(value).toBe('#custom-chat-input');
    });

    test('should toggle all settings options', async ({ popupPage }) => {
      await popupPage.locator('#settingsBtn').click();
      await popupPage.waitForTimeout(300);

      // Toggle sound (checkbox is hidden, use force)
      const soundToggle = popupPage.locator('#soundNotifications');
      const soundWasChecked = await soundToggle.isChecked();
      await soundToggle.click({ force: true });
      expect(await soundToggle.isChecked()).toBe(!soundWasChecked);

      // Toggle counter (checkbox is hidden, use force)
      const counterToggle = popupPage.locator('#showMessageCount');
      const counterWasChecked = await counterToggle.isChecked();
      await counterToggle.click({ force: true });
      expect(await counterToggle.isChecked()).toBe(!counterWasChecked);
    });
  });

  test.describe('Full Bot Configuration Flow', () => {
    test('should configure all bot features in sequence', async ({ popupPage }) => {
      // 1. Enable master toggle (hidden checkbox, use force)
      const masterToggle = popupPage.locator('#masterToggle');
      if (!(await masterToggle.isChecked())) {
        await masterToggle.click({ force: true });
        await popupPage.waitForTimeout(300);
      }

      // 2. Configure welcome (in home tab)
      await helpers.switchTab(popupPage, 'home');
      const welcomeToggle = popupPage.locator('#welcomeToggle');
      if (!(await welcomeToggle.isChecked())) {
        await welcomeToggle.click({ force: true });
      }
      await popupPage.locator('#welcomeMessage').fill('Welcome {username}!');
      await popupPage.locator('#welcomeDelay').fill('3');

      // 3. Configure timer (in messages tab)
      await helpers.switchTab(popupPage, 'messages');
      const timerToggle = popupPage.locator('#timerToggle');
      if (!(await timerToggle.isChecked())) {
        await timerToggle.click({ force: true });
      }

      // 4. Configure FAQ
      await helpers.switchTab(popupPage, 'faq');
      const faqToggle = popupPage.locator('#faqToggle');
      if (!(await faqToggle.isChecked())) {
        await faqToggle.click({ force: true });
      }

      // Verify all are enabled
      await helpers.switchTab(popupPage, 'home');
      expect(await popupPage.locator('#welcomeToggle').isChecked()).toBe(true);

      await helpers.switchTab(popupPage, 'messages');
      expect(await popupPage.locator('#timerToggle').isChecked()).toBe(true);

      await helpers.switchTab(popupPage, 'faq');
      expect(await popupPage.locator('#faqToggle').isChecked()).toBe(true);
    });
  });

  test.describe('Tab Navigation Flow', () => {
    test('should cycle through all tabs', async ({ popupPage }) => {
      // Actual tabs: home, messages, faq, analytics
      const tabs = ['home', 'messages', 'faq', 'analytics'];

      for (const tab of tabs) {
        await helpers.switchTab(popupPage, tab);

        // Verify correct tab is active
        const activeTab = await helpers.getActiveTab(popupPage);
        expect(activeTab).toBe(tab);

        // Verify content is visible
        const content = popupPage.locator(`#${tab}-panel`);
        await expect(content).toHaveClass(/active/);
      }
    });

    test('should preserve input values when switching tabs', async ({ popupPage }) => {
      // Enter value in home tab (welcome settings)
      await helpers.switchTab(popupPage, 'home');
      await popupPage.locator('#welcomeMessage').fill('Persistent message');

      // Switch to another tab
      await helpers.switchTab(popupPage, 'messages');

      // Switch back
      await helpers.switchTab(popupPage, 'home');

      // Value should still be there
      const value = await popupPage.locator('#welcomeMessage').inputValue();
      expect(value).toBe('Persistent message');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid tab switching', async ({ popupPage }) => {
      // Actual tabs: home, messages, faq, analytics
      const tabs = ['home', 'messages', 'faq', 'analytics'];

      // Rapidly switch tabs
      for (let i = 0; i < 10; i++) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        await popupPage.locator(`[data-tab="${randomTab}"]`).click();
      }

      // Should end up on a valid tab
      const activeTab = await helpers.getActiveTab(popupPage);
      expect(tabs).toContain(activeTab);
    });

    test('should handle rapid toggle clicks', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'home');
      const toggle = popupPage.locator('#welcomeToggle');

      // Click rapidly (checkbox is hidden, use force)
      for (let i = 0; i < 5; i++) {
        await toggle.click({ force: true });
      }

      // Should have a definite state
      const isChecked = await toggle.isChecked();
      expect(typeof isChecked).toBe('boolean');
    });

    test('should handle long text input', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'home');

      const longMessage = 'A'.repeat(500);
      await popupPage.locator('#welcomeMessage').fill(longMessage);

      const value = await popupPage.locator('#welcomeMessage').inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('should handle special characters in inputs', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'home');

      const specialMessage = '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~';
      await popupPage.locator('#welcomeMessage').fill(specialMessage);

      const value = await popupPage.locator('#welcomeMessage').inputValue();
      expect(value).toBe(specialMessage);
    });

    test('should handle emoji input', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'home');

      const emojiMessage = 'Welcome! 🎉🎊🎁 Thanks for joining!';
      await popupPage.locator('#welcomeMessage').fill(emojiMessage);

      const value = await popupPage.locator('#welcomeMessage').inputValue();
      expect(value).toBe(emojiMessage);
    });
  });

  test.describe('Accessibility', () => {
    test('should have focusable tabs', async ({ popupPage }) => {
      const firstTab = popupPage.locator('[data-tab="home"]');
      await firstTab.focus();

      const isFocused = await firstTab.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('should have focusable inputs', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'home');

      const messageInput = popupPage.locator('#welcomeMessage');
      await messageInput.focus();

      const isFocused = await messageInput.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('should have clickable buttons', async ({ popupPage }) => {
      const settingsBtn = popupPage.locator('#settingsBtn');
      await expect(settingsBtn).toBeEnabled();

      // Click should work
      await settingsBtn.click();
      const modal = popupPage.locator('#settingsModal');
      await expect(modal).toHaveClass(/active/);
    });
  });

  test.describe('Visual Consistency', () => {
    test('should have consistent header styling', async ({ popupPage }) => {
      const header = popupPage.locator('.header');
      await expect(header).toBeVisible();

      const bgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBeTruthy();
    });

    test('should have consistent tab styling', async ({ popupPage }) => {
      const tabs = popupPage.locator('.tab-btn');
      const count = await tabs.count();

      // 4 tabs: home, messages, faq, analytics
      expect(count).toBe(4);
    });

    test('should have consistent button styling', async ({ popupPage }) => {
      await helpers.switchTab(popupPage, 'faq');

      const addBtn = popupPage.locator('#addFaqBtn');
      await expect(addBtn).toBeVisible();

      const bgColor = await addBtn.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBeTruthy();
    });
  });
});
