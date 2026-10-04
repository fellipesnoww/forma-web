/** Calendar math on local `YYYY-MM-DD` strings, done in UTC so the browser's DST never shifts a day. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDay(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function todayIsoDay() {
  return new Date().toLocaleDateString('en-CA')
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** "2026-10" → { year: 2026, month: 10 }; anything else → null. */
export function parseMonthParam(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { year, month } : null
}

export function monthParam(year: number, month: number) {
  return `${year}-${pad(month)}`
}

export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Monday-first grid (same order as the sheet day picker): leading blanks, then every day of the month. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0 = Sunday
  const leading = (firstWeekday + 6) % 7
  const cells: (string | null)[] = Array.from({ length: leading }, () => null)
  for (let d = 1; d <= daysInMonth(year, month); d++) cells.push(toIsoDay(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const utcDate = (isoDay: string) => new Date(`${isoDay}T12:00:00Z`)

/** "outubro de 2026" → "Outubro 2026" */
export function formatMonthTitle(year: number, month: number) {
  const text = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return text.charAt(0).toUpperCase() + text.slice(1).replace(' de ', ' ')
}

/** "Sábado, 3 de outubro" */
export function formatDayTitle(isoDay: string) {
  const text = utcDate(isoDay).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "sáb" */
export function formatWeekdayShort(isoDay: string) {
  return utcDate(isoDay).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')
}

export const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

