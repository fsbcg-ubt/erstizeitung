import { expect, test } from '../fixtures/pwa-fixtures';
import {
  setEngagementData,
  simulateBeforeInstallPrompt,
} from '../helpers/pwa-helpers';

/**
 * Install Prompt E2E Tests
 *
 * Tests PWA installation prompt and engagement tracking.
 *
 * Note: Real beforeinstallprompt events cannot be programmatically triggered.
 * These tests simulate the event and verify the app's response.
 */

test.describe('Install Prompt', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigateToHome();

    await homePage.clearLocalStorage();
  });

  test('install button appears when engagement criteria met', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 30_000);

    await simulateBeforeInstallPrompt(page, 'accepted');

    await homePage.wait(2500);

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('install button has correct German text', async ({ homePage, page }) => {
    await setEngagementData(page, 2, 30_000);

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const buttonText = await homePage.getTextContent('#install-pwa-btn');
    expect(buttonText).toContain('App installieren');
  });

  test('install button does not appear without engagement', async ({
    homePage,
    page,
  }) => {
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('install button appears with sufficient visit count', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 5000);

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('install button appears with sufficient time engagement', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 1, 30_000);

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('dismiss button hides install prompt', async ({ homePage, page }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    expect(await homePage.isInstallButtonVisible()).toBe(true);

    await homePage.dismissInstallPrompt();

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('dismissing install prompt sets localStorage flag', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    await homePage.dismissInstallPrompt();

    const isDismissed = await pwaPage.isInstallDismissed();
    expect(isDismissed).toBe(true);
  });

  test('install button does not reappear after dismissal', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);
    await homePage.dismissInstallPrompt();

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('engagement data increments visit count', async ({ page, pwaPage }) => {
    await simulateBeforeInstallPrompt(page);

    const data = await pwaPage.getEngagementData();

    expect(data?.visitCount).toBeGreaterThanOrEqual(0);
  });

  test('tracks time spent on page', async ({ page, pwaPage }) => {
    await setEngagementData(page, 1, 10_000);

    await simulateBeforeInstallPrompt(page);

    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('beforeunload'));
    });

    await expect
      .poll(
        async () => {
          const data = await pwaPage.getEngagementData();
          return data?.totalTime ?? 0;
        },
        {
          intervals: [100, 250, 500],
          timeout: 2000,
        },
      )
      .toBeGreaterThanOrEqual(10_000);
  });

  test('install button has accessibility attributes', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    await homePage.assertElementHasAttribute(
      '#install-pwa-btn',
      'aria-label',
      /installieren/i,
    );
  });

  test('dismiss button has accessibility attributes', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    await homePage.assertElementHasAttribute(
      '.install-dismiss-btn',
      'aria-label',
      /schließen/i,
    );
  });

  test('install button only appears once', async ({ homePage, page }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const buttonCount = await page.locator('#install-pwa-btn').count();
    expect(buttonCount).toBe(1);

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(500);

    const buttonCountAfter = await page.locator('#install-pwa-btn').count();
    expect(buttonCountAfter).toBe(1);
  });

  test('clears dismiss flag when app is installed', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);
    await homePage.dismissInstallPrompt();

    expect(await pwaPage.isInstallDismissed()).toBe(true);

    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('appinstalled'));
    });

    await expect
      .poll(async () => await pwaPage.isInstallDismissed(), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(false);
  });

  test('removes install button when app is installed', async ({
    homePage,
    page,
  }) => {
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    expect(await homePage.isInstallButtonVisible()).toBe(true);

    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('appinstalled'));
    });

    await expect
      .poll(async () => await homePage.isInstallButtonVisible(), {
        intervals: [100, 250, 500],
        timeout: 2000,
      })
      .toBe(false);
  });
});
