import type { SheetDay, WorkoutSheet } from '@/features/workout-sheets/api'

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

/** Assumed time under load per set when the sheet only knows sets and rest. */
const SECONDS_PER_SET = 45
const DEFAULT_REST_SECONDS = 60
const DEFAULT_SETS = 3

export interface NextOccurrence {
  day: SheetDay
  /** 0 = today, 1 = tomorrow, … 6. */
  offset: number
}

/** The sheet's next training day counting from `todayWeekday` (inclusive). */
export function nextOccurrence(sheet: WorkoutSheet, todayWeekday = new Date().getDay()): NextOccurrence | null {
  let best: NextOccurrence | null = null
  for (const day of sheet.days) {
    const offset = (day.weekday - todayWeekday + 7) % 7
    if (!best || offset < best.offset) best = { day, offset }
  }
  return best
}

export function occurrenceLabel({ day, offset }: NextOccurrence) {
  if (offset === 0) return 'Hoje'
  if (offset === 1) return 'Amanhã'
  return WEEKDAY_NAMES[day.weekday]
}

/** Rough "~45 min": every set plus the rest after it, rounded to 5 minutes. */
export function estimateMinutes(day: SheetDay) {
  const seconds = day.exercises.reduce((sum, ex) => {
    const sets = ex.targetSets ?? DEFAULT_SETS
    return sum + sets * (SECONDS_PER_SET + (ex.defaultRestSeconds ?? DEFAULT_REST_SECONDS))
  }, 0)
  return Math.max(5, Math.round(seconds / 300) * 5)
}

/** weekday → sheet name, for the "Sua semana" panel. Two sheets on one weekday are joined. */
export function weekPlan(sheets: WorkoutSheet[]) {
  const plan = new Map<number, string[]>()
  for (const sheet of sheets) {
    for (const day of sheet.days) plan.set(day.weekday, [...(plan.get(day.weekday) ?? []), sheet.name])
  }
  return plan
}
