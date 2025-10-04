/**
 * Browser Environment Test Setup
 *
 * Mocks browser APIs for testing PWA components:
 * - localStorage
 * - Service Worker API
 * - BeforeInstallPromptEvent
 * - Network events (online/offline)
 */

import { afterEach, beforeEach, vi } from 'vitest';

// Mock localStorage with full API
const createLocalStorageMock = (): Storage => {
  let store: Record<string, string> = {};

  return {
    clear: vi.fn(() => {
      store = {};
    }),
    getItem: vi.fn((key: string) => store[key] || null),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
    removeItem: vi.fn((key: string) => {
      const newStore = { ...store };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete newStore[key];
      store = newStore;
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
  } as Storage;
};

// Mock Service Worker API
const createServiceWorkerMock = (): Partial<ServiceWorkerContainer> => ({
  addEventListener: vi.fn(),
  controller: null,
  ready: Promise.resolve({
    active: null,
    addEventListener: vi.fn(),
    installing: null,
    waiting: null,
  } as unknown as ServiceWorkerRegistration),
  register: vi.fn().mockResolvedValue({
    active: null,
    addEventListener: vi.fn(),
    installing: null,
    update: vi.fn().mockResolvedValue(undefined as never),
    waiting: null,
  }),
});

// BeforeInstallPromptEvent interface (matches src/install-button.ts)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Mock BeforeInstallPromptEvent
export const createBeforeInstallPromptEvent = (
  outcome: 'accepted' | 'dismissed' = 'accepted',
): BeforeInstallPromptEvent => {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  event.preventDefault = vi.fn() as unknown as () => void;
  (event as { prompt: () => Promise<void> }).prompt = vi
    .fn()
    .mockResolvedValue(undefined as never);
  (
    event as { userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
  ).userChoice = Promise.resolve({ outcome });
  return event;
};

// Global setup
beforeEach(() => {
  // Setup localStorage mock
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageMock,
    writable: true,
  });

  // Setup Service Worker mock
  const serviceWorkerMock = createServiceWorkerMock();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: serviceWorkerMock,
    writable: true,
  });

  // Setup online property
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
    writable: true,
  });
});

// Global cleanup
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();

  // Clean up DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Clear localStorage
  localStorage.clear();
});
