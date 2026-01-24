// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

/**
 * Playwright configuration for Chrome Extension testing
 * @see https://playwright.dev/docs/chrome-extensions
 */
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.test.js',

  // Run tests in parallel for speed
  fullyParallel: false, // Extensions require sequential due to shared browser context

  // Fail the build on CI if test.only is used
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Limit workers for extension testing
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Collect trace on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      },
    },
  ],

  // Global timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
