/**
 * Central Watcher Script
 * Monitors changes in src/ and assets/ and runs specific tasks.
 */

const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// ============================================ 
// Configuration
// ============================================ 

const TASKS = [
  {
    name: 'CSS',
    path: 'src/css',
    script: 'node _scripts/minify-css.js'
  },
  {
    name: 'JS',
    path: 'src/js',
    script: 'node _scripts/minify-js.js'
  },
  {
    name: 'Images',
    path: 'assets/img/originals',
    script: 'node _scripts/optimize-images.js'
  },
  {
    name: 'Video',
    path: 'assets/vid/originals',
    script: 'node _scripts/optimize-video.js'
  }
];

// ============================================ 
// Logic
// ============================================ 

console.log('👀 Central Watcher started... (Press Ctrl+C to stop)\n');

// Run all tasks on startup to ensure fresh state
TASKS.forEach(task => runTask(task, true));

TASKS.forEach(task => {
  const fullPath = path.join(__dirname, '..', task.path);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Path not found: ${task.path} (skipping watcher)`);
    return;
  }

  console.log(`✓ Watching: ${task.path}`);

  let debounceTimer;

  try {
    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      // Ignore system files / temporary files
      if (!filename || filename.startsWith('.') || filename.endsWith('.tmp')) return;
      
      // Ignore output files (to prevent loops)
      if (filename.includes('.min.') || filename.includes('.map')) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`\n⚡ Change in ${task.name}: ${filename}`);
        runTask(task);
      }, 200); // 200ms debounce
    });
  } catch (err) {
    console.error(`❌ Failed to watch ${task.path}: ${err.message}`);
  }
});

function runTask(task, silent = false) {
  exec(task.script, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error in ${task.name}: ${error.message}`);
      return;
    }
    if (stderr && !stderr.includes('warn')) {
      console.error(`⚠️  Stderr (${task.name}): ${stderr}`);
    }
    if (stdout.trim() && !silent) {
      console.log(stdout.trim());
    }
  });
}