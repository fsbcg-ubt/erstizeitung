import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Base Page Object
 *
 * Provides common functionality for all page objects.
 * Follows Playwright best practices for page object pattern with fixtures.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path relative to base URL
   */
  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded (including network idle)
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for a specific element to be visible
   */
  async waitForElement(selector: string, timeout = 5000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Wait for a specific element to be hidden or removed
   */
  async waitForElementHidden(selector: string, timeout = 5000): Promise<void> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Get text content of an element
   */
  async getTextContent(selector: string): Promise<string | null> {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Check if element exists in DOM (visible or not)
   */
  async elementExists(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).count()) > 0;
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Click on an element
   */
  async click(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  /**
   * Get localStorage item
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey);
    }, key);
  }

  /**
   * Set localStorage item
   */
  async setLocalStorageItem(key: string, value: string): Promise<void> {
    await this.page.evaluate(
      ({ storageKey, storageValue }) => {
        localStorage.setItem(storageKey, storageValue);
      },
      { storageKey: key, storageValue: value },
    );
  }

  /**
   * Clear all localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  /**
   * Wait for a specific time (use sparingly, prefer waitFor methods)
   */
  async wait(milliseconds: number): Promise<void> {
    await this.page.waitForTimeout(milliseconds);
  }

  /**
   * Reload the current page
   * @param waitUntil - Optional wait condition (default: 'networkidle')
   *                    Use 'domcontentloaded' for offline scenarios
   */
  async reload(
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle',
  ): Promise<void> {
    await this.page.reload({ waitUntil });
  }

  /**
   * Get current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Assert element has specific text content
   */
  async assertElementHasText(
    selector: string,
    expectedText: string | RegExp,
  ): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(expectedText);
  }

  /**
   * Assert element is visible
   */
  async assertElementVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Assert element is hidden
   */
  async assertElementHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  /**
   * Assert element has specific attribute value
   */
  async assertElementHasAttribute(
    selector: string,
    attribute: string,
    value: string | RegExp,
  ): Promise<void> {
    await expect(this.page.locator(selector)).toHaveAttribute(attribute, value);
  }

  /**
   * Get page URL
   */
  getURL(): string {
    return this.page.url();
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(pageFunction: () => T): Promise<T> {
    return await this.page.evaluate(pageFunction);
  }

  /**
   * Take a screenshot (useful for debugging)
   */
  async screenshot(path?: string): Promise<Buffer> {
    return await this.page.screenshot({ fullPage: true, path });
  }
}
