import { z } from 'zod'

/** Mirrors the backend: whole minutes, 1..1440 (over 24 h is almost certainly a typo). */
export const MAX_DURATION_MINUTES = 24 * 60
export const COMMENT_MAX = 1000

export const activityTypeNameSchema = z.string().trim().min(1, 'Informe o nome').max(80, 'Máximo de 80 caracteres')

export const activitySchema = z.object({
  activityTypeId: z.string().min(1, 'Escolha o tipo'),
  /** `<input type="datetime-local">` value, in the browser's timezone. */
  performedAt: z
    .string()
    .min(1, 'Informe data e hora')
    .refine((value) => new Date(value).getTime() <= Date.now(), 'A data não pode estar no futuro'),
  // An empty number input submits "", which `z.coerce.number()` would turn into 0.
  durationMinutes: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce
      .number({ error: 'Informe a duração' })
      .int('Use minutos inteiros')
      .min(1, 'Deve ser maior que 0')
      .max(MAX_DURATION_MINUTES, `Máximo de ${MAX_DURATION_MINUTES} min (24 h)`),
  ),
  comment: z.string().max(COMMENT_MAX),
})
export type ActivityFormInput = z.infer<typeof activitySchema>
export type ActivityFormValues = z.input<typeof activitySchema>
