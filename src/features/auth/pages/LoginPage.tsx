import { Link } from 'react-router-dom'
import { ClipboardList, Dumbbell, TrendingUp } from 'lucide-react'
import { AuthShell } from '@/features/auth/components/AuthShell'
import { LoginForm } from '@/features/auth/components/LoginForm'

const features = [
  { icon: ClipboardList, label: 'Planilhas por dia da semana' },
  { icon: Dumbbell, label: 'Séries, repetições e carga em cada exercício' },
  { icon: TrendingUp, label: 'Evolução de carga e medidas' },
]

export function LoginPage() {
  return (
    <AuthShell
      headline="Seu treino, do seu jeito — registrado do início ao fim."
      panel={features.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-3 text-sm font-semibold text-ink-100">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-primary-500/20 text-primary-400">
            <Icon size={16} strokeWidth={2.2} />
          </span>
          {label}
        </div>
      ))}
    >
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Entrar no Forma</h1>
      <p className="mt-1.5 text-sm font-medium text-ink-500">Entre com Google ou seu e-mail.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-4 text-center text-sm font-semibold text-ink-600">
        Não tem conta?{' '}
        <Link to="/register" className="font-extrabold text-primary-500">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
