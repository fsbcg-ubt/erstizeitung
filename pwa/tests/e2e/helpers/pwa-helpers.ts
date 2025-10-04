import { type BrowserContext, type Page } from '@playwright/test';

/**
 * PWA Test Helper Functions
 *
 * Shared utilities for PWA E2E testing
 */

/**
 * Set network condition (online/offline)
 */
export async function setOnline(
  context: BrowserContext,
  online: boolean,
): Promise<void> {
  await context.setOffline(!online);
}

/**
 * Go offline
 */
export async function goOffline(context: BrowserContext): Promise<void> {
  await setOnline(context, false);
}

/**
 * Go online
 */
export async function goOnline(context: BrowserContext): Promise<void> {
  await setOnline(context, true);
}

/**
 * Clear all PWA state (service workers, caches, localStorage)
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
 * Wait for service worker to be active and controlling the page
 */
export async function waitForServiceWorkerActive(
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
 * Simulate beforeinstallprompt event
 */
export async function simulateBeforeInstallPrompt(
  page: Page,
  outcome: 'accepted' | 'dismissed' = 'accepted',
): Promise<void> {
  await page.evaluate((userOutcome) => {
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;

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

    globalThis.dispatchEvent(event);
  }, outcome);
}

/**
 * Set engagement data in localStorage
 */
export async function setEngagementData(
  page: Page,
  visitCount: number,
  totalTime: number,
): Promise<void> {
  await page.evaluate(
    ({ time, visits }) => {
      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: Date.now() - 86_400_000, // 1 day ago
          lastVisit: Date.now(),
          totalTime: time,
          visitCount: visits,
        }),
      );
    },
    { time: totalTime, visits: visitCount },
  );
}

/**
 * Trigger offline event
 */
export async function triggerOfflineEvent(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('offline'));
  });
}

/**
 * Trigger online event
 */
export async function triggerOnlineEvent(page: Page): Promise<void> {
  await page.evaluate(() => {
    globalThis.dispatchEvent(new Event('online'));
  });
}

/**
 * Check if URL is cached
 */
export async function isURLCached(page: Page, url: string): Promise<boolean> {
  return await page.evaluate(async (targetUrl) => {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(targetUrl);
      if (response) {
        return true;
      }
    }
    return false;
  }, url);
}

/**
 * Get all cache names
 */
export async function getCacheNames(page: Page): Promise<string[]> {
  return await page.evaluate(async () => {
    return await caches.keys();
  });
}

/**
 * Verify cache exists with specific name pattern
 */
export async function verifyCacheExists(
  page: Page,
  namePattern: RegExp,
): Promise<boolean> {
  const cacheNames = await getCacheNames(page);
  return cacheNames.some((name) => namePattern.test(name));
}

/**
 * Wait for cache to be populated
 */
export async function waitForCache(
  page: Page,
  cacheNamePattern: RegExp,
  timeout = 10_000,
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await verifyCacheExists(page, cacheNamePattern)) {
      return;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(
    `Cache matching ${String(cacheNamePattern)} not found within ${String(timeout)}ms`,
  );
}

/**
 * Fetch manifest and verify properties
 */
export async function getManifest(page: Page): Promise<PWAManifest> {
  const response = await page.goto('/manifest.json');
  if (!response) {
    throw new Error('Failed to fetch manifest.json');
  }
  return (await response.json()) as PWAManifest;
}

/**
 * Verify PWA installability criteria
 */
export async function verifyInstallabilityCriteria(page: Page): Promise<{
  hasManifest: boolean;
  hasServiceWorker: boolean;
  isHTTPS: boolean;
}> {
  return await page.evaluate(async () => {
    const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hasServiceWorker = registrations.length > 0;
    const isHTTPS =
      globalThis.location.protocol === 'https:' ||
      globalThis.location.hostname === 'localhost';

    return {
      hasManifest,
      hasServiceWorker,
      isHTTPS,
    };
  });
}

/**
 * Wait for element to appear with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000,
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for element to disappear
 */
export async function waitForElementHidden(
  page: Page,
  selector: string,
  timeout = 5000,
): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * TypeScript interfaces
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAManifest {
  background_color: string;
  description: string;
  display: string;
  icons: {
    purpose: string;
    sizes: string;
    src: string;
    type: string;
  }[];
  lang: string;
  name: string;
  scope: string;
  short_name: string;
  shortcuts?: {
    description: string;
    name: string;
    short_name: string;
    url: string;
  }[];
  start_url: string;
  theme_color: string;
}
