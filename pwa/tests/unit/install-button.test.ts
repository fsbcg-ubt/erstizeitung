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
    test.each([
      {
        reason: 'minimum visits (2 visits)',
        totalTime: 0,
        visitCount: 2,
      },
      {
        reason: 'minimum time spent (30 seconds)',
        totalTime: 31_000,
        visitCount: 1,
      },
    ])('shows button with $reason', async ({ totalTime, visitCount }) => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime,
        visitCount,
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

    test('does not call preventDefault when engagement criteria not met', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 5000, // < 30 seconds
        visitCount: 0, // < 2 visits
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    test('calls preventDefault when engagement criteria met', async () => {
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2, // >= 2 visits
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      const event = createBeforeInstallPromptEvent();
      globalThis.dispatchEvent(event);

      vi.advanceTimersByTime(2100);

      expect(event.preventDefault).toHaveBeenCalled();
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
        'Erstizeitung als Progressive Web App installieren',
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
        'Installation-Hinweis dauerhaft schließen',
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

  describe('accessibility improvements', () => {
    test.each([
      { key: 'Enter', label: 'Enter key' },
      { key: ' ', label: 'Space key' },
    ])('install button responds to $label', async ({ key }) => {
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

      const button = document.querySelector('#install-pwa-btn')!;
      expect(button).toBeTruthy();

      const keyEvent = new KeyboardEvent('keydown', { key });
      button.dispatchEvent(keyEvent);

      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();

      expect(document.querySelector('#install-pwa-btn')).toBeNull();
    });

    test.each([
      { key: 'Enter', label: 'Enter key' },
      { key: ' ', label: 'Space key' },
    ])('dismiss button responds to $label', async ({ key }) => {
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

      const keyEvent = new KeyboardEvent('keydown', { key });
      dismissButton.dispatchEvent(keyEvent);

      expect(document.querySelector('#install-pwa-btn')).toBeNull();
      expect(localStorage.getItem('pwa-install-dismissed')).toBe('true');
    });

    test('install button has proper ARIA attributes', async () => {
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

      expect(button?.getAttribute('role')).toBe('button');
      expect(button?.getAttribute('aria-label')).toBe(
        'Erstizeitung als Progressive Web App installieren',
      );
      expect(button?.getAttribute('tabindex')).toBe('0');
    });

    test('dismiss button has proper ARIA attributes', async () => {
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
      const dismissButton = button!.querySelector('.install-dismiss-btn');
      expect(dismissButton).toBeTruthy();

      expect(dismissButton?.getAttribute('role')).toBe('button');
      expect(dismissButton?.getAttribute('aria-label')).toBe(
        'Installation-Hinweis dauerhaft schließen',
      );
      expect(dismissButton?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('already-installed detection', () => {
    test('hides button when in standalone mode (display-mode)', async () => {
      // Mock matchMedia for standalone
      Object.defineProperty(globalThis, 'matchMedia', {
        value: vi.fn().mockReturnValue({ matches: true }),
        writable: true,
      });

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

      // Button should NOT be added
      expect(document.querySelector('#install-pwa-btn')).toBeNull();
    });

    test('hides button on iOS standalone mode', async () => {
      // Mock iOS standalone
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        value: true,
      });

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

      // Button should NOT be added
      expect(document.querySelector('#install-pwa-btn')).toBeNull();

      // Cleanup
      delete (navigator as any).standalone;
    });

    test('removes existing button on page load if already installed', async () => {
      // Create existing button
      const existingButton = document.createElement('button');
      existingButton.id = 'install-pwa-btn';
      document.body.append(existingButton);

      expect(document.querySelector('#install-pwa-btn')).toBeTruthy();

      // Mock standalone mode
      Object.defineProperty(globalThis, 'matchMedia', {
        value: vi.fn().mockReturnValue({ matches: true }),
        writable: true,
      });

      await import('../../src/install-button');

      // Button should be removed
      expect(document.querySelector('#install-pwa-btn')).toBeNull();
    });

    test('shows button when not in standalone mode', async () => {
      // Mock matchMedia for NOT standalone
      Object.defineProperty(globalThis, 'matchMedia', {
        value: vi.fn().mockReturnValue({ matches: false }),
        writable: true,
      });

      // Ensure navigator.standalone is false
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        value: false,
      });

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

      // Button SHOULD be added
      expect(document.querySelector('#install-pwa-btn')).toBeTruthy();

      // Cleanup
      delete (navigator as any).standalone;
    });
  });

  describe('iOS/Safari fallback', () => {
    test.each([
      {
        checkContent: true,
        platform: 'iOS Safari',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      },
      {
        checkContent: false,
        platform: 'macOS Safari',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
      },
    ])(
      'shows iOS instructions for $platform users',
      async ({ checkContent, userAgent }) => {
        // Mock user agent
        Object.defineProperty(navigator, 'userAgent', {
          configurable: true,
          value: userAgent,
        });

        // Mock BeforeInstallPromptEvent as not available
        const originalBeforeInstallPromptEvent = (globalThis as any)
          .BeforeInstallPromptEvent;
        delete (globalThis as any).BeforeInstallPromptEvent;

        const engagementData = {
          firstVisit: Date.now(),
          lastVisit: Date.now(),
          totalTime: 0,
          visitCount: 2,
        };
        localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

        await import('../../src/install-button');

        // Advance timer to trigger iOS banner (5 seconds delay)
        vi.advanceTimersByTime(5100);

        const banner = document.querySelector('.ios-install-banner');
        expect(banner).toBeTruthy();

        if (checkContent) {
          expect(banner?.innerHTML).toContain('Als App installieren');
          expect(banner?.innerHTML).toContain('Zum Home-Bildschirm');
        }

        // Cleanup
        (globalThis as any).BeforeInstallPromptEvent =
          originalBeforeInstallPromptEvent;
      },
    );

    test('iOS banner respects engagement threshold', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Low engagement (doesn't meet threshold)
      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 5000, // < 30 seconds
        visitCount: 0, // < 2 visits
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      // Banner should NOT appear
      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeNull();

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner dismissal persists', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeTruthy();

      const dismissButton = banner!.querySelector('.ios-install-dismiss')!;
      expect(dismissButton).toBeTruthy();

      dismissButton.click();

      expect(document.querySelector('.ios-install-banner')).toBeNull();
      const dismissData = JSON.parse(
        localStorage.getItem('pwa-ios-instructions-dismissed')!,
      );
      expect(dismissData).toMatchObject({
        dismissCount: 1,
        dismissedAt: expect.any(Number),
        firstDismissedAt: expect.any(Number),
        visitCountAtDismiss: expect.any(Number),
      });

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner does not show if already installed', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Mock standalone mode
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        value: true,
      });

      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      // Banner should NOT appear because already installed
      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeNull();

      // Cleanup
      delete (navigator as any).standalone;
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner dismiss button supports keyboard navigation', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      const engagementData = {
        firstVisit: Date.now(),
        lastVisit: Date.now(),
        totalTime: 0,
        visitCount: 2,
      };
      localStorage.setItem('pwa-engagement', JSON.stringify(engagementData));

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeTruthy();

      const dismissButton = banner!.querySelector('.ios-install-dismiss')!;

      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      dismissButton.dispatchEvent(enterEvent);

      expect(document.querySelector('.ios-install-banner')).toBeNull();
      const dismissData = JSON.parse(
        localStorage.getItem('pwa-ios-instructions-dismissed')!,
      );
      expect(dismissData).toMatchObject({
        dismissCount: 1,
        dismissedAt: expect.any(Number),
        firstDismissedAt: expect.any(Number),
        visitCountAtDismiss: expect.any(Number),
      });

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner re-prompts after 14 days', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      const now = Date.now();
      const dismissData = {
        dismissCount: 1,
        dismissedAt: now - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        firstDismissedAt: now - 15 * 24 * 60 * 60 * 1000,
        visitCountAtDismiss: 2,
      };
      localStorage.setItem(
        'pwa-ios-instructions-dismissed',
        JSON.stringify(dismissData),
      );

      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: now - 20 * 24 * 60 * 60 * 1000,
          lastVisit: now,
          totalTime: 60_000,
          visitCount: 5,
        }),
      );

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeTruthy();

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner re-prompts after 10 visits', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Set up initial dismiss (only 5 days ago, not enough time)
      const now = Date.now();
      const dismissData = {
        dismissCount: 1,
        dismissedAt: now - 5 * 24 * 60 * 60 * 1000,
        firstDismissedAt: now - 5 * 24 * 60 * 60 * 1000,
        visitCountAtDismiss: 2,
      };
      localStorage.setItem(
        'pwa-ios-instructions-dismissed',
        JSON.stringify(dismissData),
      );

      // Set up engagement data with 13 total visits (11 since dismiss)
      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: now - 20 * 24 * 60 * 60 * 1000,
          lastVisit: now,
          totalTime: 60_000,
          visitCount: 13,
        }),
      );

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeTruthy();

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner does not re-prompt before thresholds', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Set up initial dismiss (only 5 days ago, not enough time)
      const now = Date.now();
      const dismissData = {
        dismissCount: 1,
        dismissedAt: now - 5 * 24 * 60 * 60 * 1000,
        firstDismissedAt: now - 5 * 24 * 60 * 60 * 1000,
        visitCountAtDismiss: 2,
      };
      localStorage.setItem(
        'pwa-ios-instructions-dismissed',
        JSON.stringify(dismissData),
      );

      // Set up engagement data with only 7 total visits (5 since dismiss)
      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: now - 20 * 24 * 60 * 60 * 1000,
          lastVisit: now,
          totalTime: 60_000,
          visitCount: 7,
        }),
      );

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeNull();

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner permanently hidden after 3 dismissals', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Set up dismiss data showing 3 dismissals, long time passed
      const now = Date.now();
      const dismissData = {
        dismissCount: 3,
        dismissedAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        firstDismissedAt: now - 90 * 24 * 60 * 60 * 1000,
        visitCountAtDismiss: 2,
      };
      localStorage.setItem(
        'pwa-ios-instructions-dismissed',
        JSON.stringify(dismissData),
      );

      // Set up engagement data with many visits
      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: now - 100 * 24 * 60 * 60 * 1000,
          lastVisit: now,
          totalTime: 120_000,
          visitCount: 50,
        }),
      );

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeNull();

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });

    test('iOS banner migrates old boolean format', async () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      const originalBeforeInstallPromptEvent = (globalThis as any)
        .BeforeInstallPromptEvent;
      delete (globalThis as any).BeforeInstallPromptEvent;

      // Set old boolean format
      localStorage.setItem('pwa-ios-instructions-dismissed', 'true');

      // Set up engagement data
      const now = Date.now();
      localStorage.setItem(
        'pwa-engagement',
        JSON.stringify({
          firstVisit: now - 20 * 24 * 60 * 60 * 1000,
          lastVisit: now,
          totalTime: 60_000,
          visitCount: 5,
        }),
      );

      await import('../../src/install-button');

      vi.advanceTimersByTime(5100);

      // Should show immediately (14 days assumed)
      const banner = document.querySelector('.ios-install-banner');
      expect(banner).toBeTruthy();

      const migratedData = JSON.parse(
        localStorage.getItem('pwa-ios-instructions-dismissed')!,
      );
      expect(migratedData).toMatchObject({
        dismissCount: 1,
        dismissedAt: expect.any(Number),
        firstDismissedAt: expect.any(Number),
        visitCountAtDismiss: expect.any(Number),
      });

      // Cleanup
      (globalThis as any).BeforeInstallPromptEvent =
        originalBeforeInstallPromptEvent;
    });
  });
});
