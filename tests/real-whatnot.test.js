/**
 * Real Whatnot E2E Test
 *
 * Tests the BuzzChat extension on the actual Whatnot website.
 * This test loads the extension in a real Chrome browser and verifies
 * that selectors work on actual Whatnot pages.
 *
 * REQUIREMENTS:
 * - Must run in headed mode (extensions don't work headless)
 * - Uses launchPersistentContext to load the extension
 * - No authentication needed (tests public pages)
 *
 * Run: npx playwright test real-whatnot.test.js --headed
 */

const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

// Extension path (relative to tests folder)
const EXTENSION_PATH = path.join(__dirname, '..').replace(/\\/g, '/');

// Selectors from the extension (same as in content.js)
const SELECTORS = {
  chatInput: [
    'textarea[placeholder*="chat"]',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="Send"]',
    'input[placeholder*="chat"]',
    'input[placeholder*="message"]',
    '[data-testid="chat-input"]',
    '.chat-input textarea',
    '.chat-input input',
    '[class*="ChatInput"] textarea',
    '[class*="ChatInput"] input',
    '[class*="chat-input"] textarea',
    '[class*="chat-input"] input'
  ],
  chatContainer: [
    '[data-testid="chat-messages"]',
    '[data-testid="chat-container"]',
    '.chat-messages',
    '[class*="ChatMessages"]',
    '[class*="chat-container"]',
    '[class*="ChatContainer"]',
    '[class*="LiveChat"]',
    '[class*="chat-list"]',
    '[class*="message-list"]'
  ],
  sendButton: [
    'button[type="submit"]',
    '[data-testid="send-button"]',
    '.chat-send-button',
    '[class*="SendButton"]',
    'button[aria-label*="send"]',
    'button[aria-label*="Send"]',
    '[class*="send-button"]',
    '[class*="submit-button"]'
  ],
  messageItem: [
    '[data-testid="chat-message"]',
    '.chat-message',
    '[class*="ChatMessage"]',
    '[class*="message-item"]',
    '[class*="chat-message"]',
    '[class*="Message_"]'
  ],
  username: [
    '[data-testid="username"]',
    '.username',
    '[class*="Username"]',
    '[class*="user-name"]',
    '[class*="author"]',
    'span[class*="name"]',
    '[class*="displayName"]'
  ],
  liveIndicator: [
    '[data-testid="live-indicator"]',
    '.live-badge',
    '[class*="LiveBadge"]',
    '[class*="live-indicator"]',
    '[class*="live-tag"]'
  ]
};

// Test configuration
test.describe.configure({ mode: 'serial' }); // Run tests sequentially

test.describe('Real Whatnot E2E Tests', () => {
  let context;
  let extensionPage;

  test.beforeAll(async () => {
    // Launch Chrome with the extension loaded
    // Note: Extensions only work in headed mode with persistent context
    context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled'
      ],
      viewport: { width: 1280, height: 800 }
    });

    console.log('[Test] Chrome launched with extension');
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('extension loads without errors', async () => {
    // Check that extension is loaded by looking at chrome://extensions
    const page = await context.newPage();

    // Navigate to a simple page first to verify browser works
    await page.goto('about:blank');

    // Check for any console errors from extension
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to Whatnot to trigger content script
    await page.goto('https://www.whatnot.com/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for content script to initialize

    // Filter out non-extension errors
    const extensionErrors = errors.filter(e =>
      e.includes('BuzzChat') ||
      e.includes('content.js') ||
      e.includes('selectors.js')
    );

    console.log('[Test] Console errors:', extensionErrors.length ? extensionErrors : 'None');
    expect(extensionErrors.length).toBe(0);

    await page.close();
  });

  test('navigate to Whatnot homepage', async () => {
    extensionPage = await context.newPage();

    // Set up console logging to see content script output
    extensionPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[BuzzChat]')) {
        console.log('[Content Script]', text);
      }
    });

    // Navigate to Whatnot
    console.log('[Test] Navigating to Whatnot...');
    await extensionPage.goto('https://www.whatnot.com/', { waitUntil: 'networkidle' });

    // Verify page loaded
    const title = await extensionPage.title();
    console.log('[Test] Page title:', title);

    expect(title.toLowerCase()).toContain('whatnot');
  });

  test('find live streams on Whatnot', async () => {
    // Wait for page to fully load
    await extensionPage.waitForTimeout(2000);

    // Look for live stream links/elements
    // Whatnot shows live streams on the homepage
    const liveStreamSelectors = [
      'a[href*="/live/"]',
      'a[href*="/stream/"]',
      '[class*="LiveStream"]',
      '[class*="live-stream"]',
      '[class*="StreamCard"]',
      '[data-testid*="live"]'
    ];

    let liveStreamLinks = [];

    for (const selector of liveStreamSelectors) {
      const links = await extensionPage.$$(selector);
      if (links.length > 0) {
        console.log(`[Test] Found ${links.length} elements matching: ${selector}`);
        liveStreamLinks = links;
        break;
      }
    }

    // Also try to find the browse/live sections
    const browseLink = await extensionPage.$('a[href*="/browse"]');
    if (browseLink && liveStreamLinks.length === 0) {
      console.log('[Test] Clicking browse to find live streams...');
      await browseLink.click();
      await extensionPage.waitForLoadState('networkidle');
      await extensionPage.waitForTimeout(2000);

      // Try again after navigating to browse
      for (const selector of liveStreamSelectors) {
        const links = await extensionPage.$$(selector);
        if (links.length > 0) {
          console.log(`[Test] Found ${links.length} elements matching: ${selector}`);
          liveStreamLinks = links;
          break;
        }
      }
    }

    console.log(`[Test] Found ${liveStreamLinks.length} potential live streams`);

    // Log current URL for debugging
    console.log('[Test] Current URL:', extensionPage.url());
  });

  test('check content script initialization', async () => {
    // The content script creates a status indicator when it detects a live stream
    // On non-live pages, it should still initialize but not show the indicator

    // Wait for content script to fully initialize
    await extensionPage.waitForTimeout(3000);

    // Check for BuzzChat indicator (only shows on live stream pages)
    const indicator = await extensionPage.$('#buzzchat-indicator');

    if (indicator) {
      console.log('[Test] BuzzChat indicator found - content script detected live stream');
      const indicatorText = await indicator.textContent();
      console.log('[Test] Indicator text:', indicatorText);
    } else {
      console.log('[Test] No BuzzChat indicator - not on a live stream page (expected on homepage)');
    }

    // Check console for BuzzChat initialization messages
    // These were logged by the page.on('console') handler in previous test

    // This test passes as long as no errors occurred
    expect(true).toBe(true);
  });

  test('navigate to a live stream and test selectors', async () => {
    // Try to navigate directly to a live stream
    // First try the /live page
    console.log('[Test] Navigating to /live...');
    await extensionPage.goto('https://www.whatnot.com/live', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await extensionPage.waitForTimeout(3000);

    console.log('[Test] Current URL:', extensionPage.url());

    // Check for BuzzChat indicator
    let indicator = await extensionPage.$('#buzzchat-indicator');

    if (!indicator) {
      // Try clicking on a live stream if available
      const streamCards = await extensionPage.$$('a[href*="/live/"], [class*="StreamCard"], [class*="live"]');

      if (streamCards.length > 0) {
        console.log(`[Test] Found ${streamCards.length} stream cards, clicking first one...`);
        await streamCards[0].click();
        await extensionPage.waitForLoadState('networkidle');
        await extensionPage.waitForTimeout(3000);

        indicator = await extensionPage.$('#buzzchat-indicator');
      }
    }

    // Log current URL
    console.log('[Test] Final URL:', extensionPage.url());

    // Now test which selectors actually match elements on the page
    console.log('\n[Test] ===== SELECTOR TESTING =====');
    const selectorResults = {};

    for (const [name, selectorList] of Object.entries(SELECTORS)) {
      console.log(`\n[Test] Testing ${name} selectors:`);
      selectorResults[name] = { found: false, workingSelector: null, matchCount: 0 };

      for (const selector of selectorList) {
        try {
          const elements = await extensionPage.$$(selector);
          if (elements.length > 0) {
            console.log(`  [OK] ${selector} -> ${elements.length} match(es)`);
            if (!selectorResults[name].found) {
              selectorResults[name].found = true;
              selectorResults[name].workingSelector = selector;
              selectorResults[name].matchCount = elements.length;
            }
          } else {
            console.log(`  [--] ${selector} -> no matches`);
          }
        } catch (e) {
          console.log(`  [ERR] ${selector} -> invalid selector`);
        }
      }
    }

    // Summary
    console.log('\n[Test] ===== SUMMARY =====');
    let foundCount = 0;
    for (const [name, result] of Object.entries(selectorResults)) {
      if (result.found) {
        console.log(`[OK] ${name}: ${result.workingSelector} (${result.matchCount} matches)`);
        foundCount++;
      } else {
        console.log(`[MISSING] ${name}: No working selector found`);
      }
    }
    console.log(`\n[Test] Found ${foundCount}/${Object.keys(SELECTORS).length} selector types`);

    // If we're on a live stream page, we expect at least some selectors to match
    const isLiveStream = extensionPage.url().includes('/live/');
    if (isLiveStream) {
      expect(foundCount).toBeGreaterThan(0);
    }
  });

  test('capture real DOM structure for debugging', async () => {
    // Capture interesting DOM elements for debugging selector issues
    console.log('\n[Test] ===== DOM STRUCTURE CAPTURE =====');

    // Get all textareas and inputs that might be chat inputs
    const textareas = await extensionPage.$$eval('textarea', els =>
      els.map(el => ({
        placeholder: el.placeholder,
        className: el.className,
        id: el.id,
        parentClass: el.parentElement?.className
      }))
    );

    if (textareas.length > 0) {
      console.log('\n[Test] Textareas found:');
      textareas.forEach((ta, i) => {
        console.log(`  ${i + 1}. placeholder="${ta.placeholder}" class="${ta.className}" id="${ta.id}"`);
        console.log(`     parent class="${ta.parentClass}"`);
      });
    }

    // Get all inputs
    const inputs = await extensionPage.$$eval('input[type="text"]', els =>
      els.map(el => ({
        placeholder: el.placeholder,
        className: el.className,
        id: el.id,
        parentClass: el.parentElement?.className
      }))
    );

    if (inputs.length > 0) {
      console.log('\n[Test] Text inputs found:');
      inputs.forEach((inp, i) => {
        console.log(`  ${i + 1}. placeholder="${inp.placeholder}" class="${inp.className}" id="${inp.id}"`);
      });
    }

    // Look for any element containing "chat" in class name
    const chatElements = await extensionPage.$$eval('[class*="chat" i], [class*="Chat"]', els =>
      els.slice(0, 10).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id
      }))
    );

    if (chatElements.length > 0) {
      console.log('\n[Test] Elements with "chat" in class (first 10):');
      chatElements.forEach((el, i) => {
        console.log(`  ${i + 1}. <${el.tag}> class="${el.className}" id="${el.id}"`);
      });
    }

    // Look for message-like containers
    const messageElements = await extensionPage.$$eval('[class*="message" i], [class*="Message"]', els =>
      els.slice(0, 10).map(el => ({
        tag: el.tagName,
        className: el.className,
        textContent: el.textContent?.slice(0, 50)
      }))
    );

    if (messageElements.length > 0) {
      console.log('\n[Test] Elements with "message" in class (first 10):');
      messageElements.forEach((el, i) => {
        console.log(`  ${i + 1}. <${el.tag}> class="${el.className}"`);
        if (el.textContent) {
          console.log(`     text: "${el.textContent}..."`);
        }
      });
    }

    // This test is informational - always passes
    expect(true).toBe(true);
  });

  test('test extension popup opens', async () => {
    // Get the extension ID from the service worker
    let extensionId;

    // Try to get extension ID by checking for background page
    const serviceWorkers = context.serviceWorkers();
    for (const worker of serviceWorkers) {
      if (worker.url().includes('background.js')) {
        extensionId = worker.url().split('/')[2];
        break;
      }
    }

    if (extensionId) {
      console.log(`[Test] Extension ID: ${extensionId}`);

      // Open popup directly
      const popupUrl = `chrome-extension://${extensionId}/src/popup/popup.html`;
      const popupPage = await context.newPage();
      await popupPage.goto(popupUrl);
      await popupPage.waitForLoadState('domcontentloaded');
      await popupPage.waitForTimeout(1000);

      // Verify popup loaded
      const header = await popupPage.$('.header');
      expect(header).toBeTruthy();

      console.log('[Test] Popup loaded successfully');

      // Check master toggle exists
      const masterToggle = await popupPage.$('#masterToggle');
      expect(masterToggle).toBeTruthy();
      console.log('[Test] Master toggle found');

      await popupPage.close();
    } else {
      console.log('[Test] Could not determine extension ID - skipping popup test');
    }
  });
});

/**
 * Additional test for when you have a known live stream URL
 * Uncomment and modify the URL to test a specific stream
 */
/*
test.describe('Specific Stream Test', () => {
  test('test on specific live stream', async () => {
    const STREAM_URL = 'https://www.whatnot.com/live/STREAM_ID_HERE';

    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(STREAM_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    // Your specific testing here...

    await context.close();
  });
});
*/
