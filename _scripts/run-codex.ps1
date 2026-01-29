# Runs Codex CLI with project-local state in .codex/
# This ensures project-specific configuration, prompts, and state are used

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$codexHome = Join-Path $projectRoot ".codex"

# Set CODEX_HOME to use project-local config
$env:CODEX_HOME = $codexHome

Write-Host "Starting Codex CLI with project-local config..." -ForegroundColor Cyan
Write-Host "CODEX_HOME: $codexHome" -ForegroundColor Gray
Write-Host ""

# Change to project root
Set-Location $projectRoot

# Run Codex CLI
codex
