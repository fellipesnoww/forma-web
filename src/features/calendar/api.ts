import { apiFetch } from '@/shared/api/client'
import type { WorkoutSessionSummary } from '@/features/workout-sessions'
import type { Activity } from '@/features/activities'

export interface DaySummary {
  workoutCount: number
  activityCount: number
  /** Sum of the day's activity durations. */
  activityMinutes: number
}

export interface CalendarDay {
  /** YYYY-MM-DD in the profile's timezone. */
  date: string
  hasWorkout: boolean
  hasActivity: boolean
  /** Session and activity photos, oldest first, at most `photoLimit`. */
  photoUrls: string[]
  summary: DaySummary
}

export interface CalendarMonth {
  year: number
  month: number
  timezone: string
  photoLimit: number
  /** Only days with at least one record, in order. */
  days: CalendarDay[]
}

export interface CalendarDayDetail {
  date: string
  timezone: string
  hasWorkout: boolean
  hasActivity: boolean
  summary: DaySummary
  /** Oldest first. */
  workouts: WorkoutSessionSummary[]
  activities: Activity[]
}

export const calendarApi = {
  month: (year: number, month: number) => apiFetch<CalendarMonth>(`/calendar?year=${year}&month=${month}`),

  /** An empty day answers 200 with empty lists. */
  day: (date: string) => apiFetch<CalendarDayDetail>(`/calendar/${date}`),

  /** Days are grouped in the timezone saved on the profile, not one sent per request. */
  setTimezone: (timezone: string) => apiFetch<unknown>('/profile', { method: 'PATCH', json: { timezone } }),
}
