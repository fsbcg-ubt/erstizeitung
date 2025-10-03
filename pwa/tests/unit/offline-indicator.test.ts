import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

describe('offline-indicator network state management', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('offline state behavior', () => {
    test('displays offline indicator with correct content and attributes', async () => {
      await import('../../src/offline-indicator');
      globalThis.dispatchEvent(new Event('offline'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.classList.contains('offline-toast')).toBe(true);

      expect(indicator?.innerHTML).toContain('Keine Internetverbindung');
      expect(indicator?.innerHTML).toContain(
        'Bereits geladene Inhalte bleiben verfügbar',
      );
      expect(indicator?.innerHTML).toContain('📵');

      expect(indicator?.getAttribute('role')).toBe('status');
      expect(indicator?.getAttribute('aria-live')).toBe('polite');

      expect(indicator?.classList.contains('offline')).toBe(true);
      expect(indicator?.classList.contains('show')).toBe(true);
      expect(indicator?.classList.contains('online')).toBe(false);

      expect(indicator?.querySelector('.offline-icon')).toBeTruthy();
      expect(indicator?.querySelector('.offline-content')).toBeTruthy();
      expect(indicator?.querySelector('.offline-message')).toBeTruthy();
    });

    test('reuses existing indicator if already present', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('offline'));
      const firstIndicator = document.querySelector('#offline-indicator');
      const firstIndicatorRef = firstIndicator;

      globalThis.dispatchEvent(new Event('offline'));
      const secondIndicator = document.querySelector('#offline-indicator');

      expect(secondIndicator).toBe(firstIndicatorRef);
    });
  });

  describe('online state behavior', () => {
    test('displays online notification with correct content and attributes', async () => {
      await import('../../src/offline-indicator');
      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();

      expect(indicator?.innerHTML).toContain('Wieder online');
      expect(indicator?.innerHTML).toContain('Verbindung wiederhergestellt');
      expect(indicator?.innerHTML).toContain('✅');

      expect(indicator?.classList.contains('online')).toBe(true);
      expect(indicator?.classList.contains('show')).toBe(true);
      expect(indicator?.classList.contains('offline')).toBe(false);

      expect(indicator?.querySelector('.offline-icon')).toBeTruthy();
      expect(indicator?.querySelector('.offline-content')).toBeTruthy();
      expect(indicator?.querySelector('.offline-message')).toBeTruthy();
    });

    test('auto-dismisses online notification after 3 seconds', async () => {
      await import('../../src/offline-indicator');
      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator?.classList.contains('show')).toBe(true);

      vi.advanceTimersByTime(3000);

      expect(indicator?.classList.contains('show')).toBe(false);
    });

    test('removes indicator from DOM after transition (300ms)', async () => {
      await import('../../src/offline-indicator');
      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();

      vi.advanceTimersByTime(3300);

      expect(document.querySelector('#offline-indicator')).toBeNull();
    });

    test('does not remove indicator if it regains show class', async () => {
      await import('../../src/offline-indicator');
      globalThis.dispatchEvent(new Event('online'));

      vi.advanceTimersByTime(3000);

      const indicator = document.querySelector('#offline-indicator');
      indicator?.classList.add('show');

      vi.advanceTimersByTime(300);

      expect(document.querySelector('#offline-indicator')).toBeTruthy();
    });
  });

  describe('state transitions', () => {
    test('transitions from offline to online correctly', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('offline'));

      let indicator = document.querySelector('#offline-indicator');
      expect(indicator?.classList.contains('offline')).toBe(true);
      expect(indicator?.innerHTML).toContain('Keine Internetverbindung');

      globalThis.dispatchEvent(new Event('online'));

      indicator = document.querySelector('#offline-indicator');
      expect(indicator?.classList.contains('online')).toBe(true);
      expect(indicator?.classList.contains('offline')).toBe(false);
      expect(indicator?.innerHTML).toContain('Wieder online');
    });

    test('handles rapid offline/online state changes', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('offline'));
      globalThis.dispatchEvent(new Event('online'));
      globalThis.dispatchEvent(new Event('offline'));
      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator?.classList.contains('online')).toBe(true);
      expect(indicator?.innerHTML).toContain('Wieder online');
    });

    test('creates new indicator if triggered after complete removal', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(3300);

      expect(document.querySelector('#offline-indicator')).toBeNull();

      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.innerHTML).toContain('Wieder online');
    });
  });

  describe('edge cases', () => {
    test('handles offline event when navigator.onLine is true', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });

      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('offline'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.classList.contains('offline')).toBe(true);
    });

    test('handles online event when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('online'));

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.classList.contains('online')).toBe(true);
    });

    test('handles multiple offline events in succession', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('offline'));
      globalThis.dispatchEvent(new Event('offline'));
      globalThis.dispatchEvent(new Event('offline'));

      const indicators = document.querySelectorAll('#offline-indicator');
      expect(indicators.length).toBe(1);
    });

    test('prevents auto-dismiss if going offline again during online notification', async () => {
      await import('../../src/offline-indicator');

      globalThis.dispatchEvent(new Event('online'));

      vi.advanceTimersByTime(1000);

      globalThis.dispatchEvent(new Event('offline'));

      vi.advanceTimersByTime(3000);

      const indicator = document.querySelector('#offline-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.classList.contains('offline')).toBe(true);
      expect(indicator?.classList.contains('show')).toBe(true);
    });
  });
});
