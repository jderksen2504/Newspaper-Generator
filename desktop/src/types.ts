// Newspaper Generator Types
// Zentrale Typdefinition für eine完整的 Zeitungsprojekt

export type HeadlineSize = "small" | "medium" | "large" | "xlarge"

export type TitleStyle = "fraktur" | "serif" | "blackletter" | "italic"

export type PaperFormat = "A5" | "A4" | "A3" | "Letter" | "Tabloid" | "Broadsheet"

export interface StampBox {
  heading: string
  content: string
}

export interface Article {
  id: string
  headline: string
  subheadline: string
  text: string
  imageUrl: string | null
  imageBase64: string | null
  headlineSize: HeadlineSize
}

/**
 * Pro-Zone-Schriftgrößen in pt.
 *
 * Alle Werte sind absolute pt-Größen. Der globale `zoom`-Faktor in den
 * NewspaperSettings multipliziert diese Werte für die effektive Darstellung.
 *
 * Default-Werte sind so gewählt, dass sie der bisherigen Optik mit
 * `fontSizePt: 9.5` entsprechen.
 */
export interface FontSizeConfig {
  /** Stempel-Überschriften (z.B. "DAILY REPORT") in pt */
  stampHeading: number
  /** Stempel-Text in pt */
  stampContent: number
  /** Zeitungs-Titel (Masthead) in pt */
  title: number
  /** Datum/Ort/Ausgabe-Zeile unter dem Titel in pt */
  meta: number
  /** Artikel-Headline in pt (wird pro Artikel via headlineSize skaliert) */
  articleHeadline: number
  /** Artikel-Subheadline in pt */
  articleSubheadline: number
  /** Artikel-Body-Text in pt */
  articleBody: number
}

export interface NewspaperSettings {
  // Zeitungskopf
  title: string
  date: string
  location: string
  issue: string
  stampLeft: StampBox
  stampRight: StampBox

  // Formatierung
  /** @deprecated durch fontSizes ersetzt — wird für alte JSON-Files beibehalten */
  fontSizePt?: number
  /** Pro-Zone-Schriftgrößen (pt) */
  fontSizes: FontSizeConfig
  /** Globaler Zoom-Faktor (1.0 = 100%) — skaliert alle fontSizes */
  zoom: number
  titleStyle: TitleStyle
  paperFormat: PaperFormat
  columnCount: number
  theme: string
  customTheme?: CustomTheme | null
  decorations: Decorations
}

export type CornerOrnament = "none" | "floral" | "fleur" | "star" | "skull" | "hammer"
export type DividerStyle = "simple" | "double" | "runes" | "dashed"

export interface Decorations {
  cornerOrnament: CornerOrnament
  cornerOrnamentSize: number
  dividerStyle: DividerStyle
  dividerCustomText: string
  dividerFontSize: number
  dividerTextBold: boolean
  titleShadow: boolean
}

/**
 * Custom Theme — 14 HEX-Farben, die ein Preset überschreiben.
 * border-* Style/Width und paper.gradient werden vom baseTheme übernommen.
 */
export interface CustomThemeColors {
  paperBg: string
  textPrimary: string
  textAccent: string
  textMuted: string
  borderHeaderColor: string
  borderStampColor: string
  borderSeparatorColor: string
  borderFooterColor: string
  stampHeadingColor: string
  stampContentColor: string
  stampBg: string
  titleColor: string
  duotoneHighlight: string
  duotoneShadow: string
}

export interface CustomTheme {
  baseTheme: string
  colors: CustomThemeColors
}

export interface NewspaperProject {
  version: string
  savedAt: string
  settings: NewspaperSettings
  articles: Article[]
}

export const DEFAULT_FONT_SIZES: FontSizeConfig = {
  stampHeading: 7,
  stampContent: 7,
  title: 28, // ~3em bei 9.5pt body
  meta: 7,
  articleHeadline: 14, // "large" Default
  articleSubheadline: 9,
  articleBody: 9.5,
}

export const DEFAULT_SETTINGS: NewspaperSettings = {
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
  fontSizes: DEFAULT_FONT_SIZES,
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
}

/**
 * Multiplikator für die articleHeadline-Größe, abhängig von der
 * pro-Artikel-gesetzten headlineSize.
 */
export const HEADLINE_SIZE_MULTIPLIER: Record<HeadlineSize, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.35,
  xlarge: 1.75,
}

/**
 * Berechnet die effektive Schriftgröße in px (für CSS) unter Berücksichtigung
 * des globalen Zoom-Faktors.
 *
 * pt → px: 1pt = 1.333px (bei 96dpi)
 */
export function effectivePx(basePt: number, zoom: number): number {
  return basePt * 1.333 * zoom
}

export const DEFAULT_ARTICLES: Article[] = [
  {
    id: "art-1",
    headline: "Neue Dampfmaschine Erreicht Ungeahnte Leistung",
    subheadline: "Industrielles Wunder der Technik soll die Produktion im Hafen verdoppeln",
    text: "In den frühen Morgenstunden des vergangenen Dienstags wurde die neueste Errungenschaft der Greyhavener Maschinenbauanstalt feierlich enthüllt. Die sogenannte \"Ironclad Mk. III\", ein monumentales Dampfgerät von unvorstellbaren Ausmaßen, nahm ihren Betrieb auf. Ingenieur William Ashford, der leitende Konstrukteur, sprach von einer \"neuen Ära der industriellen Befreiung\".\n\nDie Maschine, die über einen Zeitraum von vierzehn Monaten von einem Team aus zwölf Handwerkern errichtet wurde, soll in der Lage sein, die Produktionskapazität der Hafenwerften binnen Jahresfrist zu verdoppeln. Erste Probetests verliefen vielversprechend, wenn auch nicht ohne Zwischenfälle: Am dritten Tag der Inbetriebnahme barst ein Hilfsventil und verletzte zwei Arbeiter leicht.\n\nDer Stadtrat hat bereits eine Kommission eingesetzt, um die Sicherheit weiterer Anlagen zu prüfen. Kritiker aus den Reihen der Handwerksgilde warnen derweil vor einer \"Entwertung menschlicher Arbeit\" – ein Argument, das Ashford als \"rückschrittlich\" zurückweist.",
    imageUrl: null,
    imageBase64: null,
    headlineSize: "large",
  },
  {
    id: "art-2",
    headline: "Marktberichte",
    subheadline: "Getreidepreise steigen, Eisen fällt",
    text: "Die Handelsberichte der vergangenen Woche zeigen ein gemischtes Bild. Während Getreidepreise um vierzehn Prozent stiegen, verzeichnete Eisen einen leichten Rückgang von drei Prozent.\n\nStahl bleibt stabil, Händler rechnen jedoch mit Schwankungen im kommenden Monat. Die Krämergilde empfiehlt, Vorräte zeitig aufzufüllen.",
    imageUrl: null,
    imageBase64: null,
    headlineSize: "medium",
  },
  {
    id: "art-3",
    headline: "Grubenunglück Fordert Sieben Leben",
    subheadline: "Dachsturz in Schacht 12 der Northern Depths Mine",
    text: "Ein schweres Grubenunglück ereignete sich am Vorabend im Norden der Grafschaft. Bei einem Dachsturz in Schacht 12 der Northern Depths Mine wurden sieben Bergleute verschüttet. Die Rettungsarbeiten dauern an, doch die Hoffnung, Überlebende zu finden, schwindet mit jeder Stunde.\n\nDie Untersuchungskommission hat ihre Arbeit aufgenommen. Erste Hinweise deuten auf mangelhafte Stützpfeiler hin. Der Grubenvorstand äußerte sich betroffen und kündigte eine umfassende Überprüfung aller Schächte an.",
    imageUrl: null,
    imageBase64: null,
    headlineSize: "large",
  },
]

export const DEFAULT_PROJECT: NewspaperProject = {
  version: "1.0.0",
  savedAt: new Date().toISOString(),
  settings: DEFAULT_SETTINGS,
  articles: DEFAULT_ARTICLES,
}

// Papierformate in mm für die Render-Berechnung
export const PAPER_DIMENSIONS: Record<PaperFormat, { width: number; height: number; label: string }> = {
  A5: { width: 148, height: 210, label: "A5 — Klein (148 × 210 mm)" },
  A4: { width: 210, height: 297, label: "A4 — Standard (210 × 297 mm)" },
  A3: { width: 297, height: 420, label: "A3 — Groß (297 × 420 mm)" },
  Letter: { width: 216, height: 279, label: "Letter — US (216 × 279 mm)" },
  Tabloid: { width: 279, height: 432, label: "Tabloid — US (279 × 432 mm)" },
  Broadsheet: { width: 381, height: 578, label: "Broadsheet — Historical (381 × 578 mm)" },
}
