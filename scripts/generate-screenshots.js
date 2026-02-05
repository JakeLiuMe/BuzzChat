/**
 * Screenshot Generator for BuzzChat Store Listing
 * Generates screenshots of each popup tab for Chrome Web Store submission
 *
 * Usage: node scripts/generate-screenshots.js
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, '..').replace(/\\/g, '/');
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');

// Mock Chrome APIs (same approach as tests/fixtures.js)
const MOCK_CHROME_SCRIPT = `
  window.mockStorage = {
    buzzchatSettings: {
      isActive: true,
      welcomeMessage: 'Hey {username}! Welcome to the stream! 🎉',
      welcomeEnabled: true,
      welcomeDelay: 2000,
      timerMessages: [
        { id: '1', message: 'Free shipping on orders over $50! 📦', interval: 5, enabled: true },
        { id: '2', message: 'Follow for exclusive deals!', interval: 10, enabled: true }
      ],
      faqRules: [
        { id: '1', triggers: 'shipping, ship', response: 'We ship within 2 business days! US shipping is $5 flat rate.', enabled: true },
        { id: '2', triggers: 'payment, pay', response: 'We accept all major credit cards and PayPal!', enabled: true }
      ],
      templates: [
        { id: '1', name: 'Thanks', message: 'Thanks for watching! See you next time! 👋' },
        { id: '2', name: 'Follow', message: 'Don\\'t forget to follow for notifications! 🔔' }
      ],
      giveawayKeyword: 'giveaway',
      stats: {
        messagesent: 127,
        welcomesSent: 45,
        faqReplies: 32,
        sessionsCount: 12
      }
    }
  };

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
        if (callback) callback({});
        return Promise.resolve({});
      },
      onMessage: {
        addListener: () => {}
      },
      getURL: (p) => p
    },
    tabs: {
      query: (opts, callback) => {
        if (callback) callback([{ id: 1, url: 'https://whatnot.com/live/test-stream' }]);
        return Promise.resolve([{ id: 1, url: 'https://whatnot.com/live/test-stream' }]);
      },
      sendMessage: (tabId, msg, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      }
    },
    action: {
      setBadgeText: () => Promise.resolve(),
      setBadgeBackgroundColor: () => Promise.resolve()
    }
  };
`;

// Tab configurations with expected content
const TABS = [
  { name: 'home', file: 'screenshot-1-home.png', caption: 'Main Interface' },
  { name: 'messages', file: 'screenshot-2-messages.png', caption: 'Timer Messages' },
  { name: 'faq', file: 'screenshot-3-faq.png', caption: 'FAQ Auto-Replies' },
  { name: 'giveaway', file: 'screenshot-4-giveaway.png', caption: 'Giveaway Tracking' },
  { name: 'analytics', file: 'screenshot-5-analytics.png', caption: 'Analytics Dashboard' }
];

async function switchTab(page, tabName) {
  await page.click(`[data-tab="${tabName}"]`);
  await page.waitForTimeout(300);

  // Try to wait for panel to become active
  try {
    await page.waitForSelector(`#${tabName}-panel.active`, { timeout: 2000 });
  } catch (e) {
    // Manually activate if JS isn't handling tabs
    await page.evaluate((tab) => {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`${tab}-panel`);
      if (panel) panel.classList.add('active');
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
  }
}

async function generateScreenshots() {
  console.log('BuzzChat Screenshot Generator\n');

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    console.log(`Created directory: ${SCREENSHOTS_DIR}\n`);
  }

  // Launch browser
  const browser = await chromium.launch({ headless: true });

  // Create page with popup dimensions (400x600 is typical for Chrome extension popups)
  const page = await browser.newPage({
    viewport: { width: 400, height: 600 }
  });

  // Inject mock Chrome APIs
  await page.addInitScript(MOCK_CHROME_SCRIPT);

  // Navigate to popup HTML
  const popupPath = path.join(EXTENSION_PATH, 'src/popup/popup.html').replace(/\\/g, '/');
  console.log(`Loading popup from: file:///${popupPath}\n`);
  await page.goto(`file:///${popupPath}`);

  // Wait for popup to initialize
  await page.waitForSelector('.header', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Wait for JavaScript to initialize tabs
  try {
    await page.waitForFunction(() => {
      const tabBtn = document.querySelector('[data-tab="home"]');
      return tabBtn && tabBtn.classList.contains('active');
    }, { timeout: 5000 });
  } catch (e) {
    console.log('Warning: Tab navigation may not be fully initialized');
  }

  console.log('Generating screenshots:\n');

  // Generate screenshot for each tab
  for (const tab of TABS) {
    try {
      await switchTab(page, tab.name);
      await page.waitForTimeout(300); // Allow animations to settle

      const screenshotPath = path.join(SCREENSHOTS_DIR, tab.file);
      await page.screenshot({ path: screenshotPath });

      console.log(`  ✓ ${tab.file} - ${tab.caption}`);
    } catch (error) {
      console.error(`  ✗ ${tab.file} - Failed: ${error.message}`);
    }
  }

  await browser.close();

  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log('\nDone! Upload these to Chrome Web Store listing.');
}

// Run the generator
generateScreenshots().catch(error => {
  console.error('Screenshot generation failed:', error);
  process.exit(1);
});
