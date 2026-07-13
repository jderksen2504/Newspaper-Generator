"use client"

import { forwardRef } from "react"
import { Article, effectivePx, HEADLINE_SIZE_MULTIPLIER, NewspaperSettings, PAPER_DIMENSIONS, TitleStyle } from "@/lib/newspaper/types"

interface NewspaperPreviewProps {
  settings: NewspaperSettings
  articles: Article[]
}

// Konvertiert mm in Pixel für die Bildschirmdarstellung (96 dpi → 1mm = 3.78px)
const MM_TO_PX = 3.7795275591

/**
 * Liefert die CSS font-family für den jeweiligen Titel-Stil.
 *
 * Die Variablen --font-fraktur, --font-blackletter und --font-old-serif
 * werden in src/app/layout.tsx via next/font/google definiert.
 */
function getFontFamily(style: TitleStyle): string {
  switch (style) {
    case "fraktur":
      return "var(--font-fraktur), 'UnifrakturMaguntia', serif"
    case "blackletter":
      return "var(--font-blackletter), 'UnifrakturCook', var(--font-fraktur), serif"
    case "serif":
    case "italic":
      return "var(--font-old-serif), 'EB Garamond', 'Times New Roman', Georgia, serif"
    default:
      return "var(--font-fraktur), serif"
  }
}

function getFontStyle(style: TitleStyle): "normal" | "italic" {
  return style === "italic" ? "italic" : "normal"
}

export const NewspaperPreview = forwardRef<HTMLDivElement, NewspaperPreviewProps>(
  ({ settings, articles }, ref) => {
    const paper = PAPER_DIMENSIONS[settings.paperFormat]
    const widthPx = paper.width * MM_TO_PX

    // Effektive Größen = Zonen-Größe × Zoom
    const fs = settings.fontSizes
    const zoom = settings.zoom
    const bodyPx = effectivePx(fs.articleBody, zoom)
    const stampHeadingPx = effectivePx(fs.stampHeading, zoom)
    const stampContentPx = effectivePx(fs.stampContent, zoom)
    const titlePx = effectivePx(fs.title, zoom)
    const metaPx = effectivePx(fs.meta, zoom)
    const articleHeadlineBasePx = effectivePx(fs.articleHeadline, zoom)
    const articleSubheadlinePx = effectivePx(fs.articleSubheadline, zoom)

    const titleFontFamily = getFontFamily(settings.titleStyle)
    const titleFontStyle = getFontStyle(settings.titleStyle)

    return (
      <div
        ref={ref}
        className="newspaper-render-root"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          id="newspaper-paper"
          data-newspaper-paper
          style={{
            width: "100%",
            maxWidth: `${widthPx}px`,
            aspectRatio: `${paper.width} / ${paper.height}`,
            background: "#f5ecd7",
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(140,100,40,0.06), transparent 60%), radial-gradient(ellipse at bottom, rgba(80,50,10,0.08), transparent 70%)",
            color: "#1a1208",
            padding: "16px 18px 18px 18px",
            border: "2px solid #1a1208",
            boxShadow: "0 2px 0 #1a1208, 0 4px 0 rgba(26,18,8,0.4), 0 8px 20px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "var(--font-old-serif), 'EB Garamond', 'Times New Roman', Georgia, serif",
            fontSize: `${bodyPx}px`,
            lineHeight: 1.35,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header / Masthead */}
          <header
            style={{
              borderBottom: "3px double #1a1208",
              paddingBottom: "6px",
              marginBottom: "8px",
              textAlign: "center",
            }}
          >
            {/* Stamp row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "4px",
                color: "#3a2a14",
              }}
            >
              <div style={{ flex: 1, textAlign: "left", border: "1px solid #3a2a14", padding: "3px 6px" }}>
                <div style={{
                  fontSize: `${stampHeadingPx}px`,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #3a2a14",
                  marginBottom: "2px",
                  paddingBottom: "2px",
                }}>
                  {settings.stampLeft.heading || "\u00A0"}
                </div>
                <div style={{ fontSize: `${stampContentPx}px`, fontStyle: "italic", lineHeight: 1.25 }}>
                  {settings.stampLeft.content || "\u00A0"}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: "left", border: "1px solid #3a2a14", padding: "3px 6px" }}>
                <div style={{
                  fontSize: `${stampHeadingPx}px`,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #3a2a14",
                  marginBottom: "2px",
                  paddingBottom: "2px",
                }}>
                  {settings.stampRight.heading || "\u00A0"}
                </div>
                <div style={{ fontSize: `${stampContentPx}px`, fontStyle: "italic", lineHeight: 1.25 }}>
                  {settings.stampRight.content || "\u00A0"}
                </div>
              </div>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: titleFontFamily,
                fontStyle: titleFontStyle,
                fontSize: `${titlePx}px`,
                fontWeight: 700,
                lineHeight: 1,
                margin: "2px 0",
                letterSpacing: "0.02em",
                color: "#1a1208",
              }}
            >
              {settings.title || "\u00A0"}
            </h1>

            {/* Metadata */}
            <div
              style={{
                fontSize: `${metaPx}px`,
                fontStyle: "italic",
                color: "#3a2a14",
                letterSpacing: "0.04em",
              }}
            >
              {settings.location && <span>{settings.location}</span>}
              {settings.location && settings.date && <span> · </span>}
              {settings.date && <span>{settings.date}</span>}
              {(settings.location || settings.date) && settings.issue && <span> · </span>}
              {settings.issue && <span>{settings.issue}</span>}
            </div>
          </header>

          {/* Articles in column layout */}
          <div
            style={{
              columnCount: settings.columnCount,
              columnGap: "12px",
              columnRule: "1px solid #5a3e1c",
              columnFill: "auto",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {articles.map((article, idx) => {
              const img = article.imageBase64 || article.imageUrl
              // Pro-Artikel-Headline-Größe = base × multiplier (small/medium/large/xlarge)
              const headlineMultiplier = HEADLINE_SIZE_MULTIPLIER[article.headlineSize] ?? 1.0
              const headlinePx = articleHeadlineBasePx * headlineMultiplier
              return (
                <article
                  key={article.id}
                  style={{
                    breakInside: "avoid",
                    marginBottom: "12px",
                    paddingBottom: "8px",
                    borderBottom: idx === articles.length - 1 ? "none" : "1px solid #5a3e1c",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: titleFontFamily,
                      fontStyle: titleFontStyle,
                      fontSize: `${headlinePx}px`,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      margin: "0 0 4px 0",
                      color: "#1a1208",
                    }}
                  >
                    {article.headline || "\u00A0"}
                  </h2>
                  {article.subheadline && (
                    <p
                      style={{
                        fontStyle: "italic",
                        fontSize: `${articleSubheadlinePx}px`,
                        margin: "0 0 6px 0",
                        color: "#3a2a14",
                        borderBottom: "1px solid #5a3e1c",
                        paddingBottom: "4px",
                      }}
                    >
                      {article.subheadline}
                    </p>
                  )}
                  {img && (
                    <figure
                      style={{
                        margin: "0 0 6px 0",
                        border: "1px solid #3a2a14",
                        background: "#1a1208",
                      }}
                    >
                      <img
                        src={img}
                        alt={article.headline}
                        style={{
                          width: "100%",
                          display: "block",
                          filter: "grayscale(100%) contrast(1.1) brightness(0.95)",
                        }}
                      />
                    </figure>
                  )}
                  <div
                    style={{
                      textAlign: "justify",
                      hyphens: "auto",
                      whiteSpace: "pre-wrap",
                      color: "#1a1208",
                      fontSize: `${bodyPx}px`,
                    }}
                  >
                    {article.text}
                  </div>
                </article>
              )
            })}
          </div>

          {/* Footer rule */}
          <footer
            style={{
              borderTop: "1px solid #1a1208",
              marginTop: "6px",
              paddingTop: "3px",
              fontSize: `${Math.max(metaPx * 0.93, 7)}px`,
              textAlign: "center",
              color: "#3a2a14",
              fontStyle: "italic",
            }}
          >
            — {settings.title} — {settings.issue} —
          </footer>
        </div>
      </div>
    )
  }
)

NewspaperPreview.displayName = "NewspaperPreview"
