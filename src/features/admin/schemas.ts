import { z } from 'zod'

/** An empty number input submits "", which `z.coerce.number()` would turn into 0. */
const positiveInt = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.number({ error: message }).int('Use um número inteiro').min(1, 'Deve ser maior que 0'),
  )

/** Mirrors `POST/PATCH /admin/exercises`: 1–160 chars, unique ignoring case (409 from the server). */
export const adminExerciseSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(160, 'Máximo de 160 caracteres'),
  muscleGroupSlug: z.string(),
  /** Create only; afterwards the status is the table toggle (`PATCH /status`). */
  isActive: z.boolean(),
})
export type AdminExerciseFormInput = z.infer<typeof adminExerciseSchema>

/** Lowercase, digits and hyphens. Empty = derived from the name by the server. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const muscleGroupSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(80, 'Máximo de 80 caracteres'),
  slug: z
    .string()
    .trim()
    .refine((v) => v === '' || SLUG_PATTERN.test(v), 'Use letras minúsculas, números e hífens'),
})
export type MuscleGroupFormInput = z.infer<typeof muscleGroupSchema>

export const CRITERIA_TYPES = ['streak_days', 'workout_count', 'challenge_complete'] as const

export const achievementSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome').max(120, 'Máximo de 120 caracteres'),
    description: z.string().trim().max(500, 'Máximo de 500 caracteres'),
    criteriaType: z.enum(CRITERIA_TYPES),
    criteriaValue: z.preprocess((value) => (value === '' || value == null ? undefined : value), z.coerce.number().optional()),
    challengeId: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.criteriaType === 'challenge_complete') {
      if (!data.challengeId) ctx.addIssue({ code: 'custom', path: ['challengeId'], message: 'Escolha o desafio' })
      return
    }
    const v = data.criteriaValue
    if (v === undefined || !Number.isInteger(v) || v < 1) {
      ctx.addIssue({ code: 'custom', path: ['criteriaValue'], message: 'Informe um número inteiro maior que 0' })
    }
  })
export type AchievementFormInput = z.infer<typeof achievementSchema>
export type AchievementFormValues = z.input<typeof achievementSchema>

export const GOAL_TYPES = ['workout_count', 'activity_count', 'activity_minutes'] as const

export const challengeSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome').max(120, 'Máximo de 120 caracteres'),
    description: z.string().trim().max(1000, 'Máximo de 1000 caracteres'),
    goalType: z.enum(GOAL_TYPES),
    goalValue: positiveInt('Informe a meta'),
    activityTypeId: z.string(),
    reward: z.string().trim().max(255, 'Máximo de 255 caracteres'),
    /** `<input type="datetime-local">` values, in the browser's timezone. */
    startsAt: z.string().min(1, 'Informe o início'),
    endsAt: z.string().min(1, 'Informe o fim'),
    isActive: z.boolean(),
  })
  .refine((data) => !data.startsAt || !data.endsAt || new Date(data.endsAt) > new Date(data.startsAt), {
    path: ['endsAt'],
    message: 'O fim deve ser depois do início',
  })
export type ChallengeFormInput = z.infer<typeof challengeSchema>
export type ChallengeFormValues = z.input<typeof challengeSchema>
