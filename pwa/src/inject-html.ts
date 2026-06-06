import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const BOOK_DIR = '_book';
const PWA_DIR = 'pwa';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

function validateBasePath(basePath: string | undefined): string {
  const cleaned = (basePath ?? '').trim();
  if (cleaned === '') {
    return '';
  }
  if (!/^\/[\w\-/]*$/.test(cleaned)) {
    throw new Error(`Invalid BASE_PATH: "${cleaned}"`);
  }
  return cleaned.replace(/\/$/, '');
}

function processTemplate(content: string, basePath: string): string {
  return content.replaceAll('{{BASE_PATH}}', basePath);
}

function findHTMLFiles(dir: string): string[] {
  const htmlFiles: string[] = [];

  function scan(currentDirectory: string): void {
    for (const file of fs.readdirSync(currentDirectory)) {
      const filePath = path.join(currentDirectory, file);
      if (fs.statSync(filePath).isDirectory()) {
        scan(filePath);
      } else if (path.extname(file) === '.html') {
        htmlFiles.push(filePath);
      }
    }
  }

  scan(dir);
  return htmlFiles;
}

function validateBookdownStructure(
  $: cheerio.CheerioAPI,
  htmlFile: string,
): ValidationResult {
  const head = $('head');
  const body = $('body');

  if (head.length === 0) {
    throw new Error(
      `Invalid HTML structure in ${htmlFile}: <head> element not found`,
    );
  }

  if (body.length === 0) {
    throw new Error(
      `Invalid HTML structure in ${htmlFile}: <body> element not found`,
    );
  }

  // Check for expected Bookdown elements (flexible validation)
  const hasBookContent =
    body.find('.book').length > 0 ||
    body.find('.section').length > 0 ||
    body.find('main').length > 0;

  if (!hasBookContent) {
    console.warn(
      `Warning: ${htmlFile} may not be a valid Bookdown page (no expected content elements found)`,
    );
  }

  return { isValid: true };
}

const JSDELIVR_NPM_PATTERN = /\/\/cdn\.jsdelivr\.net\/npm\/(.+)$/;

// Maps a jsdelivr npm URL to a local path mirroring it under libs/, so the
// vendored copy always matches whatever asset (and version) GitBook references.
function cdnUrlToLocalPath(url: string): string | null {
  const match = JSDELIVR_NPM_PATTERN.exec(url);
  if (match === null) {
    return null;
  }
  const npmPath = match[1].split(/[?#]/)[0];
  return `libs/${npmPath}`;
}

function localizeCdnResources($: cheerio.CheerioAPI, basePath: string): void {
  const rewrite = (selector: string, attribute: 'href' | 'src'): void => {
    $(selector).each((_index, element) => {
      const url = $(element).attr(attribute);
      const localPath = url === undefined ? null : cdnUrlToLocalPath(url);
      if (localPath !== null) {
        $(element).attr(attribute, `${basePath}/${localPath}`);
      }
    });
  };
  rewrite('script[src*="cdn.jsdelivr.net/npm/"]', 'src');
  rewrite('link[href*="cdn.jsdelivr.net/npm/"]', 'href');
}

// Returns a map of local mirror path -> source CDN URL for every jsdelivr npm
// resource referenced in the document.
function collectCdnAssets($: cheerio.CheerioAPI): Map<string, string> {
  const assets = new Map<string, string>();
  const collect = (selector: string, attribute: 'href' | 'src'): void => {
    $(selector).each((_index, element) => {
      const url = $(element).attr(attribute);
      if (url === undefined) {
        return;
      }
      const localPath = cdnUrlToLocalPath(url);
      if (localPath !== null) {
        assets.set(localPath, url);
      }
    });
  };
  collect('script[src*="cdn.jsdelivr.net/npm/"]', 'src');
  collect('link[href*="cdn.jsdelivr.net/npm/"]', 'href');
  return assets;
}

async function downloadAsset(
  url: string,
  destinationPath: string,
): Promise<void> {
  // Node's fetch cannot parse protocol-relative URLs (//host/...), which are
  // valid in HTML; resolve them to https before fetching.
  const fetchUrl = url.startsWith('//') ? `https:${url}` : url;
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${fetchUrl}: HTTP ${String(response.status)}`,
    );
  }
  const data = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, data);
}

function injectPWALinks(htmlFile: string, basePath: string): boolean {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const $ = cheerio.load(html);

  validateBookdownStructure($, htmlFile);

  localizeCdnResources($, basePath);

  $('link[rel="manifest"]').remove();
  $('link[rel="apple-touch-icon"]').remove();
  $('meta[name="theme-color"]').remove();
  $('meta[name="apple-mobile-web-app-capable"]').remove();
  $('script[src*="register-sw.js"]').remove();
  $('script[src*="offline-indicator.js"]').remove();
  $('script[src*="install-button.js"]').remove();
  $('link[href*="pwa-styles.css"]').remove();

  $('head').append(`
    <link rel="manifest" href="${basePath}/manifest.json">
    <link rel="stylesheet" href="${basePath}/pwa-styles.css">
    <meta name="theme-color" content="#249260">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="apple-touch-icon" href="${basePath}/icons/icon-192.png">`);

  $('body').append(`
    <script src="${basePath}/register-sw.js"></script>
    <script src="${basePath}/offline-indicator.js"></script>
    <script src="${basePath}/install-button.js"></script>
  `);

  fs.writeFileSync(htmlFile, $.html());
  return true;
}

// Only run main code if executed directly (not imported as module)
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const BASE_PATH = validateBasePath(process.env.BASE_PATH);
    console.log(`PWA Injection starting (BASE_PATH="${BASE_PATH}")...`);

    const manifestTemplate = fs.readFileSync(
      path.join(PWA_DIR, 'manifest.template.json'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(BOOK_DIR, 'manifest.json'),
      processTemplate(manifestTemplate, BASE_PATH),
    );

    const offlineTemplate = fs.readFileSync(
      path.join(PWA_DIR, 'offline-page.html'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(BOOK_DIR, 'offline.html'),
      processTemplate(offlineTemplate, BASE_PATH),
    );

    const swContent = fs.readFileSync(
      path.join(PWA_DIR, 'dist', 'register-sw.js'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(BOOK_DIR, 'register-sw.js'),
      processTemplate(swContent, BASE_PATH),
    );

    fs.copyFileSync(
      path.join(PWA_DIR, 'pwa-styles.css'),
      path.join(BOOK_DIR, 'pwa-styles.css'),
    );
    fs.copyFileSync(
      path.join(PWA_DIR, 'dist', 'offline-indicator.js'),
      path.join(BOOK_DIR, 'offline-indicator.js'),
    );
    fs.copyFileSync(
      path.join(PWA_DIR, 'dist', 'install-button.js'),
      path.join(BOOK_DIR, 'install-button.js'),
    );

    const iconsDestination = path.join(BOOK_DIR, 'icons');
    if (!fs.existsSync(iconsDestination)) {
      fs.cpSync(path.join(PWA_DIR, 'icons'), iconsDestination, {
        recursive: true,
      });
    }

    const htmlFiles = findHTMLFiles(BOOK_DIR);

    // Mirror every externally loaded jsdelivr asset locally before rewriting the
    // references, so the rendered output makes no third-party requests (GDPR)
    // and the vendored version always matches what GitBook references.
    const cdnAssets = new Map<string, string>();
    for (const htmlFile of htmlFiles) {
      const $ = cheerio.load(fs.readFileSync(htmlFile, 'utf8'));
      for (const [localPath, url] of collectCdnAssets($)) {
        cdnAssets.set(localPath, url);
      }
    }
    for (const [localPath, url] of cdnAssets) {
      await downloadAsset(url, path.join(BOOK_DIR, localPath));
      console.log(`📦 Localized CDN asset: ${url} → ${localPath}`);
    }

    let modifiedCount = 0;
    for (const htmlFile of htmlFiles) {
      if (injectPWALinks(htmlFile, BASE_PATH)) {
        modifiedCount++;
      }
    }

    console.log(
      `✅ PWA injection complete: ${String(modifiedCount)}/${String(htmlFiles.length)} files modified`,
    );
  } catch (error) {
    const err = error as Error;
    console.error(`❌ PWA injection failed: ${err.message}`);
    console.error(err.stack);
    throw new Error(`PWA injection failed: ${err.message}`, { cause: error });
  }
}

export {
  validateBasePath,
  processTemplate,
  findHTMLFiles,
  validateBookdownStructure,
  cdnUrlToLocalPath,
  localizeCdnResources,
  downloadAsset,
  injectPWALinks,
};
