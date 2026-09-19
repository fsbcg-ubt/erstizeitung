import { test as base } from '@playwright/test';
import { BasePage } from '../pages/base-page';
import { HomePage } from '../pages/home-page';
import { PWAPage } from '../pages/pwa-page';

/**
 * Custom fixtures for PWA testing
 *
 * Extends Playwright's base test with page objects following the fixture pattern.
 * This allows automatic instantiation and cleanup of page objects.
 */

interface PWAFixtures {
  basePage: BasePage;
  homePage: HomePage;
  pwaPage: PWAPage;
}

/**
 * Extended test with PWA-specific fixtures
 */
export const test = base.extend<PWAFixtures>({
  // Base page fixture
  basePage: async ({ page }, use) => {
    const basePage = new BasePage(page);
    await use(basePage);
  },

  // Home page fixture
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  // PWA-specific page fixture
  pwaPage: async ({ page }, use) => {
    const pwaPage = new PWAPage(page);
    await use(pwaPage);
  },
});

/**
 * Export expect from @playwright/test for convenience
 */
export { expect } from '@playwright/test';
