# Newspaper Generator — Desktop-App (Tauri 2.0 + Playwright Sidecar)

Lightweight Desktop-App zum Erstellen historischer Zeitungsartikel für D&D-Kampagnen. Läuft nativ auf **macOS** (Universal Binary) und **Windows** (x64).

> **Hinweis**: Dieses Verzeichnis ist Teil eines Monorepos. Die GitHub Actions Workflow liegt im Repo-Root unter `.github/workflows/build.yml`. Siehe die [Haupt-README](../README.md) für den Gesamtüberblick.

> **Architektur**: Tauri 2.0 (Rust) als Wrapper um ein Vanilla-HTML/CSS/JS-Frontend. Der PNG-Export läuft über einen Playwright-Sidecar (Node.js + Headless-Chromium) — das löst die html2canvas-Probleme mit `column-count`, `@font-face`, `filter` und Subpixel-Rounding, weil echtes Chromium rendert.

---

## ⚡ Installation (One-Liner)

### macOS

Kopiere diese Zeile ins **Terminal** (in `/Applications/Programme/Dienstprogramme/Terminal`):

```bash
curl -fsSL https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-macos.sh | bash
```

Das Skript:
1. Lädt die neueste Version von GitHub Releases
2. Mountet die DMG und kopiert die App nach `/Applications`
3. Entfernt das macOS-Quarantine-Attribut (`xattr -cr`) — **ohne diesen Schritt** blockiert Gatekeeper die App mit "nicht von einem verifizierten Entwickler"
4. Öffnet den Programme-Ordner im Finder

> **Ohne Developer Account** ($99/Jahr) können wir die App nicht notarisieren. Das `xattr -cr` im Skript ist der saubere Workaround, der dem User die Terminal-Fummelei abnimmt.

**Bestimmte Version installieren:**

```bash
curl -fsSL https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-macos.sh | bash -s -- v1.3.6
```

**Update:** Einfach denselben Befehl nochmal ausführen — die alte Version wird ersetzt.

---

### Windows

Kopiere diese Zeile in **PowerShell** (Rechtsklick auf Start → "Windows PowerShell" oder "Terminal"):

```powershell
irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1 | iex
```

Das Skript:
1. Lädt die neueste Version von GitHub Releases
2. Führt den NSIS-Installer silent aus (`/S`-Flag) — installiert pro User nach `%LOCALAPPDATA%\Programs\Newspaper Generator\`, **keine Admin-Rechte nötig**
3. Erstellt einen Start-Menü-Eintrag
4. Startet die App automatisch

**Bestimmte Version installieren:**

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1))) v1.3.6
```

**Update:** Denselben Befehl nochmal ausführen — NSIS ersetzt die alte Version automatisch.

**Interaktiver Modus** (zeigt Installer-UI statt silent):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/jderksen2504/Newspaper-Generator/main/desktop/scripts/install/install-windows.ps1))) -Interactive
```

---

### Manueller Download

Alternativ direkt von den [GitHub Releases](https://github.com/jderksen2504/Newspaper-Generator/releases) herunterladen:

| Plattform | Datei | Hinweis |
|-----------|-------|---------|
| macOS (Universal) | `Newspaper.Generator_<version>_universal.dmg` | Nach dem Installieren `xattr -cr "/Applications/Newspaper Generator.app"` ausführen |
| Windows x64 | `Newspaper.Generator_<version>_x64-setup.exe` | NSIS-Installer, keine Admin-Rechte nötig |

---

## 🔧 Für Entwickler: App bauen

### Option A: GitHub Actions (empfohlen — baut macOS + Windows parallel)

1. Pushe das **Root-Repo** zu GitHub (siehe Haupt-README)
2. Öffne dein Repo auf GitHub → **Actions** → **Build Desktop App** → **Run workflow**
3. Wähle aus, welche Plattformen gebaut werden sollen (macOS/Windows)
4. Warte ~25–35 Minuten (parallel auf beiden Plattformen)
5. Lade die Artifacts herunter:
   - `newspaper-generator-macos-universal` → enthält `.dmg` (Universal Binary: Apple Silicon + Intel)
   - `newspaper-generator-windows-x64` → enthält `.msi` (Standard-Installer) und `.exe` (NSIS-Installer)

### Option B: Lokal bauen

**macOS** (Universal Binary):
```bash
cd desktop
./scripts/build-macos.sh           # Universal Binary
```

**Windows** (PowerShell als Admin):
```powershell
cd desktop
.\scripts\build-windows.ps1
```

Beide Skripte:
- Prüfen System-Voraussetzungen (Rust, Node, Xcode/MSVC Build Tools)
- Installieren fehlende Komponenten automatisch
- Laden Playwright-Chromium (~150 MB, einmalig)
- Laden Web-Fonts als `.woff2` (self-hosted, CSP-konform)
- Generieren App-Icons, falls keine vorhanden
- Starten den Tauri-Build

---

## 📦 Releases veröffentlichen

Sobald du eine stabile Version hast, tagge sie:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Das triggert die GitHub Actions Workflow automatisch, die:
1. Beide Plattformen baut (macOS + Windows)
2. Alle Installer-Dateien (`.dmg`, `.msi`, `.exe`) in einen **Draft Release** hochlädt
3. Auto-generierte Release Notes beifügt

Du musst danach nur noch auf GitHub den Release von "Draft" auf "Published" stellen.

---

## Was ist enthalten?

```
tauri-newspaper-generator/
├── .github/
│   └── workflows/
│       └── build.yml          # GitHub Actions: macOS + Windows Matrix-Build
├── scripts/
│   ├── build-macos.sh         # Lokaler Build auf macOS (Universal/Arm64/Intel)
│   ├── build-windows.ps1      # Lokaler Build auf Windows (PowerShell)
│   ├── download-fonts.js      # Lädt self-hosted Web-Fonts (.woff2)
│   └── push-to-github.sh      # Initialisiert Git-Repo + pusht zu GitHub
├── package.json               # Frontend-Dependencies (Vite + Tauri CLI)
├── vite.config.js             # Baut das Frontend nach dist/
├── src/
│   ├── index.html             # Haupt-HTML
│   ├── styles.css             # Dark-Theme Styles + @font-face Regeln
│   ├── main.js                # Frontend-Logik (State, Render, Tauri invoke)
│   └── types.ts               # TypeScript-Typen (Article, Settings, etc.)
├── src-tauri/
│   ├── Cargo.toml             # Rust-Dependencies
│   ├── tauri.conf.json        # Tauri-App-Konfiguration (MSI+NSIS+DMG+DEB)
│   ├── build.rs               # Tauri-Build-Skript
│   ├── capabilities/
│   │   └── default.json       # Berechtigungen (Dialog, FS, Shell)
│   ├── icons/                 # App-Icons (wird vom Build-Skript generiert)
│   ├── src/
│   │   ├── main.rs            # Rust-Einstiegspunkt
│   │   ├── lib.rs             # Tauri-Commands: save/load/export + Node-Finder
│   │   └── errors.rs          # Fehler-Typen
│   └── sidecars/
│       └── playwright-export/
│           ├── package.json   # Node-Dependencies (playwright-core)
│           └── export.js      # PNG-Renderer (plattformunabhängig)
└── README.md                  # Diese Datei
```

## Voraussetzungen

| Tool | Version | Wofür |
|------|---------|-------|
| [Rust](https://rustup.rs/) | ≥ 1.77 | Tauri-Backend kompilieren |
| [Node.js](https://nodejs.org/) | ≥ 20 | Frontend-Build + Playwright-Sidecar |
| [Tauri CLI](https://v2.tauri.app/start/prerequisites/) | v2 | `cargo tauri`-Befehl |
| Python | ≥ 3.11 | Icon-Generierung (Pillow) |

Systemabhängige Tauri-Voraussetzungen:
- **Linux**: `webkit2gtk-4.1`, `librsvg2`, `libgtk-3-dev`, `libayatana-appindicator3-dev` (siehe [Tauri-Docs](https://v2.tauri.app/start/prerequisites/))
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Microsoft C++ Build Tools + WebView2 Runtime (bei Win11 vorinstalliert)

## Setup (Ersteinrichtung — nur für Entwicklung ohne GitHub Actions)

> Wenn du nur bauen willst, nutze die Build-Skripte oben — die machen alles automatisch.

### 1. Frontend + Tauri-Dependencies installieren

```bash
cd tauri-newspaper-generator
npm install
```

### 2. Playwright-Sidecar einrichten

```bash
# Sidecar-Dependencies installieren
cd src-tauri/sidecars/playwright-export
npm install
cd ../../..

# Chromium für Playwright herunterladen (einmalig, ~150 MB)
npx playwright install chromium
```

### 3. Rust-Dependencies bauen (einmalig, dauert beim ersten Mal 5–10 Min)

```bash
cargo build
```

### 4. App-Icons generieren

Lege ein 1024×1024 PNG in `src-tauri/icons/icon.png` ab und führe aus:

```bash
npm run tauri icon src-tauri/icons/icon.png
```

Das generiert alle nötigen Icon-Formate (`.ico`, `.icns`, verschiedene Größen).

## Starten

### Entwicklungsmodus

```bash
npm run tauri dev
```

- Startet Vite-Dev-Server auf `http://localhost:5173`
- Öffnet die Tauri-WebView mit Hot-Reload
- Rust-Code wird bei Änderungen neu kompiliert

### Produktionsbuild

```bash
npm run tauri build
```

Erzeugt Installationspakete in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` Installer
- **macOS**: `.dmg` Disk Image
- **Linux**: `.deb`, `.AppImage`

## Funktionen

### Zeitungs-Editor
- **Zeitungskopf**: Titel, Datum, Ort, Ausgabe, Stempel-Boxen links/rechts
- **Formatierung**: Schriftgröße (pt), Titelstil (Fraktur/Blackletter/Serif/Italic)
- **Papierformat**: A4, A3, Letter, Tabloid, Broadsheet
- **Spaltenanzahl**: 2–6

### Artikel-Editor
- Headline, Subheadline, Text (mehrzeilig)
- Bild-Upload (Datei oder URL)
- Headline-Größe (Klein/Mittel/Groß/Sehr groß)
- Sortieren (↑/↓), Löschen, Aufklappen/Einklappen
- Beliebig viele Artikel

### Live-Vorschau
- Rendert exakt wie der PNG-Export
- Historischer Look: creme Papierton, doppelte Header-Linie, Spalten mit Trennlinien
- Fraktur-Schrift für Titel und Headlines
- Graustufen-Bilder mit kontrast-Filter

### Speichern / Laden
- **JSON-Sichern**: Native Save-Dialog, schreibt pretty-printed JSON
- **JSON-Laden**: Native Open-Dialog, lädt und parst das Projekt
- **Auto-Save**: Zwischenstand wird zusätzlich in `localStorage` abgelegt

### PNG-Export
- Native Save-Dialog für Zieldatei
- PNG wird via Headless-Chromium gerendert (Playwright-Sidecar)
- Web-Fonts (Fraktur) werden zu 100% geladen, bevor der Screenshot gemacht wird
- Hohe Treue zur Vorschau — sehr nah an der Live-Darstellung
- Original-Papiergröße in Pixeln (96 dpi)

## Architektur-Details

### Warum Tauri 2.0?

| Eigenschaft | Wert |
|------------|------|
| Binärgröße (final) | ~10–15 MB (ohne Chromium) |
| Speicherverbrauch | ~80–120 MB |
| Verwendete WebView | System-WebView (WebView2/WebKit) |
| Sidecar-Größe (Chromium) | ~150 MB (einmalig, via Playwright) |

### Warum Playwright statt html2canvas?

`html2canvas` rekonstruiert das DOM auf einem `<canvas>` — und scheitert an:
- `column-count` (Spalten-Layout)
- `@font-face` (Web-Fonts, v.a. Fraktur)
- `filter: grayscale()` (Bild-Filter)
- Subpixel-Rounding (verschiedene Layout-Engines)

Playwright hingegen nutzt **echtes Chromium** mit demselben Layout-Engine wie die Vorschau. Das Resultat ist sehr nah an der Vorschau, allerdings können minimale Subpixel-Unterschiede auftreten.

### Sidecar-Kommunikation

```
Frontend (JS)
    ↓ invoke("export_png", { project })
Tauri-Rust-Backend
    ↓ schreibt JSON nach /tmp/newspaper-<ts>.json
    ↓ startet: node export.js <json> <png-out>
Playwright-Sidecar
    ↓ chromium.launch(), page.setContent(html), page.screenshot()
    ↓ schreibt PNG nach /tmp/newspaper-<ts>.png
Tauri-Rust-Backend
    ↓ verschiebt PNG an den vom User gewählten Pfad
Frontend (JS)
    ↓ Toast: "PNG exportiert: <pfad>"
```

## Fehlerbehebung

### "Chromium nicht gefunden"
Setze die Umgebungsvariable:
```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/pfad/zu/chrome
```
Oder installiere Chromium via `npx playwright install chromium`.

### "Tauri CLI nicht gefunden"
```bash
npm install -g @tauri-apps/cli
```

### Sidecar startet nicht unter Windows
Stelle sicher, dass `node` im PATH ist. Alternativ kannst du in `tauri.conf.json` den `cmd`-Pfad absolut setzen.

### Build schlägt unter Linux fehl
Installiere die Tauri-System-Dependencies:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev libgtk-3-dev libayatana-appindicator3-dev
```

## Code-Signing & Notarization (für Verteilung)

Ohne Code-Signing zeigt macOS beim ersten Start die Meldung *"App kann nicht geöffnet werden, da sie nicht von einem verifizierten Entwickler stammt"*. Das lässt sich umgehen via:
- Rechtsklick auf die App → **Öffnen** → **Trotzdem öffnen**
- Oder: **Systemeinstellungen** → **Datenschutz & Sicherheit** → **Trotzdem öffnen**

Wenn du die App **an andere verteilen** willst, solltest du sie signieren. Dafür brauchst du einen **Apple Developer Account** (99 $/Jahr):

1. **Zertifikat erstellen**: Apple Developer Portal → Certificates → "Developer ID Application"
2. **In Keychain importieren**
3. **Tauri-Konfiguration erweitern** (`src-tauri/tauri.conf.json`):
   ```json
   "bundle": {
     "macOS": {
       "signingIdentity": "Developer ID Application: Dein Name (TEAMID)",
       "entitlements": null,
       "exceptionDomain": ""
     }
   }
   ```
4. **Notarize** (Apple-Server prüft die App auf Malware):
   ```bash
   export APPLE_ID="deine@email.com"
   export APPLE_PASSWORD="app-spezifisches-passwort"  # siehe appleid.apple.com
   export APPLE_TEAM_ID="TEAMID"
   npx @tauri-apps/cli build --target universal-apple-darwin
   ```
   Tauri führt das Notarization automatisch aus, wenn diese Env-Vars gesetzt sind.

Für **private Nutzung** (nur du selbst) brauchst du das alles nicht — die unsignierte App läuft nach dem "Trotzdem öffnen"-Dialog einwandfrei.

## Lizenz & Credits

Dieses Projekt steht unter der **GPL v3** — siehe `LICENSE`. Abwandlungen müssen unter derselben Lizenz frei verfügbar bleiben.

Schriften:
- [UnifrakturMaguntia](https://fonts.google.com/specimen/UnifrakturMaguntia) (Fraktur)
- [UnifrakturCook](https://fonts.google.com/specimen/UnifrakturCook) (Blackletter)
- [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) (Serif-Body)
- [Inter](https://fonts.google.com/specimen/Inter) (UI)
