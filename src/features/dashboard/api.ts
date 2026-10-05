import { apiFetch } from '@/shared/api/client'

export interface StatsOverview {
  timezone: string
  /** YYYY-MM-DD in the profile timezone. */
  today: string
  week: {
    from: string
    to: string
    /** Σ reps × weightKg over every logged set. */
    volumeKg: number
    previousVolumeKg: number
    /** null when the previous week was 0. */
    volumeChangePct: number | null
    workoutCount: number
    /** Always 7 items, oldest first, zeros on rest days. weekday 0 = Sunday. */
    days: { date: string; weekday: number; volumeKg: number; workoutCount: number }[]
  }
  month: {
    year: number
    month: number
    workoutCount: number
    plannedWorkoutCount: number
    /** null without sheets. */
    planCompletionPct: number | null
    activityCount: number
    activityMinutes: number
    /** Most frequent first. */
    activityTypes: { activityTypeId: string; name: string; count: number; minutes: number }[]
  }
}

export const statsApi = {
  overview: () => apiFetch<StatsOverview>('/stats/overview'),
}
