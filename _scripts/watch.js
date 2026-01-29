/**
 * Watcher Script
 * Monitors CSS and JS changes and runs minification automatically.
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const WATCH_PATHS = [
  { dir: 'src/css', ext: '.css', script: 'node _scripts/auto-minify-css.js' },
  { dir: 'src/js', ext: '.js', script: 'node _scripts/minify-js.js' }
];

console.log('👀 Watcher started... (Press Ctrl+C to stop)');

WATCH_PATHS.forEach(({ dir, ext, script }) => {
  const fullPath = path.join(__dirname, '..', dir);
  
  if (!fs.existsSync(fullPath)) return;

  fs.watch(fullPath, (eventType, filename) => {
    // Only trigger for specific extension and ignore .min files
    if (filename && filename.endsWith(ext) && !filename.includes('.min.')) {
      console.log(`\n⚡ Change detected in ${filename}. Running minification...`);
      
      exec(script, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`⚠️  Stderr: ${stderr}`);
          return;
        }
        console.log(stdout.trim());
      });
    }
  });
});
