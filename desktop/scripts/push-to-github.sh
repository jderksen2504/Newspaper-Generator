#!/usr/bin/env bash
# ============================================================================
# push-to-github.sh — Initialisiert das Git-Repo und pusht es zu GitHub
#
# Usage:
#   ./scripts/push-to-github.sh <github-repo-url>
#
# Beispiele:
#   ./scripts/push-to-github.sh git@github.com:MeinName/newspaper-generator.git
#   ./scripts/push-to-github.sh https://github.com/MeinName/newspaper-generator.git
# ============================================================================

set -euo pipefail

REPO_URL="${1:-}"

if [[ -z "$REPO_URL" ]]; then
  echo "Usage: $0 <github-repo-url>"
  echo ""
  echo "Beispiele:"
  echo "  $0 git@github.com:MeinName/newspaper-generator.git"
  echo "  $0 https://github.com/MeinName/newspaper-generator.git"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "=============================================="
echo "  Push Newspaper Generator zu GitHub"
echo "  Repo: $REPO_URL"
echo "  Verzeichnis: $ROOT_DIR"
echo "=============================================="

# ---------------------------------------------------------------------------
# 1. Git-Check
# ---------------------------------------------------------------------------
if ! command -v git &>/dev/null; then
  echo "FEHLER: git ist nicht installiert."
  echo "  macOS:  xcode-select --install"
  echo "  Linux:  sudo apt install git"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Falls noch nicht initialisiert: git init + initial commit
# ---------------------------------------------------------------------------
if [[ ! -d ".git" ]]; then
  echo ""
  echo "=== Initialisiere Git-Repository ==="
  git init
  git branch -M main
else
  echo "✓ Git bereits initialisiert"
fi

# ---------------------------------------------------------------------------
# 3. Self-hosted Fonts vorher laden, damit der erste Build sofort funktioniert
#    (Diese werden via .gitignore ignoriert — gehören also nicht ins Repo,
#     aber lokal braucht man sie, um die App zu bauen.)
# ---------------------------------------------------------------------------
if [[ ! -d "src/fonts" ]] || [[ -z "$(ls -A src/fonts 2>/dev/null)" ]]; then
  echo ""
  echo "=== Lade Web-Fonts herunter (lokal, nicht im Repo) ==="
  if command -v node &>/dev/null; then
    node scripts/download-fonts.js || echo "WARNUNG: Font-Download fehlgeschlagen"
  else
    echo "WARNUNG: node nicht gefunden — Fonts müssen manuell geladen werden"
  fi
fi

# ---------------------------------------------------------------------------
# 4. Dateien stagen
# ---------------------------------------------------------------------------
echo ""
echo "=== Stage alle Dateien ==="
git add -A

# ---------------------------------------------------------------------------
# 5. Erster Commit, falls noch keiner existiert
# ---------------------------------------------------------------------------
if ! git rev-parse HEAD &>/dev/null; then
  echo ""
  echo "=== Erstelle initialen Commit ==="
  git commit -m "feat: initial release of Newspaper Generator v1.0.0

Tauri 2.0 + Playwright Sidecar Desktop App für das Erstellen
historischer Zeitungsartikel für D&D-Kampagnen.

Features:
- Live-Vorschau mit Fraktur/Blackletter/Serif/Italic-Schriften
- PNG-Export via Headless Chromium (hochwertig)
- JSON Save/Load für Projekte
- A5/A4/A3/Letter/Tabloid/Broadsheet Papierformate
- 2-6 Spalten Layout mit column-fill: auto
- Self-hosted Web-Fonts (offline-tauglich, CSP-konform)

GitHub Actions Workflow baut macOS (Universal Binary) und Windows (x64)."
else
  echo "✓ Bereits committet"
fi

# ---------------------------------------------------------------------------
# 6. Remote setzen und pushen
# ---------------------------------------------------------------------------
echo ""
echo "=== Konfiguriere Remote ==="
if git remote get-url origin &>/dev/null; then
  echo "Remote 'origin' existiert bereits — update URL"
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo ""
echo "=== Pushe zu GitHub ==="
git push -u origin main

echo ""
echo "=============================================="
echo "  ERFOLGREICH GEPUSHT!"
echo "=============================================="
echo ""
echo "Nächste Schritte:"
echo "  1. Öffne dein Repo auf GitHub"
echo "  2. Gehe zum Tab 'Actions'"
echo "  3. Wähle 'Build Desktop App' → 'Run workflow'"
echo "  4. Warte ~25-35 Minuten"
echo "  5. Lade die Artifacts herunter (macOS .dmg + Windows .msi/.exe)"
echo ""
echo "Tipp: Für automatische Releases bei Version-Releases:"
echo "  git tag v1.0.0 && git push origin v1.0.0"
echo "Dann erstellt GitHub automatisch einen Release mit allen Builds."
