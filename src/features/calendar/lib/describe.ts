import type { CalendarDay } from '@/features/calendar/api'
import { formatDayTitle } from '@/features/calendar/lib/dates'

/** Accessible name shared by grid cells and agenda rows: "Sábado, 3 de outubro: 1 treino, 2 atividades". */
export function describeDay(date: string, day?: CalendarDay) {
  const parts: string[] = []
  if (day?.summary.workoutCount) parts.push(plural(day.summary.workoutCount, 'treino', 'treinos'))
  if (day?.summary.activityCount) parts.push(plural(day.summary.activityCount, 'atividade', 'atividades'))
  return `${formatDayTitle(date)}: ${parts.length ? parts.join(', ') : 'sem registros'}`
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}
