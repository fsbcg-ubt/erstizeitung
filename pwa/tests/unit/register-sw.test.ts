import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

describe('register-sw service worker management', () => {
  let mockRegistration: any;
  let mockServiceWorker: any;

  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    vi.clearAllTimers();
    vi.useFakeTimers();

    mockServiceWorker = {
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
      state: 'installing',
    };

    mockRegistration = {
      active: null,
      addEventListener: vi.fn(),
      installing: null,
      update: vi.fn().mockResolvedValue(),
      waiting: null,
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        controller: null,
        register: vi.fn().mockResolvedValue(mockRegistration),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('service worker registration', () => {
    test('registers service worker on window load', async () => {
      const registerSpy = vi.spyOn(navigator.serviceWorker, 'register');

      await import('../../src/register-sw');

      globalThis.dispatchEvent(new Event('load'));

      await vi.runAllTimersAsync();

      expect(registerSpy).toHaveBeenCalledWith(
        '{{BASE_PATH}}/service-worker.js',
      );
    });

    test('handles service worker registration failure', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {
          // Mock implementation
        });
      const error = new Error('Registration failed');

      navigator.serviceWorker.register = vi.fn().mockRejectedValue(error);

      await import('../../src/register-sw');

      globalThis.dispatchEvent(new Event('load'));

      await vi.runAllTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'SW registration failed:',
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('service worker update detection', () => {
    test('shows update notification when new worker is installed', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const toast = document.querySelector('#sw-update-toast');
      expect(toast).toBeTruthy();
    });

    test('does not show notification if no existing controller (first install)', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = null;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const toast = document.querySelector('#sw-update-toast');
      expect(toast).toBeNull();
    });

    test('guards against null newWorker (race condition)', async () => {
      mockRegistration.installing = null;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      expect(() => {
        updateFoundHandler?.();
      }).not.toThrow();
    });
  });

  describe('update notification UI', () => {
    test('displays update notification with correct content and UI elements', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const toast = document.querySelector('#sw-update-toast');

      expect(toast?.innerHTML).toContain('Neue Version verfügbar!');
      expect(toast?.innerHTML).toContain('Aktualisieren');

      expect(toast?.getAttribute('role')).toBe('status');
      expect(toast?.getAttribute('aria-live')).toBe('polite');

      const updateButton = document.querySelector('#sw-update-btn');
      const dismissButton = document.querySelector('#sw-dismiss-btn');
      expect(updateButton).toBeTruthy();
      expect(dismissButton).toBeTruthy();
      expect(updateButton?.getAttribute('aria-label')).toBe(
        'Neue Version laden',
      );
      expect(dismissButton?.getAttribute('aria-label')).toBe(
        'Benachrichtigung schließen',
      );
    });

    test('does not create duplicate update notifications', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      updateFoundHandler?.();
      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const toasts = document.querySelectorAll('#sw-update-toast');
      expect(toasts.length).toBe(1);
    });
  });

  describe('update button interaction', () => {
    test('sends SKIP_WAITING message to service worker when update clicked', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const updateButton = document.querySelector('#sw-update-btn');
      updateButton?.click();

      expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING',
      });
    });

    test('reloads page when new service worker takes control', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      const reloadSpy = vi.fn();
      Object.defineProperty(globalThis.location, 'reload', {
        configurable: true,
        value: reloadSpy,
        writable: true,
      });

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const updateButton = document.querySelector('#sw-update-btn');
      updateButton?.click();

      const controllerChangeHandler =
        navigator.serviceWorker.addEventListener.mock.calls.find(
          (call: any[]) => call[0] === 'controllerchange',
        )?.[1];

      controllerChangeHandler?.();

      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('dismiss button interaction', () => {
    test('removes notification when dismiss button clicked', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const dismissButton = document.querySelector('#sw-dismiss-btn');
      dismissButton?.click();

      const toast = document.querySelector('#sw-update-toast');
      expect(toast).toBeNull();
    });

    test('does not send SKIP_WAITING when dismiss clicked', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const dismissButton = document.querySelector('#sw-dismiss-btn');
      dismissButton?.click();

      expect(mockServiceWorker.postMessage).not.toHaveBeenCalled();
    });

    test('does not reload page when dismiss clicked', async () => {
      mockServiceWorker.state = 'installed';
      mockRegistration.installing = mockServiceWorker;
      navigator.serviceWorker.controller = {} as any;

      const reloadSpy = vi.fn();
      Object.defineProperty(globalThis.location, 'reload', {
        configurable: true,
        value: reloadSpy,
        writable: true,
      });

      navigator.serviceWorker.register = vi
        .fn()
        .mockResolvedValue(mockRegistration);

      await import('../../src/register-sw');
      globalThis.dispatchEvent(new Event('load'));
      await vi.runAllTimersAsync();

      const updateFoundHandler =
        mockRegistration.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'updatefound',
        )?.[1];

      updateFoundHandler?.();
      await vi.runAllTimersAsync();

      const dismissButton = document.querySelector('#sw-dismiss-btn');
      dismissButton?.click();

      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('handles missing serviceWorker API gracefully', () => {
      delete (navigator as any).serviceWorker;

      expect(async () => {
        await import('../../src/register-sw');
        globalThis.dispatchEvent(new Event('load'));
      }).not.toThrow();
    });

    test('handles registration returning null', () => {
      navigator.serviceWorker.register = vi.fn().mockResolvedValue(null);

      expect(async () => {
        await import('../../src/register-sw');
        globalThis.dispatchEvent(new Event('load'));
      }).not.toThrow();
    });
  });
});
