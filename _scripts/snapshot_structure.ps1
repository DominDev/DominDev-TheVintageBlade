<#
.SYNOPSIS
    Generuje plik Markdown ze struktura katalogow i plikow projektu.
.DESCRIPTION
    Skrypt skanuje katalog glowny projektu i tworzy plik .md z drzewem struktury.
    Automatycznie wykrywa katalog glowny nawet gdy uruchamiany z podkatalogu _scripts/.
    Plik wynikowy jest zapisywany w katalogu _project_snapshots z timestampem w nazwie.
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

# === KATALOGI I PLIKI DO WYKLUCZENIA ===

# Katalogi do wykluczenia (statyczna lista)
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
    '.nuxt'
)

$ExcludedFiles = @(
    '.gitignore',
    '.gitattributes',
    '.gitmodules',
    '.env',
    '.env.local',
    '.env.production',
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini',
    'nul',
    '*.log',
    'package-lock.json',
    'yarn.lock',
    'composer.lock',
    'snapshot_structure.ps1',
    'snapshot_code.ps1'
)

$ExcludedExtensions = @(
    '.exe', '.dll', '.so', '.dylib',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg', '.bmp',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ttf', '.woff', '.woff2', '.eot', '.otf'
)

# Funkcja sprawdzajaca czy plik/katalog jest wykluczony
function Test-IsExcluded {
    param(
        [string]$Name,
        [string]$FullPath,
        [bool]$IsDirectory
    )
    
    if ($IsDirectory) {
        # Wyklucz katalogi z prefixem "_" (np. _docs, _scripts, _project_snapshots)
        if ($Name -match '^_') { return $true }
        # Wyklucz katalogi ze statycznej listy
        return $ExcludedDirsStatic -contains $Name
    }
    
    # Sprawdz nazwe pliku
    foreach ($pattern in $ExcludedFiles) {
        if ($pattern.Contains('*')) {
            if ($Name -like $pattern) { return $true }
        } else {
            if ($Name -eq $pattern) { return $true }
        }
    }
    
    # Sprawdz rozszerzenie
    $ext = [System.IO.Path]::GetExtension($Name).ToLower()
    if ($ExcludedExtensions -contains $ext) { return $true }
    
    return $false
}

# Funkcja budujaca drzewo struktury
function Get-DirectoryTree {
    param(
        [string]$Path,
        [string]$Prefix = "",
        [string]$RelativePath = "."
    )
    
    $output = @()
    
    try {
        $items = Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue | 
                 Where-Object { -not (Test-IsExcluded -Name $_.Name -FullPath $_.FullName -IsDirectory $_.PSIsContainer) } |
                 Sort-Object { -not $_.PSIsContainer }, Name
    }
    catch {
        return $output
    }
    
    $count = $items.Count
    $index = 0
    
    foreach ($item in $items) {
        $index++
        $isLast = ($index -eq $count)
        
        if ($isLast) {
            $connector = [char]0x2514 + [string][char]0x2500 + [string][char]0x2500 + " "  # L--
            $newPrefix = $Prefix + "    "
        } else {
            $connector = [char]0x251C + [string][char]0x2500 + [string][char]0x2500 + " "  # |--
            $newPrefix = $Prefix + [char]0x2502 + "   "  # |
        }
        
        $itemRelPath = Join-Path $RelativePath $item.Name
        
        if ($item.PSIsContainer) {
            $output += "$Prefix$connector$($item.Name)/"
            $output += Get-DirectoryTree -Path $item.FullName -Prefix $newPrefix -RelativePath $itemRelPath
        } else {
            $output += "$Prefix$connector$($item.Name)"
        }
    }
    
    return $output
}

# Utworz katalog wyjsciowy jesli nie istnieje
$outputPath = Join-Path $ProjectPath $OutputDir
if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    Write-Host "Utworzono katalog: $OutputDir" -ForegroundColor Green
}

# Generuj timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $outputPath "structure_$timestamp.md"

# Pobierz nazwe projektu
$projectName = Split-Path $ProjectPath -Leaf

# Buduj zawartosc pliku MD
$content = @()
$content += "# Struktura projektu: $projectName"
$content += ""
$content += "Data wygenerowania: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$content += ""
$content += '```'
$content += "$projectName/"
$content += (Get-DirectoryTree -Path $ProjectPath)
$content += '```'
$content += ""
$content += "---"
$content += "*Wygenerowano automatycznie przez snapshot_structure.ps1*"

# Zapisz plik z kodowaniem UTF-8 BOM
$content -join "`r`n" | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host ""
Write-Host "Struktura projektu zapisana do:" -ForegroundColor Cyan
Write-Host $outputFile -ForegroundColor Yellow
Write-Host ""