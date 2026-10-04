import { apiFetch } from '@/shared/api/client'

export interface ActivityType {
  id: string
  name: string
  source: 'default' | 'custom'
}

export interface Activity {
  id: string
  activityTypeId: string
  activityTypeName: string
  performedAt: string
  durationMinutes: number
  comment: string | null
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateActivityInput {
  activityTypeId: string
  performedAt?: string
  durationMinutes: number
  comment?: string
}

export interface UpdateActivityInput {
  activityTypeId?: string
  performedAt?: string
  durationMinutes?: number
  comment?: string | null
  /** Only `null` (removes the photo). Use `uploadPhoto` to set one. */
  photoUrl?: null
}

export interface ActivityListParams {
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface ActivityListResponse {
  items: Activity[]
  total: number
  page: number
  limit: number
}

function toQuery(params: ActivityListParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const activitiesApi = {
  /** Default types first, then the user's own; alphabetical within each group. */
  listTypes: () => apiFetch<{ items: ActivityType[] }>('/activity-types'),

  /** 409 when the name (case-insensitive) already exists among the types the user sees. */
  createType: (name: string) => apiFetch<ActivityType>('/activity-types/custom', { method: 'POST', json: { name } }),

  list: (params: ActivityListParams = {}) => apiFetch<ActivityListResponse>(`/activities${toQuery(params)}`),

  create: (body: CreateActivityInput) => apiFetch<Activity>('/activities', { method: 'POST', json: body }),

  update: (id: string, body: UpdateActivityInput) =>
    apiFetch<Activity>(`/activities/${id}`, { method: 'PATCH', json: body }),

  remove: (id: string) => apiFetch<void>(`/activities/${id}`, { method: 'DELETE' }),

  uploadPhoto: (id: string, body: { data: string; mimeType: string; filename?: string }) =>
    apiFetch<{ photoUrl: string }>(`/activities/${id}/photo`, { method: 'POST', json: body }),
}
