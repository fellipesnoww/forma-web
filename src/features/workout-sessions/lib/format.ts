import type { SessionExercise } from '@/features/workout-sessions/api'

const kgFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

export function formatKg(value: number) {
  return kgFormatter.format(value)
}

/** Accepts both "62,5" and "62.5". Returns null for anything that isn't a non-negative number. */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** "Qui, 14 jun 2026" */
export function formatLongDate(iso: string) {
  const text = new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/\./g, '').replace(/ de /g, ' ')
}

export interface SessionStats {
  durationMin: number
  exercisesDone: number
  exercisesTotal: number
  setsDone: number
  volumeKg: number
}

/** Only completed sets count toward the totals. */
export function computeStats(
  exercises: Pick<SessionExercise, 'sets'>[],
  performedAt: string,
  endedAt: string | null,
  /** Server value wins: a backdated session completed days later would otherwise show days. */
  durationMinutes?: number | null,
): SessionStats {
  let setsDone = 0
  let volumeKg = 0
  let exercisesDone = 0
  for (const ex of exercises) {
    const done = ex.sets.filter((s) => s.completed)
    if (done.length > 0) exercisesDone += 1
    setsDone += done.length
    volumeKg += done.reduce((sum, s) => sum + s.reps * s.weightKg, 0)
  }
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const durationMin = durationMinutes ?? Math.max(0, Math.round((end - new Date(performedAt).getTime()) / 60000))
  return { durationMin, exercisesDone, exercisesTotal: exercises.length, setsDone, volumeKg }
}
