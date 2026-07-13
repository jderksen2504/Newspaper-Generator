"use client"

import { Minus, Plus } from "lucide-react"

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  /** Anzahl Nachkommastellen für die Anzeige im Textfeld */
  decimals?: number
  /** Suffix (z.B. "pt" oder "%") */
  suffix?: string
  /** Wenn true, wird der Wert als Prozentzahl interpretiert (value * 100) */
  displayAsPercent?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Numerisches Textfeld mit +/− Buttons.
 *
 * - Klick auf +/−: erhöht/verringert um `step`
 * - Direkte Texteingabe: beliebige Gleitkommazahl möglich
 * - Beim Verlassen des Feldes wird auf min/max geclampt
 * - Enter bestätigt die Eingabe
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  decimals = 1,
  suffix,
  displayAsPercent = false,
  disabled,
  className = "",
}: NumberInputProps) {
  // Was im Textfeld angezeigt wird
  const displayValue = displayAsPercent
    ? Math.round(value * 100)
    : value.toFixed(decimals)

  const clamp = (v: number) => Math.max(min, Math.min(max, v))

  const handleTextInput = (raw: string) => {
    // Komma → Punkt (deutsche Eingabe)
    const cleaned = raw.replace(",", ".").replace(/[^\d.\-]/g, "")
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed)) {
      const finalValue = displayAsPercent ? parsed / 100 : parsed
      onChange(clamp(finalValue))
    }
  }

  const increment = () => onChange(clamp(+(value + step).toFixed(4)))
  const decrement = () => onChange(clamp(+(value - step).toFixed(4)))

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-md border border-amber-900/40 bg-stone-950/60 text-amber-200 hover:bg-stone-800/60 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Verkleinern"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div className="relative flex-1">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => {
            // Direkt den raw Wert übernehmen, aber noch nicht clampsen
            // (passiert beim Blur/Enter). So kann der User zwischendurch
            // z.B. "0." tippen ohne dass es sofort zu 0 wird.
            const raw = e.target.value
            const cleaned = raw.replace(",", ".").replace(/[^\d.\-]/g, "")
            const parsed = parseFloat(cleaned)
            if (!isNaN(parsed)) {
              const finalValue = displayAsPercent ? parsed / 100 : parsed
              // Nur übernehmen wenn im validen Bereich, sonst lassen wir die Eingabe zu
              // und clampen erst beim Blur
              onChange(finalValue)
            } else if (cleaned === "" || cleaned === "-" || cleaned === ".") {
              // Leere Eingabe oder Partial-Eingabe — ignoriere
            }
          }}
          onBlur={(e) => handleTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTextInput((e.target as HTMLInputElement).value)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          disabled={disabled}
          className="w-full rounded-md bg-stone-950/60 border border-amber-900/40 px-2 py-2 text-sm text-stone-100 text-center focus:outline-none focus:border-amber-600/60 tabular-nums"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={increment}
        disabled={disabled || value >= max}
        className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-md border border-amber-900/40 bg-stone-950/60 text-amber-200 hover:bg-stone-800/60 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Vergrößern"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
