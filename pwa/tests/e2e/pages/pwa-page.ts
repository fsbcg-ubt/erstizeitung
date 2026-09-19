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
   * Get all cache names
   */
  async getCacheNames(): Promise<string[]> {
    return await this.page.evaluate(async () => {
      return await caches.keys();
    });
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

      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
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
    return (await this.page.evaluate(async (): Promise<unknown> => {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error('Failed to fetch manifest.json');
      }
      return await response.json();
    })) as ManifestData;
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
