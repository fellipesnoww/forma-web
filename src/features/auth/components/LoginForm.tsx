import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { GoogleButton } from '@/features/auth/components/GoogleButton'

export function LoginForm() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const afterAuth = (profile: { onboardingCompletedAt: string | null }) => {
    if (!profile.onboardingCompletedAt) {
      navigate('/onboarding')
      return
    }
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app'
    navigate(from, { replace: true })
  }

  const onSubmit = async (data: LoginInput) => {
    setFormError(null)
    try {
      afterAuth(await login(data.email, data.password))
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError && <p className="text-sm font-semibold text-danger-500">{formError}</p>}
        <Button type="submit" loading={isSubmitting} fullWidth>
          Entrar
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
            afterAuth(await loginWithGoogle(idToken))
          } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Não foi possível entrar com Google.')
          }
        }}
      />
    </div>
  )
}
