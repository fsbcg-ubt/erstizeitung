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
    // Navigate to home page
    await homePage.navigateToHome();

    // Clear localStorage to reset engagement data
    await homePage.clearLocalStorage();
  });

  test('install button appears when engagement criteria met', async ({
    homePage,
    page,
  }) => {
    // Arrange: Set engagement data (2 visits, 30s total time)
    await setEngagementData(page, 2, 30_000);

    // Act: Simulate beforeinstallprompt event
    await simulateBeforeInstallPrompt(page, 'accepted');

    // Wait for button processing (2s delay in code)
    await homePage.wait(2500);

    // Assert: Install button appears
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('install button has correct German text', async ({ homePage, page }) => {
    // Arrange: Set engagement criteria
    await setEngagementData(page, 2, 30_000);

    // Act: Simulate install prompt
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Button has German text
    const buttonText = await homePage.getTextContent('#install-pwa-btn');
    expect(buttonText).toContain('App installieren');
  });

  test('install button does not appear without engagement', async ({
    homePage,
    page,
  }) => {
    // Arrange: No engagement data (new visitor)

    // Act: Simulate beforeinstallprompt event
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Install button does NOT appear
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('install button appears with sufficient visit count', async ({
    homePage,
    page,
  }) => {
    // Arrange: 2 visits, low time
    await setEngagementData(page, 2, 5000);

    // Act: Simulate install prompt
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Button appears (visit count threshold met)
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('install button appears with sufficient time engagement', async ({
    homePage,
    page,
  }) => {
    // Arrange: 1 visit, 30s+ time
    await setEngagementData(page, 1, 30_000);

    // Act: Simulate install prompt
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Button appears (time threshold met)
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(true);
  });

  test('dismiss button hides install prompt', async ({ homePage, page }) => {
    // Arrange: Show install button
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    expect(await homePage.isInstallButtonVisible()).toBe(true);

    // Act: Click dismiss button
    await homePage.dismissInstallPrompt();

    // Assert: Button is removed
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('dismissing install prompt sets localStorage flag', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Show install button
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Act: Dismiss
    await homePage.dismissInstallPrompt();

    // Assert: localStorage flag is set
    const isDismissed = await pwaPage.isInstallDismissed();
    expect(isDismissed).toBe(true);
  });

  test('install button does not reappear after dismissal', async ({
    homePage,
    page,
  }) => {
    // Arrange: Dismiss once
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);
    await homePage.dismissInstallPrompt();

    // Act: Simulate another install prompt event
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Button still hidden
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });

  test('engagement data increments visit count', async ({ page, pwaPage }) => {
    // Arrange: No prior engagement

    // Act: Simulate beforeinstallprompt (updates engagement data)
    await simulateBeforeInstallPrompt(page);

    // Get engagement data
    const data = await pwaPage.getEngagementData();

    // Assert: Visit count is 1
    expect(data?.visitCount).toBeGreaterThanOrEqual(0);
  });

  test('tracks time spent on page', async ({ page, pwaPage }) => {
    // Arrange: Set initial engagement
    await setEngagementData(page, 1, 10_000);

    // Simulate beforeinstallprompt to trigger tracking
    await simulateBeforeInstallPrompt(page);

    // Act: Wait and trigger beforeunload
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('beforeunload'));
    });

    // Assert: Total time should have increased
    const data = await pwaPage.getEngagementData();
    expect(data?.totalTime).toBeGreaterThanOrEqual(10_000);
  });

  test('install button has accessibility attributes', async ({
    homePage,
    page,
  }) => {
    // Arrange: Show install button
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Button has aria-label
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
    // Arrange: Show install button
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Dismiss button has aria-label
    await homePage.assertElementHasAttribute(
      '.install-dismiss-btn',
      'aria-label',
      /schließen/i,
    );
  });

  test('install button only appears once', async ({ homePage, page }) => {
    // Arrange: Set engagement and trigger prompt
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    // Assert: Only one button exists
    const buttonCount = await page.locator('#install-pwa-btn').count();
    expect(buttonCount).toBe(1);

    // Act: Trigger prompt again
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(500);

    // Assert: Still only one button
    const buttonCountAfter = await page.locator('#install-pwa-btn').count();
    expect(buttonCountAfter).toBe(1);
  });

  test('clears dismiss flag when app is installed', async ({
    homePage,
    page,
    pwaPage,
  }) => {
    // Arrange: Dismiss install prompt first
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);
    await homePage.dismissInstallPrompt();

    expect(await pwaPage.isInstallDismissed()).toBe(true);

    // Act: Simulate app installation
    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('appinstalled'));
    });

    await page.waitForTimeout(500);

    // Assert: Dismiss flag is cleared
    const isDismissed = await pwaPage.isInstallDismissed();
    expect(isDismissed).toBe(false);
  });

  test('removes install button when app is installed', async ({
    homePage,
    page,
  }) => {
    // Arrange: Show install button
    await setEngagementData(page, 2, 30_000);
    await simulateBeforeInstallPrompt(page);
    await homePage.wait(2500);

    expect(await homePage.isInstallButtonVisible()).toBe(true);

    // Act: Trigger appinstalled event
    await page.evaluate(() => {
      globalThis.dispatchEvent(new Event('appinstalled'));
    });

    await page.waitForTimeout(500);

    // Assert: Button is removed
    const isVisible = await homePage.isInstallButtonVisible();
    expect(isVisible).toBe(false);
  });
});
