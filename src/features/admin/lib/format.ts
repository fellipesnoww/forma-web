import type { AccountStatus, Role } from '@/shared/auth/types'
import type {
  AchievementCriteria,
  AuditAction,
  AuditLog,
  AuditTargetType,
  ChallengeGoal,
  ChallengePeriod,
} from '@/features/admin/api'

export type Tone = 'success' | 'neutral' | 'warning' | 'danger' | 'primary'

export const ROLE_LABEL: Record<Role, string> = {
  user: 'Usuário',
  admin: 'Admin',
  super_user: 'Super user',
}

export const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  banned: 'Banido',
}

export const STATUS_TONE: Record<AccountStatus, Tone> = {
  active: 'success',
  inactive: 'neutral',
  banned: 'danger',
}

export const ROLE_TONE: Record<Role, Tone> = {
  user: 'neutral',
  admin: 'primary',
  super_user: 'warning',
}

export const PERIOD_LABEL: Record<ChallengePeriod, string> = {
  upcoming: 'Em breve',
  ongoing: 'Em andamento',
  ended: 'Encerrado',
}

export const PERIOD_TONE: Record<ChallengePeriod, Tone> = {
  upcoming: 'primary',
  ongoing: 'success',
  ended: 'neutral',
}

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'exercise.created': 'cadastrou o exercício',
  'exercise.updated': 'editou o exercício',
  'exercise.status_changed': 'alterou o status do exercício',
  'muscle_group.created': 'criou o grupo muscular',
  'muscle_group.updated': 'editou o grupo muscular',
  'user.status_changed': 'alterou o status de',
  'user.role_changed': 'alterou o papel de',
  'achievement.created': 'criou a conquista',
  'achievement.updated': 'editou a conquista',
  'achievement.deleted': 'excluiu a conquista',
  'challenge.created': 'criou o desafio',
  'challenge.updated': 'editou o desafio',
  'challenge.deleted': 'excluiu o desafio',
}

export const AUDIT_TARGET_LABEL: Record<AuditTargetType, string> = {
  exercise: 'Exercício',
  muscle_group: 'Grupo muscular',
  user: 'Usuário',
  achievement: 'Conquista',
  challenge: 'Desafio',
}

/** Dot color in the audit timeline, by how destructive the action is. */
export function auditTone(action: AuditAction, metadata: AuditLog['metadata']): Tone {
  if (action.endsWith('.deleted')) return 'danger'
  if (action === 'user.status_changed') return metadata?.to === 'active' ? 'success' : 'danger'
  if (action === 'user.role_changed') return 'warning'
  if (action.endsWith('.created')) return 'success'
  return 'primary'
}

function snapshotName(value: unknown): string | null {
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name
  return null
}

/** Best human label for the target: catalog changes carry name snapshots, status/role changes only the id. */
export function auditTargetName(log: AuditLog): string {
  const fromSnapshot = snapshotName(log.metadata?.after) ?? snapshotName(log.metadata?.before)
  if (fromSnapshot) return fromSnapshot
  const prefix = AUDIT_TARGET_LABEL[log.targetType] ?? log.targetType
  return log.targetId ? `${prefix} ${log.targetId.slice(0, 8)}` : prefix
}

/** "Ativo → Banido", "Usuário → Admin" for status/role changes; `null` otherwise. */
export function auditChange(log: AuditLog): string | null {
  const { from, to } = log.metadata ?? {}
  if (typeof from !== 'string' || typeof to !== 'string') return null
  const label = (v: string) => STATUS_LABEL[v as AccountStatus] ?? ROLE_LABEL[v as Role] ?? v
  return `${label(from)} → ${label(to)}`
}

export function auditReason(log: AuditLog): string | null {
  const reason = log.metadata?.reason
  return typeof reason === 'string' && reason ? reason : null
}

export function describeCriteria(criteria: AchievementCriteria, challengeName?: string): string {
  switch (criteria.type) {
    case 'streak_days':
      return `${criteria.days} dias seguidos`
    case 'workout_count':
      return `${criteria.count} treinos concluídos`
    case 'challenge_complete':
      return challengeName ? `concluir "${challengeName}"` : 'concluir um desafio'
  }
}

export function describeGoal(goal: ChallengeGoal, activityTypeName?: string): string {
  const suffix = activityTypeName ? ` de ${activityTypeName}` : ''
  switch (goal.type) {
    case 'workout_count':
      return `${goal.count} treinos`
    case 'activity_count':
      return `${goal.count} atividades${suffix}`
    case 'activity_minutes':
      return `${goal.minutes} min de atividade${suffix}`
  }
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const shortDateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (iso: string) => dateFmt.format(new Date(iso)).replace(/\./g, '')
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso)).replace(/\./g, '')

/** `endsAt` is exclusive, so the last day shown is the day before it. */
export function formatRange(startsAt: string, endsAt: string): string {
  const lastDay = new Date(new Date(endsAt).getTime() - 1)
  return `${shortDateFmt.format(new Date(startsAt))} – ${shortDateFmt.format(lastDay)}`.replace(/\./g, '')
}

export function displayName(user: { displayName: string | null; email: string }): string {
  return user.displayName || user.email.split('@')[0]
}
