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
  isOnline: boolean,
): Promise<void> {
  await context.setOffline(!isOnline);
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

    Object.defineProperties(event, {
      prompt: {
        value: async () => {
          // Empty implementation for mock
        },
        writable: true,
      },
      userChoice: {
        value: Promise.resolve({ outcome: userOutcome }),
        writable: true,
      },
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
 * TypeScript interfaces
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
