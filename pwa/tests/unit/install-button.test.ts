import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createBeforeInstallPromptEvent } from '../setup/browser.setup';

describe('install-button engagement tracking', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.innerHTML = '';
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('engagement data management', () => {
    test('initializes engagement data on first visit', async () => {
      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      const data = localStorage.getItem('pwa-engagement');
      expect(data).toBeTruthy();

      const parsed = JSON.parse(data!);
      expect(parsed).toHaveProperty('visitCount');
      expect(parsed).toHaveProperty('firstVisit');
      expect(parsed).toHaveProperty('lastVisit');
      expect(parsed).toHaveProperty('totalTime');
      expect(parsed.visitCount).toBe(1);
    });

    test('increments visit count on subsequent visits', async () => {
      await import('../../src/install-button');

      const event1 = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event1);
      vi.advanceTimersByTime(2100);

      const dataAfterFirst = JSON.parse(
        localStorage.getItem('pwa-engagement')!,
      ) as { visitCount: number };
      const firstCount = dataAfterFirst.visitCount;

      const event2 = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event2);
      vi.advanceTimersByTime(2100);

      const dataAfterSecond = JSON.parse(
        localStorage.getItem('pwa-engagement')!,
      );
      expect(dataAfterSecond.visitCount).toBe(firstCount + 1);
    });

    test('tracks time spent across sessions', async () => {
      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(35_000);

      globalThis.dispatchEvent(new Event('beforeunload'));

      const data = JSON.parse(localStorage.getItem('pwa-engagement')!);
      expect(data.totalTime).toBeGreaterThan(30_000); // Should be ~35000ms
    });

    test('handles invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('pwa-engagement', 'invalid-json');

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);
      vi.advanceTimersByTime(2100);

      const data = localStorage.getItem('pwa-engagement');
      expect(data).toBeTruthy();

      const parsed = JSON.parse(data!);
      expect(parsed).toHaveProperty('visitCount');
      expect(parsed.visitCount).toBeGreaterThan(0);
    });
  });

  describe('install button visibility', () => {
    test('shows button after minimum visits (2 visits)', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeTruthy();
      expect((button as HTMLElement).style.display).toBe('flex');
    });

    test('shows button after minimum time spent (30 seconds)', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 31_000, // >30 seconds
        visitCount: 1,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeTruthy();
    });

    test('does not show button if engagement criteria not met', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 5000, // <30 seconds
        visitCount: 0,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeNull();
    });

    test('does not show button if user previously dismissed it', async () => {
      localStorage.setItem('pwa-install-dismissed', 'true');

      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 50_000,
        visitCount: 3,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeNull();
    });
  });

  describe('install button interaction', () => {
    test('displays install button with correct content and accessibility', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);
      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');

      expect(button?.innerHTML).toContain('📱');
      expect(button?.innerHTML).toContain('App installieren');

      expect(button?.getAttribute('aria-label')).toBe(
        'Erstizeitung als App installieren',
      );
    });

    test('removes button after successful installation', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent('accepted');
      globalThis.dispatchEvent(event);
      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeTruthy();

      (button as HTMLElement).click();

      await vi.runOnlyPendingTimersAsync();

      await Promise.resolve();

      expect(document.querySelector('#install-pwa-btn')).toBeNull();
    });
  });

  describe('dismiss functionality', () => {
    test('removes button and persists preference when dismiss clicked', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);
      vi.advanceTimersByTime(2100);

      const button = document.querySelector('#install-pwa-btn');
      expect(button).toBeTruthy();

      const dismissButton = button!.querySelector('.install-dismiss-btn')!;
      expect(dismissButton).toBeTruthy();
      expect(dismissButton.getAttribute('aria-label')).toBe(
        'Installation-Hinweis schließen',
      );

      (dismissButton as HTMLElement).click();

      expect(document.querySelector('#install-pwa-btn')).toBeNull();

      expect(localStorage.getItem('pwa-install-dismissed')).toBe('true');
    });
  });

  describe('appinstalled event handling', () => {
    test('removes button when app is installed', () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      const beforeInstallEvent = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(beforeInstallEvent);
      vi.advanceTimersByTime(2100);

      expect(document.querySelector('#install-pwa-btn')).toBeTruthy();

      globalThis.dispatchEvent(new Event('appinstalled'));

      expect(document.querySelector('#install-pwa-btn')).toBeNull();
    });

    test('clears dismiss flag when app is installed', async () => {
      localStorage.setItem('pwa-install-dismissed', 'true');

      await import('../../src/install-button');

      globalThis.dispatchEvent(new Event('appinstalled'));

      expect(localStorage.getItem('pwa-install-dismissed')).toBeNull();
    });
  });
});
