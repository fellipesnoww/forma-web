import { z } from 'zod'

export const profileUpdateSchema = z.object({
  displayName: z.string().min(1, 'Informe seu nome').max(120),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export const measurementSchema = z.object({
  weightKg: z.coerce.number().positive('Deve ser maior que 0'),
  heightCm: z.coerce.number().positive('Deve ser maior que 0'),
  waistCm: z.coerce.number().positive('Deve ser maior que 0').optional(),
  chestCm: z.coerce.number().positive('Deve ser maior que 0').optional(),
})
export type MeasurementInput = z.infer<typeof measurementSchema>
export type MeasurementFormValues = z.input<typeof measurementSchema>

export interface Measurement extends MeasurementInput {
  id: string
  recordedAt: string
}
