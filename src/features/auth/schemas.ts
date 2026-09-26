import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  displayName: z.string().min(1, 'Informe seu nome').max(120).optional(),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo de 8 caracteres')
    .regex(/[a-zA-Z]/, 'Precisa de ao menos 1 letra')
    .regex(/[0-9]/, 'Precisa de ao menos 1 número'),
})
export type RegisterInput = z.infer<typeof registerSchema>
