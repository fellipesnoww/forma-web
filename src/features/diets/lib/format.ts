import type { MealSummary } from '@/features/diets/api'

const kcalFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** 1850 → "1.850" */
export function formatKcal(value: number) {
  return kcalFormatter.format(value)
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** "4 refeições · 12 alimentos" */
export function describeCounts(mealCount: number, foodCount: number) {
  return `${plural(mealCount, 'refeição', 'refeições')} · ${plural(foodCount, 'alimento', 'alimentos')}`
}

/**
 * Next meal by the device clock: the first one at or after now, else tomorrow's first.
 * `time` is a plain "HH:mm" routine time, so string comparison is enough.
 */
export function nextMeal<T extends Pick<MealSummary, 'time'>>(meals: T[], now = new Date()): T | null {
  if (meals.length === 0) return null
  const sorted = meals.slice().sort((a, b) => a.time.localeCompare(b.time))
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return sorted.find((m) => m.time >= current) ?? sorted[0]
}
