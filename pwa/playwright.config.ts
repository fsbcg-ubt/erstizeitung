import * as os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

/**
 * Get available CPU cores for parallel test execution
 * Uses os.availableParallelism() (Node.js 19.4.0+) which respects CPU quotas,
 * falling back to os.cpus().length for older Node.js versions
 */
const getCpuCores = (): number => {
  if (typeof os.availableParallelism === 'function') {
    return os.availableParallelism();
  }
  return os.cpus().length;
};

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

  // Dynamically detect available CPU cores in CI, run unlimited workers locally
  workers: process.env.CI ? getCpuCores() : undefined,

  // Reporter configuration
  // Use blob reporter in CI for merging reports from parallel jobs
  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [['list'], ['html', { outputFolder: 'playwright-report' }]],

  // Shared settings for all the projects below
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Collect trace only on actual failure (not on retry)
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Disable video recording (traces provide better debugging info)
    video: 'off',

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

  // Global timeout for each test (increased for CI due to service worker overhead)
  timeout: process.env.CI ? 120 * 1000 : 30 * 1000, // 120s in CI, 30s locally

  // Global timeout for expect assertions
  expect: {
    timeout: 5 * 1000, // 5 seconds
  },
});
