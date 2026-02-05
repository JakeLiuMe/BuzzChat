/**
 * BuzzChat Build Script
 *
 * Generates browser-specific packages:
 * - dist-chrome/  -> Chrome Web Store + Edge Add-ons (MV3)
 * - dist-firefox/ -> Firefox Add-ons (MV2)
 *
 * Usage:
 *   node scripts/build.js          # Build both (dev)
 *   node scripts/build.js chrome   # Build Chrome only
 *   node scripts/build.js firefox  # Build Firefox only
 *   node scripts/build.js --minify # Build with minification (prod)
 *   node scripts/build.js --zip    # Build and create ZIP files
 */

const fs = require('fs');
const path = require('path');

// Optional minification dependencies (lazy loaded)
let terser = null;
let CleanCSS = null;

const ROOT = path.resolve(__dirname, '..');
const DIST_CHROME = path.join(ROOT, 'dist-chrome');
const DIST_FIREFOX = path.join(ROOT, 'dist-firefox');

// Files to copy to both distributions
const FILES_TO_COPY = [
  'src/popup/popup.html',
  'src/popup/popup.js',
  'src/popup/popup.css',
  'src/scripts/content.js',
  'src/styles/content.css',
  'src/lib/selectors.js',
  'src/lib/analytics.js',
  'src/lib/extensionpay.js',
  'assets/icons/icon16.png',
  'assets/icons/icon48.png',
  'assets/icons/icon128.png'
];

// Chrome-specific files
const CHROME_FILES = [
  'src/background/background.js',
  'src/background/nativeMessaging.js'
];

/**
 * Ensure directory exists
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Copy file with directory creation
 */
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`  Copied: ${path.relative(ROOT, src)}`);
}

/**
 * Clean directory
 */
function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Load minification libraries
 */
function loadMinifiers() {
  try {
    terser = require('terser');
    CleanCSS = require('clean-css');
    return true;
  } catch (error) {
    console.error('Warning: Minification packages not installed.');
    console.log('Install with: npm install terser clean-css');
    return false;
  }
}

/**
 * Minify JavaScript content
 */
async function minifyJS(content, filename) {
  if (!terser) return content;

  const options = {
    compress: {
      drop_console: true, // Remove console.log statements
      drop_debugger: true,
      passes: 2
    },
    mangle: {
      toplevel: false, // Don't mangle top-level names (needed for Chrome extensions)
      reserved: [
        // Keep browser API names
        'chrome', 'browser', 'browserAPI',
        // Keep storage keys that are referenced by strings
        'buzzchatSettings', 'buzzchatAccounts', 'buzzchatActiveAccountId',
        'buzzchatApiKeys', 'buzzchatOnboarded', 'buzzchatAnalytics'
      ]
    },
    format: {
      comments: false
    },
    sourceMap: false
  };

  try {
    const result = await terser.minify(content, options);
    if (result.error) {
      console.error(`  Minification error in ${filename}:`, result.error);
      return content;
    }
    return result.code;
  } catch (error) {
    console.error(`  Minification error in ${filename}:`, error.message);
    return content;
  }
}

/**
 * Minify CSS content
 */
function minifyCSS(content, filename) {
  if (!CleanCSS) return content;

  try {
    const cleanCSS = new CleanCSS({
      level: 2, // Advanced optimizations
      format: false // Single line output
    });
    const result = cleanCSS.minify(content);
    if (result.errors && result.errors.length > 0) {
      console.error(`  CSS minification errors in ${filename}:`, result.errors);
      return content;
    }
    return result.styles;
  } catch (error) {
    console.error(`  CSS minification error in ${filename}:`, error.message);
    return content;
  }
}

/**
 * Copy and optionally minify file
 */
async function copyFileWithMinify(src, dest, shouldMinify) {
  ensureDir(path.dirname(dest));

  if (!shouldMinify) {
    fs.copyFileSync(src, dest);
    console.log(`  Copied: ${path.relative(ROOT, src)}`);
    return;
  }

  const ext = path.extname(src).toLowerCase();
  let content = fs.readFileSync(src, 'utf8');
  const filename = path.basename(src);

  if (ext === '.js') {
    const originalSize = content.length;
    content = await minifyJS(content, filename);
    const newSize = content.length;
    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  Minified: ${path.relative(ROOT, src)} (${savings}% smaller)`);
  } else if (ext === '.css') {
    const originalSize = content.length;
    content = minifyCSS(content, filename);
    const newSize = content.length;
    const savings = ((1 - newSize / originalSize) * 100).toFixed(1);
    console.log(`  Minified: ${path.relative(ROOT, src)} (${savings}% smaller)`);
  } else {
    console.log(`  Copied: ${path.relative(ROOT, src)}`);
  }

  fs.writeFileSync(dest, content);
}

/**
 * Build Chrome distribution (MV3)
 */
async function buildChrome(shouldMinify = false) {
  console.log('\nBuilding Chrome distribution...');
  if (shouldMinify) console.log('  (with minification)');
  cleanDir(DIST_CHROME);

  // Copy manifest (never minify JSON)
  copyFile(
    path.join(ROOT, 'manifest.json'),
    path.join(DIST_CHROME, 'manifest.json')
  );

  // Copy common files (minify JS/CSS if enabled)
  for (const file of FILES_TO_COPY) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      await copyFileWithMinify(src, path.join(DIST_CHROME, file), shouldMinify);
    }
  }

  // Copy Chrome-specific files
  for (const file of CHROME_FILES) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      await copyFileWithMinify(src, path.join(DIST_CHROME, file), shouldMinify);
    }
  }

  console.log(`Chrome build complete: ${DIST_CHROME}`);
}

/**
 * Transform ES6 module to IIFE for Firefox MV2
 * Removes import/export statements and wraps in IIFE
 */
function transformForFirefox(content, filename) {
  let transformed = content;

  // Remove import statements
  transformed = transformed.replace(
    /^import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?\s*$/gm,
    '// Import removed for Firefox MV2 compatibility'
  );

  // Convert export function to regular function
  transformed = transformed.replace(/^export\s+function\s+/gm, 'function ');
  transformed = transformed.replace(/^export\s+async\s+function\s+/gm, 'async function ');

  // Remove export default
  transformed = transformed.replace(/^export\s+default\s+/gm, '');

  return transformed;
}

/**
 * Build Firefox distribution (MV2)
 */
async function buildFirefox(shouldMinify = false) {
  console.log('\nBuilding Firefox distribution...');
  if (shouldMinify) console.log('  (with minification)');
  cleanDir(DIST_FIREFOX);

  // Copy Firefox manifest (never minify JSON)
  copyFile(
    path.join(ROOT, 'manifest-firefox.json'),
    path.join(DIST_FIREFOX, 'manifest.json')
  );

  // Copy common files (minify JS/CSS if enabled)
  for (const file of FILES_TO_COPY) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      await copyFileWithMinify(src, path.join(DIST_FIREFOX, file), shouldMinify);
    }
  }

  // Transform and copy background scripts for Firefox MV2
  console.log('  Transforming background scripts for Firefox MV2...');

  // Transform nativeMessaging.js
  const nativeMessagingSrc = path.join(ROOT, 'src/background/nativeMessaging.js');
  if (fs.existsSync(nativeMessagingSrc)) {
    let content = fs.readFileSync(nativeMessagingSrc, 'utf8');
    content = transformForFirefox(content, 'nativeMessaging.js');
    if (shouldMinify) {
      const originalSize = content.length;
      content = await minifyJS(content, 'nativeMessaging.js');
      const savings = ((1 - content.length / originalSize) * 100).toFixed(1);
      console.log(`  Transformed & minified: src/background/nativeMessaging.js (${savings}% smaller)`);
    } else {
      console.log('  Transformed: src/background/nativeMessaging.js');
    }
    const dest = path.join(DIST_FIREFOX, 'src/background/nativeMessaging.js');
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content);
  }

  // Transform background.js
  const backgroundSrc = path.join(ROOT, 'src/background/background.js');
  if (fs.existsSync(backgroundSrc)) {
    let content = fs.readFileSync(backgroundSrc, 'utf8');
    content = transformForFirefox(content, 'background.js');
    if (shouldMinify) {
      const originalSize = content.length;
      content = await minifyJS(content, 'background.js');
      const savings = ((1 - content.length / originalSize) * 100).toFixed(1);
      console.log(`  Transformed & minified: src/background/background.js (${savings}% smaller)`);
    } else {
      console.log('  Transformed: src/background/background.js');
    }
    const dest = path.join(DIST_FIREFOX, 'src/background/background.js');
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content);
  }

  console.log(`Firefox build complete: ${DIST_FIREFOX}`);
}

/**
 * Create ZIP files for store submission
 */
function createZips() {
  const archiver = require('archiver');

  const createZip = (srcDir, outFile) => {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outFile);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`  Created: ${path.relative(ROOT, outFile)} (${archive.pointer()} bytes)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(srcDir, false);
      archive.finalize();
    });
  };

  console.log('\nCreating ZIP files...');

  const promises = [];

  if (fs.existsSync(DIST_CHROME)) {
    promises.push(createZip(DIST_CHROME, path.join(ROOT, 'buzzchat-chrome.zip')));
  }

  if (fs.existsSync(DIST_FIREFOX)) {
    promises.push(createZip(DIST_FIREFOX, path.join(ROOT, 'buzzchat-firefox.zip')));
  }

  return Promise.all(promises);
}

/**
 * Main build function
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldZip = args.includes('--zip');
  const shouldMinify = args.includes('--minify');

  // Get target (filter out flags)
  const target = args.find(arg => !arg.startsWith('--')) || 'all';

  console.log('BuzzChat Build Script');
  console.log('=====================');

  // Load minifiers if minification is requested
  if (shouldMinify) {
    if (!loadMinifiers()) {
      console.log('\nContinuing without minification...');
    } else {
      console.log('Minification enabled');
    }
  }

  if (target === 'chrome' || target === 'all') {
    await buildChrome(shouldMinify);
  }

  if (target === 'firefox' || target === 'all') {
    await buildFirefox(shouldMinify);
  }

  if (shouldZip) {
    try {
      await createZips();
    } catch (error) {
      console.error('Error creating ZIPs:', error.message);
      console.log('Note: ZIP creation requires the "archiver" package.');
      console.log('Install with: npm install archiver');
    }
  }

  console.log('\nBuild complete!');
  console.log('\nNext steps:');
  console.log('  Chrome: Load dist-chrome/ as unpacked extension');
  console.log('  Firefox: Load dist-firefox/ as temporary add-on');
  console.log('\nFor production build with minification:');
  console.log('  npm run build:prod');
  console.log('\nFor store submission:');
  console.log('  node scripts/build.js --minify --zip');
}

main().catch(console.error);
