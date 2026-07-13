// ============================================================================
// i18n — Internationalisierung für die Tauri-App
// ============================================================================
//
// Unterstützt: Deutsch (de), Englisch (en)
// Default: de (falls nichts im localStorage gespeichert ist)
//
// Usage:
//   import { t, setLang, getLang } from "./i18n.js";
//   const text = t("settings.title");        // → "Titel" oder "Title"
//   setLang("en");                            // Sprache wechseln
//
// Strings werden über einen Dot-Notation-Pfad angesprochen:
//   t("toolbar.save")  →  translations[lang].toolbar.save
// ============================================================================

const translations = {
  de: {
    toolbar: {
      load: "Laden",
      save: "Sichern",
      pngExport: "PNG Export",
      pdfExport: "PDF Export",
      pdfCompression: "PDF-Kompression",
      compressionLossless: "Verlustfrei",
      compressionHigh: "Hohe Qualität",
      compressionMedium: "Mittel",
      compressionLow: "Niedrig",
    },
    preview: {
      title: "Vorschau",
      hint: "Live-Render — exakt wie der PNG-Export",
    },
    settings: {
      masthead: "Zeitungskopf",
      title: "Titel",
      date: "Datum",
      location: "Ort",
      issue: "Ausgabe",
      stampLeft: "Stempel Links",
      stampRight: "Stempel Rechts",
      stampHeading: "Überschrift",
      stampContent: "Inhalt",
      titleStyle: "Titelstil",
      fontSize: "Schriftgröße",
      globalZoom: "Globaler Zoom",
      resetZoom: "Zurücksetzen",
      advancedPerZone: "Erweitert (pro Zone)",
      stampHeadingLabel: "Stempel-Überschrift",
      stampContentLabel: "Stempel-Text",
      titleLabel: "Zeitungstitel",
      metaLabel: "Datum / Ort / Ausgabe",
      articleHeadlineLabel: "Artikel-Headline (Basis)",
      articleSubheadlineLabel: "Artikel-Subheadline",
      articleTextLabel: "Artikel-Text",
      resetFontSizes: "Schriftgrößen zurücksetzen",
      paperFormat: "Papierformat",
      format: "Format",
      advanced: "Erweitert",
      columnCount: "Spaltenanzahl (Standard: 3)",
      resetColumns: "Auf Standard zurücksetzen",
      resetAll: "Alle Einstellungen zurücksetzen",
    },
    articles: {
      title: "Artikel",
      add: "Artikel hinzufügen",
      headline: "Headline",
      subheadline: "Subheadline",
      text: "Text",
      image: "Bild",
      imageUrl: "Bild-URL (alternativ)",
      headlineSize: "Headline-Größe",
      uploadImage: "Bild hochladen",
      removeImage: "Bild entfernen",
      headlinePlaceholder: "Artikel-Überschrift",
      subheadlinePlaceholder: "Untertitel / Dachzeile",
      textPlaceholder: "Artikeltext…",
      newArticle: "Neuer Artikel",
      noTitle: "(ohne Titel)",
      moveUp: "Nach oben",
      moveDown: "Nach unten",
      delete: "Löschen",
    },
    headlineSizes: {
      small: "Klein",
      medium: "Mittel",
      large: "Groß",
      xlarge: "Sehr groß",
    },
    titleStyles: {
      fraktur: "Fraktur (UnifrakturMaguntia)",
      blackletter: "Blackletter (UnifrakturCook)",
      serif: "Serif (EB Garamond)",
      italic: "Italic (EB Garamond Italic)",
    },
    paperFormats: {
      A5: "A5 — Klein (148 × 210 mm)",
      A4: "A4 — Standard (210 × 297 mm)",
      A3: "A3 — Groß (297 × 420 mm)",
      Letter: "Letter — US (216 × 279 mm)",
      Tabloid: "Tabloid — US (279 × 432 mm)",
      Broadsheet: "Broadsheet — Historical (381 × 578 mm)",
    },
    page: {
      page: "Seite",
      of: "/",
      pageBreak: "— Seitenumbruch —",
    },
    numberInput: {
      decrease: "Verkleinern",
      increase: "Vergrößern",
    },
    toasts: {
      pngExported: "PNG exportiert: ",
      pngExportFailed: "PNG-Export fehlgeschlagen: ",
      pdfExported: "PDF exportiert: ",
      pdfExportFailed: "PDF-Export fehlgeschlagen: ",
      projectSaved: "Projekt gespeichert: ",
      saveFailed: "Speichern fehlgeschlagen: ",
      projectLoaded: "Projekt geladen: ",
      loadFailed: "Laden fehlgeschlagen: ",
    },
    decorations: {
      title: "Verzierungen",
      cornerOrnament: "Eck-Ornamente (unten)",
      none: "Keine",
      ornFloral: "Floral",
      ornFleur: "Fleur-de-lis",
      ornStar: "Stern",
      ornSkull: "Totenkopf",
      ornHammer: "Hammer",
      ornamentSize: "Ornament-Größe",
      dividerStyle: "Trennlinien-Stil",
      divSimple: "Einfach",
      divDouble: "Doppelt",
      divRunes: "Runen / Text",
      divDashed: "Gestrichelt",
      dividerText: "Trennlinien-Text",
      dividerFontSize: "Text-Größe",
      dividerTextBold: "Text fett",
      random: "Zufällig",
      reset: "Zurücksetzen",
      titleShadow: "Titel-Schatten",
      yes: "Ja",
      no: "Nein",
    },
    themeCustomizer: {
      title: "Theme anpassen",
      custom: "Custom",
      resetToPreset: "Auf Theme zurücksetzen",
      paperBg: "Papier-Hintergrund",
      textPrimary: "Text (primär)",
      textAccent: "Text (Akzent)",
      textMuted: "Text (gedimmt)",
      borderHeader: "Rand (Kopfzeile)",
      borderStamp: "Rand (Stempel)",
      borderSeparator: "Rand (Trenner)",
      borderFooter: "Rand (Fußzeile)",
      stampHeadingColor: "Stempel-Überschrift",
      stampContentColor: "Stempel-Text",
      stampBg: "Stempel-Hintergrund",
      titleColor: "Titel-Farbe",
      duotoneHighlight: "Bild-Tönung (hell)",
      duotoneShadow: "Bild-Tönung (dunkel)",
      duotoneHint: "Bestimmt die Hell-Dunkel-Tönung der Artikel-Bilder. 'Hell' = hellste Bildbereiche, 'Dunkel' = dunkelste Bildbereiche.",
    },
    language: {
      label: "Sprache",
    },
  },

  en: {
    toolbar: {
      load: "Load",
      save: "Save",
      pngExport: "PNG Export",
      pdfExport: "PDF Export",
      pdfCompression: "PDF Compression",
      compressionLossless: "Lossless",
      compressionHigh: "High Quality",
      compressionMedium: "Medium",
      compressionLow: "Low",
    },
    preview: {
      title: "Preview",
      hint: "Live render — exactly like the PNG export",
    },
    settings: {
      masthead: "Newspaper Header",
      title: "Title",
      date: "Date",
      location: "Location",
      issue: "Issue",
      stampLeft: "Stamp Left",
      stampRight: "Stamp Right",
      stampHeading: "Heading",
      stampContent: "Content",
      titleStyle: "Title Style",
      fontSize: "Font Size",
      globalZoom: "Global Zoom",
      resetZoom: "Reset",
      advancedPerZone: "Advanced (per zone)",
      stampHeadingLabel: "Stamp Heading",
      stampContentLabel: "Stamp Text",
      titleLabel: "Newspaper Title",
      metaLabel: "Date / Location / Issue",
      articleHeadlineLabel: "Article Headline (base)",
      articleSubheadlineLabel: "Article Subheadline",
      articleTextLabel: "Article Text",
      resetFontSizes: "Reset font sizes",
      paperFormat: "Paper Format",
      format: "Format",
      advanced: "Advanced",
      columnCount: "Column count (default: 3)",
      resetColumns: "Reset to default",
      resetAll: "Reset all settings",
    },
    articles: {
      title: "Articles",
      add: "Add article",
      headline: "Headline",
      subheadline: "Subheadline",
      text: "Text",
      image: "Image",
      imageUrl: "Image URL (alternative)",
      headlineSize: "Headline size",
      uploadImage: "Upload image",
      removeImage: "Remove image",
      headlinePlaceholder: "Article headline",
      subheadlinePlaceholder: "Subtitle / kicker",
      textPlaceholder: "Article text…",
      newArticle: "New article",
      noTitle: "(untitled)",
      moveUp: "Move up",
      moveDown: "Move down",
      delete: "Delete",
    },
    headlineSizes: {
      small: "Small",
      medium: "Medium",
      large: "Large",
      xlarge: "Extra large",
    },
    titleStyles: {
      fraktur: "Fraktur (UnifrakturMaguntia)",
      blackletter: "Blackletter (UnifrakturCook)",
      serif: "Serif (EB Garamond)",
      italic: "Italic (EB Garamond Italic)",
    },
    paperFormats: {
      A5: "A5 — Small (148 × 210 mm)",
      A4: "A4 — Standard (210 × 297 mm)",
      A3: "A3 — Large (297 × 420 mm)",
      Letter: "Letter — US (216 × 279 mm)",
      Tabloid: "Tabloid — US (279 × 432 mm)",
      Broadsheet: "Broadsheet — Historical (381 × 578 mm)",
    },
    page: {
      page: "Page",
      of: "/",
      pageBreak: "— Page break —",
    },
    numberInput: {
      decrease: "Decrease",
      increase: "Increase",
    },
    toasts: {
      pngExported: "PNG exported: ",
      pngExportFailed: "PNG export failed: ",
      pdfExported: "PDF exported: ",
      pdfExportFailed: "PDF export failed: ",
      projectSaved: "Project saved: ",
      saveFailed: "Save failed: ",
      projectLoaded: "Project loaded: ",
      loadFailed: "Load failed: ",
    },
    decorations: {
      title: "Decorations",
      cornerOrnament: "Corner Ornaments (bottom)",
      none: "None",
      ornFloral: "Floral",
      ornFleur: "Fleur-de-lis",
      ornStar: "Star",
      ornSkull: "Skull",
      ornHammer: "Hammer",
      ornamentSize: "Ornament Size",
      dividerStyle: "Divider Style",
      divSimple: "Simple",
      divDouble: "Double",
      divRunes: "Runes / Text",
      divDashed: "Dashed",
      dividerText: "Divider Text",
      dividerFontSize: "Text Size",
      dividerTextBold: "Bold text",
      random: "Random",
      reset: "Reset",
      titleShadow: "Title Shadow",
      yes: "Yes",
      no: "No",
    },
    themeCustomizer: {
      title: "Customize Theme",
      custom: "Custom",
      resetToPreset: "Reset to theme",
      paperBg: "Paper Background",
      textPrimary: "Text (Primary)",
      textAccent: "Text (Accent)",
      textMuted: "Text (Muted)",
      borderHeader: "Border (Header)",
      borderStamp: "Border (Stamp)",
      borderSeparator: "Border (Separator)",
      borderFooter: "Border (Footer)",
      stampHeadingColor: "Stamp Heading",
      stampContentColor: "Stamp Content",
      stampBg: "Stamp Background",
      titleColor: "Title Color",
      duotoneHighlight: "Image Tint (Highlight)",
      duotoneShadow: "Image Tint (Shadow)",
      duotoneHint: "Controls the light-dark tint of article images. 'Highlight' = lightest image areas, 'Shadow' = darkest image areas.",
    },
    language: {
      label: "Language",
    },
  },
};

const STORAGE_KEY = "newspaper-generator-language";
let currentLang = "de";

/**
 * Initialisiert die Sprache aus localStorage oder Browsersprache.
 */
export function initLang() {
  // 1. localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) {
      currentLang = saved;
      return;
    }
  } catch (_) {
    // localStorage nicht verfügbar
  }

  // 2. Browsersprache
  const browserLang = (navigator.language || "de").slice(0, 2).toLowerCase();
  if (translations[browserLang]) {
    currentLang = browserLang;
  }
}

/**
 * Gibt die aktuelle Sprache zurück.
 */
export function getLang() {
  return currentLang;
}

/**
 * Setzt die Sprache und speichert sie im localStorage.
 */
export function setLang(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {
    // ignore
  }
}

/**
 * Holt einen übersetzten String per Dot-Notation-Pfad.
 * Fallback auf Deutsch, dann auf den Pfad selbst.
 *
 *   t("toolbar.save")  →  "Sichern" / "Save"
 *   t("nonexistent")   →  "nonexistent"
 */
export function t(path) {
  const parts = path.split(".");
  let cur = translations[currentLang];
  for (const p of parts) {
    if (cur == null) break;
    cur = cur[p];
  }
  if (cur != null) return cur;

  // Fallback auf Deutsch
  cur = translations.de;
  for (const p of parts) {
    if (cur == null) break;
    cur = cur[p];
  }
  return cur != null ? cur : path;
}
