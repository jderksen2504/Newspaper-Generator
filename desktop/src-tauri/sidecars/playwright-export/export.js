#!/usr/bin/env node
/**
 * Playwright Sidecar — PNG/PDF Export für Newspaper Generator (Tauri 2.0)
 *
 * Usage:
 *   node export.js <path-to-project.json> <path-to-output-prefix> [png|pdf] [compression]
 *
 * Liest ein NewspaperProject JSON, rendert es mit Headless WebKit/Chromium in
 * der exakten Papiergröße und schreibt das PNG/PDF an den angegebenen Pfad.
 *
 * Warum Playwright und nicht html2canvas?
 *   html2canvas rekonstruiert das DOM auf einem <canvas> und hat Probleme mit
 *   column-count, @font-face, filter, subpixel-rounding. Playwright hingegen
 *   nutzt echtes WebKit — die Darstellung ist identisch mit der Vorschau.
 *
 * v1.3.3 Änderungen:
 *   - SVG-Duotone-Filter ersetzt das alte CSS-grayscale. Pro Theme wird
 *     { highlight, shadow } als "Helldunkel" definiert.
 *   - Custom-Theme-Support: settings.customTheme überschreibt die Farben
 *     eines Presets, behält aber dessen border-style/gradient bei.
 *   - dividerTextBold-Feld für fetten Runen-Text.
 */

const fs = require("fs");
const path = require("path");
const { webkit, chromium } = require("playwright-core");

// === Themes (MUSS mit desktop/src/themes.js übereinstimmen) ===
// Jedes Theme hat jetzt ein `duotone: { highlight, shadow }` Feld.
// imgFilter enthält nur noch contrast/brightness-Tuning (kein grayscale mehr).
const THEMES = {
  "classic": {
    paper: { bg: "#f5ecd7", gradient: "radial-gradient(ellipse at top, rgba(140,100,40,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(80,50,10,0.08), transparent 70%)" },
    text: { primary: "#1a1208", accent: "#3a2a14", muted: "#5a3e1c" },
    borders: { header: "3px double #1a1208", stamp: "1px solid #3a2a14", separator: "1px solid #5a3e1c", footer: "1px solid #1a1208" },
    stamp: { headingColor: "#3a2a14", contentColor: "#3a2a14", bg: "#f5ecd7" },
    title: { color: "#1a1208" },
    imgFilter: "contrast(1.1) brightness(0.95)",
    duotone: { highlight: "#f5ecd7", shadow: "#1a1208" },
  },
  "dark-gazette": {
    paper: { bg: "#2a2018", gradient: "radial-gradient(ellipse at top, rgba(201,168,76,0.08), transparent 60%), radial-gradient(ellipse at bottom, rgba(139,115,50,0.06), transparent 70%)" },
    text: { primary: "#e8dcc0", accent: "#c9a84c", muted: "#8b7332" },
    borders: { header: "3px double #c9a84c", stamp: "1px solid #c9a84c", separator: "1px solid #8b7332", footer: "1px solid #c9a84c" },
    stamp: { headingColor: "#c9a84c", contentColor: "#e8dcc0", bg: "#2a2018" },
    title: { color: "#c9a84c" },
    imgFilter: "contrast(1.15) brightness(0.85)",
    duotone: { highlight: "#e8dcc0", shadow: "#2a2018" },
  },
  "royal-court": {
    paper: { bg: "#f8f0db", gradient: "radial-gradient(ellipse at top, rgba(139,26,26,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(201,168,76,0.08), transparent 70%)" },
    text: { primary: "#1a1208", accent: "#8b1a1a", muted: "#c9a84c" },
    borders: { header: "3px solid #8b1a1a", stamp: "2px solid #8b1a1a", separator: "2px solid #c9a84c", footer: "1px solid #8b1a1a" },
    stamp: { headingColor: "#8b1a1a", contentColor: "#3a2a14", bg: "#f8f0db" },
    title: { color: "#8b1a1a" },
    imgFilter: "contrast(1.1) brightness(0.95)",
    duotone: { highlight: "#f8f0db", shadow: "#3a2a14" },
  },
  "elven-scroll": {
    paper: { bg: "#f0f5e8", gradient: "radial-gradient(ellipse at top, rgba(58,90,58,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(138,154,138,0.08), transparent 70%)" },
    text: { primary: "#1a2e1a", accent: "#3a5a3a", muted: "#8a9a8a" },
    borders: { header: "2px solid #8a9a8a", stamp: "1px solid #8a9a8a", separator: "1px solid #8a9a8a", footer: "1px solid #8a9a8a" },
    stamp: { headingColor: "#3a5a3a", contentColor: "#1a2e1a", bg: "#f0f5e8" },
    title: { color: "#1a2e1a" },
    imgFilter: "contrast(1.05) brightness(1.0)",
    duotone: { highlight: "#f0f5e8", shadow: "#1a2e1a" },
  },
  "dwarven-forge": {
    paper: { bg: "#d0ccc4", gradient: "radial-gradient(ellipse at top, rgba(184,115,51,0.08), transparent 60%), radial-gradient(ellipse at bottom, rgba(139,90,43,0.06), transparent 70%)" },
    text: { primary: "#1a1a1a", accent: "#b87333", muted: "#8b5a2b" },
    borders: { header: "4px solid #b87333", stamp: "3px solid #8b5a2b", separator: "2px solid #8b5a2b", footer: "2px solid #b87333" },
    stamp: { headingColor: "#b87333", contentColor: "#1a1a1a", bg: "#d0ccc4" },
    title: { color: "#1a1a1a" },
    imgFilter: "contrast(1.2) brightness(0.9)",
    duotone: { highlight: "#d0ccc4", shadow: "#1a1a1a" },
  },
  "necromancer": {
    paper: { bg: "#1a1520", gradient: "radial-gradient(ellipse at top, rgba(106,58,106,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(154,154,154,0.04), transparent 70%)" },
    text: { primary: "#7a9a6a", accent: "#9a9a9a", muted: "#6a3a6a" },
    borders: { header: "2px solid #6a3a6a", stamp: "1px solid #6a3a6a", separator: "1px dashed #6a3a6a", footer: "1px solid #6a3a6a" },
    stamp: { headingColor: "#9a9a9a", contentColor: "#7a9a6a", bg: "#1a1520" },
    title: { color: "#9a9a9a" },
    imgFilter: "contrast(1.1) brightness(0.85)",
    duotone: { highlight: "#9a9a9a", shadow: "#1a1520" },
  },
};

const DEFAULT_THEME_ID = "classic";

function getTheme(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}

// === Custom Theme Support (Mirror von themes.js) ===

function extractColorsFromTheme(theme) {
  const extractHex = (borderStr) => {
    const m = String(borderStr || "").match(/#[0-9a-fA-F]{3,8}\b/);
    return m ? m[0] : "#000000";
  };
  const stampBgRaw = theme.stamp?.bg || "transparent";
  let stampBg = stampBgRaw;
  if (stampBgRaw === "transparent") {
    stampBg = theme.paper?.bg || "#ffffff";
  } else {
    const m = stampBgRaw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      const r = parseInt(m[1]).toString(16).padStart(2, "0");
      const g = parseInt(m[2]).toString(16).padStart(2, "0");
      const b = parseInt(m[3]).toString(16).padStart(2, "0");
      stampBg = `#${r}${g}${b}`;
    }
  }
  return {
    paperBg: theme.paper?.bg || "#ffffff",
    textPrimary: theme.text?.primary || "#000000",
    textAccent: theme.text?.accent || "#666666",
    textMuted: theme.text?.muted || "#999999",
    borderHeaderColor: extractHex(theme.borders?.header),
    borderStampColor: extractHex(theme.borders?.stamp),
    borderSeparatorColor: extractHex(theme.borders?.separator),
    borderFooterColor: extractHex(theme.borders?.footer),
    stampHeadingColor: theme.stamp?.headingColor || "#000000",
    stampContentColor: theme.stamp?.contentColor || "#000000",
    stampBg,
    titleColor: theme.title?.color || "#000000",
    duotoneHighlight: theme.duotone?.highlight || "#ffffff",
    duotoneShadow: theme.duotone?.shadow || "#000000",
  };
}

function buildCustomTheme(customTheme) {
  const baseTheme = getTheme(customTheme.baseTheme || DEFAULT_THEME_ID);
  const c = customTheme.colors || {};
  const replaceBorderColor = (borderStr, newHex) => {
    return String(borderStr || "").replace(/#[0-9a-fA-F]{3,8}\b/, newHex);
  };
  return {
    id: "custom",
    label: "Custom",
    paper: { bg: c.paperBg, gradient: baseTheme.paper.gradient },
    text: { primary: c.textPrimary, accent: c.textAccent, muted: c.textMuted },
    borders: {
      header: replaceBorderColor(baseTheme.borders.header, c.borderHeaderColor),
      stamp: replaceBorderColor(baseTheme.borders.stamp, c.borderStampColor),
      separator: replaceBorderColor(baseTheme.borders.separator, c.borderSeparatorColor),
      footer: replaceBorderColor(baseTheme.borders.footer, c.borderFooterColor),
    },
    stamp: {
      headingColor: c.stampHeadingColor,
      contentColor: c.stampContentColor,
      bg: c.stampBg,
    },
    title: { color: c.titleColor },
    imgFilter: baseTheme.imgFilter,
    duotone: { highlight: c.duotoneHighlight, shadow: c.duotoneShadow },
  };
}

function resolveTheme(themeId, customTheme) {
  if (themeId === "custom" && customTheme && customTheme.colors) {
    return buildCustomTheme(customTheme);
  }
  return getTheme(themeId || DEFAULT_THEME_ID);
}

// === SVG Duotone Filter (Mirror von themes.js) ===

function hexToRgb(hex) {
  const clean = String(hex || "#000000").replace("#", "").trim();
  let r, g, b;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6 || clean.length === 8) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    r = 0; g = 0; b = 0;
  }
  return {
    r: (r || 0) / 255,
    g: (g || 0) / 255,
    b: (b || 0) / 255,
  };
}

function buildDuotoneFilterSvg(filterId, highlightHex, shadowHex) {
  const hi = hexToRgb(highlightHex);
  const sh = hexToRgb(shadowHex);
  return `<filter id="${filterId}" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="
      0.2126 0.7152 0.0722 0 0
      0.2126 0.7152 0.0722 0 0
      0.2126 0.7152 0.0722 0 0
      0      0      0      1 0"/>
    <feComponentTransfer color-interpolation-filters="sRGB">
      <feFuncR type="table" tableValues="${sh.r.toFixed(4)} ${hi.r.toFixed(4)}"/>
      <feFuncG type="table" tableValues="${sh.g.toFixed(4)} ${hi.g.toFixed(4)}"/>
      <feFuncB type="table" tableValues="${sh.b.toFixed(4)} ${hi.b.toFixed(4)}"/>
    </feComponentTransfer>
  </filter>`;
}

function buildDuotoneSvgDefs(resolvedTheme) {
  const duotone = resolvedTheme.duotone || { highlight: "#ffffff", shadow: "#000000" };
  return `<svg id="duotone-svg-defs" style="position:absolute; width:0; height:0; pointer-events:none;" aria-hidden="true">
    <defs>${buildDuotoneFilterSvg("duotone-active", duotone.highlight, duotone.shadow)}</defs>
  </svg>`;
}

function buildImageFilter(resolvedTheme) {
  const parts = ["url(#duotone-active)"];
  if (resolvedTheme.imgFilter) {
    parts.push(resolvedTheme.imgFilter);
  }
  return parts.join(" ");
}

// === Decorations (MUSS mit desktop/src/main.js übereinstimmen) ===
const CORNER_ORNAMENTS = { none: "", floral: "❦", fleur: "⚜", star: "✦", skull: "☠", hammer: "⚒" };
const DIVIDER_STYLES = {
  simple: { border: "1px solid", content: "" },
  double: { border: "3px double", content: "" },
  runes: { border: "none", content: null },
  dashed: { border: "1px dashed", content: "" },
};
const DEFAULT_RUNES_TEXT = "ᚱ ᚢ ᚾ ᛁ ᚲ";

function getDefaultDecorations() {
  return { cornerOrnament: "none", cornerOrnamentSize: 20, dividerStyle: "double", dividerCustomText: DEFAULT_RUNES_TEXT, dividerFontSize: 14, dividerTextBold: false, titleShadow: false };
}

function getCornerOrnamentHtml(dec, th) {
  const sym = CORNER_ORNAMENTS[dec.cornerOrnament] || "";
  if (!sym) return "";
  const color = th.text.accent;
  const size = (dec.cornerOrnamentSize || 20) + "px";
  return `<div style="position:absolute; bottom:8px; left:8px; font-size:${size}; color:${color}; opacity:0.5; pointer-events:none;">${sym}</div><div style="position:absolute; bottom:8px; right:8px; font-size:${size}; color:${color}; opacity:0.5; pointer-events:none;">${sym}</div>`;
}

function getDividerCss(dec, th) {
  const ds = DIVIDER_STYLES[dec.dividerStyle] || DIVIDER_STYLES.simple;
  if (dec.dividerStyle === "runes") {
    const text = dec.dividerCustomText || DEFAULT_RUNES_TEXT;
    const fontSize = (dec.dividerFontSize || 14) + "px";
    const fontWeight = dec.dividerTextBold ? "bold" : "normal";
    const opacity = dec.dividerTextBold ? "0.9" : "0.75";
    return { borderBottom: "none", afterHtml: `<div style="text-align:center; color:${th.text.muted}; font-size:${fontSize}; font-weight:${fontWeight}; letter-spacing:0.3em; margin:4px 0 8px 0; opacity:${opacity};">${escapeHtml(text)}</div>` };
  }
  return { borderBottom: `${ds.border} ${th.text.muted}`, afterHtml: "" };
}

function getTitleShadowCss(dec, th) {
  if (!dec.titleShadow) return "";
  return `text-shadow: 1px 1px 0 ${th.text.muted}, 2px 2px 4px rgba(0,0,0,0.15);`;
}

// Papierformate in mm — muss mit den Frontend-Typen übereinstimmen
const PAPER_DIMENSIONS = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Tabloid: { width: 279, height: 432 },
  Broadsheet: { width: 381, height: 578 },
};

const MM_TO_PX = 3.7795275591; // 96dpi

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// === Schriftgrößen-Berechnung (MUSS mit main.js synchron sein) ===

const DEFAULT_FONT_SIZES = {
  stampHeading: 7,
  stampContent: 7,
  title: 28,
  meta: 7,
  articleHeadline: 14,
  articleSubheadline: 9,
  articleBody: 9.5,
};

const HEADLINE_SIZE_MULTIPLIER = {
  small: 0.75,
  medium: 1.0,
  large: 1.35,
  xlarge: 1.75,
};

function effectivePx(basePt, zoom) {
  return basePt * 1.333 * zoom;
}

function resolveFontSizes(settings) {
  const zoom = typeof settings.zoom === "number" ? settings.zoom : 1.0;
  if (settings.fontSizes) {
    return { ...settings.fontSizes, zoom };
  }
  if (typeof settings.fontSizePt === "number") {
    const body = settings.fontSizePt;
    return {
      stampHeading: body * 0.74,
      stampContent: body * 0.74,
      title: body * 2.95,
      meta: body * 0.74,
      articleHeadline: body * 1.47,
      articleSubheadline: body * 0.95,
      articleBody: body,
      zoom,
    };
  }
  return { ...DEFAULT_FONT_SIZES, zoom };
}

// ============================================================================
// Render-Helpers (aufgeteilt für Multi-Page-Support)
// ============================================================================

function getRenderContext(project) {
  const { settings } = project;
  const paper = PAPER_DIMENSIONS[settings.paperFormat] || PAPER_DIMENSIONS.A4;
  const widthPx = Math.round(paper.width * MM_TO_PX);
  const heightPx = Math.round(paper.height * MM_TO_PX);
  const fs = resolveFontSizes(settings);

  let titleFontFamily;
  switch (settings.titleStyle) {
    case "fraktur": titleFontFamily = "'UnifrakturMaguntia', serif"; break;
    case "blackletter": titleFontFamily = "'UnifrakturCook', 'UnifrakturMaguntia', serif"; break;
    case "serif":
    case "italic": titleFontFamily = "'EB Garamond', 'Times New Roman', Georgia, serif"; break;
    default: titleFontFamily = "'UnifrakturMaguntia', serif";
  }

  const metaPx = effectivePx(fs.meta, fs.zoom);
  return {
    paper, widthPx, heightPx, fs,
    bodyPx: effectivePx(fs.articleBody, fs.zoom),
    stampHeadingPx: effectivePx(fs.stampHeading, fs.zoom),
    stampContentPx: effectivePx(fs.stampContent, fs.zoom),
    titlePx: effectivePx(fs.title, fs.zoom),
    metaPx,
    articleHeadlineBasePx: effectivePx(fs.articleHeadline, fs.zoom),
    articleSubheadlinePx: effectivePx(fs.articleSubheadline, fs.zoom),
    footerPx: Math.max(metaPx * 0.93, effectivePx(7, fs.zoom)),
    titleFontFamily,
    titleFontStyle: settings.titleStyle === "italic" ? "italic" : "normal",
    columnCount: settings.columnCount,
  };
}

function renderCss(ctx, th) {
  th = th || getTheme(DEFAULT_THEME_ID);
  const imgFilter = buildImageFilter(th);
  return `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: 'EB Garamond', 'Times New Roman', Georgia, serif; }
  .paper {
    width: ${ctx.widthPx}px; height: ${ctx.heightPx}px;
    background: ${th.paper.bg};
    background-image: ${th.paper.gradient};
    color: ${th.text.primary}; padding: 16px 18px 18px 18px; border: 2px solid ${th.text.primary};
    display: flex; flex-direction: column; font-size: ${ctx.bodyPx}px;
    line-height: 1.35; position: relative; overflow: hidden;
  }
  .masthead { border-bottom: ${th.borders.header}; padding-bottom: 6px; margin-bottom: 8px; text-align: center; }
  .stamp-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 4px; color: ${th.text.accent}; }
  .stamp { flex: 1; text-align: left; border: ${th.borders.stamp}; padding: 3px 6px; background: ${th.stamp.bg}; }
  .stamp-h { font-size: ${ctx.stampHeadingPx}px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: ${th.borders.stamp}; margin-bottom: 2px; padding-bottom: 2px; color: ${th.stamp.headingColor}; }
  .stamp-c { font-size: ${ctx.stampContentPx}px; font-style: italic; line-height: 1.25; color: ${th.stamp.contentColor}; }
  .title { font-family: ${ctx.titleFontFamily}; font-style: ${ctx.titleFontStyle}; font-size: ${ctx.titlePx}px; font-weight: 700; line-height: 1; margin: 2px 0; letter-spacing: 0.02em; color: ${th.title.color}; }
  .meta { font-size: ${ctx.metaPx}px; font-style: italic; color: ${th.text.accent}; letter-spacing: 0.04em; }
  .columns { column-count: ${ctx.columnCount}; column-gap: 12px; column-rule: ${th.borders.separator}; column-fill: auto; flex: 1; overflow: hidden; }
  .article { margin-bottom: 12px; padding-bottom: 8px; border-bottom: ${th.borders.separator}; }
  .article.last { border-bottom: none; }
  .article-head { font-family: ${ctx.titleFontFamily}; font-style: ${ctx.titleFontStyle}; font-weight: 700; line-height: 1.1; margin: 0 0 4px 0; color: ${th.text.primary}; }
  .article-sub { font-style: italic; font-size: ${ctx.articleSubheadlinePx}px; margin: 0 0 6px 0; color: ${th.text.accent}; border-bottom: ${th.borders.separator}; padding-bottom: 4px; }
  .article-img { margin: 0 0 6px 0; border: 1px solid ${th.text.accent}; background: ${th.text.primary}; }
  .article-img img { width: 100%; display: block; filter: ${imgFilter}; }
  .article-text { font-size: ${ctx.bodyPx}px; text-align: justify; hyphens: auto; white-space: pre-wrap; color: ${th.text.primary}; }
  .footer { border-top: ${th.borders.footer}; margin-top: 6px; padding-top: 3px; font-size: ${ctx.footerPx}px; text-align: center; color: ${th.text.accent}; font-style: italic; }
  `;
}

function renderMastheadHtml(settings) {
  const meta = [settings.location, settings.date, settings.issue].filter(Boolean).join(" · ");
  return `
    <div class="masthead">
      <div class="stamp-row">
        <div class="stamp"><div class="stamp-h">${escapeHtml(settings.stampLeft.heading)}</div><div class="stamp-c">${escapeHtml(settings.stampLeft.content)}</div></div>
        <div class="stamp"><div class="stamp-h">${escapeHtml(settings.stampRight.heading)}</div><div class="stamp-c">${escapeHtml(settings.stampRight.content)}</div></div>
      </div>
      <div class="title">${escapeHtml(settings.title)}</div>
      <div class="meta">${escapeHtml(meta)}</div>
    </div>`;
}

function renderArticleHtmlWithSize(a, idx, total, ctx) {
  const img = a.imageBase64 || a.imageUrl;
  const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
  const headlinePx = ctx.articleHeadlineBasePx * mult;
  const imgHtml = img ? `<figure class="article-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(a.headline)}" /></figure>` : "";
  const subHtml = a.subheadline ? `<p class="article-sub">${escapeHtml(a.subheadline)}</p>` : "";
  const isLast = idx === total - 1;
  return `<article class="article ${isLast ? "last" : ""}"><h2 class="article-head" style="font-size:${headlinePx}px">${escapeHtml(a.headline)}</h2>${subHtml}${imgHtml}<div class="article-text">${escapeHtml(a.text)}</div></article>`;
}

function renderFooterHtml(settings, pageNumber, totalPages) {
  const suffix = totalPages > 1 ? ` ${pageNumber} / ${totalPages}` : "";
  return `<div class="footer">— ${escapeHtml(settings.title)} — ${escapeHtml(settings.issue)} —${suffix}</div>`;
}

/**
 * Rendert eine vollständige HTML-Seite für eine einzelne Zeitungs-Seite.
 * isFirstPage=true → mit Masthead, false → ohne.
 *
 * v1.3.3: Injiziert den SVG-Duotone-Filter in <body>, damit
 * `filter: url(#duotone-active)` auf Artikel-Bilder aufgelöst wird.
 */
function renderPageHtml(project, ctx, pageArticles, isFirstPage, pageNumber, totalPages) {
  const { settings } = project;
  const th = resolveTheme(settings.theme, settings.customTheme);
  const dec = settings.decorations || getDefaultDecorations();
  const masthead = isFirstPage ? renderMastheadHtml(settings) : "";
  const footer = renderFooterHtml(settings, pageNumber, totalPages);
  const cornerHtml = getCornerOrnamentHtml(dec, th);
  const shadowCss = getTitleShadowCss(dec, th);
  const svgDefs = buildDuotoneSvgDefs(th);

  // Artikel-HTML mit Divider-Stil + Titel-Schatten auf Headlines
  const articlesHtml = pageArticles.map((a, i) => {
    const div = getDividerCss(dec, th);
    const isLast = i === pageArticles.length - 1;
    const img = a.imageBase64 || a.imageUrl;
    const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
    const headlinePx = ctx.articleHeadlineBasePx * mult;
    const imgHtml = img ? `<figure class="article-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(a.headline)}" /></figure>` : "";
    const subHtml = a.subheadline ? `<p class="article-sub">${escapeHtml(a.subheadline)}</p>` : "";
    return `<article class="article ${isLast ? "last" : ""}" style="border-bottom:${isLast ? "none" : div.borderBottom};"><h2 class="article-head" style="font-size:${headlinePx}px; ${shadowCss}">${escapeHtml(a.headline)}</h2>${subHtml}${imgHtml}<div class="article-text">${escapeHtml(a.text)}</div></article>${isLast ? "" : div.afterHtml}`;
  }).join("");

  // CSS mit Decorations
  const css = renderCss(ctx, th);
  const titleShadowCss = dec.titleShadow ? `.title { ${shadowCss} }` : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(settings.title)} — Page ${pageNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>${css}
${titleShadowCss}
</style>
</head>
<body>
  ${svgDefs}
  <div class="paper" id="paper">
    ${cornerHtml}
    ${masthead}
    <div class="columns">${articlesHtml}</div>
    ${footer}
  </div>
</body>
</html>`;
}

/**
 * Rendert eine Mess-Seite, die alle Artikel in versteckten Divs enthält
 * mit derselben Spaltbreite wie im echten Layout. Wird genutzt, um die
 * Höhen der Elemente via page.evaluate() zu messen.
 *
 * v1.3.3: Injiziert ebenfalls den SVG-Duotone-Filter, damit die Bild-Höhen
 * identisch sind (Filter ändern keine Dimensionen, aber defensive Sicherheit).
 */
function renderMeasurementHtml(project, ctx) {
  const { settings, articles } = project;
  const sidePadding = 18;
  const columnGap = 12;
  const contentWidth = ctx.widthPx - 2 * sidePadding;
  const columnWidth = (contentWidth - (ctx.columnCount - 1) * columnGap) / ctx.columnCount;

  const articlesHtml = articles
    .map((a, i) => renderArticleHtmlWithSize(a, i, articles.length, ctx))
    .join("");
  const masthead = renderMastheadHtml(settings);
  const footer = renderFooterHtml(settings);
  const th = resolveTheme(settings.theme, settings.customTheme);

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Measurement</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>
  ${renderCss(ctx, th)}
  body { background: #fff; }
  .measure-container { position: absolute; visibility: hidden; left: -9999px; top: 0; }
  .measure-masthead { width: ${contentWidth}px; }
  .measure-footer { width: ${contentWidth}px; }
  .measure-column { width: ${columnWidth}px; }
</style>
</head>
<body>
  ${buildDuotoneSvgDefs(th)}
  <div class="measure-container">
    <div class="measure-masthead">${masthead}</div>
    <div class="measure-footer">${footer}</div>
    <div class="measure-column" id="measure-articles">${articlesHtml}</div>
  </div>
</body>
</html>`;
}

/**
 * Pagination-Algorithmus (gleiche Logik wie in main.js computePages).
 * Bekommt die gemessenen Höhen und berechnet, welche Artikel auf welche Seite kommen.
 */
function paginateArticles(articles, articleHeights, mastheadHeight, footerHeight, columnCount, paperHeightPx) {
  const paddingPx = 16;
  const page1ContentHeight = paperHeightPx - mastheadHeight - footerHeight - 2 * paddingPx;
  const pageNContentHeight = paperHeightPx - footerHeight - 2 * paddingPx;

  const pages = [];
  let currentPage = [];
  let currentColumn = 0;
  let currentColumnUsed = 0;
  let currentPageHeight = page1ContentHeight;

  for (let i = 0; i < articles.length; i++) {
    const h = articleHeights[i];

    if (currentColumnUsed + h > currentPageHeight && currentColumnUsed > 0) {
      currentColumn++;
      currentColumnUsed = 0;
      if (currentColumn >= columnCount) {
        pages.push(currentPage);
        currentPage = [];
        currentColumn = 0;
        currentPageHeight = pageNContentHeight;
      }
    }
    currentPage.push(articles[i]);
    currentColumnUsed += h;
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Findet eine Browser-Engine für den Export.
 */
async function findBrowserEngine() {
  const isWindows = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const playwrightCachePaths = isWindows
    ? [path.join(process.env.LOCALAPPDATA || "", "ms-playwright")]
    : isMac
      ? [path.join(process.env.HOME || "", "Library/Caches/ms-playwright")]
      : [path.join(process.env.HOME || "", ".cache/ms-playwright")];

  // 1. Explizit gesetzte Umgebungsvariable für WebKit
  const envWebKit = process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH;
  if (envWebKit && fs.existsSync(envWebKit)) {
    return { engine: "webkit", executablePath: envWebKit };
  }

  // 2. Playwright-Cache nach WebKit durchsuchen
  for (const cacheDir of playwrightCachePaths) {
    if (!fs.existsSync(cacheDir)) continue;
    try {
      const entries = fs.readdirSync(cacheDir);
      for (const entry of entries) {
        if (!entry.startsWith("webkit")) continue;
        const subDir = path.join(cacheDir, entry);
        if (!fs.statSync(subDir).isDirectory()) continue;
        const binPath = isWindows
          ? path.join(subDir, "webkit-win64", "Playwright.exe")
          : isMac
            ? path.join(subDir, "webkit-mac-14", "Playwright.app", "Contents", "MacOS", "Playwright")
            : path.join(subDir, "webkit-linux", "minibrowser-gtk");
        if (fs.existsSync(binPath)) {
          console.error(`[playwright-export] WebKit gefunden: ${binPath}`);
          return { engine: "webkit", executablePath: binPath };
        }
      }
    } catch (_) {}
  }

  // 3. webkit.executablePath() versuchen
  try {
    const exe = webkit.executablePath();
    if (exe && fs.existsSync(exe)) {
      console.error(`[playwright-export] WebKit (via webkit.executablePath): ${exe}`);
      return { engine: "webkit", executablePath: exe };
    }
  } catch (_) {}

  // 4. Fallback: Chromium (falls WebKit nicht installiert ist)
  console.error("[playwright-export] WebKit nicht gefunden, falle auf Chromium zurück.");
  console.error("[playwright-export] HINWEIS: Für bestmögliche Übereinstimmung von Vorschau und Export");
  console.error("[playwright-export] installiere WebKit: npx playwright install webkit");

  const envChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (envChromium && fs.existsSync(envChromium)) {
    return { engine: "chromium", executablePath: envChromium };
  }

  for (const cacheDir of playwrightCachePaths) {
    if (!fs.existsSync(cacheDir)) continue;
    try {
      const entries = fs.readdirSync(cacheDir);
      for (const entry of entries) {
        if (!entry.startsWith("chromium")) continue;
        const subDir = path.join(cacheDir, entry);
        if (!fs.statSync(subDir).isDirectory()) continue;
        const binPath = isWindows
          ? path.join(subDir, "chrome-win", "chrome.exe")
          : isMac
            ? path.join(subDir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium")
            : path.join(subDir, "chrome-linux", "chrome");
        if (fs.existsSync(binPath)) {
          return { engine: "chromium", executablePath: binPath };
        }
      }
    } catch (_) {}
  }

  const systemChromePaths = isWindows
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : isMac
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
      : [
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/microsoft-edge",
        ];

  for (const p of systemChromePaths) {
    if (fs.existsSync(p) && !fs.statSync(p).isDirectory()) {
      return { engine: "chromium", executablePath: p };
    }
  }

  try {
    const exe = chromium.executablePath();
    if (exe && fs.existsSync(exe)) {
      return { engine: "chromium", executablePath: exe };
    }
  } catch (_) {}

  const hints = [
    "Keine Browser-Engine gefunden. Optionen:",
    "  EMPFOHLEN: npx playwright install webkit  (für bestmögliche Übereinstimmung mit der Vorschau)",
    "  Alternativ: npx playwright install chromium",
    isWindows
      ? "  Oder: Installiere Google Chrome oder Microsoft Edge"
      : isMac
        ? "  Oder: Installiere Google Chrome nach /Applications"
        : "  Oder: Installiere chromium via apt/brew/pacman",
  ].join("\n");
  throw new Error(hints);
}

async function main() {
  const [projectPath, outPath, modeArg, compressionArg] = process.argv.slice(2);

  if (!projectPath || !outPath) {
    console.error("Usage: node export.js <project.json> <output-prefix> [png|pdf] [lossless|high|medium|low]");
    process.exit(2);
  }

  const mode = modeArg || "png";
  const compression = compressionArg || "high";

  const projectRaw = fs.readFileSync(projectPath, "utf-8");
  const project = JSON.parse(projectRaw);

  if (!project.settings || !Array.isArray(project.articles)) {
    throw new Error("Ungültiges Projekt-Format: settings oder articles fehlen");
  }

  const { engine, executablePath } = await findBrowserEngine();
  console.error(`[playwright-export] Using engine: ${engine}, binary: ${executablePath}`);

  const browserEngine = engine === "webkit" ? webkit : chromium;
  const launchOptions = { executablePath, headless: true };
  if (engine === "chromium") {
    launchOptions.args = [
      "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
      "--disable-gpu", "--font-render-hinting=none",
    ];
  }

  const browser = await browserEngine.launch(launchOptions);

  try {
    const ctx = getRenderContext(project);
    console.error(`[playwright-export] Paper: ${ctx.widthPx}×${ctx.heightPx}px, ${ctx.columnCount} columns`);
    console.error(`[playwright-export] Theme: ${project.settings.theme}${project.settings.customTheme ? " (custom)" : ""}`);

    const measurePage = await browser.newPage();

    const borderWidth = 2;
    const paddingVertical = 16 + 18 + 2 * borderWidth;
    const paddingHorizontal = 18 + borderWidth;
    const columnGap = 12;
    const mastheadMarginBottom = 8;
    const footerMarginTop = 6;
    const footerPaddingTop = 3;
    const safetyMargin = 25 * (ctx.fs.zoom || 1.0);

    const contentWidth = ctx.widthPx - 2 * paddingHorizontal;

    const mastheadHtml = renderMastheadHtml(project.settings);
    const footerHtml = renderFooterHtml(project.settings, 0, 1);
    const allArticlesHtml = project.articles
      .map((a, i) => renderArticleHtmlWithSize(a, i, project.articles.length, ctx))
      .join("");

    const th = resolveTheme(project.settings.theme, project.settings.customTheme);
    const measureHtml = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>
  ${renderCss(ctx, th)}
  .measure-simple { position: absolute; visibility: hidden; left: -9999px; top: 0; box-sizing: border-box; width: ${contentWidth}px; font-family: 'EB Garamond', 'Times New Roman', Georgia, serif; font-size: ${ctx.bodyPx}px; line-height: 1.35; }
  .measure-cols { position: absolute; visibility: hidden; left: -9999px; top: 0; box-sizing: border-box; width: ${contentWidth}px; column-count: ${ctx.columnCount}; column-gap: ${columnGap}px; column-rule: ${th.borders.separator}; font-family: 'EB Garamond', 'Times New Roman', Georgia, serif; font-size: ${ctx.bodyPx}px; line-height: 1.35; }
</style>
</head>
<body>
  ${buildDuotoneSvgDefs(th)}
  <div class="measure-simple" id="m-masthead">${mastheadHtml}</div>
  <div class="measure-simple" id="m-footer">${footerHtml}</div>
  <div class="measure-cols" id="m-articles">${allArticlesHtml}</div>
</body>
</html>`;

    await measurePage.setContent(measureHtml, { waitUntil: "domcontentloaded", timeout: 60000 });
    await measurePage.evaluate(() => document.fonts.ready);
    await waitForImages(measurePage);

    const measurements = await measurePage.evaluate(() => {
      const masthead = document.querySelector("#m-masthead .masthead");
      const footer = document.querySelector("#m-footer .footer");
      return {
        mastheadHeight: masthead ? masthead.offsetHeight + 8 : 0,
        footerHeight: footer ? footer.offsetHeight + 9 : 0,
      };
    });
    console.error(`[playwright-export] Measured: masthead=${measurements.mastheadHeight}px, footer=${measurements.footerHeight}px`);

    const page1Height = ctx.heightPx - paddingVertical - measurements.mastheadHeight - measurements.footerHeight - safetyMargin;
    const pageNHeight = ctx.heightPx - paddingVertical - measurements.footerHeight - safetyMargin;

    const pages = [];
    let remaining = [...project.articles];
    let pageNum = 1;

    while (remaining.length > 0) {
      const isFirstPage = pages.length === 0;
      const availableHeight = isFirstPage ? page1Height : pageNHeight;

      let lo = 1, hi = remaining.length, bestFit = 1;

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const testArticles = remaining.slice(0, mid);
        const testHtml = testArticles
          .map((a, i) => renderArticleHtmlWithSize(a, i, testArticles.length, ctx))
          .join("");

        const testHeight = await measurePage.evaluate((html) => {
          document.getElementById("m-articles").innerHTML = html;
          return document.getElementById("m-articles").offsetHeight;
        }, testHtml);

        if (testHeight <= availableHeight) {
          bestFit = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      pages.push(remaining.slice(0, bestFit));
      remaining = remaining.slice(bestFit);
      pageNum++;
      if (pageNum > 20) break;
    }

    await measurePage.close();
    console.error(`[playwright-export] Pagination: ${pages.length} page(s)`);

    const pngPaths = [];
    const tempDir = require("os").tmpdir();

    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const pageHtml = renderPageHtml(project, ctx, pages[i], i === 0, pageNum, pages.length);
      const renderPage = await browser.newPage();
      await renderPage.setContent(pageHtml, { waitUntil: "networkidle", timeout: 60000 });
      await renderPage.evaluate(() => document.fonts.ready);
      await waitForImages(renderPage);
      await renderPage.setViewportSize({ width: ctx.widthPx, height: ctx.heightPx });

      let pngPath;
      if (mode === "pdf") {
        pngPath = require("path").join(tempDir, `newspaper-page-${pageNum}-${Date.now()}.png`);
      } else {
        const base = outPath.replace(/\.png$/i, "");
        pngPath = pages.length === 1 ? `${base}.png` : `${base}-${pageNum}.png`;
      }

      await renderPage.screenshot({
        path: pngPath,
        type: "png",
        clip: { x: 0, y: 0, width: ctx.widthPx, height: ctx.heightPx },
        omitBackground: false,
      });
      await renderPage.close();
      pngPaths.push(pngPath);
      console.error(`[playwright-export] Page ${pageNum}/${pages.length} → ${pngPath}`);
    }

    if (mode === "pdf") {
      const pdfPath = outPath.replace(/\.pdf$/i, "") + ".pdf";
      await combinePngsToPdf(pngPaths, pdfPath, compression, ctx);
      console.error(`[playwright-export] PDF written to ${pdfPath} (${compression})`);
      for (const p of pngPaths) {
        try { fs.unlinkSync(p); } catch (_) {}
      }
      console.log(JSON.stringify({ pages: pages.length, files: [pdfPath] }));
    } else {
      console.log(JSON.stringify({ pages: pages.length, files: pngPaths }));
    }
  } finally {
    await browser.close();
  }
}

async function waitForImages(page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => { img.onload = res; img.onerror = res; })
      )
    );
  });
}

async function combinePngsToPdf(pngPaths, pdfPath, compression, ctx) {
  const { PDFDocument } = require("pdf-lib");
  const pdfDoc = await PDFDocument.create();

  const MM_TO_PT = 2.8346456693;
  const paper = ctx.paper;
  const widthPt = paper.width * MM_TO_PT;
  const heightPt = paper.height * MM_TO_PT;

  let jpegQuality = 0.9;
  let useJpeg = true;
  switch (compression) {
    case "lossless": useJpeg = false; break;
    case "high": jpegQuality = 0.9; break;
    case "medium": jpegQuality = 0.7; break;
    case "low": jpegQuality = 0.5; break;
    default: jpegQuality = 0.9;
  }

  for (const pngPath of pngPaths) {
    const pngBytes = fs.readFileSync(pngPath);
    let image;
    if (useJpeg) {
      image = await pdfDoc.embedPng(pngBytes);
    } else {
      image = await pdfDoc.embedPng(pngBytes);
    }
    const page = pdfDoc.addPage([widthPt, heightPt]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
}

main().catch((err) => {
  console.error("[playwright-export] FATAL:", err);
  process.exit(1);
});
