import * as fs from 'node:fs';
import path from 'node:path';
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

function replaceCDNWithLocal($: cheerio.CheerioAPI, basePath: string): void {
  $('script[src*="cdn.jsdelivr.net/npm/fuse.js"]').each(
    (_index: number, element) => {
      $(element).attr('src', `${basePath}/libs/fuse-6.4.6/fuse.min.js`);
    },
  );
}

function injectPWALinks(htmlFile: string, basePath: string): boolean {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const $ = cheerio.load(html);

  validateBookdownStructure($, htmlFile);

  replaceCDNWithLocal($, basePath);

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

// Only run main code if executed directly (not required as module)
if (require.main === module) {
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
    if (fs.existsSync(iconsDestination)) {
      fs.rmSync(iconsDestination, { recursive: true });
    }
    fs.cpSync(path.join(PWA_DIR, 'icons'), iconsDestination, {
      recursive: true,
    });

    const fuseSourcePath = path.join(
      PWA_DIR,
      'node_modules',
      'fuse.js',
      'dist',
      'fuse.min.js',
    );
    const fuseDestinationDirectory = path.join(BOOK_DIR, 'libs', 'fuse-6.4.6');
    if (!fs.existsSync(fuseDestinationDirectory)) {
      fs.mkdirSync(fuseDestinationDirectory, { recursive: true });
    }
    fs.copyFileSync(
      fuseSourcePath,
      path.join(fuseDestinationDirectory, 'fuse.min.js'),
    );

    const htmlFiles = findHTMLFiles(BOOK_DIR);
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
    throw new Error(`PWA injection failed: ${err.message}`);
  }
}

// Export functions for testing
export {
  validateBasePath,
  processTemplate,
  findHTMLFiles,
  validateBookdownStructure,
  replaceCDNWithLocal,
  injectPWALinks,
};
