"use client"

import { Download, Upload, FileJson, ImageIcon, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { useNewspaperStore } from "@/lib/newspaper/store"
import { NewspaperProject } from "@/lib/newspaper/types"
import { toast } from "sonner"

interface ToolbarProps {
  previewRef: React.RefObject<HTMLDivElement | null>
}

export function Toolbar({ previewRef }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const exportProject = useNewspaperStore((s) => s.exportProject)
  const loadProject = useNewspaperStore((s) => s.loadProject)

  const handleSaveJson = () => {
    const project = exportProject()
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const safeTitle = (project.settings.title || "newspaper").replace(/[^a-zA-Z0-9-_]+/g, "_").toLowerCase()
    const date = new Date().toISOString().slice(0, 10)
    a.download = `${safeTitle}_${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Projekt als JSON gespeichert")
  }

  const handleLoadJson = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as NewspaperProject
        if (!data.settings || !Array.isArray(data.articles)) {
          throw new Error("Ungültiges Projekt-Format")
        }
        loadProject(data)
        toast.success(`Projekt geladen: ${data.settings.title || "Unbenannt"}`)
      } catch (err) {
        toast.error("Datei konnte nicht geladen werden: " + (err as Error).message)
      }
    }
    reader.onerror = () => toast.error("Datei konnte nicht gelesen werden")
    reader.readAsText(file)
    // Reset input, damit dieselbe Datei erneut geladen werden kann
    e.target.value = ""
  }

  const handleExportPng = async () => {
    setIsExporting(true)
    try {
      const project = exportProject()
      const res = await fetch("/api/export-png", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || "Export fehlgeschlagen")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const safeTitle = (project.settings.title || "newspaper").replace(/[^a-zA-Z0-9-_]+/g, "_").toLowerCase()
      a.download = `${safeTitle}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("PNG exportiert")
    } catch (err) {
      toast.error("PNG-Export fehlgeschlagen: " + (err as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/30 bg-stone-950/60 px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-stone-100">
          Newspaper Generator
        </h1>
        <p className="text-xs text-stone-400">D&D Setting — Industrialisierungszeit</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          className="hidden"
        />
        <ToolbarButton onClick={handleLoadJson} icon={Upload} label="Laden" />
        <ToolbarButton onClick={handleSaveJson} icon={Download} label="Sichern" />
        <ToolbarButton
          onClick={handleExportPng}
          icon={isExporting ? Loader2 : ImageIcon}
          label={isExporting ? "Exportiere…" : "PNG Export"}
          disabled={isExporting}
          primary
          spin={isExporting}
        />
      </div>
    </header>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  disabled?: boolean
  primary?: boolean
  spin?: boolean
}

function ToolbarButton({ onClick, icon: Icon, label, disabled, primary, spin }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        primary
          ? "bg-amber-700 text-amber-50 hover:bg-amber-600 disabled:opacity-50"
          : "border border-amber-900/40 text-stone-200 hover:bg-stone-800/60 disabled:opacity-50",
      ].join(" ")}
    >
      <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />
      {label}
    </button>
  )
}

// Unused but kept for clarity (FileJson reserved for future use)
export const _FileJson = FileJson
