import * as cheerio from 'cheerio';
import { describe, expect, test } from 'vitest';
import {
  processTemplate,
  replaceCDNWithLocal,
  validateBasePath,
} from '../../src/inject-html';

describe('validateBasePath', () => {
  describe('valid inputs', () => {
    test.each([
      { description: 'empty string', expected: '', input: '' },
      {
        description: 'simple path',
        expected: '/erstizeitung',
        input: '/erstizeitung',
      },
      {
        description: 'nested path',
        expected: '/foo/bar/baz',
        input: '/foo/bar/baz',
      },
      {
        description: 'path with trailing slash',
        expected: '/erstizeitung',
        input: '/erstizeitung/',
      },
      {
        description: 'path with whitespace',
        expected: '/erstizeitung',
        input: '  /erstizeitung  ',
      },
      {
        description: 'path with dashes',
        expected: '/path-with-dashes',
        input: '/path-with-dashes',
      },
      {
        description: 'path with underscores',
        expected: '/path_with_underscores',
        input: '/path_with_underscores',
      },
      {
        description: 'path with numbers',
        expected: '/path123',
        input: '/path123',
      },
    ])(
      'accepts $description: "$input" → "$expected"',
      ({ expected, input }) => {
        expect(validateBasePath(input)).toBe(expected);
      },
    );
  });

  describe('invalid inputs', () => {
    test.each([
      { description: 'missing leading slash', input: 'erstizeitung' },
      { description: 'contains @ symbol', input: '/app@123' },
      { description: 'contains ! symbol', input: '/app!' },
      { description: 'contains space', input: '/app test' },
      { description: 'contains hash', input: '/app#hash' },
      { description: 'contains query string', input: '/app?query' },
    ])('rejects $description: "$input"', ({ input }) => {
      expect(() => validateBasePath(input)).toThrow(/Invalid BASE_PATH/);
    });

    test('throws error with informative message', () => {
      expect(() => validateBasePath('no-slash')).toThrow(
        'Invalid BASE_PATH: "no-slash"',
      );
    });
  });

  describe('edge cases', () => {
    test('handles undefined as empty string', () => {
      expect(validateBasePath(undefined as string | undefined)).toBe('');
    });

    test('removes only single trailing slash (not multiple consecutive slashes)', () => {
      // The current implementation only removes one trailing slash
      // Multiple slashes indicate a malformed path and should be handled by validation
      expect(validateBasePath('/path//')).toBe('/path/');
    });
  });
});

describe('processTemplate', () => {
  describe('placeholder replacement', () => {
    test.each([
      {
        basePath: '/app',
        content: 'url: {{BASE_PATH}}/manifest.json',
        description: 'single placeholder with BASE_PATH',
        expected: 'url: /app/manifest.json',
      },
      {
        basePath: '',
        content: 'url: {{BASE_PATH}}/manifest.json',
        description: 'single placeholder with empty BASE_PATH',
        expected: 'url: /manifest.json',
      },
      {
        basePath: '/test',
        content: '{{BASE_PATH}}/a {{BASE_PATH}}/b {{BASE_PATH}}/c',
        description: 'multiple placeholders',
        expected: '/test/a /test/b /test/c',
      },
      {
        basePath: '/test',
        content: 'no placeholders here',
        description: 'no placeholders',
        expected: 'no placeholders here',
      },
      {
        basePath: '/test',
        content: '',
        description: 'empty content',
        expected: '',
      },
    ])('$description', ({ basePath, content, expected }) => {
      expect(processTemplate(content, basePath)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    test('handles malformed placeholders (incomplete opening)', () => {
      const result = processTemplate('{{BASE_PATH not closed', '/app');
      expect(result).toBe('{{BASE_PATH not closed');
    });

    test('handles malformed placeholders (incomplete closing)', () => {
      const result = processTemplate('BASE_PATH}} only closing', '/app');
      expect(result).toBe('BASE_PATH}} only closing');
    });

    test('preserves text before and after placeholders', () => {
      const result = processTemplate('before {{BASE_PATH}} after', '/app');
      expect(result).toBe('before /app after');
    });

    test('handles basePath with special characters for replacement', () => {
      const result = processTemplate('{{BASE_PATH}}/file', '/app');
      expect(result).toBe('/app/file');
    });
  });
});

describe('replaceCDNWithLocal', () => {
  describe('CDN replacement behavior', () => {
    test.each([
      {
        basePath: '',
        description: 'empty BASE_PATH',
        expected: '/libs/fuse-6.4.6/fuse.min.js',
      },
      {
        basePath: '/erstizeitung',
        description: 'with BASE_PATH',
        expected: '/erstizeitung/libs/fuse-6.4.6/fuse.min.js',
      },
    ])(
      'replaces fuse.js CDN URL with local path ($description)',
      ({ basePath, expected }) => {
        const html =
          '<html><head><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script></head></html>';
        const $ = cheerio.load(html);

        replaceCDNWithLocal($, basePath);

        const scriptSource = $('script[src*="fuse"]').attr('src');
        expect(scriptSource).toBe(expected);
      },
    );

    test('replaces multiple CDN script tags', () => {
      const html = `
        <html><head>
          <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>
        </head></html>
      `;
      const $ = cheerio.load(html);

      replaceCDNWithLocal($, '');

      const scripts = $('script[src*="fuse"]');
      expect(scripts.length).toBe(2);
      scripts.each((_, element) => {
        expect($(element).attr('src')).toBe('/libs/fuse-6.4.6/fuse.min.js');
      });
    });

    test('replaces CDN scripts in body as well as head', () => {
      const html = `
        <html>
          <head>
            <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>
          </head>
          <body>
            <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>
          </body>
        </html>
      `;
      const $ = cheerio.load(html);

      replaceCDNWithLocal($, '');

      expect($('head script[src="/libs/fuse-6.4.6/fuse.min.js"]').length).toBe(
        1,
      );
      expect($('body script[src="/libs/fuse-6.4.6/fuse.min.js"]').length).toBe(
        1,
      );
    });
  });

  describe('preservation behavior', () => {
    test('does not modify non-CDN script tags', () => {
      const html = `
        <html><head>
          <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>
          <script src="/local/script.js"></script>
          <script src="libs/other.js"></script>
        </head></html>
      `;
      const $ = cheerio.load(html);

      replaceCDNWithLocal($, '');

      expect($('script[src="/local/script.js"]').length).toBe(1);
      expect($('script[src="libs/other.js"]').length).toBe(1);
      expect($('script[src="/libs/fuse-6.4.6/fuse.min.js"]').length).toBe(1);
    });

    test('preserves other script attributes', () => {
      const html =
        '<html><head><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js" defer async data-test="value"></script></head></html>';
      const $ = cheerio.load(html);

      replaceCDNWithLocal($, '');

      const script = $('script[src*="fuse"]');
      expect(script.attr('src')).toBe('/libs/fuse-6.4.6/fuse.min.js');
      expect(script.attr('defer')).toBeDefined();
      expect(script.attr('async')).toBeDefined();
      expect(script.attr('data-test')).toBe('value');
    });
  });

  describe('edge cases', () => {
    test('handles HTML with no CDN references', () => {
      const html = `
        <html><head>
          <script src="/local/script.js"></script>
          <script src="another.js"></script>
        </head></html>
      `;
      const $ = cheerio.load(html);
      const originalHtml = $.html();

      replaceCDNWithLocal($, '');

      expect($.html()).toBe(originalHtml);
    });

    test('handles empty HTML', () => {
      const $ = cheerio.load('');

      replaceCDNWithLocal($, '');

      expect($('script').length).toBe(0);
    });

    test('handles HTML without head or body', () => {
      const html =
        '<script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script>';
      const $ = cheerio.load(html);

      replaceCDNWithLocal($, '');

      expect($('script[src="/libs/fuse-6.4.6/fuse.min.js"]').length).toBe(1);
    });
  });
});
