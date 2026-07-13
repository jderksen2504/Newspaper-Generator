// ============================================================================
// download-fonts.js — Lädt die benötigten Web-Fonts als .woff2-Dateien
// und speichert sie in src/fonts/ für self-hosted @font-face.
//
// Führe dieses Skript einmalig aus:
//   node scripts/download-fonts.js
//
// Strategie:
//   1. Frage die Google Fonts CSS API mit einem Chrome-User-Agent an
//      (nur dann liefert Google woff2-URLs zurück)
//   2. Extrahiere die woff2-URLs aus dem CSS
//   3. Lade die woff2-Dateien herunter
//
// Das ist robust gegen Google's URL-Änderungen, weil wir nicht-hardcodierte
// Versionsnummern verwenden.
//
// WICHTIG: Dieses Skript ist ein ES Module (import statt require), weil
// die übergeordnete package.json `"type": "module"` gesetzt hat.
// ============================================================================

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.resolve(__dirname, "..", "src", "fonts");

// Chrome-User-Agent — nur dann liefert Google Fonts woff2 zurück
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Definition der Fonts, die wir herunterladen wollen.
// `family` ist der Google-Fonts-Family-Name, `cssQuery` der css2-Parameter,
// `outName` der Dateiname in src/fonts/ und `weight`/`style` filtern das
// richtige @font-face aus dem gelieferten CSS.
const FONTS = [
  {
    family: "UnifrakturMaguntia",
    cssQuery: "family=UnifrakturMaguntia",
    outName: "UnifrakturMaguntia-Regular.woff2",
    weight: "400",
    style: "normal",
  },
  {
    family: "UnifrakturCook",
    cssQuery: "family=UnifrakturCook:wght@700",
    outName: "UnifrakturCook-Bold.woff2",
    weight: "700",
    style: "normal",
  },
  {
    family: "EB Garamond",
    cssQuery: "family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700",
    outName: "EBGaramond-Regular.woff2",
    weight: "400",
    style: "normal",
  },
  {
    family: "EB Garamond",
    cssQuery: "family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700",
    outName: "EBGaramond-Medium.woff2",
    weight: "500",
    style: "normal",
  },
  {
    family: "EB Garamond",
    cssQuery: "family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700",
    outName: "EBGaramond-Bold.woff2",
    weight: "700",
    style: "normal",
  },
  {
    family: "EB Garamond",
    cssQuery: "family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700",
    outName: "EBGaramond-Italic.woff2",
    weight: "400",
    style: "italic",
  },
  {
    family: "Inter",
    cssQuery: "family=Inter:wght@400;500;600;700",
    outName: "Inter-Regular.woff2",
    weight: "400",
    style: "normal",
  },
  {
    family: "Inter",
    cssQuery: "family=Inter:wght@400;500;600;700",
    outName: "Inter-Medium.woff2",
    weight: "500",
    style: "normal",
  },
  {
    family: "Inter",
    cssQuery: "family=Inter:wght@400;500;600;700",
    outName: "Inter-SemiBold.woff2",
    weight: "600",
    style: "normal",
  },
  {
    family: "Inter",
    cssQuery: "family=Inter:wght@400;500;600;700",
    outName: "Inter-Bold.woff2",
    weight: "700",
    style: "normal",
  },
];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: options.headers || {} }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetch(res.headers.location, options).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} für ${url}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": CHROME_UA } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fs.unlinkSync(dest);
          return downloadToFile(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} für ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        try {
          fs.unlinkSync(dest);
        } catch {}
        reject(err);
      });
  });
}

/**
 * Holt das CSS für eine Font-Family von Google Fonts und extrahiert die
 * woff2-URL für den angegebenen Weight/Style.
 */
async function getWoff2Url(cssQuery, weight, style) {
  const cssUrl = `https://fonts.googleapis.com/css2?${cssQuery}&display=swap`;
  console.log(`  CSS: ${cssUrl}`);
  const cssBuf = await fetch(cssUrl, { headers: { "User-Agent": CHROME_UA } });
  const css = cssBuf.toString("utf-8");

  // Das CSS enthält mehrere @font-face-Blöcke. Wir suchen den, der zu
  // unserem Weight/Style passt, und extrahieren die src-URL.
  //
  // Beispiel-Block:
  //   @font-face {
  //     font-family: 'EB Garamond';
  //     font-style: normal;
  //     font-weight: 400;
  //     font-display: swap;
  //     src: url(https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQ....woff2) format('woff2');
  //     unicode-range: U+0000-00FF, ...;
  //   }
  //
  // Wir splitten das CSS in Blöcke und finden den passenden.
  const blocks = css.split("@font-face").slice(1);
  for (const block of blocks) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);

    if (!weightMatch || !styleMatch || !urlMatch) continue;

    const blockWeight = weightMatch[1];
    const blockStyle = styleMatch[1];

    // Match by weight + style. Für Inter EB Garamond etc. reicht das aus.
    if (blockWeight === String(weight) && blockStyle === style) {
      return urlMatch[1];
    }
  }

  // Fallback: nehme das erste @font-face, das zum Style passt (ignoriere Weight)
  for (const block of blocks) {
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (styleMatch && urlMatch && styleMatch[1] === style) {
      console.log(`  ⚠ Exaktes Weight ${weight} nicht gefunden, nehme ersten Match für style=${style}`);
      return urlMatch[1];
    }
  }

  throw new Error(
    `Kein woff2-URL für weight=${weight}, style=${style} in Google-Fonts-CSS gefunden.\nCSS:\n${css.slice(0, 500)}`
  );
}

async function main() {
  console.log("Erstelle Verzeichnis:", FONTS_DIR);
  fs.mkdirSync(FONTS_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.outName);
    console.log(`\n↓ ${font.outName} (family="${font.family}", weight=${font.weight}, style=${font.style})`);

    try {
      const woff2Url = await getWoff2Url(font.cssQuery, font.weight, font.style);
      console.log(`  URL: ${woff2Url}`);
      await downloadToFile(woff2Url, dest);
      const stats = fs.statSync(dest);
      console.log(`  ✓ ${stats.size} Bytes gespeichert`);
      success++;
    } catch (err) {
      console.error(`  ✗ FEHLER: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`  ${success} Fonts erfolgreich heruntergeladen`);
  if (failed > 0) {
    console.log(`  ${failed} Fonts fehlgeschlagen`);
    process.exit(1);
  }
  console.log(`  Alle Fonts in src/fonts/`);
  console.log(`========================================`);
}

main();
