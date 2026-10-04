import { randomUUID } from 'node:crypto'
import { expect, type APIRequestContext } from '@playwright/test'
import { API_URL } from './env'

/** Seeds data straight through the API, so each test only drives the UI for what it actually checks. */

export const TEST_PASSWORD = 'Senha1234'

export interface TestUser {
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

  private async call<T>(method: string, path: string, data?: unknown): Promise<T> {
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
    const body = await this.call<{ accessToken: string; refreshToken: string }>('POST', '/auth', {
      email,
      password: TEST_PASSWORD,
      displayName,
    })
    this.token = body.accessToken
    return { email, password: TEST_PASSWORD, displayName, ...body }
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

  me() {
    return this.call<{ profile: { displayName: string | null; avatarUrl: string | null } }>('GET', '/auth/me')
  }
}
