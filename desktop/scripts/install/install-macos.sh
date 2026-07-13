#!/bin/bash
# ============================================================================
# Newspaper Generator — macOS Installer / Updater
# ============================================================================
#
# Usage (one-liner, copy-paste into Terminal):
#
#   curl -fsSL https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-macos.sh | bash
#
# Or, to install a specific version:
#
#   curl -fsSL https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-macos.sh | bash -s -- v1.3.6
#
# What it does:
#   1. Queries the GitHub Releases API for the latest (or specified) version
#   2. Downloads the universal .dmg to a temporary location
#   3. Mounts the DMG silently
#   4. Copies "Newspaper Generator.app" to /Applications (replacing any existing copy)
#   5. Runs `xattr -cr` on the app — this removes the macOS quarantine
#      attribute that triggers the "unidentified developer" warning.
#      Without an Apple Developer Account ($99/year) we can't notarize
#      the app, so this is the simplest user-side workaround.
#   6. Unmounts the DMG and removes the temporary download
#   7. Opens /Applications in Finder so the user can launch the app
#
# No sudo required — /Applications is user-writable on modern macOS.
#
# Requirements: macOS 10.15+, internet connection.
# ============================================================================

set -euo pipefail

REPO="jderksen2504/Newspaper-Generator"
APP_NAME="Newspaper Generator"
APP_PATH="/Applications/${APP_NAME}.app"

# ---- Colors ---------------------------------------------------------------
if [ -t 1 ]; then
  BLUE='\033[0;34m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  NC='\033[0m'
else
  BLUE=''; GREEN=''; YELLOW=''; RED=''; NC=''
fi

log()  { echo -e "${BLUE}›${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*" >&2; }

# ---- Determine version ----------------------------------------------------
VERSION_ARG="${1:-}"
if [ -n "$VERSION_ARG" ]; then
  log "Requesting release $VERSION_ARG..."
  API_URL="https://api.github.com/repos/${REPO}/releases/tags/${VERSION_ARG}"
else
  log "Requesting latest release..."
  API_URL="https://api.github.com/repos/${REPO}/releases/latest"
fi

HTTP_CODE=$(curl -fsSL -o /tmp/release.json -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  err "Could not reach GitHub. Check your internet connection."
  exit 1
fi

if [ "$HTTP_CODE" = "404" ]; then
  err "No published release found ($API_URL returned 404)."
  err ""
  err "Common causes:"
  err "  - The release is still in DRAFT state on GitHub (must be published)"
  err "  - The version tag does not exist"
  err ""
  err "Open https://github.com/${REPO}/releases to check."
  rm -f /tmp/release.json
  exit 1
fi

if [ "$HTTP_CODE" != "200" ]; then
  err "GitHub API returned HTTP $HTTP_CODE."
  rm -f /tmp/release.json
  exit 1
fi

RELEASE_JSON=$(cat /tmp/release.json)
rm -f /tmp/release.json

VERSION=$(echo "$RELEASE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tag_name','unknown'))" 2>/dev/null || echo "unknown")
if [ "$VERSION" = "unknown" ]; then
  err "Could not parse release version from API response."
  exit 1
fi

# Skip draft releases when querying "latest" — the API returns the latest
# published release, so we don't need to worry about drafts here.
ok "Found version: $VERSION"

# ---- Find DMG asset -------------------------------------------------------
DMG_URL=$(echo "$RELEASE_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assets = data.get('assets', [])
dmg_assets = [a for a in assets if a['name'].lower().endswith('.dmg')]
if not dmg_assets:
    print('')
else:
    print(dmg_assets[0]['browser_download_url'])
" 2>/dev/null || echo "")

if [ -z "$DMG_URL" ]; then
  err "No .dmg asset found in release $VERSION."
  err "Available assets:"
  echo "$RELEASE_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for a in data.get('assets', []):
    print(f\"  {a['name']}\")
" >&2 || true
  exit 1
fi

DMG_NAME=$(basename "$DMG_URL")
ok "Asset: $DMG_NAME"

# ---- Download DMG ---------------------------------------------------------
TMP_DMG=$(mktemp -t newspaper-installer).dmg
trap 'rm -f "$TMP_DMG" 2>/dev/null || true' EXIT

log "Downloading $DMG_NAME..."
curl -fSL --progress-bar -o "$TMP_DMG" "$DMG_URL"
ok "Download complete ($(du -h "$TMP_DMG" | cut -f1))"

# ---- Mount DMG ------------------------------------------------------------
log "Mounting disk image..."
MOUNT_POINT=$(hdiutil attach -nobrowse -noautoopen "$TMP_DMG" 2>/dev/null | grep '/Volumes/' | tail -1 | sed 's/.*\(\/Volumes\/.*\)/\1/' | xargs)

if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
  err "Could not mount the disk image."
  exit 1
fi

trap 'hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true; rm -f "$TMP_DMG" 2>/dev/null || true' EXIT
ok "Mounted at: $MOUNT_POINT"

# Find the .app inside the mounted DMG
APP_SOURCE=$(find "$MOUNT_POINT" -maxdepth 2 -name "*.app" -print -quit 2>/dev/null || true)
if [ -z "$APP_SOURCE" ] || [ ! -d "$APP_SOURCE" ]; then
  err "Could not find ${APP_NAME}.app inside the disk image."
  err "Contents of $MOUNT_POINT:"
  ls -la "$MOUNT_POINT" >&2 || true
  exit 1
fi
ok "Found app: $(basename "$APP_SOURCE")"

# ---- Remove existing installation -----------------------------------------
if [ -d "$APP_PATH" ]; then
  log "Removing existing installation at $APP_PATH..."
  rm -rf "$APP_PATH"
  ok "Old version removed."
fi

# ---- Copy app to /Applications --------------------------------------------
log "Installing to $APP_PATH..."
# ditto preserves macOS metadata better than cp -R
ditto "$APP_SOURCE" "$APP_PATH"
ok "App installed."

# ---- Remove quarantine attribute ------------------------------------------
# This is the key step. Without an Apple Developer Account we can't notarize
# the app, so macOS attaches the com.apple.quarantine extended attribute on
# download (browsers set it). Gatekeeper then blocks the app on first launch.
# `xattr -cr` recursively removes ALL extended attributes — safe for apps.
log "Removing quarantine attribute (xattr -cr)..."
if xattr -cr "$APP_PATH" 2>/dev/null; then
  ok "Quarantine attribute removed — app will launch without warnings."
else
  warn "xattr -cr failed. You may need to run manually:"
  warn "  xattr -cr \"$APP_PATH\""
fi

# ---- Install runtime dependencies: Node.js + Playwright WebKit -----------
# The PNG/PDF export uses a Node.js sidecar (export.js) that launches a
# headless WebKit browser via Playwright. Both must be present on the user's
# system — they are NOT bundled in the app (would add ~200MB to the DMG).
# We install them automatically so the user doesn't have to.

echo ""
log "Checking runtime dependencies for PNG/PDF export..."

# --- Node.js ---
NEED_NODE=true
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" -ge 20 ]; then
    ok "Node.js $(node --version) found."
    NEED_NODE=false
  else
    warn "Node.js $(node --version) found, but v20+ required. Upgrading..."
  fi
fi

if [ "$NEED_NODE" = true ]; then
  log "Installing Node.js 20 LTS..."
  # Try Homebrew first (most common on macOS dev machines)
  if command -v brew >/dev/null 2>&1; then
    brew install node@20 2>&1 | tail -3
    brew link --overwrite node@20 2>&1 | tail -2
  else
    # No Homebrew — download official .pkg installer
    warn "Homebrew not found. Downloading official Node.js installer..."
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
      NODE_URL="https://nodejs.org/dist/v20.18.1/node-v20.18.1.pkg"
    else
      NODE_URL="https://nodejs.org/dist/v20.18.1/node-v20.18.1.pkg"
    fi
    TMP_PKG=$(mktemp -t node-installer).pkg
    curl -fSL --progress-bar -o "$TMP_PKG" "$NODE_URL"
    # pkg install requires sudo — but it's a one-time thing
    warn "Installing Node.js system-wide (will prompt for your password)..."
    sudo installer -pkg "$TMP_PKG" -target / 2>&1 | tail -3
    rm -f "$TMP_PKG"
  fi
  if command -v node >/dev/null 2>&1; then
    ok "Node.js $(node --version) installed."
  else
    err "Node.js installation failed. Please install manually from https://nodejs.org/"
    err "PNG/PDF export will not work without Node.js."
  fi
fi

# --- Playwright WebKit browser binary ---
# The Rust sidecar (export.js) launches WebKit to render the newspaper.
# Playwright stores browser binaries in ~/Library/Caches/ms-playwright/.
log "Checking Playwright WebKit browser..."
PW_CACHE="$HOME/Library/Caches/ms-playwright"
PW_WEBKIT_FOUND=$(find "$PW_CACHE" -name "Playwright" -path "*webkit*" -type f 2>/dev/null | head -1)

if [ -n "$PW_WEBKIT_FOUND" ]; then
  ok "Playwright WebKit found at $PW_WEBKIT_FOUND"
else
  log "Installing Playwright WebKit browser (~80 MB, one-time download)..."
  # Use the sidecar's bundled playwright-core to install
  SIDECAR_DIR="$APP_PATH/Contents/Resources/sidecars/playwright-export"
  if [ -d "$SIDECAR_DIR/node_modules/playwright-core" ]; then
    (cd "$SIDECAR_DIR" && npx playwright install webkit 2>&1 | tail -5)
  else
    # Fallback: install globally
    npx --yes playwright@latest install webkit 2>&1 | tail -5
  fi
  # Verify
  PW_WEBKIT_FOUND=$(find "$PW_CACHE" -name "Playwright" -path "*webkit*" -type f 2>/dev/null | head -1)
  if [ -n "$PW_WEBKIT_FOUND" ]; then
    ok "Playwright WebKit installed."
  else
    warn "Could not verify Playwright WebKit installation."
    warn "If PNG export fails, run manually: npx playwright install webkit"
  fi
fi

# ---- Launch /Applications in Finder so the user sees the app --------------
log "Opening /Applications in Finder..."
open /Applications
ok "Done. You can now launch \"${APP_NAME}\" from the Applications folder."

# Also offer to launch the app directly
echo ""
read -r -p "Launch ${APP_NAME} now? [y/N] " response 2>/dev/null || response=""
if [[ "$response" =~ ^[Yy]$ ]]; then
  log "Launching..."
  open "$APP_PATH"
fi
