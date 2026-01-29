<#
.SYNOPSIS
    Zbiera caly kod projektu do jednego pliku z oznaczeniem sciezek.
.DESCRIPTION
    Skrypt skanuje katalog glowny projektu i laczy wszystkie pliki kodowe w jeden plik.
    Automatycznie wykrywa katalog glowny nawet gdy uruchamiany z podkatalogu _scripts/.
    Kazdy plik jest poprzedzony sciezka i oddzielony wyraznym separatorem.
    Plik wynikowy jest zapisywany w katalogu _project_snapshots z timestampem.
.NOTES
    Autor: DominDev
    Kodowanie: UTF-8 with BOM
#>

[CmdletBinding()]
param(
    [string]$OutputDir = "_project_snapshots"
)

# Wymuszenie UTF-8 z BOM
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# === AUTODETEKCJA KATALOGU GLOWNEGO PROJEKTU ===
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$CurrentDirName = Split-Path $ScriptDir -Leaf

# Jesli skrypt jest w katalogu zaczynajacym sie od "_", przejdz do parenta
if ($CurrentDirName -match '^_') {
    $ProjectPath = Split-Path $ScriptDir -Parent
    Write-Host "Wykryto uruchomienie z podkatalogu '$CurrentDirName'" -ForegroundColor DarkGray
    Write-Host "Katalog glowny projektu: $ProjectPath" -ForegroundColor DarkGray
} else {
    $ProjectPath = $ScriptDir
}

# Separator miedzy plikami (format zgodny z promptem analizy)
$Separator = @"

### FILE PATH: {0}

"@

# Rozszerzenia plikow kodowych do wlaczenia
$IncludedExtensions = @(
    '.html', '.htm',
    '.css', '.scss', '.sass', '.less',
    '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
    '.json',
    '.php',
    '.py',
    '.rb',
    '.java',
    '.c', '.cpp', '.h', '.hpp',
    '.cs',
    '.go',
    '.rs',
    '.swift',
    '.kt', '.kts',
    '.xml', '.xsl', '.xslt',
    '.yaml', '.yml',
    '.toml',
    '.md', '.markdown',
    '.txt',
    '.sql',
    '.sh', '.bash',
    '.bat', '.cmd',
    '.vue', '.svelte'
)

# Katalogi do wykluczenia (statyczna lista - katalogi z prefixem "_" sa wykluczane automatycznie)
$ExcludedDirsStatic = @(
    '.git',
    
    'node_modules',
    '.vscode',
    '.idea',
    '__pycache__',
    'vendor',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    'tmp',
    'temp'
)

# Pliki do wykluczenia (nazwy i wzorce)
$ExcludedFiles = @(
    '.gitignore',
    '.gitattributes',
    '.gitmodules',
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini',
    'nul',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'composer.lock',
    'Gemfile.lock',
    'Cargo.lock',
    '.eslintrc*',
    '.prettierrc*',
    '.babelrc*',
    'tsconfig.json',
    'jsconfig.json',
    '.editorconfig',
    '.npmrc',
    '.nvmrc',
    '.node-version',
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'settings.local.json',
    'snapshot_structure.ps1',
    'snapshot_code.ps1'
)

# Katalogi z plikami binarnymi (obrazy, fonty) do calkowitego pominiecia
$BinaryDirs = @(
    'images',
    'img',
    'assets/images',
    'assets/img',
    'fonts',
    'assets/fonts',
    'media',
    'videos',
    'audio'
)

# Funkcja sprawdzajaca czy katalog jest wykluczony
function Test-IsDirExcluded {
    param([string]$DirName, [string]$RelativePath)
    
    # Wyklucz katalogi z prefixem "_" (np. _docs, _scripts, _project_snapshots)
    if ($DirName -match '^_') { return $true }
    
    # Wyklucz katalogi ze statycznej listy
    if ($ExcludedDirsStatic -contains $DirName) { return $true }
    
    # Sprawdz czy sciezka zawiera katalog binarny
    foreach ($binDir in $BinaryDirs) {
        if ($RelativePath -like "*$binDir*") { return $true }
    }
    
    return $false
}

# Funkcja sprawdzajaca czy plik jest wykluczony
function Test-IsFileExcluded {
    param([string]$FileName)
    
    foreach ($pattern in $ExcludedFiles) {
        if ($pattern.Contains('*')) {
            if ($FileName -like $pattern) { return $true }
        } else {
            if ($FileName -eq $pattern) { return $true }
        }
    }
    
    return $false
}

# Funkcja sprawdzajaca czy plik jest plikiem kodowym
function Test-IsCodeFile {
    param([string]$FileName)
    
    $ext = [System.IO.Path]::GetExtension($FileName).ToLower()
    return $IncludedExtensions -contains $ext
}

# Funkcja rekurencyjnie zbierajaca pliki
function Get-CodeFiles {
    param(
        [string]$Path,
        [string]$RelativePath = "."
    )
    
    $files = @()
    
    try {
        $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue
    }
    catch {
        return $files
    }
    
    foreach ($item in $items) {
        $itemRelPath = if ($RelativePath -eq ".") { $item.Name } else { "$RelativePath/$($item.Name)" }
        
        if ($item.PSIsContainer) {
            # Katalog - sprawdz czy nie jest wykluczony
            if (-not (Test-IsDirExcluded -DirName $item.Name -RelativePath $itemRelPath)) {
                $files += Get-CodeFiles -Path $item.FullName -RelativePath $itemRelPath
            }
        }
        else {
            # Plik - sprawdz czy jest plikiem kodowym i nie jest wykluczony
            if ((Test-IsCodeFile -FileName $item.Name) -and 
                (-not (Test-IsFileExcluded -FileName $item.Name))) {
                $files += @{
                    FullPath = $item.FullName
                    RelativePath = "./$itemRelPath"
                    Name = $item.Name
                }
            }
        }
    }
    
    return $files
}

# Utworz katalog wyjsciowy jesli nie istnieje
$outputPath = Join-Path $ProjectPath $OutputDir
if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    Write-Host "Utworzono katalog: $OutputDir" -ForegroundColor Green
}

# Generuj timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $outputPath "code_bundle_$timestamp.txt"

# Pobierz nazwe projektu
$projectName = Split-Path $ProjectPath -Leaf

# Zbierz wszystkie pliki kodowe
Write-Host "Skanowanie projektu..." -ForegroundColor Cyan
$codeFiles = Get-CodeFiles -Path $ProjectPath

# Sortuj pliki wedlug sciezki
$codeFiles = $codeFiles | Sort-Object { $_.RelativePath }

Write-Host "Znaleziono $($codeFiles.Count) plikow kodowych." -ForegroundColor Green

# Buduj zawartosc pliku
$contentBuilder = New-Object System.Text.StringBuilder

# Naglowek pliku
[void]$contentBuilder.AppendLine("================================================================================")
[void]$contentBuilder.AppendLine("  BUNDLE KODU PROJEKTU: $projectName")
[void]$contentBuilder.AppendLine("  Data wygenerowania: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
[void]$contentBuilder.AppendLine("  Liczba plikow: $($codeFiles.Count)")
[void]$contentBuilder.AppendLine("================================================================================")
[void]$contentBuilder.AppendLine("")

# Spis tresci
[void]$contentBuilder.AppendLine("SPIS PLIKOW:")
[void]$contentBuilder.AppendLine("-" * 80)
$index = 1
foreach ($file in $codeFiles) {
    [void]$contentBuilder.AppendLine("  $index. $($file.RelativePath)")
    $index++
}
[void]$contentBuilder.AppendLine("-" * 80)
[void]$contentBuilder.AppendLine("")

# Zawartosc plikow
foreach ($file in $codeFiles) {
    Write-Host "  Przetwarzanie: $($file.RelativePath)" -ForegroundColor Gray
    
    # Dodaj separator z nazwa pliku
    $separatorLine = $Separator -f $file.RelativePath
    [void]$contentBuilder.Append($separatorLine)
    
    # Odczytaj zawartosc pliku
    try {
        $fileContent = Get-Content -Path $file.FullPath -Raw -Encoding UTF8 -ErrorAction Stop
        if ($null -eq $fileContent) {
            $fileContent = "// [PLIK PUSTY]"
        }
        [void]$contentBuilder.AppendLine($fileContent.TrimEnd())
    }
    catch {
        [void]$contentBuilder.AppendLine("// [BLAD ODCZYTU PLIKU: $($_.Exception.Message)]")
    }
    
    [void]$contentBuilder.AppendLine("")
}

# Stopka
[void]$contentBuilder.AppendLine("")
[void]$contentBuilder.AppendLine("================================================================================")
[void]$contentBuilder.AppendLine("  KONIEC BUNDLE - Wygenerowano przez snapshot_code.ps1")
[void]$contentBuilder.AppendLine("================================================================================")

# Zapisz plik z kodowaniem UTF-8 BOM
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($outputFile, $contentBuilder.ToString(), $utf8WithBom)

Write-Host ""
Write-Host "Bundle kodu zapisany do:" -ForegroundColor Cyan
Write-Host $outputFile -ForegroundColor Yellow
Write-Host ""

# Podsumowanie
$totalSize = (Get-Item $outputFile).Length
$sizeKB = [math]::Round($totalSize / 1KB, 2)
Write-Host "Rozmiar pliku: $sizeKB KB" -ForegroundColor Gray