/**
 * Watcher Script
 * Monitors CSS and JS changes and runs minification automatically.
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const WATCH_PATHS = [
  { dir: 'src/css', ext: '.css', script: 'node _scripts/minify-css.js' },
  { dir: 'src/js', ext: '.js', script: 'node _scripts/minify-js.js' },
  { dir: 'assets/img/originals', ext: '', script: 'node _scripts/optimize-images.js', recursive: true },
  { dir: 'assets/vid/originals', ext: '', script: 'node _scripts/optimize-video.js', recursive: true } // Monitoruj wideo
];

console.log('👀 Watcher started... (Press Ctrl+C to stop)');

WATCH_PATHS.forEach(({ dir, ext, script, recursive = false }) => {
  const fullPath = path.join(__dirname, '..', dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Warning: Watch path not found: ${dir}`);
    return;
  }

  console.log(`✓ Watching: ${dir}`);

  let debounceTimer;

  fs.watch(fullPath, { recursive }, (eventType, filename) => {
    // Dla obrazów ignoruj zmiany w plikach tymczasowych/systemowych
    if (filename && (filename.startsWith('.') || filename.endsWith('.tmp'))) return;

    // Filter by extension if provided
    if (ext && filename && !filename.endsWith(ext) && !filename.includes('.min.')) return;
    
    // Prosty debounce (aby nie odpalać skryptu 10 razy przy kopiowaniu folderu)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\n⚡ Change detected in ${dir}/${filename || ''}. Running task...`);
      
      exec(script, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error: ${error.message}`);
          return;
        }
        if (stderr) {
          // Ignoruj ostrzeżenia, pokazuj tylko błędy
          if (!stderr.includes('warn')) console.error(`⚠️  Stderr: ${stderr}`);
        }
        console.log(stdout.trim());
      });
    }, 500); // 500ms delay
  });
});
