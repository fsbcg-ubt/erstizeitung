import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as cheerio from 'cheerio';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  cdnUrlToLocalPath,
  downloadAsset,
  localizeCdnResources,
  processTemplate,
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

describe('cdnUrlToLocalPath', () => {
  test.each([
    {
      description: 'fuse.js dist file',
      expected: 'libs/fuse.js@6.4.6/dist/fuse.min.js',
      input: 'https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js',
    },
    {
      description: 'arbitrary npm package',
      expected: 'libs/lunr@2.3.9/lunr.min.js',
      input: 'https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js',
    },
    {
      description: 'scoped package',
      expected: 'libs/@scope/pkg@2.0.0/index.js',
      input: 'https://cdn.jsdelivr.net/npm/@scope/pkg@2.0.0/index.js',
    },
    {
      description: 'protocol-relative URL',
      expected: 'libs/fuse.js@6.4.6/dist/fuse.min.js',
      input: '//cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js',
    },
  ])(
    'mirrors the npm path under libs/ ($description)',
    ({ expected, input }) => {
      expect(cdnUrlToLocalPath(input)).toBe(expected);
    },
  );

  test('strips query string and hash fragments', () => {
    expect(
      cdnUrlToLocalPath(
        'https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js?v=1#frag',
      ),
    ).toBe('libs/fuse.js@6.4.6/dist/fuse.min.js');
  });

  test.each([
    {
      description: 'non-jsdelivr host',
      input: 'https://example.com/npm/fuse.js@6.4.6/dist/fuse.min.js',
    },
    {
      description: 'jsdelivr non-npm path',
      input: 'https://cdn.jsdelivr.net/gh/user/repo/file.js',
    },
    { description: 'local path', input: '/libs/local.js' },
  ])('returns null for non-jsdelivr-npm URLs ($description)', ({ input }) => {
    expect(cdnUrlToLocalPath(input)).toBeNull();
  });
});

describe('localizeCdnResources', () => {
  test.each([
    {
      basePath: '',
      description: 'empty BASE_PATH',
      expected: '/libs/fuse.js@6.4.6/dist/fuse.min.js',
    },
    {
      basePath: '/erstizeitung',
      description: 'with BASE_PATH',
      expected: '/erstizeitung/libs/fuse.js@6.4.6/dist/fuse.min.js',
    },
  ])(
    'rewrites a jsdelivr script src to a local mirror path ($description)',
    ({ basePath, expected }) => {
      const html =
        '<html><head><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script></head></html>';
      const $ = cheerio.load(html);

      localizeCdnResources($, basePath);

      expect($('script[src*="fuse"]').attr('src')).toBe(expected);
    },
  );

  test('rewrites a jsdelivr link href, not only scripts', () => {
    const html =
      '<html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/some-lib@1.0.0/dist/style.css"></head></html>';
    const $ = cheerio.load(html);

    localizeCdnResources($, '');

    expect($('link[rel="stylesheet"]').attr('href')).toBe(
      '/libs/some-lib@1.0.0/dist/style.css',
    );
  });

  test('localizes any jsdelivr npm package, not only fuse', () => {
    const html =
      '<html><head><script src="https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js"></script></head></html>';
    const $ = cheerio.load(html);

    localizeCdnResources($, '');

    expect($('script').attr('src')).toBe('/libs/lunr@2.3.9/lunr.min.js');
  });

  test('rewrites scripts in both head and body', () => {
    const html =
      '<html><head><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script></head><body><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js"></script></body></html>';
    const $ = cheerio.load(html);

    localizeCdnResources($, '');

    expect(
      $('head script[src="/libs/fuse.js@6.4.6/dist/fuse.min.js"]').length,
    ).toBe(1);
    expect(
      $('body script[src="/libs/fuse.js@6.4.6/dist/fuse.min.js"]').length,
    ).toBe(1);
  });

  test('does not modify non-jsdelivr resources', () => {
    const html =
      '<html><head><script src="/local/script.js"></script><link rel="stylesheet" href="https://fonts.example.com/x.css"></head></html>';
    const $ = cheerio.load(html);
    const before = $.html();

    localizeCdnResources($, '');

    expect($.html()).toBe(before);
  });

  test('preserves other attributes on rewritten elements', () => {
    const html =
      '<html><head><script src="https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js" defer async data-test="value"></script></head></html>';
    const $ = cheerio.load(html);

    localizeCdnResources($, '');

    const script = $('script[src*="fuse"]');
    expect(script.attr('src')).toBe('/libs/fuse.js@6.4.6/dist/fuse.min.js');
    expect(script.attr('defer')).toBeDefined();
    expect(script.attr('async')).toBeDefined();
    expect(script.attr('data-test')).toBe('value');
  });

  test('leaves HTML untouched when there are no CDN references', () => {
    const html =
      '<html><head><script src="/local/script.js"></script></head></html>';
    const $ = cheerio.load(html);
    const before = $.html();

    localizeCdnResources($, '');

    expect($.html()).toBe(before);
  });
});

describe('downloadAsset', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'inject-test-'));
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  test('writes fetched bytes to a nested destination path', async () => {
    const destination = path.join(
      temporaryDirectory,
      'libs',
      'fuse.js@6.4.6',
      'dist',
      'fuse.min.js',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('FUSE_BYTES', { status: 200 })),
    );

    await downloadAsset(
      'https://cdn.jsdelivr.net/npm/fuse.js@6.4.6/dist/fuse.min.js',
      destination,
    );

    expect(fs.readFileSync(destination, 'utf8')).toBe('FUSE_BYTES');
  });

  test('throws on a non-ok HTTP response', async () => {
    const destination = path.join(temporaryDirectory, 'missing.js');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not found', { status: 404 })),
    );

    await expect(
      downloadAsset(
        'https://cdn.jsdelivr.net/npm/missing@1.0.0/missing.js',
        destination,
      ),
    ).rejects.toThrow();
  });
});
