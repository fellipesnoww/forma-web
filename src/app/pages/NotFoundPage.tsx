import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-extrabold text-ink-900">Página não encontrada</h1>
      <Link to="/app">
        <Button>Voltar para o início</Button>
      </Link>
    </div>
  )
}
