import { apiFetch } from '@/shared/api/client'

/** Either a preset (last N days incl. today, profile timezone) or a custom inclusive range. */
export type ProgressRange = { period: '30' | '60' | '90' } | { from: string; to: string }

export type MeasurementMetric = 'weight' | 'height' | 'waist' | 'chest'

export interface LoadPoint {
  /** Local training day, YYYY-MM-DD, ascending. */
  date: string
  /** Heaviest set of the day (0 = bodyweight only). */
  maxWeightKg: number
  volumeKg: number
  totalReps: number
  setCount: number
}

export interface LoadProgress {
  exerciseId: string | null
  customExerciseId: string | null
  timezone: string
  from: string
  to: string
  points: LoadPoint[]
}

export interface MeasurementProgress {
  metric: MeasurementMetric
  unit: 'kg' | 'cm'
  timezone: string
  from: string
  to: string
  points: { measuredAt: string; value: number }[]
}

function rangeQuery(range: ProgressRange): Record<string, string> {
  return 'period' in range ? { period: range.period } : { from: range.from, to: range.to }
}

export const progressApi = {
  /** Unknown id or no history is a 200 with `points: []`. */
  load: (exercise: { id: string; source: 'catalog' | 'custom' }, range: ProgressRange) => {
    const params = new URLSearchParams({
      [exercise.source === 'custom' ? 'customExerciseId' : 'exerciseId']: exercise.id,
      ...rangeQuery(range),
    })
    return apiFetch<LoadProgress>(`/progress/load?${params}`)
  },

  measurements: (metric: MeasurementMetric, range: ProgressRange) => {
    const params = new URLSearchParams({ metric, ...rangeQuery(range) })
    return apiFetch<MeasurementProgress>(`/progress/measurements?${params}`)
  },
}
