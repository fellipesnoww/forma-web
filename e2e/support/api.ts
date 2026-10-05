import { randomUUID } from 'node:crypto'
import { expect, type APIRequestContext } from '@playwright/test'
import { API_URL } from './env'

/** Seeds data straight through the API, so each test only drives the UI for what it actually checks. */

export const TEST_PASSWORD = 'Senha1234'

export interface TestUser {
  id: string
  email: string
  password: string
  displayName: string
  accessToken: string
  refreshToken: string
}

export interface CatalogExercise {
  id: string
  name: string
  muscleGroup: string | null
  source: 'catalog' | 'custom'
}

export interface SeedSheetExercise {
  exerciseId?: string
  customExerciseId?: string
  targetSets?: number
  targetReps?: number
  defaultRestSeconds?: number
}

export interface SeedSheet {
  id: string
  name: string
  days: { id: string; weekday: number; exercises: { id: string; name: string }[] }[]
}

export interface SeedActivityType {
  id: string
  name: string
  source: 'default' | 'custom'
}

export interface SeedActivity {
  id: string
  activityTypeId: string
  activityTypeName: string
  performedAt: string
  durationMinutes: number
  comment: string | null
  photoUrl: string | null
}

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}+${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
}

export class Api {
  constructor(
    private readonly request: APIRequestContext,
    private token?: string,
  ) {}

  /** Raw status, for asserting refusals (403/409) without failing on them. */
  async status(method: string, path: string, data?: unknown): Promise<number> {
    const res = await this.request.fetch(`${API_URL}${path}`, {
      method,
      data,
      headers: this.token ? { authorization: `Bearer ${this.token}` } : undefined,
    })
    return res.status()
  }

  async call<T>(method: string, path: string, data?: unknown): Promise<T> {
    const res = await this.request.fetch(`${API_URL}${path}`, {
      method,
      data,
      headers: this.token ? { authorization: `Bearer ${this.token}` } : undefined,
    })
    expect(res.ok(), `${method} ${path} → ${res.status()} ${await res.text()}`).toBeTruthy()
    return (res.status() === 204 ? undefined : await res.json()) as T
  }

  async createUser(displayName = 'Ana Teste'): Promise<TestUser> {
    const email = uniqueEmail()
    const body = await this.call<{ accessToken: string; refreshToken: string; user: { id: string } }>('POST', '/auth', {
      email,
      password: TEST_PASSWORD,
      displayName,
    })
    this.token = body.accessToken
    return {
      id: body.user.id,
      email,
      password: TEST_PASSWORD,
      displayName,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    }
  }

  async catalog(): Promise<CatalogExercise[]> {
    const { items } = await this.call<{ items: CatalogExercise[] }>('GET', '/exercises')
    return items.filter((e) => e.source === 'catalog')
  }

  createCustomExercise(name: string, muscleGroupSlug?: string) {
    return this.call<CatalogExercise>('POST', '/exercises/custom', { name, muscleGroupSlug })
  }

  createSheet(name: string, days: { weekday: number; exercises: SeedSheetExercise[] }[]) {
    return this.call<SeedSheet>('POST', '/workout-sheets', {
      name,
      days: days.map((day, order) => ({
        weekday: day.weekday,
        order,
        exercises: day.exercises.map((ex, sortOrder) => ({ ...ex, sortOrder })),
      })),
    })
  }

  getSheet(id: string) {
    return this.call<SeedSheet>('GET', `/workout-sheets/${id}`)
  }

  createSession(body: {
    sheetId: string
    performedAt?: string
    comment?: string
    exercises: { exerciseId: string; sets: { reps: number; weightKg: number; completed: boolean }[] }[]
  }) {
    return this.call<{ id: string }>('POST', '/workout-sessions', {
      ...body,
      exercises: body.exercises.map((ex, sortOrder) => ({
        exerciseId: ex.exerciseId,
        sortOrder,
        sets: ex.sets.map((s, i) => ({ setNumber: i + 1, ...s })),
      })),
    })
  }

  uploadSessionPhoto(id: string, png: Buffer) {
    return this.call<{ photoUrl: string }>('POST', `/workout-sessions/${id}/photo`, {
      data: png.toString('base64'),
      mimeType: 'image/png',
      filename: 'treino.png',
    })
  }

  completeSession(id: string) {
    return this.call<unknown>('POST', `/workout-sessions/${id}/complete`)
  }

  getSession(id: string) {
    return this.call<{
      completedAt: string | null
      comment: string | null
      photoUrl: string | null
      exercises: { sets: { reps: number; weightKg: number; completed: boolean }[] }[]
    }>('GET', `/workout-sessions/${id}`)
  }

  listSessions() {
    return this.call<{ items: { id: string; completedAt: string | null }[]; total: number }>(
      'GET',
      '/workout-sessions',
    )
  }

  addMeasurement(body: { weightKg?: number; waistCm?: number; chestCm?: number; heightCm?: number }) {
    return this.call<unknown>('POST', '/profile/measurements', body)
  }

  listSheets() {
    return this.call<{ items: { id: string; name: string }[] }>('GET', '/workout-sheets')
  }

  createDiet(body: {
    name: string
    goal?: string
    meals?: { name: string; time: string; foods?: { name: string; quantity: number; unit: 'G' | 'KG' | 'ML' | 'L'; kcal: number }[] }[]
  }) {
    return this.call<SeedDiet>('POST', '/diets', body)
  }

  activateDiet(id: string) {
    return this.call<SeedDiet>('POST', `/diets/${id}/activate`)
  }

  getDiet(id: string) {
    return this.call<SeedDiet>('GET', `/diets/${id}`)
  }

  listDiets() {
    return this.call<{ items: SeedDiet[] }>('GET', '/diets')
  }

  listMeasurements() {
    return this.call<{ items: { weightKg: number | null }[] }>('GET', '/profile/measurements')
  }

  async activityTypes() {
    return (await this.call<{ items: SeedActivityType[] }>('GET', '/activity-types')).items
  }

  createActivityType(name: string) {
    return this.call<SeedActivityType>('POST', '/activity-types/custom', { name })
  }

  createActivity(body: { activityTypeId: string; durationMinutes: number; performedAt?: string; comment?: string }) {
    return this.call<SeedActivity>('POST', '/activities', body)
  }

  uploadActivityPhoto(id: string, png: Buffer) {
    return this.call<{ photoUrl: string }>('POST', `/activities/${id}/photo`, {
      data: png.toString('base64'),
      mimeType: 'image/png',
      filename: 'foto.png',
    })
  }

  getActivity(id: string) {
    return this.call<SeedActivity>('GET', `/activities/${id}`)
  }

  listActivities() {
    return this.call<{ items: SeedActivity[]; total: number }>('GET', '/activities?limit=100')
  }

  profile() {
    return this.call<{ timezone: string }>('GET', '/profile')
  }

  setTimezone(timezone: string) {
    return this.call<{ timezone: string }>('PATCH', '/profile', { timezone })
  }

  me() {
    return this.call<{ profile: { displayName: string | null; avatarUrl: string | null } }>('GET', '/auth/me')
  }

  // ---------- Admin (Fase 3) — the token must belong to an admin/super_user ----------

  adminSetRole(id: string, role: 'user' | 'admin' | 'super_user') {
    return role === 'admin'
      ? this.call<unknown>('PATCH', `/admin/users/${id}/role`, { role })
      : this.call<unknown>('PATCH', `/admin/admins/${id}/role`, { role })
  }

  adminSetStatus(id: string, status: 'active' | 'inactive' | 'banned', reason?: string) {
    return this.call<unknown>('PATCH', `/admin/users/${id}/status`, { status, reason })
  }

  async adminMuscleGroups() {
    return (await this.call<{ items: SeedMuscleGroup[] }>('GET', '/admin/muscle-groups')).items
  }

  adminCreateExercise(body: { name: string; muscleGroupSlug?: string; isActive?: boolean }) {
    return this.call<SeedAdminExercise>('POST', '/admin/exercises', body)
  }

  adminGetExercises(q: string) {
    return this.call<{ items: SeedAdminExercise[]; total: number }>(
      'GET',
      `/admin/exercises?q=${encodeURIComponent(q)}&status=all`,
    )
  }

  adminCreateChallenge(body: {
    name: string
    goal: { type: 'workout_count'; count: number } | { type: 'activity_minutes'; minutes: number; activityTypeId?: string }
    startsAt: string
    endsAt: string
    reward?: string
    isActive?: boolean
  }) {
    return this.call<SeedChallenge>('POST', '/admin/challenges', body)
  }

  adminGetChallenge(id: string) {
    return this.call<SeedChallenge>('GET', `/admin/challenges/${id}`)
  }

  adminCreateAchievement(body: {
    name: string
    description?: string
    criteria: { type: 'workout_count'; count: number } | { type: 'streak_days'; days: number }
    isActive?: boolean
  }) {
    return this.call<SeedAchievement>('POST', '/admin/achievements', body)
  }

  adminGetAchievement(id: string) {
    return this.call<SeedAchievement>('GET', `/admin/achievements/${id}`)
  }

  adminAuditLogs(query: string) {
    return this.call<{ items: { action: string; targetId: string | null; metadata: Record<string, unknown> | null }[] }>(
      'GET',
      `/admin/audit-logs?${query}`,
    )
  }

  adminGetUser(id: string) {
    return this.call<{ id: string; role: string; status: string }>('GET', `/admin/users/${id}`)
  }
}

export interface SeedMuscleGroup {
  id: string
  slug: string
  name: string
  exerciseCount: number
}

export interface SeedAdminExercise {
  id: string
  name: string
  isActive: boolean
  mediaUrl: string | null
  muscleGroup: { id: string; slug: string; name: string } | null
}

export interface SeedChallenge {
  id: string
  name: string
  isActive: boolean
  reward: string | null
  goal: Record<string, unknown>
  participantCount: number
}

export interface SeedAchievement {
  id: string
  name: string
  isActive: boolean
  iconUrl: string | null
  criteria: Record<string, unknown>
}

export interface SeedDiet {
  id: string
  name: string
  goal: string | null
  isActive: boolean
  totalKcal: number
  meals: { name: string; time: string; totalKcal: number; foods?: { name: string; quantity: number; unit: string; kcal: number }[] }[]
}
