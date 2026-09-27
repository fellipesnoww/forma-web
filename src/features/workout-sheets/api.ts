import { apiFetch } from '@/shared/api/client'

export interface SheetExercise {
  id: string
  exerciseId: string | null
  customExerciseId: string | null
  name: string
  sortOrder: number
  targetSets: number | null
  targetReps: number | null
}

export interface SheetDay {
  id: string
  weekday: number
  order: number
  exercises: SheetExercise[]
}

export interface WorkoutSheet {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  days: SheetDay[]
}

export interface WorkoutSheetSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface SheetExerciseInput {
  exerciseId?: string
  customExerciseId?: string
  sortOrder: number
  targetSets?: number
  targetReps?: number
}

export interface SheetDayInput {
  weekday: number
  order: number
  exercises: SheetExerciseInput[]
}

export interface WorkoutSheetInput {
  name: string
  days: SheetDayInput[]
}

export const workoutSheetsApi = {
  list: () => apiFetch<{ items: WorkoutSheetSummary[] }>('/workout-sheets'),

  get: (id: string) => apiFetch<WorkoutSheet>(`/workout-sheets/${id}`),

  create: (body: WorkoutSheetInput) => apiFetch<WorkoutSheet>('/workout-sheets', { method: 'POST', json: body }),

  update: (id: string, body: Partial<WorkoutSheetInput>) =>
    apiFetch<WorkoutSheet>(`/workout-sheets/${id}`, { method: 'PATCH', json: body }),

  remove: (id: string) => apiFetch<void>(`/workout-sheets/${id}`, { method: 'DELETE' }),

  reorder: (id: string, body: { dayId: string; exercises: { id: string; sortOrder: number }[] }) =>
    apiFetch<WorkoutSheet>(`/workout-sheets/${id}/reorder`, { method: 'PATCH', json: body }),
}
