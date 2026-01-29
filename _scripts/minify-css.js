#!/usr/bin/env node
/**
 * CSS Auto-Minifier
 * Automatically finds and minifies all .css files in src/css
 */

const fs = require('fs');
const path = require('path');

// ============================================ 
// Configuration
// ============================================ 

const SRC_DIR = path.join(__dirname, '../src/css');
const WATCH_MODE = process.argv.includes('--watch');

// ============================================ 
// Helpers
// ============================================ 

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/url\((['"]?)([^'"()]+)\1\)/g, 'url($2)')
    .trim();
}

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.css') && !file.endsWith('.min.css')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });

  return arrayOfFiles;
}

// ============================================ 
// Process Single File
// ============================================ 

function processFile(inputFile, silent = false) {
  const outputFile = inputFile.replace(/\.css$/, '.min.css');

  try {
    if (!fs.existsSync(inputFile)) return false;

    const css = fs.readFileSync(inputFile, 'utf8');
    const minified = minifyCSS(css);

    // Smart Save
    let fileChanged = true;
    if (fs.existsSync(outputFile)) {
      const existingContent = fs.readFileSync(outputFile, 'utf8');
      fileChanged = existingContent !== minified;
    }

    if (!fileChanged && !silent) {
      console.log(`✓ Up to date: ${path.basename(outputFile)}`);
      return false;
    }

    if (!silent) console.log(`⚙️  Minifying: ${path.basename(inputFile)}`);
    fs.writeFileSync(outputFile, minified, 'utf8');

    if (!silent) {
      const originalSize = Buffer.byteLength(css, 'utf8');
      const minifiedSize = Buffer.byteLength(minified, 'utf8');
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

function minifyAll(silent = false) {
  if (!silent) console.log('🚀 CSS Auto-Discovery Minification\n');

  if (!fs.existsSync(SRC_DIR)) {
    console.log(`⚠️  Directory not found: ${SRC_DIR}`);
    return;
  }

  const files = getAllFiles(SRC_DIR);
  if (files.length === 0 && !silent) console.log('No .css files found.');

  files.forEach(file => processFile(file, silent));
}

// ============================================ 
// Watch Mode
// ============================================ 

function startWatchMode() {
  console.log(`👁️  Watch mode: Scanning ${path.relative(process.cwd(), SRC_DIR)}...`);
  
  minifyAll(true);

  if (fs.existsSync(SRC_DIR)) {
    let debounceTimer;
    fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.css') || filename.endsWith('.min.css')) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`\n📝 Change: ${filename}`);
        const fullPath = path.join(SRC_DIR, filename);
        processFile(fullPath, false);
      }, 100);
    });
  }
}

if (WATCH_MODE) {
  startWatchMode();
} else {
  minifyAll();
}
