import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for PWA
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Glob patterns for test files
  testMatch: '**/*.spec.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: Boolean(process.env.CI),

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for more stable results
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],

  // Shared settings for all the projects below
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry (for debugging)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Browser context options
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable experimental service worker support in Chromium
        // Required for testing service worker network events
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },

    // Mobile viewports for PWA testing
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },

    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        contextOptions: {
          serviceWorkers: 'allow',
        },
      },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run serve:dev',
    reuseExistingServer: !process.env.CI,
    stderr: 'pipe',
    stdout: 'ignore',
    timeout: 120 * 1000, // 2 minutes
    url: 'http://localhost:3000',
  },

  // Global timeout for each test
  timeout: 30 * 1000, // 30 seconds

  // Global timeout for expect assertions
  expect: {
    timeout: 5 * 1000, // 5 seconds
  },
});
