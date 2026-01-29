#!/usr/bin/env node
/**
 * JavaScript Minification Script
 * Uses Terser for production-ready minification
 *
 * Features:
 * - Source Maps support
 * - Auto-directory creation
 * - Watch mode
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
const WATCH_MODE = process.argv.includes('--watch');

const BASE_TERSER_OPTIONS = {
  compress: {
    drop_console: false,
    drop_debugger: true,
    passes: 2,
    pure_funcs: ['console.debug'],
  },
  mangle: {
    safari10: true,
  },
  format: {
    comments: false,
  },
  // Source map settings will be injected per file
};

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

// ============================================ 
// Process Single File
// ============================================ 

async function processFile(inputFile, outputFile, silent = false) {
  const inputPath = path.join(ROOT_DIR, inputFile);
  const outputPath = path.join(ROOT_DIR, outputFile);
  const mapPath = outputPath + '.map';

  try {
    if (!fs.existsSync(inputPath)) {
      if (!silent) console.log(`⚠️  Skipping ${inputFile} (not found)\n`);
      return false;
    }

    if (!silent) console.log(`📖 Reading: ${inputFile}`);
    const code = fs.readFileSync(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(code, 'utf8');

    if (!silent) console.log('⚙️  Minifying with Terser...');

    // Configure options specifically for this file to generate correct Source Map
    const options = {
      ...BASE_TERSER_OPTIONS,
      sourceMap: {
        includeSources: true,
        filename: path.basename(outputFile),
        url: path.basename(mapPath)
      }
    };

    const result = await minify(code, options);

    if (result.error) throw result.error;

    // Smart Save: Check if content changed (ignoring map file for comparison)
    let fileChanged = true;
    if (fs.existsSync(outputPath)) {
      const existingContent = fs.readFileSync(outputPath, 'utf8');
      fileChanged = existingContent !== result.code;
    }

    if (!fileChanged && !silent) {
      console.log(`✓ No changes needed for ${outputFile}\n`);
      return false;
    }

    // Create directory if missing
    ensureDirectoryExistence(outputPath);

    // Write Code
    fs.writeFileSync(outputPath, result.code, 'utf8');
    
    // Write Source Map
    if (result.map) {
      fs.writeFileSync(mapPath, result.map, 'utf8');
    }

    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const saved = originalSize - minifiedSize;
    const percentage = ((saved / originalSize) * 100).toFixed(2);

    if (!silent) {
      console.log(`✅ Success!`);
      console.log(`   Original:  ${(originalSize / 1024).toFixed(2)} KB`);
      console.log(`   Minified:  ${(minifiedSize / 1024).toFixed(2)} KB`);
      console.log(`   Saved:     ${(saved / 1024).toFixed(2)} KB (${percentage}%)`);
      console.log(`   Map:       ${path.basename(mapPath)} generated`);
      console.log(`   Output:    ${outputFile}\n`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error processing ${inputFile}:`);
    console.error(`   ${error.message}`);
    if (error.line) console.error(`   Line: ${error.line}, Col: ${error.col}`);
    console.log(''); // Empty line
    return false;
  }
}

// ============================================ 
// Minify All Files
// ============================================ 

async function minifyAll(silent = false) {
  if (!silent) console.log('🚀 JavaScript Minification Started\n');

  let filesProcessed = 0;
  for (const { input, output } of FILES_TO_MINIFY) {
    if (await processFile(input, output, silent)) {
      filesProcessed++;
    }
  }

  if (!silent) {
    if (filesProcessed > 0) console.log(`🎉 Minified ${filesProcessed} file(s)!`);
    else console.log('✓ All files up to date!');
  }
}

// ============================================ 
// Watch Mode
// ============================================ 

async function startWatchMode() {
  console.log('👁️  Watch mode enabled - monitoring JS files...\n');
  FILES_TO_MINIFY.forEach(({ input }) => console.log(`  - ${input}`));
  console.log('\nPress Ctrl+C to stop.\n');

  await minifyAll(true);

  FILES_TO_MINIFY.forEach(({ input, output }) => {
    const inputPath = path.join(ROOT_DIR, input);
    if (!fs.existsSync(inputPath)) return;

    let debounceTimer;
    fs.watch(inputPath, (eventType, filename) => {
      if (filename) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          console.log(`\n📝 ${input} changed - re-minifying...`);
          await processFile(input, output, false);
        }, 100);
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
  minifyAll().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}
