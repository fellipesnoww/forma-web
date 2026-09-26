import { apiFetch } from '@/shared/api/client'
import type { Profile } from '@/shared/auth/types'
import type { Measurement, MeasurementInput } from '@/features/profile/schemas'

export interface StoredMedia {
  id: string
  url: string
  mimeType: string
  sizeBytes: number
  filename: string | null
  createdAt: string
}

export const profileApi = {
  update: (body: { displayName?: string; avatarUrl?: string }) =>
    apiFetch<Profile>('/profile', { method: 'PATCH', json: body }),

  uploadAvatar: (data: string, mimeType: string, filename?: string) =>
    apiFetch<StoredMedia>('/media', { method: 'POST', json: { data, mimeType, filename } }),

  listMeasurements: () => apiFetch<Measurement[]>('/profile/measurements'),

  addMeasurement: (body: MeasurementInput) =>
    apiFetch<Measurement>('/profile/measurements', { method: 'POST', json: body }),
}
