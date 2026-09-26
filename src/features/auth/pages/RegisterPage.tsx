import { Link } from 'react-router-dom'
import { RegisterForm } from '@/features/auth/components/RegisterForm'

export function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-extrabold text-ink-900">Criar conta</h1>
        <p className="mt-1 text-sm text-ink-500">Comece a acompanhar seus treinos.</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-ink-500">
        Já tem conta?{' '}
        <Link to="/login" className="font-bold text-primary-500">
          Entrar
        </Link>
      </p>
    </div>
  )
}
