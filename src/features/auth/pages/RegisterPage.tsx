import { Link } from 'react-router-dom'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

export function RegisterPage() {
  return (
    <AuthShell
      headline="Crie sua conta e monte seu primeiro treino hoje."
      panel={
        <p className="text-sm font-medium leading-relaxed text-ink-100/80">
          Depois do cadastro você completa peso, altura e medidas no seu perfil.
        </p>
      }
    >
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Criar conta</h1>
        <p className="text-sm font-semibold text-ink-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-extrabold text-primary-500">
            Entrar
          </Link>
        </p>
      </div>
      <RegisterForm />
    </AuthShell>
  )
}
