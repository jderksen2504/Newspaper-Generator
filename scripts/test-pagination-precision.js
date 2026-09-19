/**
 * Pagination Precision Test
 * 
 * Dieser Test lädt das Test-JSON, rendert die Artikel in einem echten
 * Browser (Puppeteer) und misst alle Höhen EXAKT. Dann vergleicht er
 * mit den Werten, die der computePages-Algorithmus berechnen würde.
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Test-JSON laden
const projectPath = "/home/z/my-project/upload/Goblins_Wöchentliche.json";
// Fallback: versuche verschiedene Dateinamen
let project;
const uploadDir = "/home/z/my-project/upload";
for (const f of fs.readdirSync(uploadDir)) {
  if (f.includes("Goblins_W") && f.endsWith(".json") && !f.includes("Broken") && !f.includes("Sollte") && !f.includes("PGN")) {
    const fullPath = path.join(uploadDir, f);
    project = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    console.log(`Loaded: ${f}`);
    break;
  }
}
if (!project) {
  console.error("Test JSON not found!");
  process.exit(1);
}

const MM_TO_PX = 3.7795275591;
const PAPER = { width: 210, height: 297 }; // A4

// Konstanten aus dem Code
const HEADLINE_SIZE_MULTIPLIER = { small: 0.75, medium: 1.0, large: 1.35, xlarge: 1.75 };

function effectivePx(basePt, zoom) {
  return basePt * 1.333 * zoom;
}

async function runTest() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  
  // Set viewport to A4 size
  const widthPx = Math.round(PAPER.width * MM_TO_PX);
  const heightPx = Math.round(PAPER.height * MM_TO_PX);
  await page.setViewport({ width: widthPx, height: heightPx });

  const settings = project.settings;
  const fs = settings.fontSizes;
  const zoom = settings.zoom;
  const columnCount = settings.columnCount;

  console.log("\n========================================");
  console.log("  PAGULATION PRECISION TEST");
  console.log("========================================");
  console.log(`Paper: A4 (${widthPx}×${heightPx}px)`);
  console.log(`Zoom: ${zoom}`);
  console.log(`Columns: ${columnCount}`);
  console.log(`Articles: ${project.articles.length}`);
  console.log("");

  // CSS für das Test-HTML (exakt wie in styles.css)
  const bodyPx = effectivePx(fs.articleBody, zoom);
  const stampHeadingPx = effectivePx(fs.stampHeading, zoom);
  const stampContentPx = effectivePx(fs.stampContent, zoom);
  const titlePx = effectivePx(fs.title, zoom);
  const metaPx = effectivePx(fs.meta, zoom);
  const articleHeadlineBasePx = effectivePx(fs.articleHeadline, zoom);
  const articleSubheadlinePx = effectivePx(fs.articleSubheadline, zoom);
  const footerPx = Math.max(metaPx * 0.93, effectivePx(7, zoom));

  let titleFontFamily = "'UnifrakturMaguntia', serif";
  if (settings.titleStyle === "blackletter") titleFontFamily = "'UnifrakturCook', 'UnifrakturMaguntia', serif";
  if (settings.titleStyle === "serif" || settings.titleStyle === "italic") titleFontFamily = "'EB Garamond', 'Times New Roman', Georgia, serif";
  const titleFontStyle = settings.titleStyle === "italic" ? "italic" : "normal";

  // Test-HTML mit echtem Paper-Layout
  const testHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; }
  
  /* Echtes Paper — exakt wie styles.css */
  .paper {
    width: ${widthPx}px;
    height: ${heightPx}px;
    background: #f5ecd7;
    color: #1a1208;
    padding: 16px 18px 18px 18px;
    border: 2px solid #1a1208;
    display: flex;
    flex-direction: column;
    font-family: 'EB Garamond', 'Times New Roman', Georgia, serif;
    font-size: ${bodyPx}px;
    line-height: 1.35;
    position: relative;
    overflow: hidden;
  }
  
  .masthead {
    border-bottom: 3px double #1a1208;
    padding-bottom: 6px;
    margin-bottom: 8px;
    text-align: center;
  }
  .stamp-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 4px;
    color: #3a2a14;
  }
  .stamp { flex: 1; text-align: left; border: 1px solid #3a2a14; padding: 3px 6px; }
  .stamp-h {
    font-size: ${stampHeadingPx}px;
    font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    border-bottom: 1px solid #3a2a14; margin-bottom: 2px; padding-bottom: 2px;
  }
  .stamp-c {
    font-size: ${stampContentPx}px;
    font-style: italic; line-height: 1.25;
  }
  .title {
    font-family: ${titleFontFamily};
    font-style: ${titleFontStyle};
    font-size: ${titlePx}px;
    font-weight: 700;
    line-height: 1;
    margin: 2px 0;
    letter-spacing: 0.02em;
    color: #1a1208;
  }
  .meta {
    font-size: ${metaPx}px; font-style: italic; color: #3a2a14; letter-spacing: 0.04em;
  }
  
  /* Manuelle Spalten — exakt wie im Code */
  .columns-container {
    display: flex;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }
  .column {
    flex: 1;
    overflow: hidden;
  }
  .column:nth-child(n+2) {
    border-left: 1px solid #5a3e1c;
    padding-left: 12px;
  }
  
  .article {
    break-inside: avoid;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #5a3e1c;
  }
  .article.last { border-bottom: none; }
  .article-head {
    font-family: ${titleFontFamily};
    font-style: ${titleFontStyle};
    font-weight: 700; line-height: 1.1; margin: 0 0 4px 0; color: #1a1208;
  }
  .article-sub {
    font-style: italic; font-size: ${articleSubheadlinePx}px; margin: 0 0 6px 0;
    color: #3a2a14; border-bottom: 1px solid #5a3e1c; padding-bottom: 4px;
  }
  .article-img {
    margin: 0 0 6px 0; border: 1px solid #3a2a14; background: #1a1208;
  }
  .article-img img {
    width: 100%; display: block;
    filter: grayscale(100%) contrast(1.1) brightness(0.95);
  }
  .article-text {
    font-size: ${bodyPx}px;
    text-align: justify; hyphens: auto; white-space: pre-wrap; color: #1a1208;
  }
  
  .footer {
    border-top: 1px solid #1a1208; margin-top: 6px; padding-top: 3px;
    font-size: ${footerPx}px; text-align: center; color: #3a2a14; font-style: italic;
  }
  
  /* Mess-Divs */
  .measure-container {
    position: absolute; visibility: hidden; left: -9999px; top: 0;
    box-sizing: border-box;
    font-family: 'EB Garamond', 'Times New Roman', Georgia, serif;
    font-size: ${bodyPx}px;
    line-height: 1.35;
  }
</style>
</head>
<body>

<!-- 1. ECHTES PAPER mit allen Artikeln (für visuelle Verifizierung) -->
<div class="paper" id="real-paper">
  <div class="masthead" id="real-masthead">
    <div class="stamp-row">
      <div class="stamp"><div class="stamp-h">${settings.stampLeft.heading}</div><div class="stamp-c">${settings.stampLeft.content}</div></div>
      <div class="stamp"><div class="stamp-h">${settings.stampRight.heading}</div><div class="stamp-c">${settings.stampRight.content}</div></div>
    </div>
    <div class="title">${settings.title}</div>
    <div class="meta">${settings.location} · ${settings.date} · ${settings.issue}</div>
  </div>
  <div class="columns-container" id="real-columns">
    <div class="column" id="col1">
      ${project.articles.slice(0, 1).map((a, i) => {
        const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
        const headPx = articleHeadlineBasePx * mult;
        const img = a.imageBase64 || a.imageUrl;
        return `<article class="article"><h2 class="article-head" style="font-size:${headPx}px">${a.headline}</h2>${a.subheadline ? `<p class="article-sub">${a.subheadline}</p>` : ""}${img ? `<figure class="article-img"><img src="${img}" alt="${a.headline}" /></figure>` : ""}<div class="article-text">${a.text}</div></article>`;
      }).join("")}
    </div>
    <div class="column" id="col2">
      ${project.articles.slice(1).map((a, i) => {
        const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
        const headPx = articleHeadlineBasePx * mult;
        const img = a.imageBase64 || a.imageUrl;
        return `<article class="article ${i === project.articles.length - 2 ? "last" : ""}"><h2 class="article-head" style="font-size:${headPx}px">${a.headline}</h2>${a.subheadline ? `<p class="article-sub">${a.subheadline}</p>` : ""}${img ? `<figure class="article-img"><img src="${img}" alt="${a.headline}" /></figure>` : ""}<div class="article-text">${a.text}</div></article>`;
      }).join("")}
    </div>
  </div>
  <div class="footer" id="real-footer">— ${settings.title} — ${settings.issue} —</div>
</div>

<!-- 2. MESS-DIV für Masthead -->
<div class="measure-container" id="measure-masthead" style="width: ${widthPx - 2 * 20}px;">
  <div class="masthead">
    <div class="stamp-row">
      <div class="stamp"><div class="stamp-h">${settings.stampLeft.heading}</div><div class="stamp-c">${settings.stampLeft.content}</div></div>
      <div class="stamp"><div class="stamp-h">${settings.stampRight.heading}</div><div class="stamp-c">${settings.stampRight.content}</div></div>
    </div>
    <div class="title">${settings.title}</div>
    <div class="meta">${settings.location} · ${settings.date} · ${settings.issue}</div>
  </div>
</div>

<!-- 3. MESS-DIV für Footer -->
<div class="measure-container" id="measure-footer" style="width: ${widthPx - 2 * 20}px;">
  <div class="footer">— ${settings.title} — ${settings.issue} —</div>
</div>

<!-- 4. MESS-DIVs für Artikel (Spalte 1 Breite und Spalte 2 Breite) -->
<!-- Spalte 1 Breite: (contentWidth) / 2, wobei contentWidth = widthPx - 2*20 = widthPx - 40 -->
<!-- Spalte 2 ist schmaler: -12px padding-left - 1px border = -13px -->
<div class="measure-container" id="measure-col1" style="width: ${(widthPx - 40) / 2}px;">
  ${project.articles.map((a, i) => {
    const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
    const headPx = articleHeadlineBasePx * mult;
    const img = a.imageBase64 || a.imageUrl;
    return `<article class="article" id="article-${i}"><h2 class="article-head" style="font-size:${headPx}px">${a.headline}</h2>${a.subheadline ? `<p class="article-sub">${a.subheadline}</p>` : ""}${img ? `<figure class="article-img"><img src="${img}" alt="${a.headline}" /></figure>` : ""}<div class="article-text">${a.text}</div></article>`;
  }).join("")}
</div>

<div class="measure-container" id="measure-col2" style="width: ${(widthPx - 40) / 2 - 13}px;">
  ${project.articles.map((a, i) => {
    const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
    const headPx = articleHeadlineBasePx * mult;
    const img = a.imageBase64 || a.imageUrl;
    return `<article class="article" id="article-col2-${i}"><h2 class="article-head" style="font-size:${headPx}px">${a.headline}</h2>${a.subheadline ? `<p class="article-sub">${a.subheadline}</p>` : ""}${img ? `<figure class="article-img"><img src="${img}" alt="${a.headline}" /></figure>` : ""}<div class="article-text">${a.text}</div></article>`;
  }).join("")}
</div>

</body>
</html>`;

  await page.setContent(testHtml, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  
  // Auf Bilder warten
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; })
      )
    );
  });
  // Extra wait for layout
  await new Promise(r => setTimeout(r, 1000));

  // === MESSUNGEN ===
  const measurements = await page.evaluate(() => {
    const results = {};

    // Paper
    const paper = document.getElementById("real-paper");
    results.paper = {
      offsetWidth: paper.offsetWidth,
      offsetHeight: paper.offsetHeight,
      clientWidth: paper.clientWidth,
      clientHeight: paper.clientHeight,
      scrollWidth: paper.scrollWidth,
      scrollHeight: paper.scrollHeight,
    };

    // Masthead
    const masthead = document.getElementById("real-masthead");
    results.masthead = {
      offsetHeight: masthead.offsetHeight,
      offsetHeightPlusMargin: masthead.offsetHeight + 8, // margin-bottom: 8px
    };

    // Footer
    const footer = document.getElementById("real-footer");
    results.footer = {
      offsetHeight: footer.offsetHeight,
      offsetHeightPlusMargin: footer.offsetHeight + 6 + 3, // margin-top: 6px + padding-top: 3px
    };

    // Columns container
    const cols = document.getElementById("real-columns");
    results.columnsContainer = {
      offsetHeight: cols.offsetHeight,
      clientHeight: cols.clientHeight,
      scrollHeight: cols.scrollHeight,
      offsetWidth: cols.offsetWidth,
    };

    // Spalte 1
    const col1 = document.getElementById("col1");
    results.col1 = {
      offsetWidth: col1.offsetWidth,
      clientWidth: col1.clientWidth,
      offsetHeight: col1.offsetHeight,
      scrollHeight: col1.scrollHeight,
      hasOverflow: col1.scrollHeight > col1.clientHeight,
    };

    // Spalte 2
    const col2 = document.getElementById("col2");
    results.col2 = {
      offsetWidth: col2.offsetWidth,
      clientWidth: col2.clientWidth,
      offsetHeight: col2.offsetHeight,
      scrollHeight: col2.scrollHeight,
      hasOverflow: col2.scrollHeight > col2.clientHeight,
    };

    // Artikel in Spalte 1
    const col1Articles = col1.querySelectorAll("article");
    results.col1Articles = Array.from(col1Articles).map(a => ({
      offsetHeight: a.offsetHeight,
      offsetHeightPlusMargin: a.offsetHeight + 12, // margin-bottom: 12px
      scrollHeight: a.scrollHeight,
    }));

    // Artikel in Spalte 2
    const col2Articles = col2.querySelectorAll("article");
    results.col2Articles = Array.from(col2Articles).map(a => ({
      offsetHeight: a.offsetHeight,
      offsetHeightPlusMargin: a.offsetHeight + 12,
      scrollHeight: a.scrollHeight,
    }));

    // Mess-Div Masthead
    const measureMasthead = document.querySelector("#measure-masthead .masthead");
    results.measureMasthead = {
      offsetHeight: measureMasthead ? measureMasthead.offsetHeight : 0,
    };

    // Mess-Div Footer
    const measureFooter = document.querySelector("#measure-footer .footer");
    results.measureFooter = {
      offsetHeight: measureFooter ? measureFooter.offsetHeight : 0,
    };

    // Mess-Div Artikel in Spalte 1 Breite
    const measureCol1Articles = document.querySelectorAll("#measure-col1 article");
    results.measureCol1Articles = Array.from(measureCol1Articles).map(a => ({
      offsetHeight: a.offsetHeight,
      offsetHeightPlusMargin: a.offsetHeight + 12,
    }));

    // Mess-Div Artikel in Spalte 2 Breite (schmaler)
    const measureCol2Articles = document.querySelectorAll("#measure-col2 article");
    results.measureCol2Articles = Array.from(measureCol2Articles).map(a => ({
      offsetHeight: a.offsetHeight,
      offsetHeightPlusMargin: a.offsetHeight + 12,
    }));

    // Bilder: natürliche Dimensionen
    const imgs = document.querySelectorAll("img");
    results.images = Array.from(imgs).map(img => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: img.offsetWidth,
      renderedHeight: img.offsetHeight,
      ratio: img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0,
    }));

    return results;
  });

  // === ANALYSE ===
  console.log("\n========================================");
  console.log("  GEMESSENE WERTE");
  console.log("========================================\n");

  console.log("--- Paper ---");
  console.log(`  offsetWidth:  ${measurements.paper.offsetWidth}px`);
  console.log(`  offsetHeight: ${measurements.paper.offsetHeight}px (sollte ${heightPx}px sein)`);
  console.log(`  clientHeight: ${measurements.paper.clientHeight}px (ohne Border)`);
  console.log("");

  console.log("--- Masthead ---");
  console.log(`  offsetHeight (echtes Paper):  ${measurements.masthead.offsetHeight}px`);
  console.log(`  + margin-bottom (8px):        ${measurements.masthead.offsetHeightPlusMargin}px`);
  console.log(`  offsetHeight (Mess-Div):      ${measurements.measureMasthead.offsetHeight}px`);
  console.log(`  Differenz:                    ${measurements.masthead.offsetHeight - measurements.measureMasthead.offsetHeight}px`);
  console.log("");

  console.log("--- Footer ---");
  console.log(`  offsetHeight (echtes Paper):  ${measurements.footer.offsetHeight}px`);
  console.log(`  + margin+padding (9px):       ${measurements.footer.offsetHeightPlusMargin}px`);
  console.log(`  offsetHeight (Mess-Div):      ${measurements.measureFooter.offsetHeight}px`);
  console.log("");

  console.log("--- Spalten ---");
  console.log(`  Columns-Container: ${measurements.columnsContainer.offsetHeight}px hoch (clientHeight: ${measurements.columnsContainer.clientHeight}px)`);
  console.log(`  Spalte 1: ${measurements.col1.offsetWidth}px breit, ${measurements.col1.offsetHeight}px hoch, scrollHeight: ${measurements.col1.scrollHeight}px, Overflow: ${measurements.col1.hasOverflow}`);
  console.log(`  Spalte 2: ${measurements.col2.offsetWidth}px breit, ${measurements.col2.offsetHeight}px hoch, scrollHeight: ${measurements.col2.scrollHeight}px, Overflow: ${measurements.col2.hasOverflow}`);
  console.log(`  Spalte 1 clientWidth: ${measurements.col1.clientWidth}px (Content-Bereich)`);
  console.log(`  Spalte 2 clientWidth: ${measurements.col2.clientWidth}px (Content-Bereich)`);
  console.log(`  Breitenunterschied: ${measurements.col1.offsetWidth - measurements.col2.offsetWidth}px (offsetWidth)`);
  console.log(`  Breitenunterschied: ${measurements.col1.clientWidth - measurements.col2.clientWidth}px (clientWidth)`);
  console.log("");

  console.log("--- Artikel (im echten Paper gerendert) ---");
  console.log("  Spalte 1:");
  measurements.col1Articles.forEach((a, i) => {
    console.log(`    Artikel ${i+1}: ${a.offsetHeight}px (+12px margin = ${a.offsetHeightPlusMargin}px)`);
  });
  console.log("  Spalte 2:");
  measurements.col2Articles.forEach((a, i) => {
    console.log(`    Artikel ${i+2}: ${a.offsetHeight}px (+12px margin = ${a.offsetHeightPlusMargin}px)`);
  });
  console.log("");

  console.log("--- Artikel (Mess-Div, Spalte 1 Breite) ---");
  measurements.measureCol1Articles.forEach((a, i) => {
    console.log(`    Artikel ${i+1}: ${a.offsetHeight}px (+12px = ${a.offsetHeightPlusMargin}px)`);
  });
  console.log("");

  console.log("--- Artikel (Mess-Div, Spalte 2 Breite = schmaler) ---");
  measurements.measureCol2Articles.forEach((a, i) => {
    console.log(`    Artikel ${i+1}: ${a.offsetHeight}px (+12px = ${a.offsetHeightPlusMargin}px)`);
  });
  console.log("");

  console.log("--- Bilder ---");
  measurements.images.forEach((img, i) => {
    console.log(`    Bild ${i+1}: ${img.naturalWidth}×${img.naturalHeight}px (ratio: ${img.ratio.toFixed(3)}), gerendert: ${img.renderedWidth}×${img.renderedHeight}px`);
  });
  console.log("");

  // === BERECHNUNG ===
  console.log("========================================");
  console.log("  PAGINATION-BERECHNUNG");
  console.log("========================================\n");

  const paddingVertical = 16 + 18 + 2 * 2; // top+bottom padding + border
  const paddingHorizontal = 18 + 2; // left/right padding + border
  const mastheadHeight = measurements.measureMasthead.offsetHeight + 8; // +margin-bottom
  const footerHeight = measurements.measureFooter.offsetHeight + 6 + 3; // +margin+padding
  const safetyMargin = 25;
  const safetyMarginScaled = 25 * zoom;

  const page1ColumnHeight_fixed = heightPx - paddingVertical - mastheadHeight - footerHeight - safetyMargin;
  const page1ColumnHeight_scaled = heightPx - paddingVertical - mastheadHeight - footerHeight - safetyMarginScaled;

  console.log(`Paper-Höhe:           ${heightPx}px`);
  console.log(`Padding+Border (V):   ${paddingVertical}px`);
  console.log(`Masthead+Margin:      ${mastheadHeight}px (gemessen: ${measurements.measureMasthead.offsetHeight}px + 8px)`);
  console.log(`Footer+Margin:        ${footerHeight}px (gemessen: ${measurements.measureFooter.offsetHeight}px + 9px)`);
  console.log(`Safety (fixed 25):    ${safetyMargin}px`);
  console.log(`Safety (zoom-scaliert): ${safetyMarginScaled.toFixed(1)}px`);
  console.log("");
  console.log(`Verfügbare Spalthöhe (fixed):   ${page1ColumnHeight_fixed.toFixed(0)}px`);
  console.log(`Verfügbare Spalthöhe (scaled):  ${page1ColumnHeight_scaled.toFixed(0)}px`);
  console.log(`Tatsächliche Spalthöhe (Paper): ${measurements.col1.clientHeight}px`);
  console.log("");

  console.log("--- Artikel-Höhen (Mess-Div, Spalte 1 Breite) ---");
  let totalCol1 = 0;
  measurements.measureCol1Articles.forEach((a, i) => {
    console.log(`  Artikel ${i+1}: ${a.offsetHeightPlusMargin}px ${a.offsetHeightPlusMargin > page1ColumnHeight_fixed ? "← ÜBERLAUF!" : ""}`);
    totalCol1 += a.offsetHeightPlusMargin;
  });
  console.log(`  Gesamt: ${totalCol1}px`);
  console.log("");

  console.log("--- Artikel-Höhen (Mess-Div, Spalte 2 Breite = schmaler) ---");
  measurements.measureCol2Articles.forEach((a, i) => {
    console.log(`  Artikel ${i+1}: ${a.offsetHeightPlusMargin}px ${a.offsetHeightPlusMargin > page1ColumnHeight_fixed ? "← ÜBERLAUF!" : ""}`);
  });
  console.log("");

  console.log("--- Overflow-Analyse ---");
  console.log(`  Spalte 1 Overflow: ${measurements.col1.hasOverflow ? "JA! Inhalt wird abgeschnitten!" : "nein"}`);
  console.log(`    scrollHeight: ${measurements.col1.scrollHeight}px > clientHeight: ${measurements.col1.clientHeight}px`);
  console.log(`  Spalte 2 Overflow: ${measurements.col2.hasOverflow ? "JA! Inhalt wird abgeschnitten!" : "nein"}`);
  console.log(`    scrollHeight: ${measurements.col2.scrollHeight}px > clientHeight: ${measurements.col2.clientHeight}px`);
  console.log("");

  console.log("--- Bild-Schätzung vs. Realität ---");
  if (measurements.images.length > 0) {
    const img = measurements.images[0];
    const col1Width = (widthPx - 2 * paddingHorizontal) / columnCount;
    const estimatedHeight = col1Width * 0.65 + 8;
    console.log(`  Bild gerendert:     ${img.renderedWidth}×${img.renderedHeight}px`);
    console.log(`  Bild natürlich:     ${img.naturalWidth}×${img.naturalHeight}px`);
    console.log(`  Seitenverhältnis:   ${img.ratio.toFixed(3)}`);
    console.log(`  Geschätzte Höhe:    ${estimatedHeight.toFixed(0)}px (columnWidth × 0.65 + 8)`);
    console.log(`  Tatsächliche Höhe:  ${img.renderedHeight}px`);
    console.log(`  Differenz:          ${(img.renderedHeight - estimatedHeight).toFixed(0)}px`);
    console.log(`  Bessere Schätzung:  ${(col1Width * img.ratio + 8).toFixed(0)}px (columnWidth × ratio + 8)`);
  }

  console.log("\n========================================");
  console.log("  ZUSAMMENFASSUNG");
  console.log("========================================\n");

  const realColHeight = measurements.col1.clientHeight;
  const measuredColHeight = page1ColumnHeight_fixed;
  const diff = realColHeight - measuredColHeight;
  console.log(`Tatsächliche Spalthöhe (aus Paper gerendert): ${realColHeight}px`);
  console.log(`Berechnete Spalthöhe (Algorithmus):           ${measuredColHeight.toFixed(0)}px`);
  console.log(`Differenz:                                     ${diff.toFixed(0)}px`);
  if (diff > 0) {
    console.log(`→ Algorithmus rechnet mit ZU WENIG Platz → denkt, mehr passt auf die Seite → Inhalt wird abgeschnitten`);
  } else if (diff < 0) {
    console.log(`→ Algorithmus rechnet mit ZU VIEL Platz → bricht zu früh um → unnötige Seite 2`);
  } else {
    console.log(`→ Werte stimmen überein`);
  }

  console.log("");
  console.log("Empfehlungen:");
  if (Math.abs(diff) > 20) {
    console.log(`  1. Safety-Margin um ${Math.abs(diff).toFixed(0)}px erhöhen oder zoom-skalieren`);
  }
  if (measurements.col1.hasOverflow) {
    console.log(`  2. Spalte 1 hat Overflow! Artikel passen nicht → Pagination ist falsch`);
  }
  if (measurements.col2.hasOverflow) {
    console.log(`  3. Spalte 2 hat Overflow! Artikel passen nicht → Pagination ist falsch`);
  }
  if (measurements.col1.offsetWidth !== measurements.col2.offsetWidth) {
    console.log(`  4. Spalten haben unterschiedliche Breiten: ${measurements.col1.offsetWidth} vs ${measurements.col2.offsetWidth}px`);
  } else {
    console.log(`  4. Spalten sind gleich breit (flex:1) — columnExtraPadding in Messung ist FALSCH`);
  }

  await browser.close();
}

runTest().catch(console.error);
