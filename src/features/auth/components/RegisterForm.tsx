import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { registerSchema, type RegisterInput } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { GoogleButton } from '@/features/auth/components/GoogleButton'

export function RegisterForm() {
  const { register: doRegister, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const afterAuth = () => navigate('/onboarding')

  const onSubmit = async (data: RegisterInput) => {
    setFormError(null)
    try {
      await doRegister(data.email, data.password, data.displayName)
      afterAuth()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível criar sua conta.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nome" autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && <p className="text-sm font-semibold text-danger-500">{formError}</p>}
        <Button type="submit" loading={isSubmitting} fullWidth>
          Criar conta
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs font-semibold text-ink-300">
        <div className="h-px flex-1 bg-border" />
        ou
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton
        onIdToken={async (idToken) => {
          setFormError(null)
          try {
            await loginWithGoogle(idToken)
            afterAuth()
          } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Não foi possível continuar com Google.')
          }
        }}
      />
    </div>
  )
}
