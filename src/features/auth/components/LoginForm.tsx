import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from '@/features/auth/schemas'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { Input } from '@/shared/ui/Input'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
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

  const afterAuth = () => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/app'
    navigate(from, { replace: true })
  }

  const onSubmit = async (data: LoginInput) => {
    setFormError(null)
    try {
      await login(data.email, data.password)
      afterAuth()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton
        onIdToken={async (idToken) => {
          setFormError(null)
          try {
            await loginWithGoogle(idToken)
            afterAuth()
          } catch (err) {
            setFormError(err instanceof ApiError ? err.message : 'Não foi possível entrar com Google.')
          }
        }}
      />

      <div className="flex items-center gap-3 text-xs font-bold text-ink-200">
        <div className="h-px flex-1 bg-border" />
        ou com e-mail
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <div className="flex flex-col gap-2">
          <PasswordInput
            label="Senha"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Link to="/forgot-password" className="self-end text-xs font-bold text-primary-500">
            Esqueci minha senha
          </Link>
        </div>
        {formError && <p className="text-sm font-semibold text-danger-500">{formError}</p>}
        <Button type="submit" loading={isSubmitting} fullWidth>
          Entrar
        </Button>
      </form>
    </div>
  )
}
