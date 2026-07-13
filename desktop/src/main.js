// ============================================================================
// Newspaper Generator — Tauri Frontend Logic
// Vanilla JS — kommuniziert mit dem Rust-Backend über Tauri invoke()
// ============================================================================

import { t, setLang, getLang, initLang } from "./i18n.js";
import { getThemeList, resolveTheme, createCustomThemeFromPreset, extractColorsFromTheme, buildDuotoneSvgDefs, buildImageFilter } from "./themes.js";
// (getLang wird in init() für das Sprach-Dropdown genutzt)

// Tauri 2.0 API. Wir verwenden window.__TAURI__, das automatisch von Tauri
// injected wird, wenn `app.withGlobalTauri: true` in tauri.conf.json gesetzt
// ist. Dadurch brauchen wir das npm-Package `@tauri-apps/api` nicht und Vite
// muss nichts zur Build-Zeit auflösen.
//
// Im Dev-Modus (vite dev ohne Tauri-Wrapper) ist window.__TAURI__ undefined —
// in diesem Fall liefern wir einen Mock, der Fehlermeldungen wirft, damit man
// sieht, dass man die App via `npm run tauri dev` statt `npm run dev` starten
// muss, um die Backend-Funktionen zu nutzen.

function getInvoke() {
  if (typeof window === "undefined" || !window.__TAURI__) {
    throw new Error(
      "Tauri API nicht verfügbar. Starte die App mit `npm run tauri dev` " +
      "(nicht `npm run dev`), damit das Rust-Backend läuft."
    );
  }
  return window.__TAURI__.core.invoke;
}

// ============================================================================
// Types / Defaults
// ============================================================================

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

function migrateSettings(s) {
  const base = { ...DEFAULT_SETTINGS, ...s };
  if (!s.fontSizes) {
    if (typeof s.fontSizePt === "number") {
      const body = s.fontSizePt;
      base.fontSizes = {
        stampHeading: body * 0.74,
        stampContent: body * 0.74,
        title: body * 2.95,
        meta: body * 0.74,
        articleHeadline: body * 1.47,
        articleSubheadline: body * 0.95,
        articleBody: body,
      };
    } else {
      base.fontSizes = { ...DEFAULT_FONT_SIZES };
    }
  }
  if (typeof base.zoom !== "number") base.zoom = 1.0;
  if (typeof base.theme !== "string") base.theme = "classic";
  if (!base.decorations || typeof base.decorations !== "object") {
    base.decorations = {
      cornerOrnament: "none",
      cornerOrnamentSize: 20,
      dividerStyle: "double",
      dividerCustomText: "ᚱ ᚢ ᚾ ᛁ ᚲ",
      dividerFontSize: 14,
      dividerTextBold: false,
      titleShadow: false,
    };
  }
  if (base.decorations.roundedCorners !== undefined) delete base.decorations.roundedCorners;
  if (base.decorations.backgroundPattern !== undefined) delete base.decorations.backgroundPattern;
  if (typeof base.decorations.cornerOrnamentSize !== "number") base.decorations.cornerOrnamentSize = 20;
  if (typeof base.decorations.dividerCustomText !== "string") base.decorations.dividerCustomText = "ᚱ ᚢ ᚾ ᛁ ᚲ";
  if (typeof base.decorations.dividerFontSize !== "number") base.decorations.dividerFontSize = 14;
  if (typeof base.decorations.dividerTextBold !== "boolean") base.decorations.dividerTextBold = false;
  if (base.decorations.dividerStyle === "dots") base.decorations.dividerStyle = "double";
  return base;
}

const DEFAULT_SETTINGS = {
  title: "The Iron Herald",
  date: "October 14, 1893",
  location: "Greyhaven",
  issue: "Vol. 3 No. 10",
  stampLeft: {
    heading: "DAILY REPORT",
    content: "Der Stadtrat tagte über neue Verordnungen zur Dampfmaschinen-Regulierung im Hafenviertel.",
  },
  stampRight: {
    heading: "WEATHER NOTICE",
    content: "Morgens bewölkt, nachmittags vereinzelt Regenschauer. Temperaturen um 12 Grad.",
  },
  fontSizes: { ...DEFAULT_FONT_SIZES },
  zoom: 1.0,
  titleStyle: "fraktur",
  paperFormat: "A4",
  columnCount: 3,
  theme: "classic",
  decorations: {
    cornerOrnament: "none",
    cornerOrnamentSize: 20,
    dividerStyle: "double",
    dividerCustomText: "ᚱ ᚢ ᚾ ᛁ ᚲ",
    dividerFontSize: 14,
    dividerTextBold: false,
    titleShadow: false,
  },
  customTheme: null,
};

const DEFAULT_ARTICLES = [
  {
    id: "art-1",
    headline: "Neue Dampfmaschine Erreicht Ungeahnte Leistung",
    subheadline: "Industrielles Wunder der Technik soll die Produktion im Hafen verdoppeln",
    text:
      'In den frühen Morgenstunden des vergangenen Dienstags wurde die neueste Errungenschaft der Greyhavener Maschinenbauanstalt feierlich enthüllt. Die sogenannte "Ironclad Mk. III", ein monumentales Dampfgerät von unvorstellbaren Ausmaßen, nahm ihren Betrieb auf. Ingenieur William Ashford, der leitende Konstrukteur, sprach von einer "neuen Ära der industriellen Befreiung".\n\nDie Maschine, die über einen Zeitraum von vierzehn Monaten von einem Team aus zwölf Handwerkern errichtet wurde, soll in der Lage sein, die Produktionskapazität der Hafenwerften binnen Jahresfrist zu verdoppeln. Erste Probetests verliefen vielversprechend, wenn auch nicht ohne Zwischenfälle: Am dritten Tag der Inbetriebnahme barst ein Hilfsventil und verletzte zwei Arbeiter leicht.\n\nDer Stadtrat hat bereits eine Kommission eingesetzt, um die Sicherheit weiterer Anlagen zu prüfen. Kritiker aus den Reihen der Handwerksgilde warnen derweil vor einer "Entwertung menschlicher Arbeit" – ein Argument, das Ashford als "rückschrittlich" zurückweist.',
    imageUrl: null,
    imageBase64: null,
    headlineSize: "large",
  },
  {
    id: "art-2",
    headline: "Marktberichte",
    subheadline: "Getreidepreise steigen, Eisen fällt",
    text:
      "Die Handelsberichte der vergangenen Woche zeigen ein gemischtes Bild. Während Getreidepreise um vierzehn Prozent stiegen, verzeichnete Eisen einen leichten Rückgang von drei Prozent.\n\nStahl bleibt stabil, Händler rechnen jedoch mit Schwankungen im kommenden Monat. Die Krämergilde empfiehlt, Vorräte zeitig aufzufüllen.",
    imageUrl: null,
    imageBase64: null,
    headlineSize: "medium",
  },
  {
    id: "art-3",
    headline: "Grubenunglück Fordert Sieben Leben",
    subheadline: "Dachsturz in Schacht 12 der Northern Depths Mine",
    text:
      "Ein schweres Grubenunglück ereignete sich am Vorabend im Norden der Grafschaft. Bei einem Dachsturz in Schacht 12 der Northern Depths Mine wurden sieben Bergleute verschüttet. Die Rettungsarbeiten dauern an, doch die Hoffnung, Überlebende zu finden, schwindet mit jeder Stunde.\n\nDie Untersuchungskommission hat ihre Arbeit aufgenommen. Erste Hinweise deuten auf mangelhafte Stützpfeiler hin. Der Grubenvorstand äußerte sich betroffen und kündigte eine umfassende Überprüfung aller Schächte an.",
    imageUrl: null,
    imageBase64: null,
    headlineSize: "large",
  },
];

const PAPER_DIMENSIONS = {
  A5: { width: 148, height: 210, label: "A5 — Klein (148 × 210 mm)" },
  A4: { width: 210, height: 297, label: "A4 — Standard (210 × 297 mm)" },
  A3: { width: 297, height: 420, label: "A3 — Groß (297 × 420 mm)" },
  Letter: { width: 216, height: 279, label: "Letter — US (216 × 279 mm)" },
  Tabloid: { width: 279, height: 432, label: "Tabloid — US (279 × 432 mm)" },
  Broadsheet: { width: 381, height: 578, label: "Broadsheet — Historical (381 × 578 mm)" },
};

// Millimeter → Pixel bei 96 dpi (1mm = 3.7795... px)
// MUSS mit export.js und der Web-App (newspaper-preview.tsx) übereinstimmen.
const MM_TO_PX = 3.7795275591;

// ============================================================================
// State
// ============================================================================

let state = {
  settings: { ...DEFAULT_SETTINGS },
  articles: DEFAULT_ARTICLES.map((a) => ({ ...a })),
  expandedArticleId: null,
};

function uid() {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// LocalStorage Auto-Save (zusätzlich zur JSON-Datei)
// ============================================================================

const LS_KEY = "newspaper-generator-project";

function autoSave() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ settings: state.settings, articles: state.articles }));
  } catch (e) {
    console.warn("Auto-save fehlgeschlagen:", e);
  }
}

function autoLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.settings) state.settings = migrateSettings(parsed.settings);
    if (Array.isArray(parsed.articles) && parsed.articles.length) state.articles = parsed.articles;
  } catch (e) {
    console.warn("Auto-load fehlgeschlagen:", e);
  }
}

// ============================================================================
// Rendering
// ============================================================================

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSettings() {
  const s = state.settings;
  const el = document.getElementById("settings-panel");

  // Expand-States speichern vor Re-Render
  const expandStates = {
    fontsizes: false,
    advanced: false,
    decorations: false,
    runes: false,
    themecustomizer: false,
  };
  const fsPanel = document.getElementById("fontsizes-panel");
  if (fsPanel) expandStates.fontsizes = fsPanel.style.display !== "none";
  const advPanel = document.getElementById("advanced-panel");
  if (advPanel) expandStates.advanced = advPanel.style.display !== "none";
  const decPanel = document.getElementById("decorations-panel");
  if (decPanel) expandStates.decorations = decPanel.style.display !== "none";
  const runesPanel = document.getElementById("runes-config");
  if (runesPanel) expandStates.runes = runesPanel.style.display !== "none";
  const tcPanel = document.getElementById("themecustomizer-panel");
  if (tcPanel) expandStates.themecustomizer = tcPanel.style.display !== "none";

  const paperOptions = Object.entries(PAPER_DIMENSIONS)
    .map(([k, v]) => `<option value="${k}" ${k === s.paperFormat ? "selected" : ""}>${t("paperFormats." + k)}</option>`)
    .join("");

  const titleStyleOptions = [
    { v: "fraktur" },
    { v: "blackletter" },
    { v: "serif" },
    { v: "italic" },
  ]
    .map((o) => `<option value="${o.v}" ${o.v === s.titleStyle ? "selected" : ""}>${t("titleStyles." + o.v)}</option>`)
    .join("");

  const themeOptions = getThemeList()
    .map((th) => `<option value="${th.id}" ${th.id === s.theme ? "selected" : ""}>${th.label}</option>`)
    .join("");

  // Custom-Theme-Option nur anzeigen, wenn theme === "custom"
  const customOption = s.theme === "custom"
    ? `<option value="custom" selected>${t("themeCustomizer.custom")}</option>`
    : "";

  // Aktuell aufgelöstes Theme (preset oder custom) — für die Color-Picker-Vorschau
  const resolvedTheme = resolveTheme(s.theme, s.customTheme);
  const themeColors = s.theme === "custom" && s.customTheme
    ? s.customTheme.colors
    : extractColorsFromTheme(resolvedTheme);

  // Color-Picker für das Theme-Customizer-Panel
  const renderColorInput = (path, label, hexValue) => {
    return `
      <div class="field" style="margin-bottom:6px;">
        <label style="font-size:11px; color:var(--text-muted);">${label}</label>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="color" data-theme-color="${path}" value="${escapeHtml(hexValue)}" style="width:32px; height:28px; padding:0; border:1px solid var(--border-amber); background:none; cursor:pointer; border-radius:4px;" />
          <input type="text" data-theme-color-text="${path}" value="${escapeHtml(hexValue)}" style="flex:1; padding:4px 6px; border:1px solid var(--border-amber); background:var(--bg-input); color:var(--text-primary); border-radius:4px; font-family:monospace; font-size:11px;" />
        </div>
      </div>
    `;
  };

  el.innerHTML = `
    <div class="block">
      <h2>${t("settings.masthead")}</h2>
      <div class="field">
        <label>${t("settings.title")}</label>
        <input type="text" data-bind="title" value="${escapeHtml(s.title)}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>${t("settings.date")}</label>
          <input type="text" data-bind="date" value="${escapeHtml(s.date)}" />
        </div>
        <div class="field">
          <label>${t("settings.location")}</label>
          <input type="text" data-bind="location" value="${escapeHtml(s.location)}" />
        </div>
      </div>
      <div class="field">
        <label>${t("settings.issue")}</label>
        <input type="text" data-bind="issue" value="${escapeHtml(s.issue)}" />
      </div>

      <div class="subsection">
        <div class="subsection-title">${t("settings.stampLeft")}</div>
        <div class="field">
          <label>${t("settings.stampHeading")}</label>
          <input type="text" data-bind="stampLeft.heading" value="${escapeHtml(s.stampLeft.heading)}" />
        </div>
        <div class="field">
          <label>${t("settings.stampContent")}</label>
          <textarea data-bind="stampLeft.content" rows="2">${escapeHtml(s.stampLeft.content)}</textarea>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-title">${t("settings.stampRight")}</div>
        <div class="field">
          <label>${t("settings.stampHeading")}</label>
          <input type="text" data-bind="stampRight.heading" value="${escapeHtml(s.stampRight.heading)}" />
        </div>
        <div class="field">
          <label>${t("settings.stampContent")}</label>
          <textarea data-bind="stampRight.content" rows="2">${escapeHtml(s.stampRight.content)}</textarea>
        </div>
      </div>

      <div class="subsection">
        <div class="field">
          <label>${t("settings.titleStyle")}</label>
          <select data-bind="titleStyle">${titleStyleOptions}</select>
        </div>
        <div class="field">
          <label>Theme</label>
          <select data-bind="theme">${customOption}${themeOptions}</select>
        </div>
      </div>

      <button class="collapsible-trigger" id="themecustomizer-trigger">${expandStates.themecustomizer ? "▾" : "▸"} ${t("themeCustomizer.title")}</button>
      <div id="themecustomizer-panel" style="display:${expandStates.themecustomizer ? "block" : "none"}; margin-top:8px; padding:8px; border:1px solid var(--border-amber); border-radius:6px; background:rgba(28,25,23,0.4);">
        ${renderColorInput("paperBg", t("themeCustomizer.paperBg"), themeColors.paperBg)}
        ${renderColorInput("textPrimary", t("themeCustomizer.textPrimary"), themeColors.textPrimary)}
        ${renderColorInput("textAccent", t("themeCustomizer.textAccent"), themeColors.textAccent)}
        ${renderColorInput("textMuted", t("themeCustomizer.textMuted"), themeColors.textMuted)}
        ${renderColorInput("titleColor", t("themeCustomizer.titleColor"), themeColors.titleColor)}
        ${renderColorInput("borderHeaderColor", t("themeCustomizer.borderHeader"), themeColors.borderHeaderColor)}
        ${renderColorInput("borderStampColor", t("themeCustomizer.borderStamp"), themeColors.borderStampColor)}
        ${renderColorInput("borderSeparatorColor", t("themeCustomizer.borderSeparator"), themeColors.borderSeparatorColor)}
        ${renderColorInput("borderFooterColor", t("themeCustomizer.borderFooter"), themeColors.borderFooterColor)}
        ${renderColorInput("stampHeadingColor", t("themeCustomizer.stampHeadingColor"), themeColors.stampHeadingColor)}
        ${renderColorInput("stampContentColor", t("themeCustomizer.stampContentColor"), themeColors.stampContentColor)}
        ${renderColorInput("stampBg", t("themeCustomizer.stampBg"), themeColors.stampBg)}
        ${renderColorInput("duotoneHighlight", t("themeCustomizer.duotoneHighlight"), themeColors.duotoneHighlight)}
        ${renderColorInput("duotoneShadow", t("themeCustomizer.duotoneShadow"), themeColors.duotoneShadow)}
        <div style="font-size:10px; color:var(--text-muted); margin:6px 0 8px 0; line-height:1.4;">${t("themeCustomizer.duotoneHint")}</div>
        <button class="link-btn" id="reset-theme-colors" style="font-size:11px; border:1px solid var(--border-amber); padding:4px 8px; border-radius:4px; width:100%; text-align:center;">${t("themeCustomizer.resetToPreset")}</button>
      </div>

      <button class="collapsible-trigger" id="decorations-trigger">${expandStates.decorations ? "▾" : "▸"} ${t("decorations.title")}</button>
      <div id="decorations-panel" style="display:${expandStates.decorations ? "block" : "none"}; margin-top:8px;">
        <div class="field">
          <label>${t("decorations.cornerOrnament")}</label>
          <select data-bind="decorations.cornerOrnament">
            <option value="none" ${s.decorations?.cornerOrnament === "none" ? "selected" : ""}>${t("decorations.none")}</option>
            <option value="floral" ${s.decorations?.cornerOrnament === "floral" ? "selected" : ""}>❦ ${t("decorations.ornFloral")}</option>
            <option value="fleur" ${s.decorations?.cornerOrnament === "fleur" ? "selected" : ""}>⚜ ${t("decorations.ornFleur")}</option>
            <option value="star" ${s.decorations?.cornerOrnament === "star" ? "selected" : ""}>✦ ${t("decorations.ornStar")}</option>
            <option value="skull" ${s.decorations?.cornerOrnament === "skull" ? "selected" : ""}>☠ ${t("decorations.ornSkull")}</option>
            <option value="hammer" ${s.decorations?.cornerOrnament === "hammer" ? "selected" : ""}>⚒ ${t("decorations.ornHammer")}</option>
          </select>
        </div>
        ${renderNumberInput("decorations.cornerOrnamentSize", s.decorations?.cornerOrnamentSize ?? 20, 8, 60, 1, 0, "px", false, t("decorations.ornamentSize"))}
        <div class="field">
          <label>${t("decorations.dividerStyle")}</label>
          <select data-bind="decorations.dividerStyle" id="divider-style-select">
            <option value="simple" ${s.decorations?.dividerStyle === "simple" ? "selected" : ""}>${t("decorations.divSimple")}</option>
            <option value="double" ${s.decorations?.dividerStyle === "double" ? "selected" : ""}>${t("decorations.divDouble")}</option>
            <option value="runes" ${s.decorations?.dividerStyle === "runes" ? "selected" : ""}>${t("decorations.divRunes")}</option>
            <option value="dashed" ${s.decorations?.dividerStyle === "dashed" ? "selected" : ""}>${t("decorations.divDashed")}</option>
          </select>
        </div>
        <div id="runes-config" style="display:${s.decorations?.dividerStyle === "runes" ? "block" : "none"}; margin-bottom:8px;">
          <div class="field">
            <label>${t("decorations.dividerText")}</label>
            <input type="text" data-bind="decorations.dividerCustomText" value="${escapeHtml(s.decorations?.dividerCustomText ?? "ᚱ ᚢ ᚾ ᛁ ᚲ")}" />
          </div>
          ${renderNumberInput("decorations.dividerFontSize", s.decorations?.dividerFontSize ?? 14, 6, 40, 1, 0, "px", false, t("decorations.dividerFontSize"))}
          <div class="field" style="display:flex; align-items:center; gap:8px;">
            <label style="margin:0; font-size:12px; flex:1;">${t("decorations.dividerTextBold")}</label>
            <select data-bind="decorations.dividerTextBold" style="width:auto;">
              <option value="false" ${!s.decorations?.dividerTextBold ? "selected" : ""}>${t("decorations.no")}</option>
              <option value="true" ${s.decorations?.dividerTextBold ? "selected" : ""}>${t("decorations.yes")}</option>
            </select>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="link-btn" id="runes-random" style="flex:1; text-align:center; border:1px solid var(--border-amber); padding:4px 8px; border-radius:4px;">${t("decorations.random")}</button>
            <button class="link-btn" id="runes-reset" style="flex:1; text-align:center; border:1px solid var(--border-amber); padding:4px 8px; border-radius:4px;">${t("decorations.reset")}</button>
          </div>
        </div>
        <div class="field">
          <label>${t("decorations.titleShadow")}</label>
          <select data-bind="decorations.titleShadow">
            <option value="false" ${!s.decorations?.titleShadow ? "selected" : ""}>${t("decorations.no")}</option>
            <option value="true" ${s.decorations?.titleShadow ? "selected" : ""}>${t("decorations.yes")}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="block">
      <h2>${t("settings.fontSize")}</h2>
      <div class="field">
        <label>${t("settings.globalZoom")}</label>
        ${renderNumberInput("zoom", s.zoom, 0.5, 2.0, 0.05, 2, "%", true)}
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:4px;">
          <span>50%</span>
          <button class="link-btn" id="reset-zoom" style="font-size:10px;">${t("settings.resetZoom")}</button>
          <span>200%</span>
        </div>
      </div>

      <button class="collapsible-trigger" id="fontsizes-trigger">${expandStates.fontsizes ? "▾" : "▸"} ${t("settings.advancedPerZone")}</button>
      <div id="fontsizes-panel" style="display:${expandStates.fontsizes ? "block" : "none"}; margin-top:8px;">
        ${renderNumberInput("fontSizes.stampHeading", s.fontSizes.stampHeading, 4, 16, 0.5, 1, "pt", false, t("settings.stampHeadingLabel"))}
        ${renderNumberInput("fontSizes.stampContent", s.fontSizes.stampContent, 4, 16, 0.5, 1, "pt", false, t("settings.stampContentLabel"))}
        ${renderNumberInput("fontSizes.title", s.fontSizes.title, 12, 60, 1, 1, "pt", false, t("settings.titleLabel"))}
        ${renderNumberInput("fontSizes.meta", s.fontSizes.meta, 4, 16, 0.5, 1, "pt", false, t("settings.metaLabel"))}
        ${renderNumberInput("fontSizes.articleHeadline", s.fontSizes.articleHeadline, 8, 36, 0.5, 1, "pt", false, t("settings.articleHeadlineLabel"))}
        ${renderNumberInput("fontSizes.articleSubheadline", s.fontSizes.articleSubheadline, 6, 18, 0.5, 1, "pt", false, t("settings.articleSubheadlineLabel"))}
        ${renderNumberInput("fontSizes.articleBody", s.fontSizes.articleBody, 5, 20, 0.5, 1, "pt", false, t("settings.articleTextLabel"))}
        <button class="link-btn" id="reset-fontsizes" style="margin-top:8px;">${t("settings.resetFontSizes")}</button>
      </div>
    </div>

    <div class="block">
      <h2>${t("settings.paperFormat")}</h2>
      <div class="field">
        <label>${t("settings.format")}</label>
        <select data-bind="paperFormat">${paperOptions}</select>
      </div>
      <button class="collapsible-trigger" id="advanced-trigger">${expandStates.advanced ? "▾" : "▸"} ${t("settings.advanced")}</button>
      <div id="advanced-panel" style="display:${expandStates.advanced ? "block" : "none"}; margin-top:8px;">
        <div class="field">
          <label>${t("settings.columnCount")}</label>
          ${renderNumberInput("columnCount", s.columnCount, 2, 6, 1, 0, "", false)}
        </div>
        <button class="link-btn" id="reset-columns">${t("settings.resetColumns")}</button>
      </div>
    </div>

    <button class="link-btn" id="reset-all">${t("settings.resetAll")}</button>
  `;

  // Bind all inputs (text fields, selects, textarea)
  el.querySelectorAll("[data-bind]").forEach((input) => {
    const path = input.dataset.bind;
    // Handhabung je nach Input-Typ
    if (input.classList.contains("number-input-field")) {
      // NumberInput: Texteingabe mit Validierung beim Blur und Enter
      const commitValue = () => {
        // Lese vom Wrapper die Konfiguration
        const wrapper = input.closest(".number-input-wrapper");
        if (!wrapper) return;
        const min = parseFloat(wrapper.dataset.min);
        const max = parseFloat(wrapper.dataset.max);
        const step = parseFloat(wrapper.dataset.step);
        const decimals = parseInt(wrapper.dataset.decimals) || 0;
        const isPercent = wrapper.dataset.percent === "1";

        // Parse Eingabe: Komma → Punkt, nur Ziffern/Punkt/Minus
        const cleaned = input.value.replace(",", ".").replace(/[^\d.\-]/g, "");
        let parsed = parseFloat(cleaned);
        if (isNaN(parsed)) {
          // Reset auf aktuellen State-Wert
          parsed = getByPath(state.settings, path);
        } else if (isPercent) {
          parsed = parsed / 100;
        }
        // Clamp auf min/max
        const clamped = Math.max(min, Math.min(max, parsed));
        // Setze im State
        const finalValue = path === "columnCount" ? Math.round(clamped) : clamped;
        setByPath(state.settings, path, finalValue);
        // Update Anzeige
        input.value = isPercent
          ? Math.round(finalValue * 100)
          : finalValue.toFixed(decimals);
        autoSave();
        renderPreview();
      };
      // Bei Enter oder Blur: Wert committen
      input.addEventListener("blur", commitValue);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitValue();
          input.blur();
        }
      });
      // Bei Tippen: nichts tun (nur bei Enter/Blur committen)
    } else {
      // Normale Inputs (Titel, Datum, etc.) und Selects
      const eventType = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(eventType, () => {
        let value = input.value;
        // columnCount wird als int gespeichert
        if (path === "columnCount") value = parseInt(value);
        // Decorations: Boolean-Felder konvertieren
        if (path === "decorations.titleShadow" || path === "decorations.roundedCorners" || path === "decorations.dividerTextBold") {
          value = value === "true";
        }
        setByPath(state.settings, path, value);
        autoSave();
        // Theme-Wechsel: Color-Picker-Werte müssen aktualisiert werden.
        // renderSettings() erhält die Expand-States, so dass offene Panels offen bleiben.
        if (path === "theme") {
          renderSettings();
        }
        renderPreview();
      });
    }
  });

  // NumberInput +/− Buttons
  el.querySelectorAll(".number-input-wrapper").forEach((wrapper) => {
    const path = wrapper.dataset.path;
    const min = parseFloat(wrapper.dataset.min);
    const max = parseFloat(wrapper.dataset.max);
    const step = parseFloat(wrapper.dataset.step);
    const decimals = parseInt(wrapper.dataset.decimals) || 0;
    const isPercent = wrapper.dataset.percent === "1";

    const input = wrapper.querySelector(".number-input-field");
    const incBtn = wrapper.querySelector(".number-input-increment");
    const decBtn = wrapper.querySelector(".number-input-decrement");

    const applyDelta = (delta) => {
      const current = getByPath(state.settings, path);
      let next = current + delta;
      // Auf decimals runden, sonst float-precision-Fehler
      next = parseFloat(next.toFixed(decimals + 4));
      next = Math.max(min, Math.min(max, next));
      const finalValue = path === "columnCount" ? Math.round(next) : next;
      setByPath(state.settings, path, finalValue);
      // Update Anzeige
      input.value = isPercent
        ? Math.round(finalValue * 100)
        : finalValue.toFixed(decimals);
      autoSave();
      renderPreview();
    };

    if (incBtn) incBtn.addEventListener("click", () => applyDelta(step));
    if (decBtn) decBtn.addEventListener("click", () => applyDelta(-step));
  });

  // Zoom Reset
  const resetZoom = document.getElementById("reset-zoom");
  if (resetZoom) resetZoom.addEventListener("click", () => {
    state.settings.zoom = 1.0;
    autoSave();
    renderSettings();
    renderPreview();
  });

  // Font-Sizes-Panel auf/zuklappen
  const fsTrigger = document.getElementById("fontsizes-trigger");
  if (fsTrigger) fsTrigger.addEventListener("click", (e) => {
    const panel = document.getElementById("fontsizes-panel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    e.target.textContent = isHidden ? "▾ " + t("settings.advancedPerZone") : "▸ " + t("settings.advancedPerZone");
  });

  // Decorations-Panel auf/zuklappen
  const decTrigger = document.getElementById("decorations-trigger");
  if (decTrigger) decTrigger.addEventListener("click", (e) => {
    const panel = document.getElementById("decorations-panel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    e.target.textContent = isHidden ? "▾ " + t("decorations.title") : "▸ " + t("decorations.title");
  });

  // Theme-Customizer-Panel auf/zuklappen
  const tcTrigger = document.getElementById("themecustomizer-trigger");
  if (tcTrigger) tcTrigger.addEventListener("click", (e) => {
    const panel = document.getElementById("themecustomizer-panel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    e.target.textContent = isHidden ? "▾ " + t("themeCustomizer.title") : "▸ " + t("themeCustomizer.title");
  });

  // Theme-Customizer Color-Picker + Hex-Text-Eingaben
  // Bei Änderung: theme="custom" setzen (falls noch nicht), customTheme.colors aktualisieren, Preview re-render
  const handleThemeColorChange = (path, value) => {
    // Hex-Validierung: 3 oder 6 hex digits, mit optionalem #
    const cleaned = String(value || "").trim();
    const m = cleaned.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!m) return;
    const hex = cleaned.startsWith("#") ? cleaned : "#" + cleaned;

    // Falls theme noch auf einem Preset steht: snapshot in customTheme
    if (state.settings.theme !== "custom" || !state.settings.customTheme) {
      state.settings.customTheme = createCustomThemeFromPreset(state.settings.theme || "classic");
      state.settings.theme = "custom";
    }
    state.settings.customTheme.colors[path] = hex;
    autoSave();

    // Color-Picker und Text-Input synchronisieren (ohne vollständigen Re-Render,
    // damit der User die Expand-States behält)
    const colorInput = document.querySelector(`input[data-theme-color="${path}"]`);
    const textInput = document.querySelector(`input[data-theme-color-text="${path}"]`);
    if (colorInput) colorInput.value = hex;
    if (textInput) textInput.value = hex;

    // Theme-Dropdown auf "custom" aktualisieren
    const themeSelect = document.querySelector('select[data-bind="theme"]');
    if (themeSelect && themeSelect.value !== "custom") {
      // Füge Custom-Option hinzu, falls noch nicht vorhanden
      if (!themeSelect.querySelector('option[value="custom"]')) {
        const opt = document.createElement("option");
        opt.value = "custom";
        opt.textContent = t("themeCustomizer.custom");
        themeSelect.insertBefore(opt, themeSelect.firstChild);
      }
      themeSelect.value = "custom";
    }

    renderPreview();
  };

  el.querySelectorAll('input[data-theme-color]').forEach((input) => {
    input.addEventListener("input", (e) => {
      handleThemeColorChange(e.target.dataset.themeColor, e.target.value);
    });
  });
  el.querySelectorAll('input[data-theme-color-text]').forEach((input) => {
    input.addEventListener("change", (e) => {
      handleThemeColorChange(e.target.dataset.themeColorText, e.target.value);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleThemeColorChange(e.target.dataset.themeColorText, e.target.value);
        e.target.blur();
      }
    });
  });

  // Reset-Button: customTheme löschen, auf Classic-Preset zurücksetzen
  const resetThemeBtn = document.getElementById("reset-theme-colors");
  if (resetThemeBtn) resetThemeBtn.addEventListener("click", () => {
    state.settings.customTheme = null;
    // Auf Classic zurücksetzen (oder auf das zuletzt gewählte Preset, falls customTheme.baseTheme vorhanden)
    state.settings.theme = "classic";
    autoSave();
    renderSettings();
    renderPreview();
  });

  // Runen-Config ein/ausblenden je nach Trennlinien-Stil
  const dividerSelect = document.getElementById("divider-style-select");
  if (dividerSelect) dividerSelect.addEventListener("change", (e) => {
    const runesConfig = document.getElementById("runes-config");
    if (runesConfig) runesConfig.style.display = e.target.value === "runes" ? "block" : "none";
  });
  // Runen: Zufällig — nur renderPreview, nicht renderSettings (erhält Expand-States)
  const runesRandom = document.getElementById("runes-random");
  if (runesRandom) runesRandom.addEventListener("click", () => {
    const text = generateRandomRunes();
    state.settings.decorations.dividerCustomText = text;
    // Textfeld direkt aktualisieren ohne vollständigen Re-Render
    const input = document.querySelector('input[data-bind="decorations.dividerCustomText"]');
    if (input) input.value = text;
    autoSave();
    renderPreview();
  });

  // Runen: Zurücksetzen — nur renderPreview
  const runesReset = document.getElementById("runes-reset");
  if (runesReset) runesReset.addEventListener("click", () => {
    state.settings.decorations.dividerCustomText = DEFAULT_RUNES_TEXT;
    const input = document.querySelector('input[data-bind="decorations.dividerCustomText"]');
    if (input) input.value = DEFAULT_RUNES_TEXT;
    autoSave();
    renderPreview();
  });

  // Reset Font-Sizes
  const resetFs = document.getElementById("reset-fontsizes");
  if (resetFs) resetFs.addEventListener("click", () => {
    state.settings.fontSizes = { ...DEFAULT_FONT_SIZES };
    autoSave();
    renderSettings();
    renderPreview();
  });

  document.getElementById("advanced-trigger").addEventListener("click", (e) => {
    const panel = document.getElementById("advanced-panel");
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";
    e.target.textContent = isHidden ? "▾ " + t("settings.advanced") : "▸ " + t("settings.advanced");
  });

  document.getElementById("reset-columns").addEventListener("click", () => {
    state.settings.columnCount = 3;
    autoSave();
    renderSettings();
    renderPreview();
  });

  document.getElementById("reset-all").addEventListener("click", () => {
    state.settings = { ...DEFAULT_SETTINGS, fontSizes: { ...DEFAULT_FONT_SIZES } };
    autoSave();
    renderSettings();
    renderPreview();
  });
}

/**
 * Rendert ein NumberInput-Feld mit +/− Buttons.
 *
 * Statt eines Sliders (der nur feste Inkremente zulässt) gibt es ein Textfeld,
 * in das der User beliebige Gleitkommazahlen eintragen kann. Plus/Minus-Buttons
 * erhöhen/verringern um `step`.
 *
 * @param {string} path - Pfad in state.settings, z.B. "zoom" oder "fontSizes.title"
 * @param {number} value - Aktueller Wert
 * @param {number} min - Minimum (Wert wird darauf geclampt)
 * @param {number} max - Maximum
 * @param {number} step - Inkrement für +/− Buttons
 * @param {number} decimals - Anzahl Nachkommastellen für die Anzeige
 * @param {string} suffix - Suffix rechts im Feld (z.B. "pt" oder "%")
 * @param {boolean} displayAsPercent - Wenn true, wird value*100 angezeigt
 * @param {string} [label] - Optional Label über dem Feld
 */
function renderNumberInput(path, value, min, max, step, decimals, suffix, displayAsPercent, label) {
  const displayValue = displayAsPercent
    ? Math.round(value * 100)
    : value.toFixed(decimals);

  const labelHtml = label ? `<label>${label}</label>` : "";

  // Wrapper hat data-path, data-min, data-max, data-step, data-decimals, data-percent
  // damit der Event-Handler die +/− Buttons finden kann.
  return `
    <div class="field number-input-wrapper"
         data-path="${path}"
         data-min="${min}"
         data-max="${max}"
         data-step="${step}"
         data-decimals="${decimals}"
         data-percent="${displayAsPercent ? "1" : "0"}">
      ${labelHtml}
      <div style="display:flex; align-items:center; gap:6px;">
        <button type="button" class="icon-btn number-input-decrement"
                style="border:1px solid var(--border-amber); padding:6px 10px; height:32px; width:32px; flex-shrink:0;"
                aria-label="${t("numberInput.decrease")}">−</button>
        <div style="position:relative; flex:1;">
          <input type="text"
                 inputmode="decimal"
                 class="number-input-field"
                 data-bind="${path}"
                 value="${displayValue}"
                 style="width:100%; padding:6px 28px 6px 6px; text-align:center; border:1px solid var(--border-amber); background:var(--bg-input); color:var(--text-primary); border-radius:4px; font-size:13px; font-family:inherit;" />
          ${suffix ? `<span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:10px; color:var(--text-muted); pointer-events:none;">${suffix}</span>` : ""}
        </div>
        <button type="button" class="icon-btn number-input-increment"
                style="border:1px solid var(--border-amber); padding:6px 10px; height:32px; width:32px; flex-shrink:0;"
                aria-label="${t("numberInput.increase")}">+</button>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:2px;">
        <span>${displayAsPercent ? Math.round(min * 100) + "%" : min}</span>
        <span>${displayAsPercent ? Math.round(max * 100) + "%" : max}</span>
      </div>
    </div>
  `;
}

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function getByPath(obj, path) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

function renderArticles() {
  const el = document.getElementById("article-list");
  const articles = state.articles;
  state.expandedArticleId = state.expandedArticleId ?? articles[0]?.id ?? null;

  const cards = articles
    .map((a, idx) => {
      const isExpanded = state.expandedArticleId === a.id;
      const isLast = idx === articles.length - 1;
      const currentImage = a.imageBase64 || a.imageUrl;
      const sizeOptions = [
        { v: "small" },
        { v: "medium" },
        { v: "large" },
        { v: "xlarge" },
      ]
        .map((o) => `<option value="${o.v}" ${o.v === a.headlineSize ? "selected" : ""}>${t("headlineSizes." + o.v)}</option>`)
        .join("");

      const imageBlock = currentImage
        ? `<div class="image-preview">
            <img src="${escapeHtml(currentImage)}" alt="${t("preview.title")}" />
            <button class="remove" data-action="remove-image" data-id="${a.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ${t("articles.removeImage")}
            </button>
          </div>`
        : `<button class="upload-btn" data-action="upload-image" data-id="${a.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            ${t("articles.uploadImage")}
          </button>`;

      return `
        <div class="article-card ${isExpanded ? "expanded" : ""}" data-id="${a.id}">
          <div class="article-header">
            <button class="toggle" data-action="toggle" data-id="${a.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 15 17 10"/><polyline points="7 4 12 9 17 4"/></svg>
              <span class="number">${idx + 1}.</span>
              <span class="title">${escapeHtml(a.headline || t("articles.noTitle"))}</span>
            </button>
            <button class="icon-btn" data-action="up" data-id="${a.id}" ${idx === 0 ? "disabled" : ""} aria-label="${t("articles.moveUp")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" data-action="down" data-id="${a.id}" ${isLast ? "disabled" : ""} aria-label="${t("articles.moveDown")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="icon-btn danger" data-action="remove" data-id="${a.id}" aria-label="${t("articles.delete")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
          <div class="article-body">
            <div class="field">
              <label>${t("articles.headline")}</label>
              <input type="text" data-article-field="headline" data-id="${a.id}" value="${escapeHtml(a.headline)}" placeholder="${t("articles.headlinePlaceholder")}" />
            </div>
            <div class="field">
              <label>${t("articles.subheadline")}</label>
              <input type="text" data-article-field="subheadline" data-id="${a.id}" value="${escapeHtml(a.subheadline)}" placeholder="${t("articles.subheadlinePlaceholder")}" />
            </div>
            <div class="field">
              <label>${t("articles.text")}</label>
              <textarea data-article-field="text" data-id="${a.id}" rows="8" placeholder="${t("articles.textPlaceholder")}">${escapeHtml(a.text)}</textarea>
            </div>
            <div class="field">
              <label>${t("articles.image")}</label>
              ${imageBlock}
            </div>
            <div class="field">
              <label>${t("articles.imageUrl")}</label>
              <input type="text" data-article-field="imageUrl" data-id="${a.id}" value="${escapeHtml(a.imageUrl ?? "")}" placeholder="https://…" />
            </div>
            <div class="field">
              <label>${t("articles.headlineSize")}</label>
              <select data-article-field="headlineSize" data-id="${a.id}">${sizeOptions}</select>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  el.innerHTML = `
    <div style="margin-bottom:8px;">
      <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.15em; color:rgba(253,230,138,0.8); margin-bottom:8px;">${t("articles.title")}</div>
      ${cards}
      <button class="add-article-btn" id="add-article">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${t("articles.add")}
      </button>
    </div>
  `;

  // Article field bindings
  el.querySelectorAll("[data-article-field]").forEach((input) => {
    const field = input.dataset.articleField;
    const id = input.dataset.id;
    input.addEventListener("input", () => {
      const article = state.articles.find((a) => a.id === id);
      if (!article) return;
      let value = input.value;
      if (field === "imageUrl") {
        article.imageUrl = value || null;
        article.imageBase64 = null;
      } else {
        article[field] = value;
      }
      autoSave();
      renderPreview();
      // Live-Update des Toggle-Titels ohne Re-Render des ganzen Lists
      if (field === "headline") {
        const toggle = el.querySelector(`.toggle[data-id="${id}"] .title`);
        if (toggle) toggle.textContent = value || t("articles.noTitle");
      }
    });
  });

  // Action buttons
  el.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => handleArticleAction(btn.dataset.action, btn.dataset.id));
  });

  // Image upload handler
  const uploadButtons = el.querySelectorAll('[data-action="upload-image"]');
  uploadButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const article = state.articles.find((a) => a.id === id);
          if (!article) return;
          article.imageBase64 = reader.result;
          article.imageUrl = null;
          autoSave();
          renderArticles();
          renderPreview();
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  });

  document.getElementById("add-article").addEventListener("click", () => {
    const newArticle = {
      id: uid(),
      headline: t("articles.newArticle"),
      subheadline: "",
      text: "",
      imageUrl: null,
      imageBase64: null,
      headlineSize: "medium",
    };
    state.articles.push(newArticle);
    state.expandedArticleId = newArticle.id;
    autoSave();
    renderArticles();
    renderPreview();
  });
}

function handleArticleAction(action, id) {
  const idx = state.articles.findIndex((a) => a.id === id);
  if (idx === -1) return;
  switch (action) {
    case "toggle":
      state.expandedArticleId = state.expandedArticleId === id ? null : id;
      renderArticles();
      break;
    case "remove":
      state.articles.splice(idx, 1);
      if (state.expandedArticleId === id) state.expandedArticleId = null;
      autoSave();
      renderArticles();
      renderPreview();
      break;
    case "up":
      if (idx > 0) {
        [state.articles[idx - 1], state.articles[idx]] = [state.articles[idx], state.articles[idx - 1]];
        autoSave();
        renderArticles();
      }
      break;
    case "down":
      if (idx < state.articles.length - 1) {
        [state.articles[idx + 1], state.articles[idx]] = [state.articles[idx], state.articles[idx + 1]];
        autoSave();
        renderArticles();
      }
      break;
    case "remove-image": {
      const a = state.articles[idx];
      a.imageBase64 = null;
      a.imageUrl = null;
      autoSave();
      renderArticles();
      renderPreview();
      break;
    }
  }
}

// ============================================================================
// Newspaper Preview Rendering — Multi-Page
// ============================================================================

// ============================================================================
// Decorations — Verzierungen (Eck-Ornamente, Trennlinien, etc.)
// ============================================================================

const CORNER_ORNAMENTS = {
  none: "",
  floral: "❦",
  fleur: "⚜",
  star: "✦",
  skull: "☠",
  hammer: "⚒",
};

const DIVIDER_STYLES = {
  simple: { border: "1px solid", content: "" },
  double: { border: "3px double", content: "" },
  runes: { border: "none", content: null }, // content aus dec.dividerCustomText
  dashed: { border: "1px dashed", content: "" },
};

const DEFAULT_RUNES_TEXT = "ᚱ ᚢ ᚾ ᛁ ᚲ";

const RUNE_CHARS = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

function generateRandomRunes() {
  const len = 5 + Math.floor(Math.random() * 4);
  const chars = [];
  for (let i = 0; i < len; i++) {
    chars.push(RUNE_CHARS[Math.floor(Math.random() * RUNE_CHARS.length)]);
  }
  return chars.join(" ");
}

/**
 * Liefert HTML für die Eck-Ornamente — NUR UNTEN, symmetrisch zum Footer.
 */
function getCornerOrnamentHtml(dec, th) {
  const sym = CORNER_ORNAMENTS[dec.cornerOrnament] || "";
  if (!sym) return "";
  const color = th.text.accent;
  const size = (dec.cornerOrnamentSize || 20) + "px";
  return `
    <div style="position:absolute; bottom:8px; left:8px; font-size:${size}; color:${color}; opacity:0.5; pointer-events:none;">${sym}</div>
    <div style="position:absolute; bottom:8px; right:8px; font-size:${size}; color:${color}; opacity:0.5; pointer-events:none;">${sym}</div>
  `;
}

/**
 * Liefert CSS für den Artikel-Trennlinien-Stil.
 */
function getDividerCss(dec, th) {
  const ds = DIVIDER_STYLES[dec.dividerStyle] || DIVIDER_STYLES.simple;
  if (dec.dividerStyle === "runes") {
    const text = dec.dividerCustomText || DEFAULT_RUNES_TEXT;
    const fontSize = (dec.dividerFontSize || 14) + "px";
    const fontWeight = dec.dividerTextBold ? "bold" : "normal";
    // Bei fett: höhere Opacity, damit der Text besser lesbar ist
    const opacity = dec.dividerTextBold ? "0.9" : "0.75";
    return {
      borderBottom: "none",
      afterHtml: `<div style="text-align:center; color:${th.text.muted}; font-size:${fontSize}; font-weight:${fontWeight}; letter-spacing:0.3em; margin:4px 0 8px 0; opacity:${opacity};">${escapeHtml(text)}</div>`,
    };
  }
  return {
    borderBottom: `${ds.border} ${th.text.muted}`,
    afterHtml: "",
  };
}

/**
 * Liefert CSS für Titel-Schatten (für alle Titel/Headlines).
 */
function getTitleShadowCss(dec, th) {
  if (!dec.titleShadow) return "";
  return `text-shadow: 1px 1px 0 ${th.text.muted}, 2px 2px 4px rgba(0,0,0,0.15);`;
}

// ============================================================================
// Render-Funktionen
// ============================================================================

/**
 * Rendert einen einzelnen Artikel als HTML-String (für Vorschau und Messung).
 */
function renderArticleHtml(a, idx, totalArticles, ctx, themeId, decorations, customTheme) {
  const th = resolveTheme(themeId || "classic", customTheme);
  const dec = decorations || { cornerOrnament: "none", cornerOrnamentSize: 20, dividerStyle: "double", dividerCustomText: DEFAULT_RUNES_TEXT, dividerFontSize: 14, dividerTextBold: false, titleShadow: false };
  const isLast = idx === totalArticles - 1;
  const img = a.imageBase64 || a.imageUrl;
  const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0;
  const headPx = ctx.articleHeadlineBasePx * mult;
  const div = getDividerCss(dec, th);
  const shadowCss = getTitleShadowCss(dec, th);
  const imgFilter = buildImageFilter(th);
  const imgHtml = img
    ? `<figure style="margin:0 0 6px 0; border:1px solid ${th.text.accent}; background:${th.text.primary};"><img src="${escapeHtml(img)}" alt="${escapeHtml(a.headline)}" style="width:100%; display:block; filter:${imgFilter};" /></figure>`
    : "";
  const subHtml = a.subheadline
    ? `<p style="font-style:italic; font-size:${ctx.articleSubheadlinePx}px; margin:0 0 6px 0; color:${th.text.accent}; border-bottom:${th.borders.separator}; padding-bottom:4px;">${escapeHtml(a.subheadline)}</p>`
    : "";
  return `
    <article style="margin-bottom:12px; padding-bottom:8px; border-bottom:${isLast ? "none" : div.borderBottom};">
      <h2 style="font-family:${ctx.titleFontFamily}; font-style:${ctx.titleFontStyle}; font-size:${headPx}px; font-weight:700; line-height:1.1; margin:0 0 4px 0; color:${th.text.primary}; ${shadowCss}">${escapeHtml(a.headline) || "&nbsp;"}</h2>
      ${subHtml}
      ${imgHtml}
      <div style="font-size:${ctx.bodyPx}px; text-align:justify; hyphens:auto; white-space:pre-wrap; color:${th.text.primary};">${escapeHtml(a.text)}</div>
    </article>
    ${isLast ? "" : div.afterHtml}
  `;
}

/**
 * Rendert den Masthead (Zeitungskopf) als HTML-String.
 */
function renderMastheadHtml(s, ctx) {
  const th = resolveTheme(s.theme, s.customTheme);
  const metaParts = [s.location, s.date, s.issue].filter(Boolean);
  const meta = metaParts.join(" · ");
  return `
    <div class="masthead" style="border-bottom:${th.borders.header}; padding-bottom:6px; margin-bottom:8px; text-align:center;">
      <div class="stamp-row" style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:4px; color:${th.text.accent};">
        <div class="stamp" style="flex:1; text-align:left; border:${th.borders.stamp}; padding:3px 6px; background:${th.stamp.bg};">
          <div class="stamp-h" style="font-size:${ctx.stampHeadingPx}px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border-bottom:${th.borders.stamp}; margin-bottom:2px; padding-bottom:2px; color:${th.stamp.headingColor};">${escapeHtml(s.stampLeft.heading) || "&nbsp;"}</div>
          <div class="stamp-c" style="font-size:${ctx.stampContentPx}px; font-style:italic; line-height:1.25; color:${th.stamp.contentColor};">${escapeHtml(s.stampLeft.content) || "&nbsp;"}</div>
        </div>
        <div class="stamp" style="flex:1; text-align:left; border:${th.borders.stamp}; padding:3px 6px; background:${th.stamp.bg};">
          <div class="stamp-h" style="font-size:${ctx.stampHeadingPx}px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; border-bottom:${th.borders.stamp}; margin-bottom:2px; padding-bottom:2px; color:${th.stamp.headingColor};">${escapeHtml(s.stampRight.heading) || "&nbsp;"}</div>
          <div class="stamp-c" style="font-size:${ctx.stampContentPx}px; font-style:italic; line-height:1.25; color:${th.stamp.contentColor};">${escapeHtml(s.stampRight.content) || "&nbsp;"}</div>
        </div>
      </div>
      <div class="np-title" style="font-family:${ctx.titleFontFamily}; font-style:${ctx.titleFontStyle}; font-size:${ctx.titlePx}px; font-weight:700; line-height:1; margin:2px 0; letter-spacing:0.02em; color:${th.title.color}; ${s.decorations ? getTitleShadowCss(s.decorations, th) : ""}">${escapeHtml(s.title) || "&nbsp;"}</div>
      <div class="np-meta" style="font-size:${ctx.metaPx}px; font-style:italic; color:${th.text.accent}; letter-spacing:0.04em;">${escapeHtml(meta)}</div>
    </div>
  `;
}

/**
 * Rendert den Footer als HTML-String.
 */
function renderFooterHtml(s, ctx, pageNumber, totalPages) {
  const th = resolveTheme(s.theme, s.customTheme);
  const suffix = totalPages > 1 ? ` ${pageNumber} / ${totalPages}` : "";
  return `<div class="np-footer" style="border-top:${th.borders.footer}; margin-top:6px; padding-top:3px; font-size:${ctx.footerPx}px; text-align:center; color:${th.text.accent}; font-style:italic;">— ${escapeHtml(s.title)} — ${escapeHtml(s.issue)} —${suffix}</div>`;
}

/**
 * Berechnet die Seitenaufteilung (Pagination) mit CSS column-count Messung.
 *
 * NEUER ANSATZ: Statt Artikelhöhen einzeln zu messen und manuell auf Spalten
 * zu verteilen, nutzen wir CSS column-count für BEIDES — Messung und Rendering.
 *
 * Vorteil: Artikel fließen natürlich von Spalte 1 in Spalte 2 (wie in echten
 * Zeitungen). Lange Artikel werden nicht mehr abgeschnitten, sondern fortgesetzt.
 *
 * Messmethode: Ein verstecktes Div mit column-count:N und OHNE height constraint.
 * Der Browser verteilt den Inhalt auf N Spalten und offsetHeight = Höhe der
 * höchsten Spalte. Wenn das ≤ verfügbare Höhe ist, passen alle Artikel auf die Seite.
 *
 * Algorithmus:
 *   1. Misse Masthead- und Footer-Höhe
 *   2. Binary Search: Finde max. Artikel pro Seite
 *      - Rendere articles[0..mid] in column-count:N Div ohne height
 *      - Prüfe: offsetHeight ≤ verfügbare Höhe?
 *   3. Wiederhole für nächste Seite
 */
function computePages(s, articles, ctx, paperWidthPx, paperHeightPx) {
  if (articles.length === 0) {
    return [{ articles: [], pageNumber: 1, totalPages: 1 }];
  }

  // Geometrie-Konstanten
  const borderWidth = 2;
  const paddingVertical = 16 + 18 + 2 * borderWidth;
  const paddingHorizontal = 18 + borderWidth;
  const columnGap = 12;
  const mastheadMarginBottom = 8;
  const footerMarginTop = 6;
  const footerPaddingTop = 3;
  const safetyMargin = 25 * (typeof s.zoom === "number" ? s.zoom : 1.0);

  const contentWidth = paperWidthPx - 2 * paddingHorizontal;

  // --- Mess-Div für Masthead und Footer ---
  const measureSimple = document.createElement("div");
  measureSimple.style.cssText = `
    position: absolute; visibility: hidden; left: -9999px; top: 0;
    box-sizing: border-box; width: ${contentWidth}px;
    font-family: var(--font-serif), 'Times New Roman', Georgia, serif;
    font-size: ${ctx.bodyPx}px; line-height: 1.35; pointer-events: none;
  `;
  document.body.appendChild(measureSimple);

  measureSimple.innerHTML = renderMastheadHtml(s, ctx);
  const mastheadHeight = (measureSimple.querySelector(".masthead")?.offsetHeight || 0) + mastheadMarginBottom;

  measureSimple.innerHTML = renderFooterHtml(s, ctx, 0, 1);
  const footerHeight = (measureSimple.querySelector(".np-footer")?.offsetHeight || 0) + footerMarginTop + footerPaddingTop;

  document.body.removeChild(measureSimple);

  // Verfügbare Höhe für den Spalten-Container
  const page1Height = paperHeightPx - paddingVertical - mastheadHeight - footerHeight - safetyMargin;
  const pageNHeight = paperHeightPx - paddingVertical - footerHeight - safetyMargin;

  // --- Mess-Div für Artikel mit CSS column-count ---
  const th = resolveTheme(s.theme, s.customTheme);
  // KEINE height constraint → offsetHeight = höchste Spalte
  const measureCols = document.createElement("div");
  measureCols.style.cssText = `
    position: absolute; visibility: hidden; left: -9999px; top: 0;
    box-sizing: border-box; width: ${contentWidth}px;
    column-count: ${s.columnCount}; column-gap: ${columnGap}px;
    column-rule: ${th.borders.separator};
    font-family: var(--font-serif), 'Times New Roman', Georgia, serif;
    font-size: ${ctx.bodyPx}px; line-height: 1.35; pointer-events: none;
  `;
  document.body.appendChild(measureCols);

  // Track unloaded images for re-render
  const unloadedImageUrls = [];

  // Hilfsfunktion: Rendere eine Teilmenge von Artikeln und miss die Höhe
  function measureArticles(subset) {
    measureCols.innerHTML = subset
      .map((a, i) => renderArticleHtml(a, i, subset.length, ctx, s.theme, s.decorations, s.customTheme))
      .join("");

    // Bilder prüfen
    const imgs = measureCols.querySelectorAll("img");
    imgs.forEach(img => {
      if (!img.complete && img.naturalHeight === 0) {
        const src = img.src;
        if (src && !unloadedImageUrls.includes(src)) {
          unloadedImageUrls.push(src);
        }
      }
    });

    return measureCols.offsetHeight;
  }

  // --- Binary Search Pagination ---
  const pages = [];
  let remaining = [...articles];

  while (remaining.length > 0) {
    const isFirstPage = pages.length === 0;
    const availableHeight = isFirstPage ? page1Height : pageNHeight;

    let lo = 1;
    let hi = remaining.length;
    let bestFit = 1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const testHeight = measureArticles(remaining.slice(0, mid));
      if (testHeight <= availableHeight) {
        bestFit = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    pages.push({
      articles: remaining.slice(0, bestFit),
      pageNumber: pages.length + 1,
      totalPages: 0,
    });

    remaining = remaining.slice(bestFit);
    if (pages.length > 20) break;
  }

  // Aufräumen
  measureCols.innerHTML = "";
  document.body.removeChild(measureCols);

  // Re-render bei Bild-Ladung
  if (unloadedImageUrls.length > 0) {
    unloadedImageUrls.forEach(url => {
      const img = new Image();
      img.onload = () => renderPreview();
      img.onerror = () => renderPreview();
      img.src = url;
    });
  }

  const totalPages = pages.length;
  pages.forEach(p => p.totalPages = totalPages);

  return pages;
}

function renderPreview() {
  const s = state.settings;
  const articles = state.articles;
  const container = document.getElementById("preview-container");

  // Papier-Größe in Pixeln
  const paper = PAPER_DIMENSIONS[s.paperFormat] || PAPER_DIMENSIONS.A4;
  const paperWidthPx = paper.width * MM_TO_PX;
  const paperHeightPx = paper.height * MM_TO_PX;

  // Effektive Schriftgrößen (zone × zoom)
  const fs = s.fontSizes || DEFAULT_FONT_SIZES;
  const zoom = typeof s.zoom === "number" ? s.zoom : 1.0;
  const ctx = {
    bodyPx: effectivePx(fs.articleBody, zoom),
    stampHeadingPx: effectivePx(fs.stampHeading, zoom),
    stampContentPx: effectivePx(fs.stampContent, zoom),
    titlePx: effectivePx(fs.title, zoom),
    metaPx: effectivePx(fs.meta, zoom),
    articleHeadlineBasePx: effectivePx(fs.articleHeadline, zoom),
    articleSubheadlinePx: effectivePx(fs.articleSubheadline, zoom),
  };
  ctx.footerPx = Math.max(ctx.metaPx * 0.93, effectivePx(7, zoom));

  // Titel-Stil
  let titleFontFamily;
  switch (s.titleStyle) {
    case "fraktur": titleFontFamily = "var(--font-fraktur)"; break;
    case "blackletter": titleFontFamily = "var(--font-blackletter)"; break;
    case "serif":
    case "italic": titleFontFamily = "var(--font-serif)"; break;
    default: titleFontFamily = "var(--font-fraktur)";
  }
  ctx.titleFontFamily = titleFontFamily;
  ctx.titleFontStyle = s.titleStyle === "italic" ? "italic" : "normal";

  // Pagination berechnen
  const pages = computePages(s, articles, ctx, paperWidthPx, paperHeightPx);

  // Einmalig SVG-Duotone-Defs injizieren (für die Bild-Filter)
  const resolvedThemeForSvg = resolveTheme(s.theme, s.customTheme);
  const svgDefsHtml = buildDuotoneSvgDefs(resolvedThemeForSvg);

  // Seiten rendern — CSS column-count lässt Text zwischen Spalten fließen
  container.innerHTML = svgDefsHtml + pages.map((page, idx) => {
    const isFirstPage = idx === 0;
    const th = resolveTheme(s.theme, s.customTheme);
    const dec = s.decorations || { cornerOrnament: "none", cornerOrnamentSize: 20, dividerStyle: "double", dividerCustomText: DEFAULT_RUNES_TEXT, dividerFontSize: 14, dividerTextBold: false, titleShadow: false };
    const mastheadHtml = isFirstPage ? renderMastheadHtml(s, ctx) : "";
    const footerHtml = renderFooterHtml(s, ctx, page.pageNumber, page.totalPages);
    const cornerHtml = getCornerOrnamentHtml(dec, th);

    // Artikel-HTML für diese Seite
    const articlesHtml = page.articles
      .map((a, aIdx) => renderArticleHtml(a, aIdx, page.articles.length, ctx, s.theme, dec, s.customTheme))
      .join("");

    return `
      <div class="newspaper-paper" style="font-size:${ctx.bodyPx}px; max-width:${paperWidthPx}px; aspect-ratio:${paper.width} / ${paper.height}; background:${th.paper.bg}; background-image:${th.paper.gradient}; color:${th.text.primary}; border:2px solid ${th.text.primary}; font-family:var(--font-serif), 'Times New Roman', Georgia, serif; line-height:1.35; padding:16px 18px 18px 18px; display:flex; flex-direction:column; position:relative; overflow:hidden;">
        ${cornerHtml}
        ${mastheadHtml}
        <div style="column-count: ${s.columnCount}; column-gap: 12px; column-rule: ${th.borders.separator}; column-fill: auto; flex: 1; overflow: hidden;">
          ${articlesHtml}
        </div>
        ${footerHtml}
      </div>
      ${idx < pages.length - 1 ? `<div style="margin:16px 0; text-align:center; color:var(--text-muted); font-size:11px;">${t("page.pageBreak")}</div>` : ""}
    `;
  }).join("");
}

// ============================================================================
// Save / Load / Export
// ============================================================================

function buildProject() {
  return {
    version: "1.0.0",
    savedAt: new Date().toISOString(),
    settings: state.settings,
    articles: state.articles,
  };
}

async function handleSave() {
  const project = buildProject();
  try {
    const invoke = getInvoke();
    const path = await invoke("save_project_json", {
      project,
      suggestedName: project.settings.title || "newspaper",
    });
    showToast(t("toasts.projectSaved") + path, "success");
  } catch (err) {
    showToast(t("toasts.saveFailed") + err, "error");
  }
}

async function handleLoad() {
  try {
    const invoke = getInvoke();
    const project = await invoke("load_project_json");
    if (!project.settings || !Array.isArray(project.articles)) {
      throw new Error("Ungültiges Projekt-Format");
    }
    state.settings = migrateSettings(project.settings);
    state.articles = project.articles;
    state.expandedArticleId = project.articles[0]?.id ?? null;
    autoSave();
    renderSettings();
    renderArticles();
    renderPreview();
    showToast(t("toasts.projectLoaded") + (project.settings.title || "Untitled"), "success");
  } catch (err) {
    showToast(t("toasts.loadFailed") + err, "error");
  }
}

async function handleExport() {
  const btn = document.getElementById("btn-export");
  const label = document.getElementById("export-label");
  btn.disabled = true;
  label.textContent = "Exportiere…";
  try {
    const invoke = getInvoke();
    const project = buildProject();
    const result = await invoke("export_png", { project });
    showToast(t("toasts.pngExported") + result, "success");
  } catch (err) {
    showToast(t("toasts.pngExportFailed") + err, "error");
  } finally {
    btn.disabled = false;
    label.textContent = "PNG Export";
  }
}

async function handlePdfExport() {
  const btn = document.getElementById("btn-pdf");
  const label = document.getElementById("pdf-label");
  const compressionSelect = document.getElementById("pdf-compression");
  btn.disabled = true;
  label.textContent = "Exportiere…";
  try {
    const invoke = getInvoke();
    const project = buildProject();
    const compression = compressionSelect ? compressionSelect.value : "high";
    const result = await invoke("export_pdf", { project, compression });
    showToast(t("toasts.pdfExported") + result, "success");
  } catch (err) {
    showToast(t("toasts.pdfExportFailed") + err, "error");
  } finally {
    btn.disabled = false;
    label.textContent = "PDF Export";
  }
}

// ============================================================================
// Toast
// ============================================================================

function showToast(message, kind = "info") {
  let container = document.getElementById("toast");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// Init
// ============================================================================

function init() {
  // i18n initialisieren (lädt Sprache aus localStorage oder Browsersprache)
  initLang();

  autoLoad();
  state.expandedArticleId = state.articles[0]?.id ?? null;

  // UI-Strings, die nicht via render* aktualisiert werden, manuell setzen
  updateStaticTexts();

  renderSettings();
  renderArticles();
  renderPreview();

  document.getElementById("btn-save").addEventListener("click", handleSave);
  document.getElementById("btn-load").addEventListener("click", handleLoad);
  document.getElementById("btn-export").addEventListener("click", handleExport);
  document.getElementById("btn-pdf").addEventListener("click", handlePdfExport);

  // Sprach-Dropdown
  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = getLang();
    langSelect.addEventListener("change", (e) => {
      setLang(e.target.value);
      // Alle UI-Texte aktualisieren
      updateStaticTexts();
      renderSettings();
      renderArticles();
      renderPreview();
    });
  }
}

/**
 * Aktualisiert alle statischen UI-Texte, die nicht via render* neu gerendert werden.
 * Wird beim Sprachwechsel und beim Init aufgerufen.
 */
function updateStaticTexts() {
  // Toolbar-Buttons (Labels sind in <span> verpackt, damit SVGs erhalten bleiben)
  const loadLabel = document.getElementById("btn-load-label");
  const saveLabel = document.getElementById("btn-save-label");
  const exportLabel = document.getElementById("export-label");
  const pdfLabel = document.getElementById("pdf-label");
  if (loadLabel) loadLabel.textContent = t("toolbar.load");
  if (saveLabel) saveLabel.textContent = t("toolbar.save");
  if (exportLabel) exportLabel.textContent = t("toolbar.pngExport");
  if (pdfLabel) pdfLabel.textContent = t("toolbar.pdfExport");

  // PDF-Kompression-Dropdown
  const pdfComp = document.getElementById("pdf-compression");
  if (pdfComp) {
    pdfComp.title = t("toolbar.pdfCompression");
    pdfComp.querySelector('option[value="lossless"]').textContent = t("toolbar.compressionLossless");
    pdfComp.querySelector('option[value="high"]').textContent = t("toolbar.compressionHigh");
    pdfComp.querySelector('option[value="medium"]').textContent = t("toolbar.compressionMedium");
    pdfComp.querySelector('option[value="low"]').textContent = t("toolbar.compressionLow");
  }

  // Preview-Header
  const previewTitle = document.querySelector(".preview-header h2");
  const previewHint = document.querySelector(".preview-header .hint");
  if (previewTitle) previewTitle.textContent = t("preview.title");
  if (previewHint) previewHint.textContent = t("preview.hint");
}

document.addEventListener("DOMContentLoaded", init);
