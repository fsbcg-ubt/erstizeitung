import { expect, test } from '../fixtures/pwa-fixtures';
import {
  goOffline,
  goOnline,
  waitForServiceWorkerActive,
} from '../helpers/pwa-helpers';

/**
 * Offline Functionality E2E Tests
 *
 * Tests PWA offline capabilities following the pattern from
 * "Offline but Not Broken: Testing Cached Data with Playwright"
 *
 * Test Structure (AAA Pattern):
 * - Arrange: Set initial state
 * - Act: Perform action
 * - Assert: Verify outcome
 */

test.describe('Offline Functionality', () => {
  test.beforeEach(async ({ context, homePage, page }) => {
    // Ensure we start online
    await goOnline(context);

    // Navigate to home page
    await homePage.navigateToHome();

    // Wait for service worker to be active
    await waitForServiceWorkerActive(page);

    // Reload to ensure content is cached
    await homePage.reload();
  });

  test('displays cached content when going offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Verify content loads while online
    await expect(homePage.page.locator('.book-body')).toBeVisible();

    const onlineHeading = await homePage.page
      .locator('.page-inner h1')
      .first()
      .textContent();
    expect(onlineHeading).toBeTruthy();

    // Act: Verify page is cached
    const pathname = new URL(page.url()).pathname;
    const isCached = await pwaPage.isURLCached(pathname);
    expect(isCached).toBe(true);

    // Verify cached content matches online content
    const cachedContent = await page.evaluate(async (path) => {
      const target = new URL(path, globalThis.location.origin);
      const normalized =
        target.pathname === '/' || target.pathname.endsWith('/')
          ? target.pathname.replace(/\/$/, '') + '/index.html'
          : path;

      const normalizedURL = new URL(normalized, globalThis.location.origin);
      const response = await caches.match(normalizedURL.href, {
        ignoreSearch: true,
        ignoreVary: true,
      });
      if (!response) {
        return null;
      }
      const html = await response.text();
      // Extract heading from cached HTML
      const parser = new DOMParser();
      const document = parser.parseFromString(html, 'text/html');
      const heading = document.querySelector('.page-inner h1')?.textContent;
      return {
        hasBookBody: html.includes('book-body'),
        heading,
      };
    }, pathname);

    // Assert: Cached content matches online content
    expect(cachedContent).not.toBeNull();
    expect(cachedContent?.hasBookBody).toBe(true);
    expect(cachedContent?.heading).toBe(onlineHeading);
  });

  test('displays offline indicator with German message', async ({
    context,
    homePage,
  }) => {
    // Arrange: Start online
    const isOnline = await homePage.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);

    // Act: Go offline
    await goOffline(context);

    // Trigger offline event (simulate network loss)
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    // Assert: Offline indicator appears with German text
    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineMessage();
  });

  test('offline indicator has correct accessibility attributes', async ({
    context,
    homePage,
  }) => {
    // Arrange: Go offline
    await goOffline(context);

    // Act: Trigger offline event
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    // Assert: Verify accessibility attributes
    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineIndicatorAccessibility();
  });

  test('displays online notification when connection restored', async ({
    context,
    homePage,
  }) => {
    // Arrange: Start offline
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    // Act: Go back online
    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    // Assert: Online notification appears
    await homePage.verifyOnlineMessage();
  });

  test('online notification auto-dismisses after 3 seconds', async ({
    context,
    homePage,
  }) => {
    // Arrange: Go offline then back online
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    // Act: Go online
    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    // Wait for indicator to show
    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();

    // Assert: Indicator disappears after 3 seconds
    await homePage.waitForOfflineIndicatorHidden(5000);
  });

  test('offline indicator persists until connection restored', async ({
    context,
    homePage,
  }) => {
    // Arrange: Go offline
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    // Assert: Indicator appears and stays visible
    await homePage.waitForOfflineIndicator();
    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();

    // Wait 2 seconds - indicator should still be visible
    await homePage.wait(2000);
    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();
  });

  test('multiple pages remain accessible offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Visit multiple pages while online to cache them
    await homePage.navigateToPage('/fachschaft.html');
    await page.waitForLoadState('networkidle');

    await expect
      .poll(async () => await pwaPage.isURLCached('fachschaft.html'), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(true);

    await homePage.navigateToPage('/termine.html');
    await page.waitForLoadState('networkidle');

    await expect
      .poll(async () => await pwaPage.isURLCached('termine.html'), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(true);

    // Assert: Both pages remain cached and contain valid content
    const bothCached = await page.evaluate(async () => {
      const cache1 = await caches.match('fachschaft.html', {
        ignoreSearch: true,
        ignoreVary: true,
      });
      const cache2 = await caches.match('termine.html', {
        ignoreSearch: true,
        ignoreVary: true,
      });
      return Boolean(cache1 && cache2);
    });
    expect(bothCached).toBe(true);
  });

  test('handles online-offline-online transitions correctly', async ({
    context,
    homePage,
  }) => {
    // Arrange: Start online
    const initialOnline = await homePage.evaluate(() => navigator.onLine);
    expect(initialOnline).toBe(true);

    // Act: Go offline
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    // Go online
    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    // Wait for online message to appear and dismiss
    await homePage.wait(100); // Small wait for message to appear
    await homePage.waitForOfflineIndicatorHidden(4000);

    // Go offline again
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    // Assert: Offline indicator appears again
    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineMessage();
  });
});
