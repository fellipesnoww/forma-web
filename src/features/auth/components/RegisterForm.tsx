import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { registerSchema, type RegisterInput } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { Input } from '@/shared/ui/Input'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { PasswordStrengthMeter } from '@/features/auth/components/PasswordStrengthMeter'
import { Button } from '@/shared/ui/Button'
import { GoogleButton } from '@/features/auth/components/GoogleButton'

export function RegisterForm() {
  const { register: doRegister, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const password = watch('password') ?? ''
  const afterAuth = () => navigate('/app')

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
        <div className="flex flex-col gap-2.5">
          <PasswordInput
            label="Senha"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <PasswordInput
          label="Confirmar senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <label className="flex items-start gap-2.5 text-xs font-semibold leading-snug text-ink-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary-500 focus:ring-2 focus:ring-primary-100"
            {...register('acceptTerms')}
          />
          <span>
            Li e aceito os <span className="font-bold text-primary-500">Termos de uso</span> e a{' '}
            <span className="font-bold text-primary-500">Política de privacidade</span>
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs font-medium text-danger-500">{errors.acceptTerms.message}</p>}
        {formError && <p className="text-sm font-semibold text-danger-500">{formError}</p>}
        <Button type="submit" loading={isSubmitting} fullWidth>
          Criar conta
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs font-bold text-ink-200">
        <div className="h-px flex-1 bg-border" />
        ou continue com
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
