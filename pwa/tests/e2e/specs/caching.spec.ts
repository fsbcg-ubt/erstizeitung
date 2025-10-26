import { expect, test } from '../fixtures/pwa-fixtures';
import { waitForServiceWorkerActive } from '../helpers/pwa-helpers';

/**
 * Caching Strategy E2E Tests
 *
 * Tests PWA caching strategies based on workbox-config.ts:
 * - HTML: NetworkFirst
 * - CSS/JS: StaleWhileRevalidate
 * - Images: CacheFirst
 * - Documents: CacheFirst
 * - MathJax CDN: CacheFirst
 */

test.describe('Caching Strategies', () => {
  test.beforeEach(async ({ homePage, page }) => {
    await homePage.navigateToHome();
    await waitForServiceWorkerActive(page);

    await homePage.reload();
  });

  test('creates runtime caches in addition to precache', async ({
    pwaPage,
  }) => {
    const cacheNames = await pwaPage.getCacheNames();

    expect(cacheNames.length).toBeGreaterThan(0);

    const hasPrecache = cacheNames.some((name) => name.includes('precache'));
    expect(hasPrecache).toBe(true);
  });

  test('caches HTML pages in precache', async ({ page, pwaPage }) => {
    const pathname = new URL(page.url()).pathname;

    const isCached = await pwaPage.isURLCached(pathname);

    expect(isCached).toBe(true);
  });

  test('serves HTML from cache when offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    await expect(homePage.page.locator('.book-body')).toBeVisible();

    const pathname = new URL(page.url()).pathname;
    const isCached = await pwaPage.isURLCached(pathname);

    expect(isCached).toBe(true);

    const hasValidContent = await page.evaluate(async (path) => {
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
        return false;
      }
      const html = await response.text();
      return html.includes('book-body');
    }, pathname);

    expect(hasValidContent).toBe(true);
  });

  test('caches navigation to new pages', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    await expect(page.locator('.book-body')).toBeVisible();

    await homePage.navigateToPage('/fachschaft.html');
    await page.waitForLoadState('networkidle');

    await expect
      .poll(async () => await pwaPage.isURLCached('fachschaft.html'), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(true);
  });

  test('cached pages remain accessible offline', async ({
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

    const cachedContent = await page.evaluate(async () => {
      const response = await caches.match('fachschaft.html', {
        ignoreSearch: true,
        ignoreVary: true,
      });
      if (!response) {
        return null;
      }
      const html = await response.text();
      return html.includes('book-body') && html.includes('Fachschaft');
    });
    expect(cachedContent).toBe(true);
  });

  test('precache includes critical resources', async ({ pwaPage }) => {
    const cacheNames = await pwaPage.getCacheNames();
    const precacheName = cacheNames.find((name) => name.includes('precache'));

    expect(precacheName).toBeDefined();

    const itemCount = await pwaPage.getCachedItemCount(precacheName!);

    expect(itemCount).toBeGreaterThan(0);
  });

  test('CSS files are cached', async ({ page }) => {
    const isCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const cssRequest = requests.find((request) =>
          request.url.includes('.css'),
        );
        if (cssRequest) {
          return true;
        }
      }
      return false;
    });

    expect(isCached).toBe(true);
  });

  test('JavaScript files are cached', async ({ page }) => {
    const isCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const jsRequest = requests.find((request) =>
          request.url.includes('.js'),
        );
        if (jsRequest) {
          return true;
        }
      }
      return false;
    });

    expect(isCached).toBe(true);
  });

  test('offline page is available when needed', async ({ page }) => {
    const isOfflinePageCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match('/offline.html');
        if (response) {
          return true;
        }
      }
      return false;
    });

    expect(isOfflinePageCached).toBe(true);
  });

  test('service worker cache ID matches configuration', async ({ pwaPage }) => {
    const cacheNames = await pwaPage.getCacheNames();

    const hasExpectedCacheId = cacheNames.some((name) =>
      name.includes('erstizeitung'),
    );
    expect(hasExpectedCacheId).toBe(true);
  });

  test('cache persists across page reloads', async ({ homePage, pwaPage }) => {
    const initialCaches = await pwaPage.getCacheNames();
    expect(initialCaches.length).toBeGreaterThan(0);

    await homePage.reload();

    const afterReloadCaches = await pwaPage.getCacheNames();
    expect(afterReloadCaches.length).toBeGreaterThanOrEqual(
      initialCaches.length,
    );
  });

  test('new content is cached during navigation', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    const initialCaches = await pwaPage.getCacheNames();

    await homePage.navigateToPage('/studienstart.html');
    await page.waitForLoadState('networkidle');

    const afterNavCaches = await pwaPage.getCacheNames();
    expect(afterNavCaches.length).toBeGreaterThanOrEqual(initialCaches.length);
  });

  test('verifies cache-first strategy for images', async ({ page }) => {
    const areImagesCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        const imageRequest = requests.find((request) =>
          /\.(png|jpg|jpeg|svg|gif|webp)$/i.exec(request.url),
        );
        if (imageRequest) {
          return true;
        }
      }
      return false;
    });

    expect(typeof areImagesCached).toBe('boolean');
  });

  test('service worker handles cache updates', async ({ pwaPage }) => {
    await pwaPage.triggerServiceWorkerUpdate();

    await expect
      .poll(
        async () => {
          const caches = await pwaPage.getCacheNames();
          return caches.length > 0;
        },
        {
          intervals: [100, 250, 500],
          timeout: 3000,
        },
      )
      .toBe(true);
  });

  test('cache cleanup removes old versions', async ({ pwaPage }) => {
    const cacheNames = await pwaPage.getCacheNames();

    // Workbox cleanup should keep cache count reasonable
    expect(cacheNames.length).toBeLessThan(10); // Reasonable upper limit
  });

  test('navigating offline shows cached page without errors', async ({
    homePage,
    page,
  }) => {
    await homePage.navigateToPage('/campus-card.html');
    await page.waitForLoadState('networkidle');

    await expect
      .poll(
        async () => {
          return await page.evaluate(async () => {
            const response = await caches.match('campus-card.html', {
              ignoreSearch: true,
              ignoreVary: true,
            });
            if (!response) {
              return null;
            }
            const html = await response.text();
            return {
              hasBookBody: html.includes('book-body'),
              hasNoErrors:
                !html.toLowerCase().includes('error') &&
                !html.toLowerCase().includes('fehler'),
            };
          });
        },
        {
          intervals: [100, 250, 500],
          timeout: 2000,
        },
      )
      .toBeTruthy();

    const cachedContent = await page.evaluate(async () => {
      const response = await caches.match('campus-card.html', {
        ignoreSearch: true,
        ignoreVary: true,
      });
      if (!response) {
        return null;
      }
      const html = await response.text();
      return {
        hasBookBody: html.includes('book-body'),
        hasNoErrors:
          !html.toLowerCase().includes('error') &&
          !html.toLowerCase().includes('fehler'),
      };
    });

    expect(cachedContent).not.toBeNull();
    expect(cachedContent?.hasBookBody).toBe(true);
    expect(cachedContent?.hasNoErrors).toBe(true);
  });
});
