# ============================================================================
# build-windows.ps1 — Lokaler Build der Tauri-App auf Windows
# ============================================================================
#
# Benötigt:
#   - Windows 10/11
#   - Microsoft C++ Build Tools:  https://visualstudio.microsoft.com/visual-cpp-build-tools/
#   - WebView2 Runtime:           https://developer.microsoft.com/microsoft-edge/webview2/
#                                 (bei Win11 vorinstalliert)
#   - Rust:                       https://rustup.rs/
#   - Node.js 20+:                https://nodejs.org/
#   - Python 3.11+:               https://www.python.org/  (für Icon-Generierung)
#
# Usage in PowerShell (als Admin):
#   .\scripts\build-windows.ps1
# ============================================================================

param(
    [string]$Target = "x64"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Set-Location $RootDir

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Newspaper Generator - Windows Build" -ForegroundColor Cyan
Write-Host "  Ziel: $Target" -ForegroundColor Cyan
Write-Host "  Verzeichnis: $RootDir" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. System-Check
# ---------------------------------------------------------------------------
if ($env:OS -notmatch "Windows_NT") {
    Write-Host "FEHLER: Dieses Skript muss auf Windows ausgeführt werden." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Rust nicht gefunden. Installiere via rustup..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
    & "$env:TEMP\rustup-init.exe" -y
    $env:Path += ";$env:USERPROFILE\.cargo\bin"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "FEHLER: Node.js nicht gefunden." -ForegroundColor Red
    Write-Host "  Lade herunter: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "FEHLER: Python nicht gefunden (für Icon-Generierung benötigt)." -ForegroundColor Red
    Write-Host "  Lade herunter: https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK System-Checks bestanden" -ForegroundColor Green
Write-Host "  rustc:  $(rustc --version)"
Write-Host "  node:   $(node --version)"
Write-Host "  python: $(python --version)"

# ---------------------------------------------------------------------------
# 2. Frontend-Dependencies
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Installiere Frontend-Dependencies ===" -ForegroundColor Cyan
npm install

# ---------------------------------------------------------------------------
# 3. Self-hosted Web-Fonts herunterladen
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Lade Web-Fonts herunter (self-hosted) ===" -ForegroundColor Cyan
node scripts\download-fonts.js

# ---------------------------------------------------------------------------
# 4. Sidecar-Dependencies + Playwright Chromium
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Installiere Playwright-Sidecar ===" -ForegroundColor Cyan
Push-Location src-tauri\sidecars\playwright-export
npm install
Pop-Location

Write-Host ""
Write-Host "=== Lade Playwright WebKit (~80 MB, einmalig) ===" -ForegroundColor Cyan
npx playwright install webkit

# ---------------------------------------------------------------------------
# 5. App-Icon (falls keines vorhanden)
# ---------------------------------------------------------------------------
if (-not (Test-Path "src-tauri\icons\icon.png")) {
    Write-Host ""
    Write-Host "=== Erstelle Placeholder-Icon ===" -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path "src-tauri\icons" | Out-Null
    pip install Pillow --quiet
    python -c @"
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGBA', (1024, 1024), (245, 236, 215, 255))
d = ImageDraw.Draw(img)
for w in [16, 8, 4]:
    d.rectangle([w, w, 1024-w, 1024-w], outline=(26, 18, 8, 255), width=w)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/times.ttf', 400)
except:
    font = ImageFont.load_default()
text = 'IH'
bbox = d.textbbox((0,0), text, font=font)
w = bbox[2]-bbox[0]; h = bbox[3]-bbox[1]
d.text(((1024-w)/2 - bbox[0], (1024-h)/2 - bbox[1]), text, fill=(26, 18, 8, 255), font=font)
img.save('src-tauri/icons/icon.png')
"@
    Write-Host "Placeholder-Icon erstellt" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Generiere Tauri-Icons (.ico, .icns, etc.) ===" -ForegroundColor Cyan
npx @tauri-apps/cli icon src-tauri\icons\icon.png

# ---------------------------------------------------------------------------
# 6. Tauri-App bauen
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Baue Tauri-App (target: $Target) ===" -ForegroundColor Cyan
npx @tauri-apps/cli build

# ---------------------------------------------------------------------------
# 7. Ergebnis anzeigen
# ---------------------------------------------------------------------------
$BundleDir = "src-tauri\target\release\bundle"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  BUILD ERFOLGREICH!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ergebnisse in: $BundleDir"
Write-Host ""
Write-Host "MSI Installer:" -ForegroundColor Cyan
Get-ChildItem -Path "$BundleDir\msi" -Filter "*.msi" -ErrorAction SilentlyContinue | Format-Table Name, Length
Write-Host "NSIS Installer:" -ForegroundColor Cyan
Get-ChildItem -Path "$BundleDir\nsis" -Filter "*.exe" -ErrorAction SilentlyContinue | Format-Table Name, Length
Write-Host ""
Write-Host "Die .msi-Datei ist der Standard-Windows-Installer."
Write-Host "Die .exe im nsis-Ordner ist ein alternativer Installer (kleiner, schneller)."
