#!/usr/bin/env bash
# ============================================================================
# build-macos.sh — Lokaler Build der Tauri-App auf macOS
# ============================================================================
#
# Benötigt:
#   - macOS 12+ (Monterey oder neuer empfohlen)
#   - Xcode Command Line Tools:  xcode-select --install
#   - Rust:                       https://rustup.rs/
#   - Node.js 20+:                https://nodejs.org/ oder `brew install node`
#   - Tauri-Systemdeps:           automatisch via brew (Skript installiert sie)
#
# Usage:
#   ./scripts/build-macos.sh           # Universal Binary (Apple Silicon + Intel)
#   ./scripts/build-macos.sh arm64     # Nur Apple Silicon
#   ./scripts/build-macos.sh x86_64    # Nur Intel
# ============================================================================

set -euo pipefail

TARGET="${1:-universal}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "=============================================="
echo "  Newspaper Generator — macOS Build"
echo "  Ziel: $TARGET"
echo "  Verzeichnis: $ROOT_DIR"
echo "=============================================="

# ---------------------------------------------------------------------------
# 1. System-Check
# ---------------------------------------------------------------------------
if [[ "$(uname)" != "Darwin" ]]; then
  echo "FEHLER: Dieses Skript muss auf macOS ausgeführt werden."
  echo "Du bist auf: $(uname)"
  exit 1
fi

if ! command -v xcode-select &>/dev/null; then
  echo "FEHLER: Xcode Command Line Tools fehlen."
  echo "  Installiere mit:  xcode-select --install"
  exit 1
fi

if ! command -v rustc &>/dev/null; then
  echo "Rust nicht gefunden. Installiere via rustup…"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

if ! command -v node &>/dev/null; then
  echo "FEHLER: Node.js nicht gefunden."
  echo "  Installiere via Homebrew:  brew install node"
  echo "  Oder lade herunter:        https://nodejs.org/"
  exit 1
fi

echo "✓ System-Checks bestanden"
echo "  rustc:  $(rustc --version)"
echo "  node:   $(node --version)"

# ---------------------------------------------------------------------------
# 2. Rust-Targets für Universal Binary installieren
# ---------------------------------------------------------------------------
if [[ "$TARGET" == "universal" ]]; then
  echo ""
  echo "=== Installiere Rust-Targets für Universal Binary ==="
  rustup target add aarch64-apple-darwin || true
  rustup target add x86_64-apple-darwin || true
elif [[ "$TARGET" == "arm64" ]]; then
  rustup target add aarch64-apple-darwin || true
elif [[ "$TARGET" == "x86_64" ]]; then
  rustup target add x86_64-apple-darwin || true
else
  echo "FEHLER: Unbekanntes Target: $TARGET"
  echo "  Gültig: universal | arm64 | x86_64"
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Frontend-Dependencies
# ---------------------------------------------------------------------------
echo ""
echo "=== Installiere Frontend-Dependencies ==="
npm install

# ---------------------------------------------------------------------------
# 3b. Self-hosted Web-Fonts herunterladen (offline-tauglich, CSP-konform)
# ---------------------------------------------------------------------------
echo ""
echo "=== Lade Web-Fonts herunter (self-hosted) ==="
node scripts/download-fonts.js

# ---------------------------------------------------------------------------
# 4. Sidecar-Dependencies + Playwright Chromium
# ---------------------------------------------------------------------------
echo ""
echo "=== Installiere Playwright-Sidecar ==="
pushd src-tauri/sidecars/playwright-export > /dev/null
npm install
popd > /dev/null

echo ""
echo "=== Lade Playwright WebKit (~80 MB, einmalig) ==="
npx playwright install webkit

# ---------------------------------------------------------------------------
# 5. App-Icon (falls keines vorhanden)
# ---------------------------------------------------------------------------
if [[ ! -f "src-tauri/icons/icon.png" ]]; then
  echo ""
  echo "=== Erstelle Placeholder-Icon ==="
  mkdir -p src-tauri/icons
  python3 -c "
from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGBA', (1024, 1024), (245, 236, 215, 255))
d = ImageDraw.Draw(img)
for w in [16, 8, 4]:
    d.rectangle([w, w, 1024-w, 1024-w], outline=(26, 18, 8, 255), width=w)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Times New Roman.ttf', 400)
except:
    font = ImageFont.load_default()
text = 'IH'
bbox = d.textbbox((0,0), text, font=font)
w = bbox[2]-bbox[0]; h = bbox[3]-bbox[1]
d.text(((1024-w)/2 - bbox[0], (1024-h)/2 - bbox[1]), text, fill=(26, 18, 8, 255), font=font)
img.save('src-tauri/icons/icon.png')
" || {
    echo "WARNUNG: Konnte kein Icon erstellen (Pillow fehlt?). Erzeuge 1x1 Pixel als Fallback."
    printf '\x89PNG\r\n\x1a\n' > src-tauri/icons/icon.png
  }
fi

echo ""
echo "=== Generiere Tauri-Icons (.icns, .ico, etc.) ==="
npx @tauri-apps/cli icon src-tauri/icons/icon.png

# ---------------------------------------------------------------------------
# 6. Tauri-App bauen
# ---------------------------------------------------------------------------
echo ""
echo "=== Baue Tauri-App (target: $TARGET) ==="
case "$TARGET" in
  universal)
    npx @tauri-apps/cli build --target universal-apple-darwin
    BUNDLE_DIR="src-tauri/target/universal-apple-darwin/release/bundle"
    ;;
  arm64)
    npx @tauri-apps/cli build --target aarch64-apple-darwin
    BUNDLE_DIR="src-tauri/target/aarch64-apple-darwin/release/bundle"
    ;;
  x86_64)
    npx @tauri-apps/cli build --target x86_64-apple-darwin
    BUNDLE_DIR="src-tauri/target/x86_64-apple-darwin/release/bundle"
    ;;
esac

# ---------------------------------------------------------------------------
# 7. Ergebnis anzeigen
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  BUILD ERFOLGREICH!"
echo "=============================================="
echo ""
echo "Ergebnisse in: $BUNDLE_DIR"
echo ""
echo "App-Bundle (.app):"
find "$BUNDLE_DIR/macos" -name "*.app" -maxdepth 1 2>/dev/null || true
echo ""
echo "Disk Image (.dmg):"
find "$BUNDLE_DIR/dmg" -name "*.dmg" -maxdepth 1 2>/dev/null || true
echo ""
echo "----------------------------------------------"
echo "Die .dmg-Datei ist das, was du an andere verteilen kannst."
echo "Die .app kannst du direkt in /Applications verschieben."
echo ""
echo "Hinweis: Beim ersten Start wird macOS die App blockieren"
echo "(\"nicht verifizierter Entwickler\"). Öffne in diesem Fall:"
echo "  Systemeinstellungen > Datenschutz & Sicherheit > Trotzdem öffnen"
echo ""
echo "Für echte Verteilung: Code-Signing mit Apple Developer Account"
echo "notwendig. Siehe README.md, Abschnitt 'Code-Signing'."
