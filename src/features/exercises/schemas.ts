import { z } from 'zod'

export const customExerciseSchema = z.object({
  name: z.string().min(1, 'Informe o nome').max(160),
  muscleGroupSlug: z.string().optional(),
})
export type CustomExerciseInput = z.infer<typeof customExerciseSchema>
