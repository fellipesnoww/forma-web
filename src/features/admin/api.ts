import { apiFetch } from '@/shared/api/client'
import type { AccountStatus, Role } from '@/shared/auth/types'

/** Admin list format: `?page=&limit=` (limit max 100, default 20). */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

/** `data` is base64 without the data-URL prefix. Stored as global media (readable by any signed-in user). */
export interface MediaInput {
  data: string
  mimeType: string
  filename?: string
}

// ---------- 3.2 Exercises & muscle groups ----------

export interface MuscleGroupRef {
  id: string
  slug: string
  name: string
}

export interface AdminExercise {
  id: string
  name: string
  muscleGroup: MuscleGroupRef | null
  isActive: boolean
  mediaUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface MuscleGroup extends MuscleGroupRef {
  exerciseCount: number
}

export type ActiveFilter = 'active' | 'inactive' | 'all'

export interface AdminExerciseParams {
  q?: string
  muscleGroup?: string
  status?: ActiveFilter
  page?: number
  limit?: number
}

export interface CreateExerciseInput {
  name: string
  muscleGroupSlug?: string
  isActive?: boolean
  media?: MediaInput
}

export interface UpdateExerciseInput {
  name?: string
  muscleGroupSlug?: string | null
  media?: MediaInput
  /** Only `null`: removes the image. Can't be sent with `media`. */
  mediaUrl?: null
}

// ---------- 3.3 / 3.4 Users, admins, audit ----------

export interface AdminUserSummary {
  id: string
  email: string
  role: Role
  status: AccountStatus
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface AdminUserDetail extends AdminUserSummary {
  updatedAt: string
  authMethods: { password: boolean; oauthProvider: 'google' | 'apple' | null }
  profile: {
    timezone: string
    weightKg: number | null
    heightCm: number | null
    onboardingCompletedAt: string | null
  }
  stats: {
    workoutSheets: number
    workoutSessions: number
    completedWorkoutSessions: number
    freeActivities: number
    customExercises: number
    achievementsUnlocked: number
    challengesJoined: number
    lastActivityAt: string | null
  }
}

export interface AdminUserParams {
  q?: string
  status?: AccountStatus
  role?: Role
  page?: number
  limit?: number
}

export interface AdminAdminsParams {
  q?: string
  role?: Exclude<Role, 'user'>
  status?: AccountStatus
  page?: number
  limit?: number
}

export const AUDIT_ACTIONS = [
  'exercise.created',
  'exercise.updated',
  'exercise.status_changed',
  'muscle_group.created',
  'muscle_group.updated',
  'user.status_changed',
  'user.role_changed',
  'achievement.created',
  'achievement.updated',
  'achievement.deleted',
  'challenge.created',
  'challenge.updated',
  'challenge.deleted',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_TARGET_TYPES = ['exercise', 'muscle_group', 'user', 'achievement', 'challenge'] as const
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number]

export interface AuditLog {
  id: string
  /** `null` = done from the CLI, or the admin account was deleted. */
  actor: { id: string; email: string } | null
  action: AuditAction
  targetType: AuditTargetType
  targetId: string | null
  /** `{ from, to, reason? }` for status/role, `{ before, after }` snapshots for catalog changes. */
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogParams {
  actorId?: string
  action?: AuditAction
  targetType?: AuditTargetType
  targetId?: string
  /** ISO 8601 datetimes, inclusive, filtering on `createdAt`. */
  from?: string
  to?: string
  page?: number
  limit?: number
}

// ---------- 3.5 Achievements & challenges ----------

export type AchievementCriteria =
  | { type: 'streak_days'; days: number }
  | { type: 'workout_count'; count: number }
  | { type: 'challenge_complete'; challengeId: string }

export interface Achievement {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  criteria: AchievementCriteria
  isActive: boolean
  unlockCount: number
  createdAt: string
  updatedAt: string
}

export interface AchievementUnlock {
  userId: string
  email: string
  displayName: string | null
  unlockedAt: string
}

export interface CreateAchievementInput {
  name: string
  description?: string
  criteria: AchievementCriteria
  isActive?: boolean
  icon?: MediaInput
}

export interface UpdateAchievementInput {
  name?: string
  description?: string | null
  criteria?: AchievementCriteria
  isActive?: boolean
  icon?: MediaInput
  /** Only `null`: removes the icon. Can't be sent with `icon`. */
  iconUrl?: null
}

export type ChallengeGoal =
  | { type: 'workout_count'; count: number }
  | { type: 'activity_count'; count: number; activityTypeId?: string }
  | { type: 'activity_minutes'; minutes: number; activityTypeId?: string }

export type ChallengePeriod = 'upcoming' | 'ongoing' | 'ended'

export interface Challenge {
  id: string
  name: string
  description: string | null
  goal: ChallengeGoal
  reward: string | null
  startsAt: string
  /** Exclusive. */
  endsAt: string
  isActive: boolean
  period: ChallengePeriod
  participantCount: number
  createdAt: string
  updatedAt: string
}

export interface ChallengeInput {
  name: string
  description?: string | null
  goal: ChallengeGoal
  reward?: string | null
  startsAt: string
  endsAt: string
  isActive?: boolean
}

export interface ListParams {
  q?: string
  status?: ActiveFilter
  page?: number
  limit?: number
}

function toQuery(params: object) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const adminApi = {
  exercises: {
    list: (params: AdminExerciseParams = {}) =>
      apiFetch<Paginated<AdminExercise>>(`/admin/exercises${toQuery(params)}`),
    create: (body: CreateExerciseInput) => apiFetch<AdminExercise>('/admin/exercises', { method: 'POST', json: body }),
    update: (id: string, body: UpdateExerciseInput) =>
      apiFetch<AdminExercise>(`/admin/exercises/${id}`, { method: 'PATCH', json: body }),
    setStatus: (id: string, isActive: boolean) =>
      apiFetch<AdminExercise>(`/admin/exercises/${id}/status`, { method: 'PATCH', json: { isActive } }),
  },

  muscleGroups: {
    /** Not paginated: a small list meant for selects. */
    list: () => apiFetch<{ items: MuscleGroup[] }>('/admin/muscle-groups'),
    create: (body: { name: string; slug?: string }) =>
      apiFetch<MuscleGroup>('/admin/muscle-groups', { method: 'POST', json: body }),
    update: (id: string, body: { name?: string; slug?: string }) =>
      apiFetch<MuscleGroup>(`/admin/muscle-groups/${id}`, { method: 'PATCH', json: body }),
  },

  users: {
    list: (params: AdminUserParams = {}) => apiFetch<Paginated<AdminUserSummary>>(`/admin/users${toQuery(params)}`),
    get: (id: string) => apiFetch<AdminUserDetail>(`/admin/users/${id}`),
    setStatus: (id: string, body: { status: AccountStatus; reason?: string }) =>
      apiFetch<AdminUserSummary>(`/admin/users/${id}/status`, { method: 'PATCH', json: body }),
    /** super_user only. Only user → admin. */
    promote: (id: string, reason?: string) =>
      apiFetch<AdminUserSummary>(`/admin/users/${id}/role`, { method: 'PATCH', json: { role: 'admin', reason } }),
  },

  admins: {
    list: (params: AdminAdminsParams = {}) =>
      apiFetch<Paginated<AdminUserSummary>>(`/admin/admins${toQuery(params)}`),
    /** super_user only. Target must already be admin or super_user; `user` revokes panel access. */
    setRole: (id: string, body: { role: Role; reason?: string }) =>
      apiFetch<AdminUserSummary>(`/admin/admins/${id}/role`, { method: 'PATCH', json: body }),
  },

  auditLogs: {
    list: (params: AuditLogParams = {}) => apiFetch<Paginated<AuditLog>>(`/admin/audit-logs${toQuery(params)}`),
  },

  achievements: {
    list: (params: ListParams = {}) => apiFetch<Paginated<Achievement>>(`/admin/achievements${toQuery(params)}`),
    create: (body: CreateAchievementInput) =>
      apiFetch<Achievement>('/admin/achievements', { method: 'POST', json: body }),
    update: (id: string, body: UpdateAchievementInput) =>
      apiFetch<Achievement>(`/admin/achievements/${id}`, { method: 'PATCH', json: body }),
    /** 409 when someone already unlocked it: deactivate instead. */
    remove: (id: string) => apiFetch<void>(`/admin/achievements/${id}`, { method: 'DELETE' }),
    unlocks: (id: string, params: { page?: number; limit?: number } = {}) =>
      apiFetch<Paginated<AchievementUnlock>>(`/admin/achievements/${id}/unlocks${toQuery(params)}`),
  },

  challenges: {
    list: (params: ListParams & { period?: ChallengePeriod } = {}) =>
      apiFetch<Paginated<Challenge>>(`/admin/challenges${toQuery(params)}`),
    create: (body: ChallengeInput) => apiFetch<Challenge>('/admin/challenges', { method: 'POST', json: body }),
    update: (id: string, body: Partial<ChallengeInput>) =>
      apiFetch<Challenge>(`/admin/challenges/${id}`, { method: 'PATCH', json: body }),
    /** 409 when it has participants or an achievement depends on it: deactivate instead. */
    remove: (id: string) => apiFetch<void>(`/admin/challenges/${id}`, { method: 'DELETE' }),
  },
}
