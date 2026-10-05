const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

/** "12 jun" from YYYY-MM-DD or a full ISO datetime (local day). */
export function formatShortDate(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '').replace(' de ', ' ')
}

/** "jun" */
export function formatMonth(value: string) {
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  const text = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Days between two YYYY-MM-DD, inclusive. */
export function rangeDays(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

/** First→last change: "↑ 25%" for loads, "↓ 1,8 kg" for measurements. */
export function describeChange(first: number, last: number, mode: 'percent' | 'absolute', unit = '') {
  const delta = last - first
  if (delta === 0) return { text: 'sem variação', direction: 0 as const }
  const arrow = delta > 0 ? '↑' : '↓'
  if (mode === 'percent') {
    if (first === 0) return { text: `${arrow} ${formatNumber(Math.abs(delta))} ${unit}`.trim(), direction: Math.sign(delta) as 1 | -1 }
    return { text: `${arrow} ${Math.round((Math.abs(delta) / first) * 100)}%`, direction: Math.sign(delta) as 1 | -1 }
  }
  return { text: `${arrow} ${formatNumber(Math.abs(delta))} ${unit}`.trim(), direction: Math.sign(delta) as 1 | -1 }
}
