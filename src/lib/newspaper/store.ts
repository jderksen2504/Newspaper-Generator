"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Article, DEFAULT_ARTICLES, DEFAULT_FONT_SIZES, DEFAULT_PROJECT, DEFAULT_SETTINGS, FontSizeConfig, NewspaperProject, NewspaperSettings } from "./types"

interface NewspaperStore {
  settings: NewspaperSettings
  articles: Article[]
  expandedArticleId: string | null

  // Settings
  updateSettings: (partial: Partial<NewspaperSettings>) => void
  updateFontSizes: (partial: Partial<FontSizeConfig>) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  resetSettings: () => void

  // Articles
  addArticle: () => void
  removeArticle: (id: string) => void
  updateArticle: (id: string, partial: Partial<Article>) => void
  moveArticle: (id: string, direction: "up" | "down") => void
  toggleExpand: (id: string) => void

  // Project I/O
  loadProject: (project: NewspaperProject) => void
  exportProject: () => NewspaperProject
  resetProject: () => void
}

function uid(): string {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Migriert alte Settings, die nur `fontSizePt` hatten, auf das neue
 * `fontSizes` + `zoom` Schema. Bestehende JSON-Files funktionieren weiterhin.
 */
function migrateSettings(s: Partial<NewspaperSettings>): NewspaperSettings {
  const base: NewspaperSettings = { ...DEFAULT_SETTINGS, ...s }
  // Falls fontSizes fehlt, aus altem fontSizePt ableiten oder Defaults nehmen
  if (!s.fontSizes) {
    if (typeof s.fontSizePt === "number") {
      // Altes Schema: body = fontSizePt, rest proportional
      const body = s.fontSizePt
      base.fontSizes = {
        stampHeading: body * 0.74,
        stampContent: body * 0.74,
        title: body * 2.95,
        meta: body * 0.74,
        articleHeadline: body * 1.47,
        articleSubheadline: body * 0.95,
        articleBody: body,
      }
    } else {
      base.fontSizes = { ...DEFAULT_FONT_SIZES }
    }
  }
  if (typeof base.zoom !== "number") base.zoom = 1.0
  return base
}

export const useNewspaperStore = create<NewspaperStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      articles: DEFAULT_ARTICLES,
      expandedArticleId: DEFAULT_ARTICLES[0]?.id ?? null,

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      updateFontSizes: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            fontSizes: { ...s.settings.fontSizes, ...partial },
          },
        })),

      zoomIn: () =>
        set((s) => ({
          settings: { ...s.settings, zoom: Math.min(2.0, +(s.settings.zoom + 0.1).toFixed(2)) },
        })),

      zoomOut: () =>
        set((s) => ({
          settings: { ...s.settings, zoom: Math.max(0.5, +(s.settings.zoom - 0.1).toFixed(2)) },
        })),

      resetZoom: () => set((s) => ({ settings: { ...s.settings, zoom: 1.0 } })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      addArticle: () =>
        set((s) => {
          const newArticle: Article = {
            id: uid(),
            headline: "Neuer Artikel",
            subheadline: "",
            text: "",
            imageUrl: null,
            imageBase64: null,
            headlineSize: "medium",
          }
          return {
            articles: [...s.articles, newArticle],
            expandedArticleId: newArticle.id,
          }
        }),

      removeArticle: (id) =>
        set((s) => ({
          articles: s.articles.filter((a) => a.id !== id),
          expandedArticleId: s.expandedArticleId === id ? null : s.expandedArticleId,
        })),

      updateArticle: (id, partial) =>
        set((s) => ({
          articles: s.articles.map((a) => (a.id === id ? { ...a, ...partial } : a)),
        })),

      moveArticle: (id, direction) =>
        set((s) => {
          const idx = s.articles.findIndex((a) => a.id === id)
          if (idx === -1) return s
          const target = direction === "up" ? idx - 1 : idx + 1
          if (target < 0 || target >= s.articles.length) return s
          const next = [...s.articles]
          ;[next[idx], next[target]] = [next[target], next[idx]]
          return { articles: next }
        }),

      toggleExpand: (id) =>
        set((s) => ({
          expandedArticleId: s.expandedArticleId === id ? null : id,
        })),

      loadProject: (project) =>
        set({
          settings: migrateSettings(project.settings ?? {}),
          articles: project.articles?.length ? project.articles : [],
          expandedArticleId: project.articles?.[0]?.id ?? null,
        }),

      exportProject: () => {
        const { settings, articles } = get()
        return {
          ...DEFAULT_PROJECT,
          version: "1.1.0",
          savedAt: new Date().toISOString(),
          settings,
          articles,
        }
      },

      resetProject: () =>
        set({
          settings: DEFAULT_SETTINGS,
          articles: DEFAULT_ARTICLES,
          expandedArticleId: DEFAULT_ARTICLES[0]?.id ?? null,
        }),
    }),
    {
      name: "newspaper-generator-project",
      partialize: (s) => ({ settings: s.settings, articles: s.articles }),
      // Migration beim Laden aus localStorage: altes fontSizePt-Schema auf
      // neues fontSizes/zoom-Schema migrieren.
      merge: (persisted, currentState) => {
        const p = (persisted ?? {}) as { settings?: Partial<NewspaperSettings>; articles?: Article[] }
        return {
          ...currentState,
          settings: migrateSettings(p.settings ?? {}),
          articles: p.articles?.length ? p.articles : currentState.articles,
          expandedArticleId: p.articles?.[0]?.id ?? currentState.expandedArticleId,
        }
      },
    }
  )
)
