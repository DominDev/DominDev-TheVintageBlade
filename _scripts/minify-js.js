#!/usr/bin/env node
/**
 * JavaScript Minification Script
 * Uses Terser for production-ready minification
 *
 * Usage: node _scripts/minify-js.js
 */

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// ============================================
// Configuration
// ============================================

const FILES_TO_MINIFY = [
  { input: 'src/js/main.js', output: 'src/js/main.min.js' },
  { input: 'src/js/config.js', output: 'src/js/config.min.js' },
  { input: 'src/js/privacy-content.js', output: 'src/js/privacy-content.min.js' }
];

const ROOT_DIR = path.join(__dirname, '..');

const TERSER_OPTIONS = {
  compress: {
    drop_console: false,      // Keep console for debugging in prod if needed
    drop_debugger: true,      // Remove debugger statements
    passes: 2,                // Multiple compression passes
    pure_funcs: ['console.debug'], // Remove debug logs only
  },
  mangle: {
    safari10: true,           // Safari 10 compatibility
  },
  format: {
    comments: false,          // Remove all comments
  },
  sourceMap: false,           // No source maps for production
};

// ============================================
// Process Single File
// ============================================

async function processFile(inputFile, outputFile) {
  const inputPath = path.join(ROOT_DIR, inputFile);
  const outputPath = path.join(ROOT_DIR, outputFile);

  try {
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  Skipping ${inputFile} (not found)\n`);
      return false;
    }

    console.log(`📖 Reading: ${inputFile}`);
    const code = fs.readFileSync(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(code, 'utf8');

    console.log('⚙️  Minifying with Terser...');
    const result = await minify(code, TERSER_OPTIONS);

    if (result.error) {
      throw result.error;
    }

    const minifiedSize = Buffer.byteLength(result.code, 'utf8');

    // Write output
    fs.writeFileSync(outputPath, result.code, 'utf8');

    // Calculate savings
    const saved = originalSize - minifiedSize;
    const percentage = ((saved / originalSize) * 100).toFixed(2);

    console.log(`✅ Success!`);
    console.log(`   Original:  ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Minified:  ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`   Saved:     ${(saved / 1024).toFixed(2)} KB (${percentage}%)`);
    console.log(`   Output:    ${outputFile}\n`);

    return true;
  } catch (error) {
    console.error(`❌ Error processing ${inputFile}: ${error.message}\n`);
    return false;
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log('🚀 JavaScript Minification Started\n');

  let filesProcessed = 0;

  for (const { input, output } of FILES_TO_MINIFY) {
    if (await processFile(input, output)) {
      filesProcessed++;
    }
  }

  if (filesProcessed > 0) {
    console.log(`🎉 Minified ${filesProcessed} file(s)!`);
  } else {
    console.log('⚠️  No files were minified.');
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
