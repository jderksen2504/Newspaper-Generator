// ============================================================================
// Themes — Newspaper Look & Feel
// ============================================================================
//
// Jedes Theme definiert Farben, Border-Stile und optionale dekorative
// Elemente. Die Layout-Struktur (Spalten, Pagination, Schriftgrößen) bleibt
// identisch — Themes ändern nur das visuelle Erscheinungsbild.
//
// NEU in v1.3.3:
//   - Jedes Theme hat ein `duotone: { highlight, shadow }` Feld für die
//     Bild-Tönung (SVG-Filter ersetzt das alte CSS-grayscale).
//   - `customTheme` erlaubt dem User, alle Farben frei anzupassen. Die
//     Border-Stile (width/style) werden vom `baseTheme` übernommen, nur
//     die Farben werden überschrieben.
//
// Usage:
//   import { getTheme, getThemeList, resolveTheme } from "./themes.js";
//   const theme = getTheme("dark-gazette");
//   theme.paper.bg     → "#2a2018"
//   theme.text.primary → "#e8dcc0"
//   theme.duotone      → { highlight: "#e8dcc0", shadow: "#2a2018" }
//
//   // Custom Theme auflösen:
//   const th = resolveTheme(settings.theme, settings.customTheme);
// ============================================================================

export const THEMES = {
  "classic": {
    id: "classic",
    label: "Classic Parchment",
    paper: {
      bg: "#f5ecd7",
      gradient: "radial-gradient(ellipse at top, rgba(140,100,40,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(80,50,10,0.08), transparent 70%)",
    },
    text: { primary: "#1a1208", accent: "#3a2a14", muted: "#5a3e1c" },
    borders: {
      header: "3px double #1a1208",
      stamp: "1px solid #3a2a14",
      separator: "1px solid #5a3e1c",
      footer: "1px solid #1a1208",
    },
    stamp: { headingColor: "#3a2a14", contentColor: "#3a2a14", bg: "#f5ecd7" },
    title: { color: "#1a1208" },
    imgFilter: "contrast(1.1) brightness(0.95)",
    duotone: { highlight: "#f5ecd7", shadow: "#1a1208" },
    decorative: "",
  },

  "dark-gazette": {
    id: "dark-gazette",
    label: "Dark Gazette",
    paper: {
      bg: "#2a2018",
      gradient: "radial-gradient(ellipse at top, rgba(201,168,76,0.08), transparent 60%), radial-gradient(ellipse at bottom, rgba(139,115,50,0.06), transparent 70%)",
    },
    text: { primary: "#e8dcc0", accent: "#c9a84c", muted: "#8b7332" },
    borders: {
      header: "3px double #c9a84c",
      stamp: "1px solid #c9a84c",
      separator: "1px solid #8b7332",
      footer: "1px solid #c9a84c",
    },
    stamp: { headingColor: "#c9a84c", contentColor: "#e8dcc0", bg: "#2a2018" },
    title: { color: "#c9a84c" },
    imgFilter: "contrast(1.15) brightness(0.85)",
    // Dunkles Theme: highlight = helle Textfarbe, shadow = dunkler Papier-Ton
    // (Bild bleibt sichtbar auf dunklem Papier)
    duotone: { highlight: "#e8dcc0", shadow: "#2a2018" },
    decorative: "",
  },

  "royal-court": {
    id: "royal-court",
    label: "Royal Court",
    paper: {
      bg: "#f8f0db",
      gradient: "radial-gradient(ellipse at top, rgba(139,26,26,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(201,168,76,0.08), transparent 70%)",
    },
    text: { primary: "#1a1208", accent: "#8b1a1a", muted: "#c9a84c" },
    borders: {
      header: "3px solid #8b1a1a",
      stamp: "2px solid #8b1a1a",
      separator: "2px solid #c9a84c",
      footer: "1px solid #8b1a1a",
    },
    stamp: { headingColor: "#8b1a1a", contentColor: "#3a2a14", bg: "#f8f0db" },
    title: { color: "#8b1a1a" },
    imgFilter: "contrast(1.1) brightness(0.95)",
    duotone: { highlight: "#f8f0db", shadow: "#3a2a14" },
    decorative: "",
  },

  "elven-scroll": {
    id: "elven-scroll",
    label: "Elven Scroll",
    paper: {
      bg: "#f0f5e8",
      gradient: "radial-gradient(ellipse at top, rgba(58,90,58,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(138,154,138,0.08), transparent 70%)",
    },
    text: { primary: "#1a2e1a", accent: "#3a5a3a", muted: "#8a9a8a" },
    borders: {
      header: "2px solid #8a9a8a",
      stamp: "1px solid #8a9a8a",
      separator: "1px solid #8a9a8a",
      footer: "1px solid #8a9a8a",
    },
    stamp: { headingColor: "#3a5a3a", contentColor: "#1a2e1a", bg: "#f0f5e8" },
    title: { color: "#1a2e1a" },
    imgFilter: "contrast(1.05) brightness(1.0)",
    duotone: { highlight: "#f0f5e8", shadow: "#1a2e1a" },
    decorative: "",
  },

  "dwarven-forge": {
    id: "dwarven-forge",
    label: "Dwarven Forge",
    paper: {
      bg: "#d0ccc4",
      gradient: "radial-gradient(ellipse at top, rgba(184,115,51,0.08), transparent 60%), radial-gradient(ellipse at bottom, rgba(139,90,43,0.06), transparent 70%)",
    },
    text: { primary: "#1a1a1a", accent: "#b87333", muted: "#8b5a2b" },
    borders: {
      header: "4px solid #b87333",
      stamp: "3px solid #8b5a2b",
      separator: "2px solid #8b5a2b",
      footer: "2px solid #b87333",
    },
    stamp: { headingColor: "#b87333", contentColor: "#1a1a1a", bg: "#d0ccc4" },
    title: { color: "#1a1a1a" },
    imgFilter: "contrast(1.2) brightness(0.9)",
    duotone: { highlight: "#d0ccc4", shadow: "#1a1a1a" },
    decorative: "",
  },

  "necromancer": {
    id: "necromancer",
    label: "Necromancer's Tome",
    paper: {
      bg: "#1a1520",
      gradient: "radial-gradient(ellipse at top, rgba(106,58,106,0.12), transparent 60%), radial-gradient(ellipse at bottom, rgba(154,154,154,0.04), transparent 70%)",
    },
    text: { primary: "#7a9a6a", accent: "#9a9a9a", muted: "#6a3a6a" },
    borders: {
      header: "2px solid #6a3a6a",
      stamp: "1px solid #6a3a6a",
      separator: "1px dashed #6a3a6a",
      footer: "1px solid #6a3a6a",
    },
    stamp: { headingColor: "#9a9a9a", contentColor: "#7a9a6a", bg: "#1a1520" },
    title: { color: "#9a9a9a" },
    imgFilter: "contrast(1.1) brightness(0.85)",
    // Dunkles Theme: highlight = heller Text, shadow = Papier-Ton
    duotone: { highlight: "#9a9a9a", shadow: "#1a1520" },
    decorative: "",
  },
};

const DEFAULT_THEME = "classic";

/**
 * Liefert das Theme-Objekt für eine Theme-ID.
 * Fallback auf "classic" falls unbekannt.
 */
export function getTheme(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME];
}

/**
 * Liefert eine Liste aller Themes für das Dropdown.
 * "Custom" wird nur angezeigt, wenn settings.theme === "custom".
 */
export function getThemeList() {
  return Object.values(THEMES).map(t => ({ id: t.id, label: t.label }));
}

// ============================================================================
// Custom Theme Support
// ============================================================================
//
// Ein Custom Theme speichert 14 Farb-Hex-Werte. Die Border-Stile (width/style)
// und der paper.gradient werden vom `baseTheme` übernommen. Beim Anpassen
// einer Farbe wird theme="custom" gesetzt und customTheme.colors gespeichert.
//
// Schema:
//   customTheme: {
//     baseTheme: "elven-scroll",  // für border-style + gradient
//     colors: {
//       paperBg, textPrimary, textAccent, textMuted,
//       borderHeaderColor, borderStampColor, borderSeparatorColor, borderFooterColor,
//       stampHeadingColor, stampContentColor, stampBg,
//       titleColor, duotoneHighlight, duotoneShadow
//     }
//   }

/**
 * Extrahiert die 14 Farben aus einem Theme-Objekt als flat Object.
 * Wird verwendet, um customTheme.colors aus einem Preset zu initialisieren.
 *
 * Border-Strings wie "3px double #1a1208" werden in nur den Hex-Wert
 * aufgespalten. Beim Auflösen wird der Style aus dem baseTheme übernommen.
 */
export function extractColorsFromTheme(theme) {
  const extractHex = (borderStr) => {
    // "3px double #1a1208" → "#1a1208"
    const m = String(borderStr || "").match(/#[0-9a-fA-F]{3,8}\b/);
    return m ? m[0] : "#000000";
  };
  // stamp.bg kann "transparent" oder "rgba(...)" sein → auf hex normalisieren
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

/**
 * Baut ein vollständiges Theme-Objekt aus einer Theme-ID (Preset) oder
 * einem customTheme-Objekt (falls theme === "custom").
 *
 * @param {string} themeId - "classic", "dark-gazette", ..., oder "custom"
 * @param {object} [customTheme] - { baseTheme, colors } oder undefined
 * @returns {object} vollständiges Theme-Objekt
 */
export function resolveTheme(themeId, customTheme) {
  if (themeId === "custom" && customTheme && customTheme.colors) {
    return buildCustomTheme(customTheme);
  }
  return getTheme(themeId || DEFAULT_THEME);
}

/**
 * Baut ein Theme-Objekt aus einem customTheme.
 * Übernimmt border-style/width und gradient vom baseTheme, ersetzt die Farben.
 */
function buildCustomTheme(customTheme) {
  const baseTheme = getTheme(customTheme.baseTheme || DEFAULT_THEME);
  const c = customTheme.colors;

  // Border-Style aus baseTheme, Farbe aus customTheme
  // "3px double #1a1208" → "3px double #customhex"
  const replaceBorderColor = (borderStr, newHex) => {
    return String(borderStr || "").replace(/#[0-9a-fA-F]{3,8}\b/, newHex);
  };

  return {
    id: "custom",
    label: "Custom",
    paper: {
      bg: c.paperBg,
      // Gradient vom baseTheme, aber mit paperBg als Hintergrund
      gradient: baseTheme.paper.gradient,
    },
    text: {
      primary: c.textPrimary,
      accent: c.textAccent,
      muted: c.textMuted,
    },
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
    decorative: baseTheme.decorative || "",
  };
}

/**
 * Erzeugt eine customTheme-Snapshot von einem Preset.
 * Wird aufgerufen, wenn der User das erste Mal eine Farbe im Theme-Customizer
 * verändert (und theme noch auf einem Preset steht).
 */
export function createCustomThemeFromPreset(themeId) {
  const preset = getTheme(themeId || DEFAULT_THEME);
  return {
    baseTheme: preset.id,
    colors: extractColorsFromTheme(preset),
  };
}

// ============================================================================
// SVG Duotone Filter
// ============================================================================
//
// Erzeugt den SVG-<filter>-String für den Duotone-Effekt eines Themes.
// Wird im Preview-Container einmal injiziert (id="duotone-svg-defs") und via
// CSS `filter: url(#duotone-{id})` auf Artikel-Bilder angewendet.
//
// Funktionsweise:
//   1. feColorMatrix: konvertiert RGB in Luminanz (Graustufen)
//   2. feComponentTransfer: mappt Luminanz [0..1] auf den Bereich
//      [shadow.RGB .. highlight.RGB] pro Kanal linear
//
// Ergebnis: dunkle Bildpixel werden zur shadow-Farbe, helle zur highlight-
// Farbe. Genau das "Helldunkel aus Theme-Farben", das der User wollte.

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

/**
 * Erzeugt den SVG-Filter-String für ein einzelnes Theme.
 *
 * @param {string} filterId - DOM-ID für den Filter (z.B. "duotone-classic")
 * @param {string} highlightHex - Hex-Farbe für helle Bildbereiche
 * @param {string} shadowHex - Hex-Farbe für dunkle Bildbereiche
 * @returns {string} SVG <filter>-Element als String
 */
export function buildDuotoneFilterSvg(filterId, highlightHex, shadowHex) {
  const hi = hexToRgb(highlightHex);
  const sh = hexToRgb(shadowHex);
  // tableValues: 2 Werte = lineare Interpolation zwischen shadow (Luminanz 0)
  // und highlight (Luminanz 1) für jeden RGB-Kanal.
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

/**
 * Erzeugt ein komplettes <svg> mit allen Theme-Filtern.
 * Wird in renderPreview() einmal am Anfang des Preview-Containers injiziert.
 *
 * @param {object} resolvedTheme - das aufgelöste Theme (preset oder custom)
 * @returns {string} <svg>-Element mit <filter>-Kindern
 */
export function buildDuotoneSvgDefs(resolvedTheme) {
  const filterId = "duotone-active";
  const duotone = resolvedTheme.duotone || { highlight: "#ffffff", shadow: "#000000" };
  return `<svg id="duotone-svg-defs" style="position:absolute; width:0; height:0; pointer-events:none;" aria-hidden="true">
    <defs>${buildDuotoneFilterSvg(filterId, duotone.highlight, duotone.shadow)}</defs>
  </svg>`;
}

/**
 * Liefert den CSS filter-String für Artikel-Bilder.
 * Kombiniert den Duotone-SVG-Filter mit dem theme.eigenen imgFilter
 * (für Kontrast/Helligkeits-Tuning).
 */
export function buildImageFilter(resolvedTheme) {
  const parts = ["url(#duotone-active)"];
  if (resolvedTheme.imgFilter) {
    parts.push(resolvedTheme.imgFilter);
  }
  return parts.join(" ");
}
