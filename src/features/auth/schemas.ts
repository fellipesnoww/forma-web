import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Informe sua senha'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    displayName: z.string().min(1, 'Informe seu nome').max(120).optional(),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .regex(/[A-Z]/, 'Precisa de uma letra maiúscula')
      .regex(/[0-9]/, 'Precisa de ao menos 1 número'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, { message: 'Aceite os termos para continuar' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
export type RegisterInput = z.infer<typeof registerSchema>
