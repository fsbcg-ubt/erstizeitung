import { test as base, type BrowserContext, type Page } from '@playwright/test';
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

/**
 * Helper to set network condition (online/offline)
 */
export async function setNetworkCondition(
  context: BrowserContext,
  online: boolean,
): Promise<void> {
  await context.setOffline(!online);
}

/**
 * Helper to wait for service worker registration
 */
export async function waitForServiceWorker(
  page: Page,
  timeout = 10_000,
): Promise<void> {
  await page.waitForFunction(
    () => {
      return navigator.serviceWorker.controller !== null;
    },
    { timeout },
  );
}

/**
 * Helper to clear all service workers and caches
 */
export async function clearPWAState(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));

    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();
  });
}

/**
 * Helper to simulate beforeinstallprompt event
 */
export async function simulateInstallPrompt(
  page: Page,
  outcome: 'accepted' | 'dismissed' = 'accepted',
): Promise<void> {
  await page.evaluate((userOutcome) => {
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;

    // Add required properties
    Object.defineProperty(event, 'prompt', {
      value: async () => {
        // Empty implementation for mock
      },
      writable: true,
    });

    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: userOutcome }),
      writable: true,
    });

    // Dispatch the event
    globalThis.dispatchEvent(event);
  }, outcome);
}

/**
 * TypeScript interface for BeforeInstallPromptEvent
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
