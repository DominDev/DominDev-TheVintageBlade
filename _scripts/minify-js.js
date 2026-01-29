#!/usr/bin/env node
/**
 * JavaScript Auto-Minifier
 * Automatically finds and minifies all .js files in src/js
 *
 * Features:
 * - Recursive auto-discovery
 * - Source Maps support
 * - Smart Save (only writes on change)
 * - Watch mode
 */

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// ============================================ 
// Configuration
// ============================================ 

const SRC_DIR = path.join(__dirname, '../src/js');
const WATCH_MODE = process.argv.includes('--watch');

const TERSER_OPTIONS = {
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
};

// ============================================ 
// Helpers
// ============================================ 

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      // Filter: only .js, exclude .min.js and .map
      if (file.endsWith('.js') && !file.endsWith('.min.js')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

// ============================================ 
// Process Single File
// ============================================ 

async function processFile(inputFile, silent = false) {
  // Output is same path but .min.js
  const outputFile = inputFile.replace(/\.js$/, '.min.js');
  const mapFile = outputFile + '.map';

  try {
    if (!fs.existsSync(inputFile)) return false;

    const code = fs.readFileSync(inputFile, 'utf8');
    
    // Config for Source Map
    const options = {
      ...TERSER_OPTIONS,
      sourceMap: {
        includeSources: true,
        filename: path.basename(outputFile),
        url: path.basename(mapFile)
      }
    };

    const result = await minify(code, options);
    if (result.error) throw result.error;

    // Smart Save
    let fileChanged = true;
    if (fs.existsSync(outputFile)) {
      const existingContent = fs.readFileSync(outputFile, 'utf8');
      fileChanged = existingContent !== result.code;
    }

    if (!fileChanged && !silent) {
      console.log(`✓ Up to date: ${path.basename(outputFile)}`);
      return false;
    }

    if (!silent) console.log(`⚙️  Minifying: ${path.basename(inputFile)}`);

    fs.writeFileSync(outputFile, result.code, 'utf8');
    if (result.map) fs.writeFileSync(mapFile, result.map, 'utf8');

    if (!silent) {
      const originalSize = Buffer.byteLength(code, 'utf8');
      const minifiedSize = Buffer.byteLength(result.code, 'utf8');
      const saved = originalSize - minifiedSize;
      const percentage = originalSize > 0 ? ((saved / originalSize) * 100).toFixed(1) : 0;
      console.log(`✅ Saved ${percentage}% -> ${path.basename(outputFile)}\n`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Error in ${path.basename(inputFile)}: ${error.message}\n`);
    return false;
  }
}

// ============================================ 
// Main Logic
// ============================================ 

async function minifyAll(silent = false) {
  if (!silent) console.log('🚀 JS Auto-Discovery Minification\n');
  
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`⚠️  Directory not found: ${SRC_DIR}`);
    return;
  }

  const files = getAllFiles(SRC_DIR);
  if (files.length === 0 && !silent) console.log('No .js files found to minify.');

  for (const file of files) {
    await processFile(file, silent);
  }
}

// ============================================ 
// Watch Mode
// ============================================ 

async function startWatchMode() {
  console.log(`👁️  Watch mode: Scanning ${path.relative(process.cwd(), SRC_DIR)}...`);
  
  await minifyAll(true);

  // Watch entire directory recursively
  if (fs.existsSync(SRC_DIR)) {
    let debounceTimer;
    fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.js') || filename.endsWith('.min.js')) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log(`\n📝 Change: ${filename}`);
        const fullPath = path.join(SRC_DIR, filename);
        await processFile(fullPath, false);
      }, 100);
    });
  }
}

if (WATCH_MODE) {
  startWatchMode();
} else {
  minifyAll();
}