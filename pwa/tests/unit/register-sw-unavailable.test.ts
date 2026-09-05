import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Separate file for test isolation (no shared DOM/event listeners between files)
describe('register-sw unavailable serviceWorker', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.replaceChildren();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('handles missing serviceWorker API gracefully', async () => {
    delete (navigator as any).serviceWorker;

    await import('../../src/register-sw');

    expect(() => {
      globalThis.dispatchEvent(new Event('load'));
    }).not.toThrow();
  });

  test('handles registration returning null', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        controller: null,
        register: vi.fn().mockResolvedValue(null),
      },
      writable: true,
    });

    await import('../../src/register-sw');
    globalThis.dispatchEvent(new Event('load'));
    await vi.runAllTimersAsync();

    expect(navigator.serviceWorker.register).toHaveBeenCalled();
  });
});
