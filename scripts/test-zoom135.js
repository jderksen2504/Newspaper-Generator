const puppeteer = require("puppeteer");
const fs = require("fs");
const project = JSON.parse(fs.readFileSync("/home/z/my-project/upload/test-zoom135.json", "utf-8"));
const MM_TO_PX = 3.7795275591;
const HEADLINE_SIZE_MULTIPLIER = { small: 0.75, medium: 1.0, large: 1.35, xlarge: 1.75 };
function effectivePx(basePt, zoom) { return basePt * 1.333 * zoom; }

async function runTest() {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const s = project.settings;
  const fs = s.fontSizes;
  const zoom = s.zoom;
  const widthPx = Math.round(210 * MM_TO_PX);
  const heightPx = Math.round(297 * MM_TO_PX);
  const borderWidth = 2;
  const paddingVertical = 16 + 18 + 2 * borderWidth;
  const paddingHorizontal = 18 + borderWidth;
  const columnGap = 12;
  const safetyMargin = 25 * zoom;
  const contentWidth = widthPx - 2 * paddingHorizontal;
  const columnWidth = (contentWidth - (s.columnCount - 1) * columnGap) / s.columnCount;
  const bodyPx = effectivePx(fs.articleBody, zoom);
  const titlePx = effectivePx(fs.title, zoom);
  const stampHeadingPx = effectivePx(fs.stampHeading, zoom);
  const stampContentPx = effectivePx(fs.stampContent, zoom);
  const metaPx = effectivePx(fs.meta, zoom);
  const articleHeadlineBasePx = effectivePx(fs.articleHeadline, zoom);
  const articleSubheadlinePx = effectivePx(fs.articleSubheadline, zoom);
  const footerPx = Math.max(metaPx * 0.93, effectivePx(7, zoom));
  let titleFontFamily = "'UnifrakturCook', 'UnifrakturMaguntia', serif";
  const titleFontStyle = "normal";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=UnifrakturCook:wght@700&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400;1,700&display=swap" rel="stylesheet">
<style>* { box-sizing: border-box; margin: 0; padding: 0; }
.measure { position: absolute; visibility: hidden; left: -9999px; top: 0; font-family: 'EB Garamond', serif; font-size: ${bodyPx}px; line-height: 1.35; }
.masthead { border-bottom: 3px double #1a1208; padding-bottom: 6px; margin-bottom: 8px; text-align: center; }
.stamp-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.stamp { flex: 1; border: 1px solid #3a2a14; padding: 3px 6px; }
.stamp-h { font-size: ${stampHeadingPx}px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #3a2a14; margin-bottom: 2px; padding-bottom: 2px; }
.stamp-c { font-size: ${stampContentPx}px; font-style: italic; line-height: 1.25; }
.title { font-family: ${titleFontFamily}; font-size: ${titlePx}px; font-weight: 700; line-height: 1; margin: 2px 0; }
.meta { font-size: ${metaPx}px; font-style: italic; }
.article { margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #5a3e1c; }
.article-head { font-family: ${titleFontFamily}; font-weight: 700; line-height: 1.1; margin: 0 0 4px 0; }
.article-sub { font-style: italic; font-size: ${articleSubheadlinePx}px; margin: 0 0 6px 0; border-bottom: 1px solid #5a3e1c; padding-bottom: 4px; }
.article-img { margin: 0 0 6px 0; border: 1px solid #3a2a14; }
.article-img img { width: 100%; display: block; }
.article-text { font-size: ${bodyPx}px; text-align: justify; hyphens: auto; white-space: pre-wrap; }
.footer { border-top: 1px solid #1a1208; margin-top: 6px; padding-top: 3px; font-size: ${footerPx}px; text-align: center; font-style: italic; }
</style></head><body>
<div class="measure" id="m-masthead" style="width: ${contentWidth}px;"><div class="masthead"><div class="stamp-row"><div class="stamp"><div class="stamp-h">${s.stampLeft.heading}</div><div class="stamp-c">${s.stampLeft.content}</div></div><div class="stamp"><div class="stamp-h">${s.stampRight.heading}</div><div class="stamp-c">${s.stampRight.content}</div></div></div><div class="title">${s.title}</div><div class="meta">${s.location} · ${s.date} · ${s.issue}</div></div></div>
<div class="measure" id="m-footer" style="width: ${contentWidth}px;"><div class="footer">— ${s.title} — ${s.issue} —</div></div>
<div class="measure" id="m-articles" style="width: ${columnWidth}px;">${project.articles.map((a,i)=>{const m=HEADLINE_SIZE_MULTIPLIER[a.headlineSize]??1;const h=articleHeadlineBasePx*m;const img=a.imageBase64||a.imageUrl;return '<article class="article"><h2 class="article-head" style="font-size:'+h+'px">'+a.headline+'</h2>'+(a.subheadline?'<p class="article-sub">'+a.subheadline+'</p>':'')+(img?'<figure class="article-img"><img src="'+img+'" alt=""/></figure>':'')+'<div class="article-text">'+a.text+'</div></article>';}).join("")}</div>
</body></html>`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(Array.from(document.images).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; }))));
  await new Promise(r => setTimeout(r, 1000));

  const m = await page.evaluate(() => {
    const masthead = document.querySelector("#m-masthead .masthead");
    const footer = document.querySelector("#m-footer .footer");
    const articles = Array.from(document.querySelectorAll("#m-articles article"));
    const imgs = Array.from(document.querySelectorAll("img"));
    return {
      mastheadH: masthead ? masthead.offsetHeight + 8 : 0,
      footerH: footer ? footer.offsetHeight + 9 : 0,
      articleH: articles.map(a => a.offsetHeight + 12),
      imgs: imgs.map(img => ({ rendH: img.offsetHeight, ratio: img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 0 })),
    };
  });

  const page1ColH = heightPx - paddingVertical - m.mastheadH - m.footerH - safetyMargin;
  const pageNColH = heightPx - paddingVertical - m.footerH - safetyMargin;

  // Greedy fill
  const pages = [];
  let i = 0;
  while (i < project.articles.length) {
    const isFirst = pages.length === 0;
    const colH = isFirst ? page1ColH : pageNColH;
    const columns = [[]]; let curCol = 0, curUsed = 0;
    while (i < project.articles.length && curCol < s.columnCount) {
      const h = m.articleH[i];
      if (curUsed + h > colH) {
        if (curUsed === 0) { columns[curCol].push(i); i++; curUsed = h; curCol++; curUsed = 0; if (curCol >= s.columnCount) break; columns.push([]); }
        else { curCol++; curUsed = 0; if (curCol >= s.columnCount) break; columns.push([]); continue; }
      } else { columns[curCol].push(i); curUsed += h; i++; }
    }
    while (columns.length < s.columnCount) columns.push([]);
    pages.push(columns);
    if (pages.length > 20) break;
  }

  console.log("\n=== ZOOM 1.35 TEST ===");
  console.log(`safetyMargin: ${safetyMargin.toFixed(1)}px, page1ColH: ${page1ColH.toFixed(0)}px, pageNColH: ${pageNColH.toFixed(0)}px`);
  console.log(`Article heights: ${m.articleH.map((h, i) => "A" + (i+1) + "=" + h + "px").join(", ")}`);
  console.log(`Pages: ${pages.length}`);
  pages.forEach((p, idx) => {
    p.forEach((col, ci) => {
      const names = col.map(ai => project.articles[ai].headline).join(", ");
      const total = col.reduce((s, ai) => s + m.articleH[ai], 0);
      console.log(`  Page ${idx+1} Col ${ci+1}: [${names}] = ${total}px ${total > (idx === 0 ? page1ColH : pageNColH) && col.length > 1 ? "⚠ OVERFLOW!" : ""}`);
    });
  });
  await browser.close();
}
runTest().catch(console.error);
