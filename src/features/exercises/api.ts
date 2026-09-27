import { apiFetch } from '@/shared/api/client'

export interface Exercise {
  id: string
  name: string
  muscleGroup: string | null
  source: 'catalog' | 'custom'
  isActive: boolean
  mediaUrl: string | null
}

export const exercisesApi = {
  list: (q?: string) =>
    apiFetch<{ items: Exercise[] }>(`/exercises${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  createCustom: (body: { name: string; muscleGroupSlug?: string }) =>
    apiFetch<Exercise>('/exercises/custom', { method: 'POST', json: body }),

  updateCustom: (id: string, body: { name?: string; muscleGroupSlug?: string }) =>
    apiFetch<Exercise>(`/exercises/custom/${id}`, { method: 'PATCH', json: body }),

  deleteCustom: (id: string) => apiFetch<void>(`/exercises/custom/${id}`, { method: 'DELETE' }),
}
