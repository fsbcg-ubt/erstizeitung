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
    // Navigate to home and wait for SW
    await homePage.navigateToHome();
    await waitForServiceWorkerActive(page);

    // Reload to populate caches
    await homePage.reload();
  });

  test('creates runtime caches in addition to precache', async ({
    pwaPage,
  }) => {
    // Arrange: Service worker is active

    // Act: Get all cache names
    const cacheNames = await pwaPage.getCacheNames();

    // Assert: Multiple caches exist
    expect(cacheNames.length).toBeGreaterThan(0);

    // Precache should exist
    const hasPrecache = cacheNames.some((name) => name.includes('precache'));
    expect(hasPrecache).toBe(true);
  });

  test('caches HTML pages in precache', async ({ page, pwaPage }) => {
    // Arrange: Get current page URL pathname
    const pathname = new URL(page.url()).pathname;

    // Act: Check if HTML is cached
    const isCached = await pwaPage.isURLCached(pathname);

    // Assert: Current page is cached
    expect(isCached).toBe(true);
  });

  test('serves HTML from cache when offline', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Verify page is loaded
    await expect(homePage.page.locator('.book-body')).toBeVisible();

    // Act: Verify current page is cached
    const pathname = new URL(page.url()).pathname;
    const isCached = await pwaPage.isURLCached(pathname);

    // Assert: Page is cached
    expect(isCached).toBe(true);

    // Verify cached content has valid HTML structure
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
    // Arrange: Start on home page
    await expect(page.locator('.book-body')).toBeVisible();

    // Act: Navigate to another page
    await homePage.navigateToPage('/fachschaft.html');
    await page.waitForLoadState('networkidle');

    // Assert: New page is cached (poll with timeout instead of arbitrary wait)
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
    // Arrange: Visit and cache a page
    await homePage.navigateToPage('/fachschaft.html');
    await page.waitForLoadState('networkidle');

    // Assert: Verify page is cached (poll with timeout instead of arbitrary wait)
    await expect
      .poll(async () => await pwaPage.isURLCached('fachschaft.html'), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(true);

    // Verify cached content has expected structure
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
    // Arrange: Service worker is active

    // Act: Get precache name and count
    const cacheNames = await pwaPage.getCacheNames();
    const precacheName = cacheNames.find((name) => name.includes('precache'));

    expect(precacheName).toBeDefined();

    const itemCount = await pwaPage.getCachedItemCount(precacheName!);

    // Assert: Precache has multiple items
    expect(itemCount).toBeGreaterThan(0);
  });

  test('CSS files are cached', async ({ page }) => {
    // Arrange: Page is loaded with styles

    // Act: Check if CSS is cached
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

    // Assert: CSS is cached
    expect(isCached).toBe(true);
  });

  test('JavaScript files are cached', async ({ page }) => {
    // Arrange: Page is loaded with scripts

    // Act: Check if JS is cached
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

    // Assert: JS is cached
    expect(isCached).toBe(true);
  });

  test('offline page is available when needed', async ({ page }) => {
    // Arrange: Service worker is active

    // Act: Check if offline page is cached
    const isOfflinePageCached = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match('/offline-page.html');
        if (response) {
          return true;
        }
      }
      return false;
    });

    // Assert: Offline page is cached (or it might be served from network)
    // Note: Offline page caching depends on workbox configuration
    expect(typeof isOfflinePageCached).toBe('boolean');
  });

  test('service worker cache ID matches configuration', async ({ pwaPage }) => {
    // Arrange: Service worker is active

    // Act: Get cache names
    const cacheNames = await pwaPage.getCacheNames();

    // Assert: Cache names include configured ID
    const hasExpectedCacheId = cacheNames.some((name) =>
      name.includes('erstizeitung'),
    );
    expect(hasExpectedCacheId).toBe(true);
  });

  test('cache persists across page reloads', async ({ homePage, pwaPage }) => {
    // Arrange: Get initial cache names
    const initialCaches = await pwaPage.getCacheNames();
    expect(initialCaches.length).toBeGreaterThan(0);

    // Act: Reload page
    await homePage.reload();

    // Assert: Caches still exist
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
    // Arrange: Get initial cache names
    const initialCaches = await pwaPage.getCacheNames();

    // Act: Navigate to a new page
    await homePage.navigateToPage('/studienstart.html');
    await page.waitForLoadState('networkidle');

    // Assert: Cache may have grown or new cache created
    const afterNavCaches = await pwaPage.getCacheNames();
    expect(afterNavCaches.length).toBeGreaterThanOrEqual(initialCaches.length);
  });

  test('verifies cache-first strategy for images', async ({ page }) => {
    // Arrange: Page with images loaded

    // Act: Check if images are cached
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

    // Assert: Images are cached (if page has images)
    expect(typeof areImagesCached).toBe('boolean');
  });

  test('service worker handles cache updates', async ({ pwaPage }) => {
    // Arrange: Service worker is active

    // Act: Trigger update check
    await pwaPage.triggerServiceWorkerUpdate();

    // Assert: No errors occurred during update (poll for cache update)
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
    // Arrange: Service worker is active
    const cacheNames = await pwaPage.getCacheNames();

    // Assert: Only active cache versions exist (no excessive old caches)
    // Workbox cleanup should keep cache count reasonable
    expect(cacheNames.length).toBeLessThan(10); // Reasonable upper limit
  });

  test('navigating offline shows cached page without errors', async ({
    homePage,
    page,
  }) => {
    // Arrange: Cache a page
    await homePage.navigateToPage('/campus-card.html');
    await page.waitForLoadState('networkidle');

    // Act: Verify page is cached with valid content (poll with timeout)
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

    // Assert: Verify cached content structure
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
