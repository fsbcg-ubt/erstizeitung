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
    await goOnline(context);

    await homePage.navigateToHome();

    await waitForServiceWorkerActive(page);

    await homePage.reload();
  });

  test('displays cached content when going offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    await expect(homePage.page.locator('.book-body')).toBeVisible();

    const onlineHeading = await homePage.page
      .locator('.page-inner h1')
      .first()
      .textContent();
    expect(onlineHeading).toBeTruthy();

    const pathname = new URL(page.url()).pathname;
    const isCached = await pwaPage.isURLCached(pathname);
    expect(isCached).toBe(true);

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
      const parser = new DOMParser();
      const document = parser.parseFromString(html, 'text/html');
      const heading = document.querySelector('.page-inner h1')?.textContent;
      return {
        hasBookBody: html.includes('book-body'),
        heading,
      };
    }, pathname);

    expect(cachedContent).not.toBeNull();
    expect(cachedContent?.hasBookBody).toBe(true);
    expect(cachedContent?.heading).toBe(onlineHeading);
  });

  test('displays offline indicator with German message', async ({
    context,
    homePage,
  }) => {
    const isOnline = await homePage.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(true);

    await goOffline(context);

    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineMessage();
  });

  test('offline indicator has correct accessibility attributes', async ({
    context,
    homePage,
  }) => {
    await goOffline(context);

    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineIndicatorAccessibility();
  });

  test('displays online notification when connection restored', async ({
    context,
    homePage,
  }) => {
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    await homePage.verifyOnlineMessage();
  });

  test('online notification auto-dismisses after 3 seconds', async ({
    context,
    homePage,
  }) => {
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();

    await homePage.waitForOfflineIndicatorHidden(5000);
  });

  test('offline indicator persists until connection restored', async ({
    context,
    homePage,
  }) => {
    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();
    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();

    await homePage.wait(2000);
    await expect(homePage.page.locator('#offline-indicator')).toBeVisible();
  });

  test('multiple pages remain accessible offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
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
    const initialOnline = await homePage.evaluate(() => navigator.onLine);
    expect(initialOnline).toBe(true);

    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();

    await goOnline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('online'));
    });

    await homePage.wait(100); // Small wait for message to appear
    await homePage.waitForOfflineIndicatorHidden(4000);

    await goOffline(context);
    await homePage.page.evaluate(() => {
      globalThis.dispatchEvent(new Event('offline'));
    });

    await homePage.waitForOfflineIndicator();
    await homePage.verifyOfflineMessage();
  });

  test('manifest icons are accessible offline', async ({
    browserName,
    context,
    page,
    pwaPage,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit has known issues with context.setOffline() and service workers (Playwright #2311)',
    );

    await waitForServiceWorkerActive(page);
    await page.reload();

    const manifest = await pwaPage.getManifest();
    const firstIconPath = new URL(manifest.icons[0].src, page.url()).pathname;

    await expect
      .poll(async () => await pwaPage.isURLCached(firstIconPath), {
        intervals: [100, 250, 500],
        timeout: 3000,
      })
      .toBe(true);

    await goOffline(context);

    const iconLoadsOffline = await page.evaluate(async (iconSource) => {
      try {
        const response = await fetch(iconSource);
        return response.ok;
      } catch {
        return false;
      }
    }, manifest.icons[0].src);

    expect(iconLoadsOffline).toBe(true);
  });

  test('font files are accessible offline', async ({
    browserName,
    context,
    page,
    pwaPage,
  }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit has known issues with context.setOffline() and service workers (Playwright #2311)',
    );

    await waitForServiceWorkerActive(page);
    await page.reload();

    const fontPath =
      '/libs/gitbook-2.6.7/css/fontawesome/fontawesome-webfont.ttf';

    await expect
      .poll(async () => await pwaPage.isURLCached(fontPath), {
        intervals: [100, 250, 500],
        timeout: 3000,
      })
      .toBe(true);

    await goOffline(context);

    const fontLoadsOffline = await page.evaluate(async (fontSource) => {
      try {
        const response = await fetch(fontSource);
        return response.ok;
      } catch {
        return false;
      }
    }, fontPath);

    expect(fontLoadsOffline).toBe(true);
  });
});
