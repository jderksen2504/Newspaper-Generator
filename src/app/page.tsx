"use client"

import { useRef } from "react"
import { Toolbar } from "@/components/newspaper/toolbar"
import { SettingsPanel } from "@/components/newspaper/settings-panel"
import { ArticleList } from "@/components/newspaper/article-list"
import { NewspaperPreview } from "@/components/newspaper/newspaper-preview"
import { useNewspaperStore } from "@/lib/newspaper/store"

export default function Home() {
  const previewRef = useRef<HTMLDivElement>(null)
  const settings = useNewspaperStore((s) => s.settings)
  const articles = useNewspaperStore((s) => s.articles)

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 text-stone-100">
      <Toolbar previewRef={previewRef} />

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-0 overflow-hidden">
        {/* Left: Settings */}
        <aside className="border-r border-amber-900/30 bg-stone-950/40 overflow-y-auto p-4 lg:max-h-[calc(100vh-64px)]">
          <SettingsPanel />
        </aside>

        {/* Center: Preview */}
        <section className="overflow-auto p-6 lg:max-h-[calc(100vh-64px)] bg-stone-900/30">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200/80">Vorschau</h2>
            <span className="text-[10px] text-stone-500">Live-Render — exakt wie der PNG-Export</span>
          </div>
          <NewspaperPreview ref={previewRef} settings={settings} articles={articles} />
        </section>

        {/* Right: Articles */}
        <aside className="border-l border-amber-900/30 bg-stone-950/40 overflow-y-auto p-4 lg:max-h-[calc(100vh-64px)]">
          <ArticleList />
        </aside>
      </main>
    </div>
  )
}
