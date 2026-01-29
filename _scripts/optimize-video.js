/**
 * ═══════════════════════════════════════════════════════════════════
 * VIDEO OPTIMIZATION SCRIPT - HIGH-PERFORMANCE WEB
 * ═══════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

// Konfiguracja
const CONFIG = {
  inputDir: 'assets/video/originals',
  outputDir: 'assets/video/optimized',
  audio: false,          // Usuń audio (dla tła hero)
};

// Upewnij się, że katalogi istnieją
// Upewnij się, że katalog wejściowy istnieje (stwórz go, jeśli chcesz dopiero wrzucać pliki)
if (!fs.existsSync(CONFIG.inputDir)) {
  fs.mkdirSync(CONFIG.inputDir, { recursive: true });
  console.log(`[INFO] Brak katalogu wejściowego. Utworzyłem: ${CONFIG.inputDir}`);
  console.log('[INFO] Wrzuć tam pliki wideo (np. .mp4) i uruchom skrypt ponownie.');
  process.exit(0);
}

if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Funkcja pomocnicza do formatowania rozmiaru
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Główna funkcja przetwarzania
async function processVideo(filename) {
  const inputPath = path.join(CONFIG.inputDir, filename);
  const name = path.parse(filename).name;
  
  console.log(`\n🎬 Przetwarzam: ${filename}`);
  
  const originalSize = fs.statSync(inputPath).size;
  console.log(`   Oryginał: ${formatBytes(originalSize)}`);

  // 1. Generowanie WebM (VP9) - Lepsza kompresja
  // Używamy CRF (Constant Rate Factor) zamiast stałego bitrate
  const webmOutput = path.join(CONFIG.outputDir, `${name}.webm`);
  const webmCmd = [
    `"${ffmpegPath}"`,
    `-y`, // Overwrite
    `-i "${inputPath}"`,
    `-c:v libvpx-vp9`,
    `-crf 35`, // Jakość (0-63, wyższe = mniejszy plik). 35 to dobry balans dla tła
    `-b:v 0`,  // Wymagane dla CRF w VP9
    `-deadline good`, // Balans szybkości
    `-cpu-used 2`,    // Wykorzystanie CPU
    CONFIG.audio ? '' : `-an`, // No audio
    `"${webmOutput}"`
  ].join(' ');

  // 2. Generowanie MP4 (H.264) - Kompatybilność + Optymalizacja Web
  const mp4Output = path.join(CONFIG.outputDir, `${name}.mp4`);
  const mp4Cmd = [
    `"${ffmpegPath}"`,
    `-y`,
    `-i "${inputPath}"`,
    `-c:v libx264`,
    `-preset medium`, // Balans szybkości/kompresji
    `-profile:v main`,
    `-level 3.1`,
    `-crf 26`, // Jakość (18-28, wyższe = mniejszy plik). 26 to dobra kompresja dla tła
    `-movflags +faststart`, // CRITICAL for web streaming
    CONFIG.audio ? '' : `-an`,
    `"${mp4Output}"`
  ].join(' ');

  // Wykonanie komend
  const run = (cmd, type) => new Promise((resolve, reject) => {
    console.log(`   ⚙️  Generuję ${type}...`);
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve();
    });
  });

  try {
    await run(webmCmd, 'WebM');
    const webmSize = fs.statSync(webmOutput).size;
    console.log(`   ✅ WebM: ${formatBytes(webmSize)} (-${Math.round((1 - webmSize/originalSize)*100)}%)`);

    await run(mp4Cmd, 'MP4');
    const mp4Size = fs.statSync(mp4Output).size;
    console.log(`   ✅ MP4:  ${formatBytes(mp4Size)} (-${Math.round((1 - mp4Size/originalSize)*100)}%)`);

  } catch (err) {
    console.error(`   ❌ Błąd: ${err.message}`);
  }
}

// Uruchomienie
async function main() {
  console.log('🚀 Video Optimization Started\n');
  
  const files = fs.readdirSync(CONFIG.inputDir).filter(f => /\.(mp4|mov|avi)$/i.test(f));
  
  if (files.length === 0) {
    console.log('⚠️  Brak plików wideo do przetworzenia.');
    return;
  }

  for (const file of files) {
    await processVideo(file);
  }
  
  console.log('\n✨ Zakończono!');
}

main();