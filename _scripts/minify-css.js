#!/usr/bin/env node
/**
 * Auto CSS Minifier with Watch Mode
 * 
 * Usage:
 *   node _scripts/minify-css.js           - minify once
 *   node _scripts/minify-css.js --watch   - watch for changes
 */

const fs = require('fs');
const path = require('path');

// ============================================ 
// Configuration
// ============================================ 

const FILES_TO_MINIFY = [
  { input: 'src/css/style.css', output: 'src/css/style.min.css' }
];

const ROOT_DIR = path.join(__dirname, '..');
const WATCH_MODE = process.argv.includes('--watch');

// ============================================ 
// Helper Functions
// ============================================ 

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')       // Comments
    .replace(/\s+/g, ' ')                   // Whitespace
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')   // Spaces around special chars
    .replace(/;}/g, '}')                    // Trailing semicolons
    .replace(/url\((['"]?)([^'"()]+)\1\)/g, 'url($2)') // Quotes in URLs
    .trim();
}

// ============================================ 
// Process Single File
// ============================================ 

function processFile(inputFile, outputFile, silent = false) {
  const inputPath = path.join(ROOT_DIR, inputFile);
  const outputPath = path.join(ROOT_DIR, outputFile);

  try {
    if (!fs.existsSync(inputPath)) {
      if (!silent) console.log(`⚠️  Skipping ${inputFile} (not found)\n`);
      return false;
    }

    if (!silent) console.log(`📖 Reading: ${inputFile}`);
    const css = fs.readFileSync(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(css, 'utf8');

    if (!silent) console.log('⚙️  Minifying...');
    const minified = minifyCSS(css);
    const minifiedSize = Buffer.byteLength(minified, 'utf8');

    // Smart Save
    let fileChanged = true;
    if (fs.existsSync(outputPath)) {
      const existingContent = fs.readFileSync(outputPath, 'utf8');
      fileChanged = existingContent !== minified;
    }

    if (!fileChanged && !silent) {
      console.log(`✓ No changes needed for ${outputFile}\n`);
      return false;
    }

    ensureDirectoryExistence(outputPath);
    fs.writeFileSync(outputPath, minified, 'utf8');

    const saved = originalSize - minifiedSize;
    const percentage = ((saved / originalSize) * 100).toFixed(2);

    if (!silent) {
      console.log(`✅ Success!`);
      console.log(`   Original:  ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`   Minified:  ${(minifiedSize / 1024).toFixed(2)} KB`);
      console.log(`   Saved:     ${(saved / 1024).toFixed(2)} KB (${percentage}%)`);
      console.log(`   Output:    ${outputFile}\n`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error processing ${inputFile}: ${error.message}\n`);
    // Do NOT exit process here, so watch mode can continue
    return false;
  }
}

// ============================================ 
// Minify All Files
// ============================================ 

function minifyAll(silent = false) {
  if (!silent) console.log('🚀 CSS Minification Started\n');

  let filesProcessed = 0;
  FILES_TO_MINIFY.forEach(({ input, output }) => {
    if (processFile(input, output, silent)) {
      filesProcessed++;
    }
  });

  if (!silent) {
    if (filesProcessed > 0) console.log(`🎉 Minified ${filesProcessed} file(s)!`);
    else console.log('✓ All files up to date!');
  }
}

// ============================================ 
// Watch Mode
// ============================================ 

function startWatchMode() {
  console.log('👁️  Watch mode enabled - monitoring CSS files...\n');
  FILES_TO_MINIFY.forEach(({ input }) => console.log(`  - ${input}`));
  console.log('\nPress Ctrl+C to stop.\n');

  minifyAll(true);

  FILES_TO_MINIFY.forEach(({ input, output }) => {
    const inputPath = path.join(ROOT_DIR, input);
    if (!fs.existsSync(inputPath)) return;

    fs.watch(inputPath, (eventType, filename) => {
      if (eventType === 'change') {
        console.log(`\n📝 ${input} changed - re-minifying...`);
        processFile(input, output, false);
      }
    });
  });
}

// ============================================ 
// Main Execution
// ============================================ 

if (WATCH_MODE) {
  startWatchMode();
} else {
  minifyAll();
}