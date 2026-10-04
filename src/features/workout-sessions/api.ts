import { apiFetch } from '@/shared/api/client'

export interface SessionSet {
  id: string
  setNumber: number
  reps: number
  weightKg: number
  completed: boolean
}

export interface SessionExercise {
  id: string
  exerciseId: string | null
  customExerciseId: string | null
  name: string
  sortOrder: number
  sets: SessionSet[]
}

export interface WorkoutSessionSummary {
  id: string
  sheetId: string
  sheetName: string
  performedAt: string
  completedAt: string | null
  photoUrl: string | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkoutSession extends WorkoutSessionSummary {
  exercises: SessionExercise[]
}

export interface SessionSetInput {
  setNumber: number
  reps: number
  weightKg: number
  completed?: boolean
}

export interface SessionExerciseInput {
  exerciseId?: string
  customExerciseId?: string
  sortOrder: number
  sets: SessionSetInput[]
}

export interface CreateSessionInput {
  sheetId: string
  performedAt?: string
  comment?: string
  exercises: SessionExerciseInput[]
}

export interface UpdateSessionInput {
  performedAt?: string
  comment?: string | null
  /** Only `null` (removes the photo). Use `uploadPhoto` to set one. */
  photoUrl?: null
  exercises?: SessionExerciseInput[]
}

export interface SessionListParams {
  from?: string
  to?: string
  sheetId?: string
  page?: number
  limit?: number
}

export interface SessionListResponse {
  items: WorkoutSessionSummary[]
  total: number
  page: number
  limit: number
}

function toQuery(params: SessionListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const workoutSessionsApi = {
  list: (params: SessionListParams = {}) => apiFetch<SessionListResponse>(`/workout-sessions${toQuery(params)}`),

  get: (id: string) => apiFetch<WorkoutSession>(`/workout-sessions/${id}`),

  create: (body: CreateSessionInput) => apiFetch<WorkoutSession>('/workout-sessions', { method: 'POST', json: body }),

  update: (id: string, body: UpdateSessionInput) =>
    apiFetch<WorkoutSession>(`/workout-sessions/${id}`, { method: 'PATCH', json: body }),

  /** Idempotent: calling it on a finished session returns the original `completedAt`. */
  complete: (id: string) => apiFetch<WorkoutSession>(`/workout-sessions/${id}/complete`, { method: 'POST' }),

  uploadPhoto: (id: string, body: { data: string; mimeType: string; filename?: string }) =>
    apiFetch<{ photoUrl: string }>(`/workout-sessions/${id}/photo`, { method: 'POST', json: body }),
}
