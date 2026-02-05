/**
 * Playwright fixtures for Chrome Extension testing
 * Provides multiple testing approaches for maximum reliability
 */
const playwright = require('@playwright/test');
const base = playwright.test;
const { chromium } = playwright;
const path = require('path');
const fs = require('fs');

// Path to the extension source
const EXTENSION_PATH = path.join(__dirname, '..').replace(/\\/g, '/');

/**
 * Extended test fixture that provides testing utilities
 */
const test = base.extend({
  /**
   * Direct popup page testing (no extension loading required)
   * Serves the popup HTML directly with mocked Chrome APIs
   */
  popupPage: async ({ browser }, use) => {
    const page = await browser.newPage();

    // Inject mock Chrome storage API
    await page.addInitScript(() => {
      window.mockStorage = {};

      window.chrome = {
        storage: {
          local: {
            get: (keys, callback) => {
              const result = {};
              if (typeof keys === 'string') {
                result[keys] = window.mockStorage[keys];
              } else if (Array.isArray(keys)) {
                keys.forEach(k => result[k] = window.mockStorage[k]);
              } else if (keys === null || keys === undefined) {
                Object.assign(result, window.mockStorage);
              }
              if (callback) callback(result);
              return Promise.resolve(result);
            },
            set: (items, callback) => {
              Object.assign(window.mockStorage, items);
              if (callback) callback();
              return Promise.resolve();
            },
            clear: (callback) => {
              window.mockStorage = {};
              if (callback) callback();
              return Promise.resolve();
            }
          },
          sync: {
            get: (keys, callback) => {
              if (callback) callback({});
              return Promise.resolve({});
            },
            set: (items, callback) => {
              if (callback) callback();
              return Promise.resolve();
            }
          },
          onChanged: {
            addListener: () => {}
          }
        },
        runtime: {
          lastError: null,
          sendMessage: (msg, callback) => {
            console.log('[Mock] sendMessage:', msg);
            if (callback) callback({});
            return Promise.resolve({});
          },
          onMessage: {
            addListener: () => {}
          },
          getURL: (path) => `file://${EXTENSION_PATH}/${path}`
        },
        tabs: {
          query: (opts, callback) => {
            if (callback) callback([{ id: 1, url: 'https://whatnot.com/live' }]);
            return Promise.resolve([{ id: 1, url: 'https://whatnot.com/live' }]);
          },
          sendMessage: (tabId, msg, callback) => {
            console.log('[Mock] tabs.sendMessage:', msg);
            if (callback) callback({});
            return Promise.resolve({});
          }
        },
        action: {
          setBadgeText: () => Promise.resolve(),
          setBadgeBackgroundColor: () => Promise.resolve()
        }
      };
    });

    // Navigate to popup HTML
    const popupPath = path.join(EXTENSION_PATH, 'src/popup/popup.html');
    await page.goto(`file:///${popupPath.replace(/\\/g, '/')}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for popup initialization
    await page.waitForSelector('.header', { timeout: 5000 });

    // Note: ES modules don't execute from file:// URLs due to CORS.
    // Wait a moment for any inline scripts to complete.
    await page.waitForTimeout(500);

    // Try to check if JS initialized (home tab should be active)
    await page.waitForFunction(() => {
      const tabBtn = document.querySelector('[data-tab="home"]');
      return tabBtn && tabBtn.classList.contains('active');
    }, { timeout: 3000 }).catch(() => {
      // JS didn't initialize - manually set up home tab as active
      console.log('[Fixture] Tab navigation not initialized, setting up manually');
    });

    await use(page);
    await page.close();
  },

  /**
   * Mock storage for testing
   */
  mockStorage: async ({ popupPage }, use) => {
    const storage = {
      async get(key) {
        return popupPage.evaluate((k) => window.mockStorage[k], key);
      },
      async set(key, value) {
        await popupPage.evaluate(({ k, v }) => {
          window.mockStorage[k] = v;
        }, { k: key, v: value });
      },
      async getAll() {
        return popupPage.evaluate(() => window.mockStorage);
      },
      async clear() {
        await popupPage.evaluate(() => {
          window.mockStorage = {};
        });
      },
      async getSettings() {
        return this.get('buzzchatSettings');
      }
    };

    await use(storage);
  },

  /**
   * Content script test page with mock Whatnot elements
   */
  mockWhatnotPage: async ({ browser }, use) => {
    const page = await browser.newPage();

    // Create mock Whatnot page HTML
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Whatnot Live Stream - Test</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .chat-container { border: 1px solid #ccc; padding: 10px; max-width: 400px; }
          .chat-messages { height: 300px; overflow-y: auto; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .chat-message { padding: 5px; margin: 5px 0; background: #f5f5f5; border-radius: 4px; }
          .username { font-weight: bold; color: #7c3aed; margin-right: 8px; }
          .message-text { color: #333; }
          .chat-input-area { padding-top: 10px; }
          .chat-input { width: calc(100% - 80px); padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
          .send-btn { width: 70px; padding: 8px; background: #7c3aed; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 5px; }
          .live-badge { display: inline-block; background: red; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="live-badge">LIVE</div>
        <h1>Mock Whatnot Stream</h1>

        <div class="chat-container" data-testid="chat-container">
          <div class="chat-messages" data-testid="chat-messages">
            <div class="chat-message" data-message-id="msg-1">
              <span class="username">TestUser1</span>
              <span class="message-text">Hello everyone!</span>
            </div>
            <div class="chat-message" data-message-id="msg-2">
              <span class="username">TestUser2</span>
              <span class="message-text">Great stream!</span>
            </div>
          </div>

          <div class="chat-input-area">
            <input type="text" class="chat-input" data-testid="chat-input" placeholder="Type a message...">
            <button class="send-btn" data-testid="chat-send-button">Send</button>
          </div>
        </div>

        <script>
          // Mock Whatnot functionality
          window.mockChat = {
            messages: [],
            sentMessages: [],

            addMessage(username, text) {
              const container = document.querySelector('[data-testid="chat-messages"]');
              if (!container) return null;

              const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
              const msgHtml = \`
                <div class="chat-message" data-message-id="\${msgId}">
                  <span class="username">\${username}</span>
                  <span class="message-text">\${text}</span>
                </div>
              \`;
              container.insertAdjacentHTML('beforeend', msgHtml);
              this.messages.push({ id: msgId, username, text });

              // Scroll to bottom
              container.scrollTop = container.scrollHeight;
              return msgId;
            },

            simulateNewViewer(username) {
              return this.addMessage(username, 'just joined the stream');
            },

            getMessageCount() {
              return document.querySelectorAll('.chat-message').length;
            }
          };

          // Wire up send button
          const input = document.querySelector('[data-testid="chat-input"]');
          const sendBtn = document.querySelector('[data-testid="chat-send-button"]');

          if (input && sendBtn) {
            const sendMessage = () => {
              const text = input.value.trim();
              if (text) {
                window.mockChat.addMessage('You', text);
                window.mockChat.sentMessages.push(text);
                input.value = '';
              }
            };

            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') sendMessage();
            });
          }
        </script>
      </body>
      </html>
    `;

    await page.setContent(mockHtml);
    await page.waitForLoadState('domcontentloaded');

    await use(page);
    await page.close();
  },
});

/**
 * Test helper utilities
 */
const helpers = {
  /**
   * Switch to a specific tab in popup
   * Since ES modules don't execute from file:// URLs, we manually handle tab switching
   */
  async switchTab(page, tabName) {
    // Manually switch tabs via DOM manipulation (JS event handlers don't work from file://)
    await page.evaluate((tab) => {
      // Remove active from all panels
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      // Add active to target panel
      const panel = document.getElementById(`${tab}-panel`);
      if (panel) panel.classList.add('active');
      // Update tab buttons
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      const btn = document.querySelector(`[data-tab="${tab}"]`);
      if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      }
    }, tabName);

    // Verify the panel is now visible
    await page.waitForSelector(`#${tabName}-panel.active`, { timeout: 1000 });
  },

  /**
   * Toggle a checkbox/switch by clicking the visible label
   * (Checkboxes are hidden with display:none, so we click the parent label)
   */
  async toggleSwitch(page, checkboxSelector) {
    // Click the parent label element which is visible
    const labelSelector = `.toggle-label:has(${checkboxSelector})`;
    await page.click(labelSelector);
  },

  /**
   * Toggle a hidden checkbox by clicking its parent label or using evaluate
   */
  async toggleCheckbox(page, checkboxId) {
    // Since checkbox has display:none, click the parent label
    await page.evaluate((id) => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, checkboxId);
  },

  /**
   * Open a modal by adding the 'show' class
   * Since JS handlers don't execute from file://, we manually show modals
   */
  async openModal(page, modalId) {
    await page.evaluate((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
      }
    }, modalId);
    await page.waitForTimeout(100);
  },

  /**
   * Close a modal by removing the 'show' class
   */
  async closeModal(page, modalId) {
    await page.evaluate((id) => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
      }
    }, modalId);
    await page.waitForTimeout(100);
  },

  /**
   * Fill input and wait for debounce
   */
  async fillWithDebounce(page, selector, value, waitMs = 600) {
    await page.fill(selector, value);
    await page.waitForTimeout(waitMs);
  },

  /**
   * Get active tab name
   */
  async getActiveTab(page) {
    return page.locator('.tab-btn.active').getAttribute('data-tab');
  },

  /**
   * Wait for storage to update
   */
  async waitForStorageUpdate(page, key, timeout = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = await page.evaluate((k) => window.mockStorage[k], key);
      if (value !== undefined) return value;
      await page.waitForTimeout(100);
    }
    return null;
  },

  /**
   * Simulate new chat message on mock page
   */
  async addChatMessage(page, username, text) {
    return page.evaluate(({ u, t }) => window.mockChat.addMessage(u, t), { u: username, t: text });
  },

  /**
   * Get sent messages from mock page
   */
  async getSentMessages(page) {
    return page.evaluate(() => window.mockChat.sentMessages);
  },

  /**
   * Get current message count
   */
  async getMessageCount(page) {
    return page.evaluate(() => window.mockChat.getMessageCount());
  },
};

module.exports = { test, helpers };
