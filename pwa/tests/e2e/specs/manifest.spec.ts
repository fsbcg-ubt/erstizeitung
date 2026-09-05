import { expect, test } from '../fixtures/pwa-fixtures';

/**
 * Manifest Validation E2E Tests
 *
 * Tests Web App Manifest configuration and properties.
 */

test.describe('Web App Manifest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('manifest.json is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');

    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('application/json');
  });

  test('manifest has required properties', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('manifest has correct name', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.name).toContain('Erstizeitung');
  });

  test('manifest has correct short_name', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.short_name).toBe('Erstizeitung');
  });

  test('manifest has University of Bayreuth theme color', async ({
    pwaPage,
  }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.theme_color).toBe('#249260');
  });

  test('manifest has correct language', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.lang).toBe('de-DE');
  });

  test('manifest display mode is standalone', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.display).toBe('standalone');
  });

  test('manifest includes all icon sizes', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

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
    const manifest = await pwaPage.getManifest();

    const maskableIcons = manifest.icons.filter(
      (icon) => icon.purpose === 'maskable',
    );
    expect(maskableIcons.length).toBeGreaterThan(0);
  });

  test('manifest includes Apple touch icon', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const appleIcon = manifest.icons.find((icon) => icon.sizes === '180x180');
    expect(appleIcon).toBeDefined();
  });

  test('manifest icon paths are valid', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    for (const icon of manifest.icons) {
      expect(icon.src).toMatch(/^\/.*icons\//);
    }
  });

  test('manifest includes shortcuts', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.shortcuts).toBeDefined();
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts?.length).toBeGreaterThan(0);
  });

  test('manifest shortcuts include required pages', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const shortcutNames =
      manifest.shortcuts?.map((s) => s.name.toLowerCase()) ?? [];

    expect(shortcutNames.some((name) => name.includes('fachschaft'))).toBe(
      true,
    );
    expect(
      shortcutNames.some(
        (name) => name.includes('dschungel') || name.includes('abc'),
      ),
    ).toBe(true);
    expect(shortcutNames.some((name) => name.includes('termine'))).toBe(true);
  });

  test('manifest start_url points to root', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.start_url).toMatch(/\/$/);
  });

  test('manifest scope is correctly set', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.scope).toMatch(/\/$/);
  });

  test('manifest has description', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.description).toBeTruthy();
    expect(manifest.description.toLowerCase()).toMatch(
      /erstizeitung|bcg|bayreuth/,
    );
  });

  test('manifest background color is white', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.background_color).toBe('#ffffff');
  });

  test('manifest link tag is present in HTML', async ({ pwaPage }) => {
    const hasLink = await pwaPage.hasManifestLink();

    expect(hasLink).toBe(true);
  });

  test('manifest link href is correct', async ({ pwaPage }) => {
    const href = await pwaPage.getManifestLinkHref();

    expect(href).toMatch(/manifest\.json$/);
  });

  test('manifest icons are PNG format', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
    }
  });

  test('manifest has categories', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    expect((manifest as { categories?: string[] }).categories).toBeDefined();
    expect(
      Array.isArray((manifest as { categories?: string[] }).categories),
    ).toBe(true);
  });

  test('BASE_PATH template is replaced in manifest', async ({ pwaPage }) => {
    // Use in-browser fetch instead of page.goto + response.text()
    // to avoid Firefox CDP protocol error (NS_ERROR_FAILURE)
    const manifestText = await pwaPage.page.evaluate(async () => {
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error('Failed to fetch manifest.json');
      }
      return await response.text();
    });

    expect(manifestText).not.toContain('{{BASE_PATH}}');
  });

  test('manifest shortcuts have valid URL format', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    if (manifest.shortcuts && manifest.shortcuts.length > 0) {
      for (const shortcut of manifest.shortcuts) {
        expect(shortcut.url).toMatch(/^\//);
        expect(shortcut.url).toMatch(/\.html$/);
      }
    }
  });

  test('manifest shortcut URLs are accessible', async ({ page, pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const shortcuts = manifest.shortcuts ?? [];

    for (const shortcut of shortcuts) {
      const response = await page.goto(shortcut.url);
      expect(
        response.status() === 200 || response.status() === 304,
      ).toBeTruthy();
    }
  });

  test('manifest shortcuts have required properties', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const shortcuts = manifest.shortcuts ?? [];

    for (const shortcut of shortcuts) {
      expect(shortcut.name).toBeTruthy();
      expect(shortcut.url).toBeTruthy();
    }
  });

  test('manifest shortcuts have recommended properties', async ({
    pwaPage,
  }) => {
    const manifest = await pwaPage.getManifest();

    const shortcuts = manifest.shortcuts ?? [];

    for (const shortcut of shortcuts) {
      expect(shortcut.short_name).toBeTruthy();
      expect(shortcut.description).toBeTruthy();
      expect(shortcut.icons).toBeDefined();
      expect(Array.isArray(shortcut.icons)).toBe(true);
    }
  });

  test('manifest shortcut icons meet requirements', async ({ pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const shortcuts = manifest.shortcuts ?? [];

    for (const shortcut of shortcuts) {
      expect(shortcut.icons.length).toBeGreaterThan(0);

      for (const icon of shortcut.icons) {
        expect(icon.sizes).toBe('192x192');
        expect(icon.type).toBe('image/png');
      }
    }
  });

  test('manifest shortcuts follow best practices (≤3 for Android)', async ({
    pwaPage,
  }) => {
    const manifest = await pwaPage.getManifest();

    expect(manifest.shortcuts?.length).toBeLessThanOrEqual(3);
  });

  test('manifest shortcuts have meaningful descriptions for accessibility', async ({
    pwaPage,
  }) => {
    const manifest = await pwaPage.getManifest();

    const shortcuts = manifest.shortcuts ?? [];

    for (const shortcut of shortcuts) {
      expect(shortcut.description).toBeTruthy();
      expect(shortcut.description.length).toBeGreaterThan(10);
    }
  });

  test('manifest icon URLs are accessible', async ({ page, pwaPage }) => {
    const manifest = await pwaPage.getManifest();

    const firstIcon = manifest.icons[0];
    const response = await page.goto(firstIcon.src);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-type']).toContain('image');
  });
});
