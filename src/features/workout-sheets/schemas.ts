import { z } from 'zod'

export const sheetNameSchema = z.object({
  name: z.string().min(1, 'Informe o nome da planilha').max(120),
})
export type SheetNameInput = z.infer<typeof sheetNameSchema>
