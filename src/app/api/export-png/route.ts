import { NextRequest, NextResponse } from "next/server"
import puppeteer from "puppeteer"
import { NewspaperProject, PAPER_DIMENSIONS } from "@/lib/newspaper/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

// Caching des Browsers — wichtig, damit der erste Export nicht 5s dauert
let browserPromise: Promise<any> | null = null

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--font-render-hinting=none",
      ],
    })
  }
  return browserPromise
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// === Schriftgrößen-Berechnung (MUSS mit types.ts synchron sein) ===

const HEADLINE_SIZE_MULTIPLIER: Record<string, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.35,
  xlarge: 1.75,
}

const DEFAULT_FONT_SIZES = {
  stampHeading: 7,
  stampContent: 7,
  title: 28,
  meta: 7,
  articleHeadline: 14,
  articleSubheadline: 9,
  articleBody: 9.5,
}

/**
 * Berechnet die effektive Schriftgröße in px: pt → px (×1.333) × zoom.
 * Fehlt fontSizes im Projekt (altes Schema), wird aus fontSizePt migriert.
 */
function effectivePx(basePt: number, zoom: number): number {
  return basePt * 1.333 * zoom
}

function resolveFontSizes(settings: NewspaperProject["settings"]): {
  stampHeading: number
  stampContent: number
  title: number
  meta: number
  articleHeadline: number
  articleSubheadline: number
  articleBody: number
  zoom: number
} {
  const zoom = typeof settings.zoom === "number" ? settings.zoom : 1.0

  if (settings.fontSizes) {
    return { ...settings.fontSizes, zoom }
  }

  // Migration altes Schema
  if (typeof settings.fontSizePt === "number") {
    const body = settings.fontSizePt
    return {
      stampHeading: body * 0.74,
      stampContent: body * 0.74,
      title: body * 2.95,
      meta: body * 0.74,
      articleHeadline: body * 1.47,
      articleSubheadline: body * 0.95,
      articleBody: body,
      zoom,
    }
  }

  return { ...DEFAULT_FONT_SIZES, zoom }
}

function renderNewspaperHtml(project: NewspaperProject): string {
  const { settings, articles } = project
  const paper = PAPER_DIMENSIONS[settings.paperFormat]
  const widthPx = paper.width * 3.7795275591
  const heightPx = paper.height * 3.7795275591

  // Effektive Größen
  const fs = resolveFontSizes(settings)
  const bodyPx = effectivePx(fs.articleBody, fs.zoom)
  const stampHeadingPx = effectivePx(fs.stampHeading, fs.zoom)
  const stampContentPx = effectivePx(fs.stampContent, fs.zoom)
  const titlePx = effectivePx(fs.title, fs.zoom)
  const metaPx = effectivePx(fs.meta, fs.zoom)
  const articleHeadlineBasePx = effectivePx(fs.articleHeadline, fs.zoom)
  const articleSubheadlinePx = effectivePx(fs.articleSubheadline, fs.zoom)
  const footerPx = Math.max(metaPx * 0.93, effectivePx(7, fs.zoom))

  // Font-Familie passend zum Titel-Stil. Die Schriften werden via Google Fonts
  // CSS im <head> geladen (siehe unten). Wichtig: exakt dieselben Familien wie
  // in der Browser-Vorschau verwenden, sonst unterscheidet sich der PNG-Export.
  let titleFontFamily: string
  switch (settings.titleStyle) {
    case "fraktur":
      titleFontFamily = "'UnifrakturMaguntia', serif"
      break
    case "blackletter":
      titleFontFamily = "'UnifrakturCook', 'UnifrakturMaguntia', serif"
      break
    case "serif":
      titleFontFamily = "'EB Garamond', 'Times New Roman', Georgia, serif"
      break
    case "italic":
      titleFontFamily = "'EB Garamond', 'Times New Roman', Georgia, serif"
      break
    default:
      titleFontFamily = "'UnifrakturMaguntia', serif"
  }

  const titleFontStyle = settings.titleStyle === "italic" ? "italic" : "normal"

  const stampRow = `
    <div class="stamp-row">
      <div class="stamp">
        <div class="stamp-h">${escapeHtml(settings.stampLeft.heading)}</div>
        <div class="stamp-c">${escapeHtml(settings.stampLeft.content)}</div>
      </div>
      <div class="stamp">
        <div class="stamp-h">${escapeHtml(settings.stampRight.heading)}</div>
        <div class="stamp-c">${escapeHtml(settings.stampRight.content)}</div>
      </div>
    </div>`

  const articlesHtml = articles
    .map((a, idx) => {
      const img = a.imageBase64 || a.imageUrl
      const mult = HEADLINE_SIZE_MULTIPLIER[a.headlineSize] ?? 1.0
      const headlinePx = articleHeadlineBasePx * mult
      const imgHtml = img
        ? `<figure class="article-img"><img src="${escapeHtml(img)}" alt="${escapeHtml(a.headline)}" /></figure>`
        : ""
      const subHtml = a.subheadline
        ? `<p class="article-sub">${escapeHtml(a.subheadline)}</p>`
        : ""
      const isLast = idx === articles.length - 1
      return `
        <article class="article ${isLast ? "last" : ""}">
          <h2 class="article-head" style="font-size:${headlinePx}px">${escapeHtml(a.headline)}</h2>
          ${subHtml}
          ${imgHtml}
          <div class="article-text">${escapeHtml(a.text)}</div>
        </article>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(settings.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  body {
    font-family: 'EB Garamond', 'Times New Roman', Georgia, serif;
  }
  .paper {
    width: ${widthPx}px;
    height: ${heightPx}px;
    background: #f5ecd7;
    background-image:
      radial-gradient(ellipse at top, rgba(140,100,40,0.06), transparent 60%),
      radial-gradient(ellipse at bottom, rgba(80,50,10,0.08), transparent 70%);
    color: #1a1208;
    padding: 16px 18px 18px 18px;
    border: 2px solid #1a1208;
    box-shadow: 0 2px 0 #1a1208;
    display: flex;
    flex-direction: column;
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
  .stamp {
    flex: 1;
    text-align: left;
    border: 1px solid #3a2a14;
    padding: 3px 6px;
  }
  .stamp-h {
    font-size: ${stampHeadingPx}px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border-bottom: 1px solid #3a2a14;
    margin-bottom: 2px;
    padding-bottom: 2px;
  }
  .stamp-c {
    font-size: ${stampContentPx}px;
    font-style: italic;
    line-height: 1.25;
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
    font-size: ${metaPx}px;
    font-style: italic;
    color: #3a2a14;
    letter-spacing: 0.04em;
  }
  .columns {
    column-count: ${settings.columnCount};
    column-gap: 12px;
    column-rule: 1px solid #5a3e1c;
    column-fill: auto;
    flex: 1;
    overflow: hidden;
  }
  .article {
    break-inside: avoid;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #5a3e1c;
  }
  .article.last {
    border-bottom: none;
  }
  .article-head {
    font-family: ${titleFontFamily};
    font-style: ${titleFontStyle};
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 4px 0;
    color: #1a1208;
  }
  .article-sub {
    font-style: italic;
    font-size: ${articleSubheadlinePx}px;
    margin: 0 0 6px 0;
    color: #3a2a14;
    border-bottom: 1px solid #5a3e1c;
    padding-bottom: 4px;
  }
  .article-img {
    margin: 0 0 6px 0;
    border: 1px solid #3a2a14;
    background: #1a1208;
  }
  .article-img img {
    width: 100%;
    display: block;
    filter: grayscale(100%) contrast(1.1) brightness(0.95);
  }
  .article-text {
    text-align: justify;
    hyphens: auto;
    white-space: pre-wrap;
    color: #1a1208;
    font-size: ${bodyPx}px;
  }
  .footer {
    border-top: 1px solid #1a1208;
    margin-top: 6px;
    padding-top: 3px;
    font-size: ${footerPx}px;
    text-align: center;
    color: #3a2a14;
    font-style: italic;
  }
</style>
</head>
<body>
  <div class="paper" id="paper">
    <div class="masthead">
      ${stampRow}
      <div class="title">${escapeHtml(settings.title)}</div>
      <div class="meta">
        ${escapeHtml(settings.location)}${settings.location && settings.date ? " · " : ""}${escapeHtml(settings.date)}${(settings.location || settings.date) && settings.issue ? " · " : ""}${escapeHtml(settings.issue)}
      </div>
    </div>
    <div class="columns">
      ${articlesHtml}
    </div>
    <div class="footer">— ${escapeHtml(settings.title)} — ${escapeHtml(settings.issue)} —</div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let project: NewspaperProject
  try {
    project = (await req.json()) as NewspaperProject
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
  }

  if (!project.settings || !Array.isArray(project.articles)) {
    return NextResponse.json({ error: "Ungültiges Projekt-Format" }, { status: 400 })
  }

  let browser: any
  try {
    browser = await getBrowser()
    const page = await browser.newPage()

    const html = renderNewspaperHtml(project)
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 })

    // Sicherstellen, dass alle Web-Fonts geladen sind — entscheidend für Fraktur-Schriften
    await page.evaluate(() => document.fonts.ready)
    // Noch eine Sekunde warten, falls Bilder noch laden
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = res
                img.onerror = res
              })
        )
      )
    })

    const paper = PAPER_DIMENSIONS[project.settings.paperFormat]
    const widthPx = Math.round(paper.width * 3.7795275591)
    const heightPx = Math.round(paper.height * 3.7795275591)

    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: widthPx, height: heightPx },
      omitBackground: false,
    })

    await page.close()

    return new NextResponse(png as any, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="newspaper.png"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("PNG-Export fehlgeschlagen:", err)
    return NextResponse.json(
      { error: "PNG-Export fehlgeschlagen: " + (err as Error).message },
      { status: 500 }
    )
  }
  // Browser bleibt offen für weitere Exporte
}
