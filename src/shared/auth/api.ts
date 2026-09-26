import { apiFetch } from '@/shared/api/client'
import type { AuthPayload, Profile, User } from '@/shared/auth/types'

export const authApi = {
  register: (body: { email: string; password: string; displayName?: string }) =>
    apiFetch<AuthPayload>('/auth', { method: 'POST', json: body, skipAuth: true }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthPayload>('/auth/login', { method: 'POST', json: body, skipAuth: true }),

  loginWithGoogle: (idToken: string) =>
    apiFetch<AuthPayload>('/auth/google', { method: 'POST', json: { idToken }, skipAuth: true }),

  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () => apiFetch<{ user: User; profile: Profile }>('/auth/me'),
}
