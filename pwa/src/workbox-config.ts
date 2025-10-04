const BASE_PATH = process.env.BASE_PATH ?? '';

interface WorkboxConfig {
  cacheId: string;
  clientsClaim: boolean;
  globDirectory: string;
  globIgnores: string[];
  globPatterns: string[];
  maximumFileSizeToCacheInBytes: number;
  navigateFallback: string;
  navigateFallbackDenylist: RegExp[];
  runtimeCaching: RuntimeCachingEntry[];
  skipWaiting: boolean;
  swDest: string;
}

interface RuntimeCachingEntry {
  handler: string;
  options: {
    cacheName: string;
    expiration: {
      maxAgeSeconds: number;
      maxEntries: number;
    };
    networkTimeoutSeconds?: number;
  };
  urlPattern: RegExp;
}

const config: WorkboxConfig = {
  cacheId: 'erstizeitung-v1',
  clientsClaim: true,
  globDirectory: '../_book/',
  globIgnores: ['**/node_modules/**', '**/workbox-*.js', '**/*-lock.json'],
  globPatterns: [
    '**/*.html',
    'style.css',
    'pwa-styles.css',
    '*.js',
    'libs/**/*.{css,js}',
    'images/cover.png',
    'icons/**/*.png',
    'search_index.json',
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  navigateFallback: `${BASE_PATH}/offline.html`,
  navigateFallbackDenylist: [
    /^\/_/,
    /\/[^/?][^./?]*\.[^/]+$/,
    /\.(?:pdf|epub|zip)$/,
  ],

  runtimeCaching: [
    {
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: { maxAgeSeconds: 30 * 24 * 60 * 60, maxEntries: 100 },
      },
      urlPattern: /\.(?:css|js)$/,
    },
    {
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxAgeSeconds: 90 * 24 * 60 * 60, maxEntries: 200 },
      },
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
    },
    {
      handler: 'CacheFirst',
      options: {
        cacheName: 'document-cache',
        expiration: { maxAgeSeconds: 365 * 24 * 60 * 60, maxEntries: 10 },
      },
      urlPattern: /\.(?:pdf|epub)$/,
    },
  ],

  skipWaiting: false, // Wait for user confirmation before activating new SW
  swDest: '../_book/service-worker.js',
};

export = config;
