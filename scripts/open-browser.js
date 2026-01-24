/**
 * Simple script to open Chrome with the BuzzChat extension loaded.
 * No tests - just opens the browser for manual testing.
 *
 * Run: node scripts/open-browser.js
 */

const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '..').replace(/\\/g, '/');

async function openBrowser() {
  console.log('Opening Chrome with BuzzChat extension...');
  console.log('Extension path:', EXTENSION_PATH);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: 1280, height: 800 }
  });

  console.log('\n✅ Chrome is open with BuzzChat extension loaded!');
  console.log('\nYou can now:');
  console.log('  1. Navigate to https://www.whatnot.com/');
  console.log('  2. Log in to your account');
  console.log('  3. Go to a live stream');
  console.log('  4. Test the extension');
  console.log('\nPress Ctrl+C to close the browser when done.\n');

  // Keep the script running
  await new Promise(() => {});
}

openBrowser().catch(console.error);
