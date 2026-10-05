import { apiFetch } from '@/shared/api/client'

export interface Exercise {
  id: string
  name: string
  muscleGroup: string | null
  source: 'catalog' | 'custom'
  isActive: boolean
  mediaUrl: string | null
}

export interface LastSessionSet {
  setNumber: number
  reps: number
  weightKg: number
  completed: boolean
}

export interface LastSession {
  exerciseId: string | null
  customExerciseId: string | null
  name: string
  /** null = never logged. */
  lastSession: {
    sessionId: string
    sheetId: string
    sheetName: string
    performedAt: string
    completedAt: string | null
    sets: LastSessionSet[]
    /** The heaviest set (ties: more reps). No progression applied. */
    suggestion: { weightKg: number; reps: number }
  } | null
}

export const exercisesApi = {
  list: (q?: string) =>
    apiFetch<{ items: Exercise[] }>(`/exercises${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  createCustom: (body: { name: string; muscleGroupSlug?: string }) =>
    apiFetch<Exercise>('/exercises/custom', { method: 'POST', json: body }),

  updateCustom: (id: string, body: { name?: string; muscleGroupSlug?: string }) =>
    apiFetch<Exercise>(`/exercises/custom/${id}`, { method: 'PATCH', json: body }),

  deleteCustom: (id: string) => apiFetch<void>(`/exercises/custom/${id}`, { method: 'DELETE' }),

  /** `id` is a catalog or own custom exercise id. No history is a 200 with `lastSession: null`. */
  lastSession: (id: string, excludeSessionId?: string) =>
    apiFetch<LastSession>(
      `/exercises/${id}/last-session${excludeSessionId ? `?excludeSessionId=${excludeSessionId}` : ''}`,
    ),
}
