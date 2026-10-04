import { apiFetch } from '@/shared/api/client'
import type { Profile } from '@/shared/auth/types'
import type { Measurement, MeasurementInput, ProfileDetails } from '@/features/profile/schemas'

export const profileApi = {
  /** Current body values are the latest of each field across measurements. */
  get: () => apiFetch<ProfileDetails>('/profile'),

  update: (body: { displayName?: string }) =>
    apiFetch<Profile>('/profile', { method: 'PATCH', json: body }),

  /** Uploads and sets the avatar in one call — `PATCH /profile` doesn't accept `avatarUrl`. */
  uploadAvatar: (data: string, mimeType: string, filename?: string) =>
    apiFetch<{ avatarUrl: string }>('/profile/avatar', { method: 'POST', json: { data, mimeType, filename } }),

  listMeasurements: () =>
    apiFetch<{ items: Measurement[] }>('/profile/measurements').then((res) => res.items),

  addMeasurement: (body: MeasurementInput) =>
    apiFetch<Measurement>('/profile/measurements', { method: 'POST', json: body }),
}
