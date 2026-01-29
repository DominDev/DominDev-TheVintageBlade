/**
 * ═══════════════════════════════════════════════════════════════════
 * IMAGE OPTIMIZATION SCRIPT - HIGH-PERFORMANCE WEB
 * ═══════════════════════════════════════════════════════════════════
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// KONFIGURACJA
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  // Katalog bazowy z oryginałami (Automatycznie skanujemy podkatalogi)
  baseInputDir: 'assets/img/originals',
  
  // Katalog bazowy wyjściowy (z zachowaniem struktury podkatalogów)
  baseOutputDir: 'assets/img/optimized',

  // Rozmiary dla responsive images
  sizes: [400, 800, 1200, 1600],

  // Formaty wyjściowe
  formats: [
    { ext: 'avif', quality: 75, options: { effort: 4 } },
    { ext: 'webp', quality: 80, options: { effort: 4 } },
    { ext: 'jpg',  quality: 80, options: { progressive: true, mozjpeg: true } },
  ],

  // Dedykowane rozmiary
  special: {
    social: { width: 1200, height: 630 },
  },

  // Limity
  limits: {
    maxPixels: {
      avif: 16000 * 16000,
      webp: 16383 * 16383,
    },
    maxDimension: 16000,
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    // console.log(`📁 Utworzono katalog: ${dir}`);
  }
}

async function getImages(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(file =>
      /\.(jpg|jpeg|png|webp|tiff)$/i.test(file)
    ).map(file => ({
      fullPath: path.join(dir, file),
      filename: path.parse(file).name,
      ext: path.parse(file).ext,
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Zwraca listę podkatalogów w katalogu bazowym (płasko)
 * oraz sam katalog bazowy jeśli zawiera pliki
 */
async function getInputDirectories(baseDir) {
  const dirs = [];
  try {
    // Dodaj sam baseDir na wypadek gdyby były tam pliki bezpośrednio
    dirs.push(baseDir);

    const files = await fs.readdir(baseDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        dirs.push(path.join(baseDir, file.name));
      }
    }
  } catch (err) {
    console.warn(`⚠️  Katalog bazowy nie istnieje: ${baseDir}`);
  }
  return dirs;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function calculateSavings(original, optimized) {
  return Math.round((1 - optimized / original) * 100);
}

// ═══════════════════════════════════════════════════════════════════
// CORE OPTIMIZATION LOGIC
// ═══════════════════════════════════════════════════════════════════

function canGenerateFormat(width, height, formatExt) {
  const totalPixels = width * height;
  if (formatExt === 'avif' && totalPixels > CONFIG.limits.maxPixels.avif) return false;
  if (formatExt === 'webp' && totalPixels > CONFIG.limits.maxPixels.webp) return false;
  if (width > CONFIG.limits.maxDimension || height > CONFIG.limits.maxDimension) return false;
  return true;
}

async function generateVariant(inputPath, outputPath, width, format) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const targetWidth = Math.min(width, metadata.width);
  const targetHeight = Math.round((targetWidth / metadata.width) * metadata.height);

  if (!canGenerateFormat(targetWidth, targetHeight, format.ext)) {
    throw new Error(`Image too large for ${format.ext}`);
  }

  let resized = image.resize(width, null, { withoutEnlargement: true, fit: 'inside' });
  resized = resized.rotate();

  switch (format.ext) {
    case 'avif': resized = resized.avif({ quality: format.quality, effort: format.options.effort }); break;
    case 'webp': resized = resized.webp({ quality: format.quality, effort: format.options.effort }); break;
    case 'jpg': resized = resized.jpeg({ quality: format.quality, progressive: format.options.progressive, mozjpeg: format.options.mozjpeg }); break;
  }

  await resized.toFile(outputPath);
  const stats = await fs.stat(outputPath);
  return { size: stats.size, width: targetWidth, height: targetHeight };
}

async function generateSocialImage(inputPath, outputDir, filename) {
  const { width, height } = CONFIG.special.social;
  const image = sharp(inputPath);
  const resized = image.resize(width, height, { fit: 'cover', position: 'center' });
  
  const formats = CONFIG.formats.filter(f => f.ext === 'webp' || f.ext === 'jpg');
  for (const format of formats) {
    const outputPath = path.join(outputDir, `${filename}-social.${format.ext}`);
    let output = resized.clone();
    if (format.ext === 'webp') output = output.webp({ quality: format.quality });
    else output = output.jpeg({ quality: format.quality, progressive: true });
    
    await output.toFile(outputPath);
  }
}

async function processImage(image, outputDir) {
  // Sprawdź czy plik źródłowy w ogóle istnieje (mogł zostać usunięty w międzyczasie)
  try {
    await fs.access(image.fullPath);
  } catch {
    return;
  }

  const originalStats = await fs.stat(image.fullPath);
  const originalSize = originalStats.size;
  const originalMtime = originalStats.mtime; // Czas modyfikacji oryginału

  // Sprawdzamy czy musimy przetwarzać (czy chociaż jeden wariant jest nieaktualny)
  let needsProcessing = false;
  
  // Sprawdź pierwszy potencjalny plik wyjściowy (najmniejszy wariant)
  // Jeśli on istnieje i jest nowszy od oryginału, zakładamy że reszta też jest OK
  // (Uproszczenie dla wydajności, w pełnej wersji można sprawdzać wszystkie)
  const testFile = path.join(outputDir, `${image.filename}-${CONFIG.sizes[0]}.${CONFIG.formats[0].ext}`);
  
  try {
    const stats = await fs.stat(testFile);
    if (stats.mtime > originalMtime) {
      // Plik wyjściowy jest nowszy niż źródłowy -> Skip
      // console.log(`⏩ Pomijam (aktualny): ${image.filename}`);
      return; 
    }
  } catch (e) {
    // Plik nie istnieje -> Przetwarzaj
    needsProcessing = true;
  }

  console.log(`\n🖼️  Przetwarzam: ${image.filename}${image.ext}`);
  
  let totalSaved = 0;
  let variantCount = 0;

  for (const size of CONFIG.sizes) {
    for (const format of CONFIG.formats) {
      const outputFilename = `${image.filename}-${size}.${format.ext}`;
      const outputPath = path.join(outputDir, outputFilename);

      try {
        const result = await generateVariant(image.fullPath, outputPath, size, format);
        totalSaved += (originalSize - result.size);
        variantCount++;
      } catch (error) {
        // console.error(`    Skipped ${size}px ${format.ext}: ${error.message}`);
      }
    }
  }

  if (outputDir.includes('social')) {
    await generateSocialImage(image.fullPath, outputDir, image.filename);
  }

  console.log(`  ✅ Wygenerowano wariantów: ${variantCount} (Oszczędność: ${formatBytes(totalSaved)})`);
}

/**
 * Oblicza ścieżkę wyjściową na podstawie wejściowej, zachowując strukturę
 * Input: assets/img/originals/hero
 * Output: assets/img/optimized/hero
 */
function getOutputDir(inputDir) {
  const relative = path.relative(CONFIG.baseInputDir, inputDir);
  return path.join(CONFIG.baseOutputDir, relative);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 AUTO IMAGE OPTIMIZER (SMART DIRECTORY STRUCTURE)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const inputDirs = await getInputDirectories(CONFIG.baseInputDir);
  let totalImages = 0;

  for (const inputDir of inputDirs) {
    const images = await getImages(inputDir);
    if (images.length === 0) continue;

    const outputDir = getOutputDir(inputDir);
    await ensureDir(outputDir);
    
    console.log(`📂 Katalog: ${path.relative(process.cwd(), inputDir)} -> ${path.relative(process.cwd(), outputDir)}`);

    for (const image of images) {
      await processImage(image, outputDir);
      totalImages++;
    }
  }

  console.log(`\n✨ Zakończono. Przetworzono obrazów: ${totalImages}`);
}

// ═══════════════════════════════════════════════════════════════════
// WATCH MODE
// ═══════════════════════════════════════════════════════════════════

async function watchForChanges() {
  console.log('👁️  WATCH MODE - Monitoring assets/img/originals...');
  const inputDirs = await getInputDirectories(CONFIG.baseInputDir);

  // Initial run
  await main();

  inputDirs.forEach(inputDir => {
    // Ignoruj tekstury, jeśli potrzeba
    if (inputDir.includes('texture')) return;

    try {
      require('fs').watch(inputDir, async (eventType, filename) => {
        if (!filename || !/\.(jpg|jpeg|png|webp|tiff)$/i.test(filename)) return;

        const fullPath = path.join(inputDir, filename);
        const outputDir = getOutputDir(inputDir);

        // Debounce
        setTimeout(async () => {
          try {
            await fs.access(fullPath); // Check if exists
            console.log(`\n📷 Zmiana wykryta: ${filename}`);
            const image = {
              fullPath,
              filename: path.parse(filename).name,
              ext: path.parse(filename).ext,
            };
            await ensureDir(outputDir);
            await processImage(image, outputDir);
          } catch (e) { /* Deleted */ }
        }, 500);
      });
      console.log(`✓ Watching: ${path.relative(process.cwd(), inputDir)}`);
    } catch (e) {
      console.log(`⚠️  Cannot watch ${inputDir}`);
    }
  });
}

if (process.argv.includes('--watch')) {
  watchForChanges();
} else {
  main();
}