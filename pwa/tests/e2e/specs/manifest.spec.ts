import { expect, test } from '../fixtures/pwa-fixtures';

/**
 * Manifest Validation E2E Tests
 *
 * Tests Web App Manifest configuration and properties.
 */

test.describe('Web App Manifest', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page to ensure we're in the app context
    await page.goto('/');
  });

  test('manifest.json is accessible', async ({ page }) => {
    // Arrange & Act: Fetch manifest
    const response = await page.goto('/manifest.json');

    // Assert: Response is successful
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('application/json');
  });

  test('manifest has required properties', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Required properties exist
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('manifest has correct name', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Name is correct
    expect(manifest.name).toContain('Erstizeitung');
  });

  test('manifest has correct short_name', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Short name is correct
    expect(manifest.short_name).toBe('Erstizeitung');
  });

  test('manifest has University of Bayreuth theme color', async ({
    pwaPage,
  }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Theme color is Uni Bayreuth green
    expect(manifest.theme_color).toBe('#249260');
  });

  test('manifest has correct language', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Language is German
    expect(manifest.lang).toBe('de-DE');
  });

  test('manifest display mode is standalone', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Display is standalone
    expect(manifest.display).toBe('standalone');
  });

  test('manifest includes all icon sizes', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Icons include required sizes
    const iconSizes = manifest.icons.map((icon) => icon.sizes);

    expect(iconSizes).toContain('72x72');
    expect(iconSizes).toContain('96x96');
    expect(iconSizes).toContain('128x128');
    expect(iconSizes).toContain('144x144');
    expect(iconSizes).toContain('152x152');
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('384x384');
    expect(iconSizes).toContain('512x512');
  });

  test('manifest includes maskable icons', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Maskable icons are present
    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose === 'maskable',
    );
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  test('manifest includes Apple touch icon', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Apple touch icon (180x180) is present
    const appleIcon = manifest.icons.find((icon) => icon.sizes === '180x180');
    expect(appleIcon).toBeDefined();
  });

  test('manifest icon paths are valid', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: All icon paths start with / or BASE_PATH
    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\/.*icons\//);
    }
  });

  test('manifest includes shortcuts', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Shortcuts are defined
    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts?.length).toBeGreaterThan(0);
  });

  test('manifest shortcuts include required pages', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Key shortcuts are present
    const shortcutNames =
      manifest.shortcuts?.map((s) => s.name.toLowerCase()) ?? [];

    expect(
      shortcutNames.some(
        (name) => name.includes('studienstart') || name.includes('studium'),
      ),
    ).toBe(true);
    expect(shortcutNames.some((name) => name.includes('fachschaft'))).toBe(
      true,
    );
    expect(shortcutNames.some((name) => name.includes('campus'))).toBe(true);
  });

  test('manifest start_url points to root', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: start_url is root
    expect(manifest.start_url).toMatch(/\/$/);
  });

  test('manifest scope is correctly set', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Scope is root or BASE_PATH
    expect(manifest.scope).toMatch(/\/$/);
  });

  test('manifest has description', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Description exists and contains key terms
    expect(manifest.description).toBeTruthy();
    expect(manifest.description.toLowerCase()).toMatch(
      /erstizeitung|bcg|bayreuth/,
    );
  });

  test('manifest background color is white', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Background color is white
    expect(manifest.background_color).toBe('#ffffff');
  });

  test('manifest link tag is present in HTML', async ({ pwaPage }) => {
    // Arrange & Act: Check for manifest link
    const hasLink = await pwaPage.hasManifestLink();

    // Assert: Link exists
    expect(hasLink).toBe(true);
  });

  test('manifest link href is correct', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest link
    const href = await pwaPage.getManifestLinkHref();

    // Assert: Href points to manifest.json
    expect(href).toMatch(/manifest\.json$/);
  });

  test('manifest icons are PNG format', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: All icons are PNG
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
    }
  });

  test('manifest has categories', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest
    const manifest = await pwaPage.getManifest();

    // Assert: Categories are defined
    expect((manifest as { categories?: string[] }).categories).toBeDefined();
    expect(
      Array.isArray((manifest as { categories?: string[] }).categories),
    ).toBe(true);
  });

  test('BASE_PATH template is replaced in manifest', async ({ pwaPage }) => {
    // Arrange & Act: Get manifest as raw text
    const response = await pwaPage.page.goto('/manifest.json');
    const manifestText = await response?.text();

    // Assert: No template placeholders remain
    expect(manifestText).not.toContain('{{BASE_PATH}}');
  });

  test('manifest shortcuts have valid URL format', async ({ pwaPage }) => {
    // Arrange: Get manifest
    const manifest = await pwaPage.getManifest();

    // Act & Assert: Check shortcuts are properly formatted
    if (manifest.shortcuts && manifest.shortcuts.length > 0) {
      for (const shortcut of manifest.shortcuts) {
        // Verify URL format (should start with /)
        expect(shortcut.url).toMatch(/^\//);
        expect(shortcut.url).toMatch(/\.html$/);
      }
    }
  });

  test('manifest icon URLs are accessible', async ({ page, pwaPage }) => {
    // Arrange: Get manifest
    const manifest = await pwaPage.getManifest();

    // Act & Assert: Check first icon URL
    const firstIcon = manifest.icons[0];
    const response = await page.goto(firstIcon.src);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image');
  });
});
