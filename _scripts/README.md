# _scripts

Zestaw pomocniczych skryptów dla projektów HTML/CSS/JS (Vanilla).

## Wymagania (Node)

Minimalnie: Node.js 18+.

Zależności używane przez skrypty:
- `terser` (minify-js.js)
- `sharp` (optimize-images.js)
- `ffmpeg-static` (optimize-video.js)

Instalacja (w root projektu):
```bash
npm init -y
npm i -D terser sharp ffmpeg-static
```

## Uruchamianie

### Watcher (minifikacja CSS/JS przy zmianach)
```bash
node _scripts/watch.js
```

### Minifikacja CSS (jednorazowo)
```bash
node _scripts/auto-minify-css.js
```

### Minifikacja CSS (watch)
```bash
node _scripts/auto-minify-css.js --watch
```

### Minifikacja JS (lista plików w skrypcie)
```bash
node _scripts/minify-js.js
```

### Optymalizacja obrazów
```bash
node _scripts/optimize-images.js
```

### Optymalizacja wideo
```bash
node _scripts/optimize-video.js
```

### Snapshot (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File .\_scripts\snapshot_code.ps1
powershell -ExecutionPolicy Bypass -File .\_scripts\snapshot_structure.ps1
```
