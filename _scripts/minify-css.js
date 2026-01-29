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

    if (!fileChanged) return false;

    if (!silent) console.log(`⚙️  Minifying: ${path.relative(process.cwd(), inputFile)}`);
    fs.writeFileSync(outputFile, minified, 'utf8');

    if (!silent) {
      console.log(`   ✅ Created: ${path.relative(process.cwd(), outputFile)}`);
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

function minifyAll() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`⚠️  Directory not found: ${SRC_DIR}`);
    return;
  }

  const files = getAllFiles(SRC_DIR);
  if (files.length === 0) return;

  let count = 0;
  files.forEach(file => {
    if (processFile(file, false)) count++;
  });
  
  if (count > 0) console.log(`✨ CSS Updated (${count} files)`);
}

minifyAll();