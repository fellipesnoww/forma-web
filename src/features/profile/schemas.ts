import { z } from 'zod'

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1, 'Informe seu nome').max(120),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

/** An empty number input submits "", which `z.coerce.number()` would turn into 0 and reject. */
const optionalPositive = z.preprocess(
  (value) => (value === '' || value == null ? undefined : value),
  z.coerce.number().positive('Deve ser maior que 0').optional(),
)

export const measurementSchema = z.object({
  weightKg: z.coerce.number().positive('Deve ser maior que 0'),
  heightCm: z.coerce.number().positive('Deve ser maior que 0'),
  waistCm: optionalPositive,
  chestCm: optionalPositive,
})
export type MeasurementInput = z.infer<typeof measurementSchema>
export type MeasurementFormValues = z.input<typeof measurementSchema>

/** API shape: every measurement field is independently optional, so each can be null. */
export interface Measurement {
  id: string
  weightKg: number | null
  heightCm: number | null
  waistCm: number | null
  chestCm: number | null
  createdAt: string
}
