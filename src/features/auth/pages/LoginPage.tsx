import { Link } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink-900">Entrar</h1>
        <p className="mt-1 text-sm text-ink-500">Bem-vinda de volta ao Forma.</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-ink-500">
        Não tem conta?{' '}
        <Link to="/register" className="font-bold text-primary-500">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
