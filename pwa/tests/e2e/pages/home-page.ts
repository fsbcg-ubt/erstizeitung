import { BasePage } from './base-page';

/**
 * Home Page Object
 *
 * Represents the Erstizeitung home page with PWA-specific interactions.
 */
export class HomePage extends BasePage {
  // Selectors
  private readonly selectors = {
    // Page elements
    mainContent: 'main',
    navigation: '.book-summary',
    searchButton: '.fa-search',

    // PWA-specific elements
    dismissUpdateButton: '#sw-dismiss-btn',
    installButton: '#install-pwa-btn',
    installDismissButton: '.install-dismiss-btn',
    offlineIndicator: '#offline-indicator',
    updateButton: '#sw-update-btn',
    updateToast: '#sw-update-toast',

    // Content elements
    pageContent: '.page-inner',
    pageTitle: 'h1',
  };

  /**
   * Navigate to home page
   */
  async navigateToHome(): Promise<void> {
    await this.goto('/');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to a specific chapter/page
   */
  async navigateToPage(pagePath: string): Promise<void> {
    await this.goto(pagePath);
    await this.waitForPageLoad();
  }

  /**
   * Check if main content is visible
   */
  async isContentVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.mainContent);
  }

  /**
   * Get page heading text
   */
  async getPageHeading(): Promise<string | null> {
    return await this.getTextContent(this.selectors.pageTitle);
  }

  /**
   * Wait for navigation menu to be visible
   */
  async waitForNavigation(): Promise<void> {
    await this.waitForElement(this.selectors.navigation);
  }

  /**
   * Check if install button is visible
   */
  async isInstallButtonVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.installButton);
  }

  /**
   * Click install button
   */
  async clickInstallButton(): Promise<void> {
    await this.click(this.selectors.installButton);
  }

  /**
   * Dismiss install prompt
   */
  async dismissInstallPrompt(): Promise<void> {
    await this.click(this.selectors.installDismissButton);
  }

  /**
   * Check if offline indicator is visible
   */
  async isOfflineIndicatorVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.offlineIndicator);
  }

  /**
   * Get offline indicator message
   */
  async getOfflineIndicatorMessage(): Promise<string | null> {
    return await this.getTextContent(this.selectors.offlineIndicator);
  }

  /**
   * Wait for offline indicator to appear
   */
  async waitForOfflineIndicator(timeout = 5000): Promise<void> {
    await this.waitForElement(this.selectors.offlineIndicator, timeout);
  }

  /**
   * Wait for offline indicator to disappear
   */
  async waitForOfflineIndicatorHidden(timeout = 5000): Promise<void> {
    await this.waitForElementHidden(this.selectors.offlineIndicator, timeout);
  }

  /**
   * Check if update toast is visible
   */
  async isUpdateToastVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.updateToast);
  }

  /**
   * Get update toast message
   */
  async getUpdateToastMessage(): Promise<string | null> {
    return await this.getTextContent(this.selectors.updateToast);
  }

  /**
   * Click update button in toast
   */
  async clickUpdateButton(): Promise<void> {
    await this.click(this.selectors.updateButton);
  }

  /**
   * Dismiss update notification
   */
  async dismissUpdateNotification(): Promise<void> {
    await this.click(this.selectors.dismissUpdateButton);
  }

  /**
   * Wait for service worker update toast to appear
   */
  async waitForUpdateToast(timeout = 5000): Promise<void> {
    await this.waitForElement(this.selectors.updateToast, timeout);
  }

  /**
   * Verify page content is cached and displayed
   */
  async verifyContentDisplayed(
    expectedHeading: string | RegExp,
  ): Promise<void> {
    await this.assertElementVisible(this.selectors.mainContent);
    await this.assertElementHasText(this.selectors.pageTitle, expectedHeading);
  }

  /**
   * Verify offline indicator shows German message
   */
  async verifyOfflineMessage(): Promise<void> {
    await this.assertElementVisible(this.selectors.offlineIndicator);
    await this.assertElementHasText(
      this.selectors.offlineIndicator,
      /Keine Internetverbindung/,
    );
  }

  /**
   * Verify online notification shows German message
   */
  async verifyOnlineMessage(): Promise<void> {
    await this.assertElementVisible(this.selectors.offlineIndicator);
    await this.assertElementHasText(
      this.selectors.offlineIndicator,
      /Wieder online/,
    );
  }

  /**
   * Verify accessibility attributes on offline indicator
   */
  async verifyOfflineIndicatorAccessibility(): Promise<void> {
    await this.assertElementHasAttribute(
      this.selectors.offlineIndicator,
      'role',
      'status',
    );
    await this.assertElementHasAttribute(
      this.selectors.offlineIndicator,
      'aria-live',
      'polite',
    );
  }
}
