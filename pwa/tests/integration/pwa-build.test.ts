import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';

const BOOK_DIR = path.join(__dirname, '..', '..', '..', '_book');

// Integration tests verify build output exists and is correct
// Run 'make render-pwa' before running these tests

describe('PWA Build Output', () => {
  describe('PWA manifest', () => {
    test('manifest.json exists and has valid structure', () => {
      const manifestPath = path.join(BOOK_DIR, 'manifest.json');
      expect(fs.existsSync(manifestPath), 'manifest.json should exist').toBe(
        true,
      );

      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      let manifest;

      expect(() => {
        manifest = JSON.parse(manifestContent);
      }).not.toThrow();

      expect(manifest).toHaveProperty('name');
      expect(manifest).toHaveProperty('short_name');
      expect(manifest).toHaveProperty('theme_color');
      expect(manifest).toHaveProperty('background_color');
      expect(manifest).toHaveProperty('lang');

      expect(manifest.name).toBe('Erstizeitung BCG - Universität Bayreuth');
      expect(manifest.short_name).toBe('Erstizeitung');
      expect(manifest.theme_color).toBe('#249260');
      expect(manifest.background_color).toBe('#ffffff');
      expect(manifest.lang).toBe('de-DE');
    });
  });

  describe('Service Worker', () => {
    test('service-worker.js exists and uses Workbox', () => {
      const swPath = path.join(BOOK_DIR, 'service-worker.js');
      expect(fs.existsSync(swPath), 'service-worker.js should exist').toBe(
        true,
      );

      const swContent = fs.readFileSync(swPath, 'utf8');
      expect(swContent).toContain('workbox');
    });
  });

  describe('PWA support files', () => {
    test.each([
      'offline.html',
      'register-sw.js',
      'offline-indicator.js',
      'install-button.js',
      'pwa-styles.css',
    ])('%s exists in build output', (filename) => {
      const filePath = path.join(BOOK_DIR, filename);
      expect(fs.existsSync(filePath), `${filename} should exist`).toBe(true);
    });
  });

  describe('PWA icons', () => {
    test.each([72, 96, 128, 144, 152, 192, 384, 512])(
      'icon-%ipx.png exists',
      (size) => {
        const iconPath = path.join(
          BOOK_DIR,
          'icons',
          `icon-${String(size)}.png`,
        );
        expect(
          fs.existsSync(iconPath),
          `icon-${String(size)}.png should exist`,
        ).toBe(true);
      },
    );

    test('apple-touch-icon exists', () => {
      const iconPath = path.join(
        BOOK_DIR,
        'icons',
        'apple-touch-icon-180x180.png',
      );
      expect(fs.existsSync(iconPath), 'apple-touch-icon should exist').toBe(
        true,
      );
    });

    test.each([192, 512])('maskable-icon-%ix%i.png exists', (size) => {
      const iconPath = path.join(
        BOOK_DIR,
        'icons',
        `maskable-icon-${String(size)}x${String(size)}.png`,
      );
      expect(
        fs.existsSync(iconPath),
        `maskable-icon-${String(size)}x${String(size)}.png should exist`,
      ).toBe(true);
    });
  });

  describe('HTML PWA injection', () => {
    test('index.html has required PWA meta tags and links', () => {
      const indexPath = path.join(BOOK_DIR, 'index.html');
      expect(fs.existsSync(indexPath), 'index.html should exist').toBe(true);

      const html = fs.readFileSync(indexPath, 'utf8');

      // Check for required PWA meta tags and links
      expect(html).toContain('<link rel="manifest"');
      expect(html).toContain('manifest.json');
      expect(html).toContain('<meta name="theme-color" content="#249260"');
      expect(html).toContain('<link rel="apple-touch-icon"');
      expect(html).toContain('pwa-styles.css');

      // Check for PWA scripts
      expect(html).toContain('register-sw.js');
      expect(html).toContain('offline-indicator.js');
      expect(html).toContain('install-button.js');
    });
  });

  describe('Template processing', () => {
    test.each([
      { description: 'manifest', file: 'manifest.json' },
      { description: 'offline page', file: 'offline.html' },
      { description: 'service worker registration', file: 'register-sw.js' },
    ])('$description has no {{BASE_PATH}} placeholders', ({ file }) => {
      const filePath = path.join(BOOK_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('{{BASE_PATH}}');
    });
  });

  describe('Localization', () => {
    test('offline page has German content', () => {
      const offlinePath = path.join(BOOK_DIR, 'offline.html');
      const offline = fs.readFileSync(offlinePath, 'utf8');

      expect(offline).toContain('Keine Internetverbindung');
      expect(offline).toContain('Zurück');
    });
  });

  describe('CSP compliance', () => {
    test.each(['register-sw.js', 'offline-indicator.js', 'install-button.js'])(
      '%s has no inline styles (style="...")',
      (file) => {
        const content = fs.readFileSync(path.join(BOOK_DIR, file), 'utf8');
        expect(
          content,
          `${file} should not contain inline styles`,
        ).not.toContain('style="');
      },
    );
  });

  describe('Failure scenarios', () => {
    test('_book directory exists', () => {
      expect(
        fs.existsSync(BOOK_DIR),
        '_book directory should exist (run make render-pwa first)',
      ).toBe(true);
    });

    test('manifest.json is not empty', () => {
      const manifestPath = path.join(BOOK_DIR, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const stats = fs.statSync(manifestPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    test('service-worker.js is not empty', () => {
      const swPath = path.join(BOOK_DIR, 'service-worker.js');
      if (fs.existsSync(swPath)) {
        const stats = fs.statSync(swPath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });
  });
});
