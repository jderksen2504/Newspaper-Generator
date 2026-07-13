"use client"

import { ChevronsUpDown, ChevronUp, ChevronDown, Trash2, Plus, Image as ImageIcon, X } from "lucide-react"
import { useRef } from "react"
import { useNewspaperStore } from "@/lib/newspaper/store"
import { Article, HeadlineSize } from "@/lib/newspaper/types"

const HEADLINE_SIZES: { value: HeadlineSize; label: string }[] = [
  { value: "small", label: "Klein" },
  { value: "medium", label: "Mittel" },
  { value: "large", label: "Groß" },
  { value: "xlarge", label: "Sehr groß" },
]

export function ArticleList() {
  const articles = useNewspaperStore((s) => s.articles)
  const expandedArticleId = useNewspaperStore((s) => s.expandedArticleId)
  const addArticle = useNewspaperStore((s) => s.addArticle)
  const removeArticle = useNewspaperStore((s) => s.removeArticle)
  const updateArticle = useNewspaperStore((s) => s.updateArticle)
  const moveArticle = useNewspaperStore((s) => s.moveArticle)
  const toggleExpand = useNewspaperStore((s) => s.toggleExpand)

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200/80">Artikel</h2>

      <div className="space-y-2">
        {articles.map((article, idx) => {
          const isExpanded = expandedArticleId === article.id
          return (
            <ArticleCard
              key={article.id}
              article={article}
              index={idx}
              total={articles.length}
              isExpanded={isExpanded}
              onToggle={() => toggleExpand(article.id)}
              onRemove={() => removeArticle(article.id)}
              onMoveUp={() => moveArticle(article.id, "up")}
              onMoveDown={() => moveArticle(article.id, "down")}
              onUpdate={(partial) => updateArticle(article.id, partial)}
            />
          )
        })}
      </div>

      <button
        onClick={addArticle}
        className="w-full mt-2 flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-700/40 bg-amber-950/20 px-4 py-3 text-sm font-medium text-amber-200 hover:bg-amber-900/30 hover:border-amber-600/60 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Artikel hinzufügen
      </button>
    </section>
  )
}

interface ArticleCardProps {
  article: Article
  index: number
  total: number
  isExpanded: boolean
  onToggle: () => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (partial: Partial<Article>) => void
}

function ArticleCard({
  article,
  index,
  total,
  isExpanded,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: ArticleCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({ imageBase64: reader.result as string, imageUrl: null })
    }
    reader.readAsDataURL(file)
  }

  const handleImageUrlChange = (url: string) => {
    if (url) {
      onUpdate({ imageUrl: url, imageBase64: null })
    } else {
      onUpdate({ imageUrl: null, imageBase64: null })
    }
  }

  const currentImage = article.imageBase64 || article.imageUrl

  return (
    <div className="rounded-md border border-amber-900/30 bg-stone-900/60 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-900/40">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm text-stone-200 hover:text-amber-200"
          aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
        >
          <ChevronsUpDown className="h-4 w-4 text-amber-200/70" />
          <span className="text-amber-200/70 tabular-nums">{index + 1}.</span>
          <span className="truncate font-medium">
            {article.headline || "(ohne Titel)"}
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800/60 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Nach oben"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded text-stone-400 hover:text-amber-200 hover:bg-stone-800/60 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Nach unten"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded text-stone-400 hover:text-red-400 hover:bg-stone-800/60"
            aria-label="Löschen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-t border-amber-900/30">
          <Field label="Headline">
            <input
              type="text"
              value={article.headline}
              onChange={(e) => onUpdate({ headline: e.target.value })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
              placeholder="Artikel-Überschrift"
            />
          </Field>

          <Field label="Subheadline">
            <input
              type="text"
              value={article.subheadline}
              onChange={(e) => onUpdate({ subheadline: e.target.value })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
              placeholder="Untertitel / Dachzeile"
            />
          </Field>

          <Field label="Text">
            <textarea
              value={article.text}
              onChange={(e) => onUpdate({ text: e.target.value })}
              rows={8}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60 font-serif resize-y"
              placeholder="Artikeltext…"
            />
          </Field>

          <Field label="Bild">
            <div className="space-y-2">
              {currentImage ? (
                <div className="relative rounded-md border border-amber-900/40 overflow-hidden bg-stone-950">
                  <img
                    src={currentImage}
                    alt="Vorschau"
                    className="w-full max-h-40 object-contain"
                    style={{ filter: "grayscale(100%) contrast(1.1)" }}
                  />
                  <button
                    onClick={() => onUpdate({ imageBase64: null, imageUrl: null })}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 rounded bg-red-900/80 px-2 py-1 text-xs text-red-100 hover:bg-red-800"
                  >
                    <X className="h-3 w-3" />
                    Bild entfernen
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-amber-900/40 bg-stone-950/40 px-4 py-3 text-sm text-stone-300 hover:bg-stone-800/40 hover:border-amber-700/60"
                >
                  <ImageIcon className="h-4 w-4" />
                  Bild hochladen
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </Field>

          <Field label="Bild-URL (alternativ)">
            <input
              type="text"
              value={article.imageUrl ?? ""}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
              placeholder="https://…"
            />
          </Field>

          <Field label="Headline-Größe">
            <select
              value={article.headlineSize}
              onChange={(e) => onUpdate({ headlineSize: e.target.value as HeadlineSize })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
            >
              {HEADLINE_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200/80">
        {label}
      </label>
      {children}
    </div>
  )
}
