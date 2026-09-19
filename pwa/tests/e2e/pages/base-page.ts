import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Content container every rendered GitBook page carries.
 */
const CONTENT_SELECTOR = '.book-body';

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
   * Wait until the rendered page content is present.
   *
   * goto() already awaits the load event, so this asserts the stronger
   * condition the specs need: that the book's content container is rendered.
   */
  async waitForPageLoad(): Promise<void> {
    await expect(this.page.locator(CONTENT_SELECTOR)).toBeVisible();
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
   * Reload the current page and wait for its content to be rendered again.
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
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
   * Execute JavaScript in page context
   */
  async evaluate<T>(pageFunction: () => T): Promise<T> {
    return await this.page.evaluate(pageFunction);
  }
}
