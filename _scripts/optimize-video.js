/**
 * ═══════════════════════════════════════════════════════════════════
 * VIDEO OPTIMIZATION SCRIPT - SMART DIRECTORY STRUCTURE
 * ═══════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Konfiguracja
const CONFIG = {
  baseInputDir: 'assets/vid/originals',
  baseOutputDir: 'assets/vid/optimized',
  audio: false, // Domyślnie usuń audio (dla tła hero)
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Znajduje pliki wideo rekursywnie
 */
function getFilesRecursive(dir, fileList = []) {
  if (!fs.existsSync(dir)) return [];
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursive(filePath, fileList);
    } else {
      if (/".(mp4|mov|avi|mkv)$/i.test(file)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Zwraca ścieżkę wyjściową zachowując strukturę katalogów
 */
function getOutputPath(inputPath, ext) {
  const relativePath = path.relative(CONFIG.baseInputDir, inputPath);
  const dirName = path.dirname(relativePath);
  const name = path.parse(inputPath).name;
  
  const outputDir = path.join(CONFIG.baseOutputDir, dirName);
  ensureDirSync(outputDir);
  
  return path.join(outputDir, `${name}${ext}`);
}

// ═══════════════════════════════════════════════════════════════════
// PROCESSING LOGIC
// ═══════════════════════════════════════════════════════════════════

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function processVideo(inputPath) {
  const name = path.basename(inputPath);
  const originalStats = fs.statSync(inputPath);
  const originalSize = originalStats.size;
  const originalMtime = originalStats.mtime;

  // Sprawdź czy WebM (najlepsza kompresja) jest aktualny
  const webmOutput = getOutputPath(inputPath, '.webm');
  
  try {
    if (fs.existsSync(webmOutput)) {
      const stats = fs.statSync(webmOutput);
      if (stats.mtime > originalMtime) {
        // console.log(`⏩ Pomijam (aktualny): ${name}`);
        return; 
      }
    }
  } catch(e) {}

  console.log(`
🎬 Przetwarzam: ${name}`);
  console.log(`   Oryginał: ${formatBytes(originalSize)}`);

  // 1. WebM (VP9)
  const webmCmd = [
    `"${ffmpegPath}"`, 
    `-y`,
    `-i "${inputPath}"`, 
    `-c:v libvpx-vp9`,
    `-crf 35`,
    `-b:v 0`,
    `-deadline good`,
    `-cpu-used 2`,
    CONFIG.audio ? '' : `-an`,
    `"${webmOutput}"`
  ].join(' ');

  // 2. MP4 (H.264)
  const mp4Output = getOutputPath(inputPath, '.mp4');
  const mp4Cmd = [
    `"${ffmpegPath}"`, 
    `-y`,
    `-i "${inputPath}"`, 
    `-c:v libx264`,
    `-preset medium`,
    `-profile:v main`,
    `-level 3.1`,
    `-crf 26`,
    `-movflags +faststart`,
    CONFIG.audio ? '' : `-an`,
    `"${mp4Output}"`
  ].join(' ');

  try {
    // Generuj sekwencyjnie
    console.log(`   ⚙️  Generuję WebM...`);
    await runCommand(webmCmd);
    const webmSize = fs.statSync(webmOutput).size;
    console.log(`     ✅ ${formatBytes(webmSize)} (-${Math.round((1 - webmSize/originalSize)*100)}%)`);

    console.log(`   ⚙️  Generuję MP4...`);
    await runCommand(mp4Cmd);
    const mp4Size = fs.statSync(mp4Output).size;
    console.log(`     ✅ ${formatBytes(mp4Size)} (-${Math.round((1 - mp4Size/originalSize)*100)}%)`);

  } catch (err) {
    console.error(`   ❌ Błąd ffmpeg: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  ensureDirSync(CONFIG.baseInputDir);

  const files = getFilesRecursive(CONFIG.baseInputDir);
  
  if (files.length === 0) {
    // Tylko loguj jeśli nie jest to watch mode (który odpala ten skrypt)
    // Ale w trybie watch może być cicho jeśli folder pusty
    return;
  }

  console.log('🚀 Video Optimization Check...');
  
  for (const file of files) {
    await processVideo(file);
  }
}

main();
