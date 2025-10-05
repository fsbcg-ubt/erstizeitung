import { expect, test } from '../fixtures/pwa-fixtures';
import {
  setEngagementData,
  simulateBeforeInstallPrompt,
  waitForServiceWorkerActive,
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
    await waitForServiceWorkerActive(homePage.page);
    await homePage.reload();
    await homePage.clearLocalStorage();
  });

  test('install button has correct German text', async ({ homePage, page }) => {
    await setEngagementData(page, 2, 30_000);

    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    const buttonText = await homePage.getTextContent('#install-pwa-btn');
    expect(buttonText).toContain('App installieren');
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
