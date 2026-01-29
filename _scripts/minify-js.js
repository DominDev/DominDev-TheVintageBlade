#!/usr/bin/env node
/**
 * JavaScript Auto-Minifier
 * Automatically finds and minifies all .js files in src/js
 */

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// ============================================ 
// Configuration
// ============================================ 

const SRC_DIR = path.join(__dirname, '../src/js');

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

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function getAllFiles(dirPath, arrayOfFiles) {
  if (!fs.existsSync(dirPath)) return [];
  
  files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
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

async function processFile(inputFile) {
  const outputFile = inputFile.replace(/\.js$/, '.min.js');
  const mapFile = outputFile + '.map';

  try {
    if (!fs.existsSync(inputFile)) return false;

    const code = fs.readFileSync(inputFile, 'utf8');
    
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

    if (!fileChanged) return false;

    console.log(`⚙️  Minifying: ${path.relative(process.cwd(), inputFile)}`);

    ensureDirectoryExistence(outputFile);
    fs.writeFileSync(outputFile, result.code, 'utf8');
    if (result.map) fs.writeFileSync(mapFile, result.map, 'utf8');

    console.log(`   ✅ Created: ${path.relative(process.cwd(), outputFile)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error in ${path.basename(inputFile)}: ${error.message}\n`);
    return false;
  }
}

// ============================================ 
// Main Logic
// ============================================ 

async function minifyAll() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`⚠️  Directory not found: ${SRC_DIR}`);
    return;
  }

  const files = getAllFiles(SRC_DIR);
  if (files.length === 0) return;

  let count = 0;
  for (const file of files) {
    if (await processFile(file)) count++;
  }
  
  if (count > 0) console.log(`✨ JS Updated (${count} files)`);
}

minifyAll();
