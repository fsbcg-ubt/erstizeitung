import { BasePage } from './base-page';

/**
 * PWA Page Object
 *
 * Provides PWA-specific functionality for testing service workers,
 * manifest, caching, and installation features.
 */
export class PWAPage extends BasePage {
  /**
   * Wait for service worker to be registered and active
   */
  async waitForServiceWorkerActive(timeout = 10_000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        return navigator.serviceWorker.controller !== null;
      },
      { timeout },
    );
  }

  /**
   * Get service worker registration state
   */
  async getServiceWorkerState(): Promise<string | null> {
    return await this.page.evaluate(() => {
      if (navigator.serviceWorker.controller) {
        return navigator.serviceWorker.controller.state;
      }
      return null;
    });
  }

  /**
   * Check if service worker is registered
   */
  async isServiceWorkerRegistered(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });
  }

  /**
   * Get all service worker registrations
   */
  async getServiceWorkerRegistrations(): Promise<number> {
    return await this.page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length;
    });
  }

  /**
   * Unregister all service workers
   */
  async unregisterServiceWorkers(): Promise<void> {
    await this.page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    });
  }

  /**
   * Get all cache names
   */
  async getCacheNames(): Promise<string[]> {
    return await this.page.evaluate(async () => {
      return await caches.keys();
    });
  }

  /**
   * Check if specific cache exists
   */
  async cacheExists(cacheName: string): Promise<boolean> {
    return await this.page.evaluate(async (name) => {
      const cacheNames = await caches.keys();
      return cacheNames.includes(name);
    }, cacheName);
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await this.page.evaluate(async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    });
  }

  /**
   * Get number of cached items in a specific cache
   */
  async getCachedItemCount(cacheName: string): Promise<number> {
    return await this.page.evaluate(async (name) => {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      return keys.length;
    }, cacheName);
  }

  /**
   * Check if a specific URL is cached
   * Normalizes URLs to match Workbox precache behavior (e.g., "/" -> "/index.html")
   */
  async isURLCached(url: string): Promise<boolean> {
    return await this.page.evaluate(async (rawUrl) => {
      // Normalize URLs to match Workbox precache behavior
      const normalise = (input: string): string => {
        const target = new URL(input, globalThis.location.origin);
        // Convert "/" to "/index.html"
        if (target.pathname === '/' || target.pathname.endsWith('/')) {
          target.pathname = target.pathname.replace(/\/$/, '') + '/index.html';
        }
        return target.href;
      };

      const target = new URL(rawUrl, globalThis.location.origin);
      const candidates = new Set<string>([
        normalise(rawUrl), // Full URL with normalization
        target.href, // Full URL without normalization
        target.pathname, // Just the pathname (e.g., "/fachschaft.html")
        target.pathname.replace(/^\//, ''), // Pathname without leading slash (e.g., "fachschaft.html")
      ]);

      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName);
        for (const candidate of candidates) {
          const response = await cache.match(candidate, {
            ignoreSearch: true,
            ignoreVary: true,
          });
          if (response) {
            return true;
          }
        }
      }
      return false;
    }, url);
  }

  /**
   * Fetch and parse manifest.json
   */
  async getManifest(): Promise<ManifestData> {
    const response = await this.page.goto('/manifest.json');
    if (!response) {
      throw new Error('Failed to fetch manifest.json');
    }
    return (await response.json()) as ManifestData;
  }

  /**
   * Verify manifest link in HTML
   */
  async hasManifestLink(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link !== null;
    });
  }

  /**
   * Get manifest link href
   */
  async getManifestLinkHref(): Promise<string | null> {
    return await this.page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link?.getAttribute('href') ?? null;
    });
  }

  /**
   * Simulate beforeinstallprompt event with engagement data
   */
  async simulateInstallPromptWithEngagement(
    visitCount = 2,
    totalTime = 30_000,
  ): Promise<void> {
    // Set engagement data in localStorage
    await this.setLocalStorageItem(
      'pwa-engagement',
      JSON.stringify({
        firstVisit: Date.now() - 86_400_000, // 1 day ago
        lastVisit: Date.now(),
        totalTime,
        visitCount,
      }),
    );

    // Simulate beforeinstallprompt event
    await this.page.evaluate(() => {
      const event = new Event(
        'beforeinstallprompt',
      ) as BeforeInstallPromptEvent;

      Object.defineProperty(event, 'prompt', {
        value: async () => {
          // Empty implementation for mock
        },
        writable: true,
      });

      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' }),
        writable: true,
      });

      globalThis.dispatchEvent(event);
    });
  }

  /**
   * Get install engagement data from localStorage
   */
  async getEngagementData(): Promise<EngagementData | null> {
    const data = await this.getLocalStorageItem('pwa-engagement');
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data) as EngagementData;
    } catch {
      return null;
    }
  }

  /**
   * Check if install was dismissed
   */
  async isInstallDismissed(): Promise<boolean> {
    const dismissed = await this.getLocalStorageItem('pwa-install-dismissed');
    return dismissed === 'true';
  }

  /**
   * Trigger update check for service worker
   */
  async triggerServiceWorkerUpdate(): Promise<void> {
    await this.page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    });
  }

  /**
   * Listen for service worker update event
   */
  async listenForUpdateEvent(): Promise<void> {
    await this.page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return;
      }

      return new Promise<void>((resolve) => {
        registration.addEventListener('updatefound', () => {
          resolve();
        });
      });
    });
  }

  /**
   * Get network state (online/offline)
   */
  async isOnline(): Promise<boolean> {
    return await this.page.evaluate(() => navigator.onLine);
  }

  /**
   * Verify PWA installability criteria
   */
  async verifyPWAInstallabilityCriteria(): Promise<{
    hasManifest: boolean;
    hasServiceWorker: boolean;
    isHTTPS: boolean;
  }> {
    return await this.page.evaluate(async () => {
      const hasManifest =
        document.querySelector('link[rel="manifest"]') !== null;
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
}

/**
 * TypeScript interfaces
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface EngagementData {
  firstVisit: number;
  lastVisit: number;
  totalTime: number;
  visitCount: number;
}

interface ManifestData {
  background_color: string;
  description: string;
  display: string;
  icons: ManifestIcon[];
  lang: string;
  name: string;
  scope: string;
  short_name: string;
  shortcuts?: ManifestShortcut[];
  start_url: string;
  theme_color: string;
}

interface ManifestIcon {
  purpose: string;
  sizes: string;
  src: string;
  type: string;
}

interface ManifestShortcut {
  description: string;
  icons: ManifestIcon[];
  name: string;
  short_name: string;
  url: string;
}
