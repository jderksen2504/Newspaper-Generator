"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { useNewspaperStore } from "@/lib/newspaper/store"
import { DEFAULT_FONT_SIZES, FontSizeConfig, PAPER_DIMENSIONS, PaperFormat, TitleStyle } from "@/lib/newspaper/types"
import { NumberInput } from "./number-input"

const TITLE_STYLES: { value: TitleStyle; label: string }[] = [
  { value: "fraktur", label: "Fraktur (UnifrakturMaguntia)" },
  { value: "blackletter", label: "Blackletter (UnifrakturCook)" },
  { value: "serif", label: "Serif (EB Garamond)" },
  { value: "italic", label: "Italic (EB Garamond Italic)" },
]

const PAPER_FORMATS = (Object.keys(PAPER_DIMENSIONS) as PaperFormat[]).map((key) => ({
  value: key,
  label: PAPER_DIMENSIONS[key].label,
}))

const FONT_SIZE_FIELDS: { key: keyof FontSizeConfig; label: string; min: number; max: number; step: number }[] = [
  { key: "stampHeading", label: "Stempel-Überschrift", min: 4, max: 16, step: 0.5 },
  { key: "stampContent", label: "Stempel-Text", min: 4, max: 16, step: 0.5 },
  { key: "title", label: "Zeitungstitel", min: 12, max: 60, step: 1 },
  { key: "meta", label: "Datum / Ort / Ausgabe", min: 4, max: 16, step: 0.5 },
  { key: "articleHeadline", label: "Artikel-Headline (Basis)", min: 8, max: 36, step: 0.5 },
  { key: "articleSubheadline", label: "Artikel-Subheadline", min: 6, max: 18, step: 0.5 },
  { key: "articleBody", label: "Artikel-Text", min: 5, max: 20, step: 0.5 },
]

export function SettingsPanel() {
  const settings = useNewspaperStore((s) => s.settings)
  const updateSettings = useNewspaperStore((s) => s.updateSettings)
  const updateFontSizes = useNewspaperStore((s) => s.updateFontSizes)
  const resetZoom = useNewspaperStore((s) => s.resetZoom)
  const resetSettings = useNewspaperStore((s) => s.resetSettings)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [fontSizesOpen, setFontSizesOpen] = useState(false)

  return (
    <section className="space-y-4">
      {/* Zeitungskopf */}
      <Block title="Zeitungskopf">
        <Field label="Titel">
          <input
            type="text"
            value={settings.title}
            onChange={(e) => updateSettings({ title: e.target.value })}
            className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <input
              type="text"
              value={settings.date}
              onChange={(e) => updateSettings({ date: e.target.value })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
            />
          </Field>
          <Field label="Ort">
            <input
              type="text"
              value={settings.location}
              onChange={(e) => updateSettings({ location: e.target.value })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
            />
          </Field>
        </div>

        <Field label="Ausgabe">
          <input
            type="text"
            value={settings.issue}
            onChange={(e) => updateSettings({ issue: e.target.value })}
            className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
          />
        </Field>

        {/* Stempel Links */}
        <div className="space-y-2 pt-2 border-t border-amber-900/20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200/80">Stempel Links</div>
          <Field label="Überschrift">
            <input
              type="text"
              value={settings.stampLeft.heading}
              onChange={(e) => updateSettings({ stampLeft: { ...settings.stampLeft, heading: e.target.value } })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
            />
          </Field>
          <Field label="Inhalt">
            <textarea
              value={settings.stampLeft.content}
              onChange={(e) => updateSettings({ stampLeft: { ...settings.stampLeft, content: e.target.value } })}
              rows={2}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60 resize-y"
            />
          </Field>
        </div>

        {/* Stempel Rechts */}
        <div className="space-y-2 pt-2 border-t border-amber-900/20">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200/80">Stempel Rechts</div>
          <Field label="Überschrift">
            <input
              type="text"
              value={settings.stampRight.heading}
              onChange={(e) => updateSettings({ stampRight: { ...settings.stampRight, heading: e.target.value } })}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
            />
          </Field>
          <Field label="Inhalt">
            <textarea
              value={settings.stampRight.content}
              onChange={(e) => updateSettings({ stampRight: { ...settings.stampRight, content: e.target.value } })}
              rows={2}
              className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60 resize-y"
            />
          </Field>
        </div>

        <Field label="Titelstil">
          <select
            value={settings.titleStyle}
            onChange={(e) => updateSettings({ titleStyle: e.target.value as TitleStyle })}
            className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
          >
            {TITLE_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Block>

      {/* Schriftgröße — Globaler Zoom */}
      <Block title="Schriftgröße">
        <Field label="Globaler Zoom">
          <NumberInput
            value={settings.zoom}
            onChange={(v) => updateSettings({ zoom: v })}
            min={0.5}
            max={2.0}
            step={0.05}
            decimals={2}
            suffix="%"
            displayAsPercent
          />
          <div className="flex justify-between text-[10px] text-stone-500 mt-1">
            <span>50%</span>
            <button
              onClick={resetZoom}
              className="text-red-400 hover:text-red-300 hover:underline"
            >
              Zurücksetzen
            </button>
            <span>200%</span>
          </div>
        </Field>

        {/* Erweitert: Pro-Zone-Schriftgrößen */}
        <button
          onClick={() => setFontSizesOpen(!fontSizesOpen)}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-200 mt-2"
        >
          {fontSizesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Erweitert (pro Zone)
        </button>

        {fontSizesOpen && (
          <div className="space-y-3 pt-2 border-t border-amber-900/20 mt-2">
            {FONT_SIZE_FIELDS.map((f) => (
              <Field key={f.key} label={`${f.label}`}>
                <NumberInput
                  value={settings.fontSizes[f.key]}
                  onChange={(v) => updateFontSizes({ [f.key]: v })}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  decimals={1}
                  suffix="pt"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>{f.min} pt</span>
                  <span>{f.max} pt</span>
                </div>
              </Field>
            ))}
            <button
              onClick={() => updateFontSizes(DEFAULT_FONT_SIZES)}
              className="text-xs text-red-400 hover:text-red-300 hover:underline"
            >
              Schriftgrößen zurücksetzen
            </button>
          </div>
        )}
      </Block>

      {/* Papierformat */}
      <Block title="Papierformat">
        <Field label="Format">
          <select
            value={settings.paperFormat}
            onChange={(e) => updateSettings({ paperFormat: e.target.value as PaperFormat })}
            className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-600/60"
          >
            {PAPER_FORMATS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-200"
        >
          {advancedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Erweitert
        </button>

        {advancedOpen && (
          <div className="space-y-2 pt-1">
            <Field label="Spaltenanzahl (Standard: 3)">
              <NumberInput
                value={settings.columnCount}
                onChange={(v) => updateSettings({ columnCount: Math.round(v) })}
                min={2}
                max={6}
                step={1}
                decimals={0}
              />
            </Field>
            <button
              onClick={() => updateSettings({ columnCount: 3 })}
              className="text-xs text-red-400 hover:text-red-300 hover:underline"
            >
              Auf Standard zurücksetzen
            </button>
          </div>
        )}
      </Block>

      {/* Reset */}
      <button
        onClick={resetSettings}
        className="flex items-center gap-2 text-xs text-stone-400 hover:text-red-400"
      >
        <RotateCcw className="h-3 w-3" />
        Alle Einstellungen zurücksetzen
      </button>
    </section>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-md border border-amber-900/30 bg-stone-900/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-200/80">{title}</h2>
      {children}
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
