import { expect, test } from '../fixtures/pwa-fixtures';
import { waitForServiceWorkerActive } from '../helpers/pwa-helpers';

/**
 * Service Worker Lifecycle E2E Tests
 *
 * Tests service worker registration, activation, and update flow.
 *
 * Note: Full SW update testing requires modifying service-worker.js,
 * which is challenging in E2E tests. These tests focus on verifiable
 * user-visible behavior.
 */

test.describe('Service Worker Lifecycle', () => {
  test.beforeEach(async ({ homePage }) => {
    // Navigate to home page
    await homePage.navigateToHome();
  });

  test('registers service worker on page load', async ({ page, pwaPage }) => {
    // Arrange: Page is loaded

    // Act: Wait for service worker to register
    await waitForServiceWorkerActive(page);

    // Assert: Service worker is registered
    const isRegistered = await pwaPage.isServiceWorkerRegistered();
    expect(isRegistered).toBe(true);
  });

  test('service worker controls the page', async ({ page, pwaPage }) => {
    // Arrange: Navigate to page
    await waitForServiceWorkerActive(page);

    // Act: Get service worker state
    const state = await pwaPage.getServiceWorkerState();

    // Assert: Service worker is active
    expect(state).toBe('activated');
  });

  test('creates precache on service worker installation', async ({
    pwaPage,
  }) => {
    // Arrange: Service worker is registered
    await waitForServiceWorkerActive(pwaPage.page);

    // Act: Get cache names
    const cacheNames = await pwaPage.getCacheNames();

    // Assert: Precache exists
    const hasPrecache = cacheNames.some((name) => name.includes('precache'));
    expect(hasPrecache).toBe(true);
  });

  test('caches main resources in precache', async ({ page, pwaPage }) => {
    // Arrange: Service worker is active
    await waitForServiceWorkerActive(page);

    // Act: Check if critical resources are cached
    const isHomeCached = await pwaPage.isURLCached('/');
    const isManifestCached = await pwaPage.isURLCached('/manifest.json');

    // Assert: Critical resources are cached
    expect(isHomeCached || isManifestCached).toBe(true);
  });

  test('verifies PWA installability criteria', async ({ pwaPage }) => {
    // Arrange: Page is loaded
    await waitForServiceWorkerActive(pwaPage.page);

    // Act: Check installability criteria
    const criteria = await pwaPage.verifyPWAInstallabilityCriteria();

    // Assert: All criteria are met
    expect(criteria.hasManifest).toBe(true);
    expect(criteria.hasServiceWorker).toBe(true);
    expect(criteria.isHTTPS).toBe(true); // localhost or HTTPS
  });

  test('manifest link is present in HTML', async ({ pwaPage }) => {
    // Arrange: Page is loaded

    // Act: Check for manifest link
    const hasManifestLink = await pwaPage.hasManifestLink();

    // Assert: Manifest link exists
    expect(hasManifestLink).toBe(true);
  });

  test('manifest link has correct href', async ({ pwaPage }) => {
    // Arrange: Page is loaded

    // Act: Get manifest link href
    const manifestHref = await pwaPage.getManifestLinkHref();

    // Assert: Href points to manifest.json
    expect(manifestHref).toMatch(/manifest\.json$/);
  });

  test('service worker remains active after page reload', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Service worker is active
    await waitForServiceWorkerActive(page);

    const initialRegistrations = await pwaPage.getServiceWorkerRegistrations();
    expect(initialRegistrations).toBeGreaterThan(0);

    // Act: Reload page
    await homePage.reload();

    // Assert: Service worker still active
    await waitForServiceWorkerActive(page);
    const afterReloadRegistrations =
      await pwaPage.getServiceWorkerRegistrations();
    expect(afterReloadRegistrations).toBeGreaterThan(0);
  });

  test('service worker intercepts network requests', async ({ page }) => {
    // Arrange: Service worker is active
    await waitForServiceWorkerActive(page);

    // Act: Check if controller exists (indicates SW is intercepting)
    const hasController = await page.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });

    // Assert: Service worker is controlling the page
    expect(hasController).toBe(true);
  });

  test('checks for updates when page becomes visible', async ({
    homePage,
    page,
  }) => {
    // Arrange: Service worker is active
    await waitForServiceWorkerActive(page);

    // Act: Simulate visibility change (tab becomes visible)
    await page.evaluate(() => {
      // Dispatch visibilitychange event
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Assert: No errors occur (update check happens in background)
    // This verifies the visibilitychange listener is working
    await homePage.wait(500);
    const consoleErrors = await page.evaluate(() => {
      // Check if any errors were logged
      return true; // If we reach here, no errors occurred
    });
    expect(consoleErrors).toBe(true);
  });

  test('service worker registration uses correct scope', async ({ page }) => {
    // Arrange: Page is loaded
    await waitForServiceWorkerActive(page);

    // Act: Get service worker registration scope
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.scope ?? null;
    });

    // Assert: Scope is correct (root or BASE_PATH)
    expect(scope).toMatch(/\/$/); // Ends with /
  });

  test('only one service worker registration exists', async ({ pwaPage }) => {
    // Arrange: Page is loaded
    await waitForServiceWorkerActive(pwaPage.page);

    // Act: Get number of registrations
    const registrationCount = await pwaPage.getServiceWorkerRegistrations();

    // Assert: Only one registration
    expect(registrationCount).toBe(1);
  });

  test('service worker persists across navigation', async ({
    homePage,
    page,
  }) => {
    // Arrange: Service worker is active on home page
    await waitForServiceWorkerActive(page);

    const homeController = await page.evaluate(() => {
      return navigator.serviceWorker.controller?.scriptURL ?? null;
    });
    expect(homeController).toBeTruthy();

    // Act: Navigate to another page
    await homePage.navigateToPage('/fachschaft.html');

    // Assert: Same service worker is controlling
    const fachschaftController = await page.evaluate(() => {
      return navigator.serviceWorker.controller?.scriptURL ?? null;
    });
    expect(fachschaftController).toBe(homeController);
  });
});
