const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname, '..');
  const userDataDir = path.join(__dirname, '..', '.test-user-data');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
    ]
  });

  const page = await context.newPage();
  await page.goto('https://www.whatnot.com');
  console.log('Whatnot opened with BuzzChat extension loaded.');
  console.log('Extension path:', extensionPath);
  console.log('Press Ctrl+C to close.');
  await new Promise(() => {});
})();
