const oneDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const twoDecimals = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 64.2 → "64,2"; null → "—" */
export function formatNumber(value: number | null) {
  return value == null ? '—' : oneDecimal.format(value)
}

/** Height is stored in cm and shown in meters, as in the design: 168 → "1,68". */
export function formatMeters(cm: number | null) {
  return cm == null ? '—' : twoDecimals.format(cm / 100)
}

/** "14 jun 2026" */
export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')
}
