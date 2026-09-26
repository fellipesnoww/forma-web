import { Link } from 'react-router-dom'
import { ClipboardList, Dumbbell, UserRound } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { Card } from '@/shared/ui/Card'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const quickLinks = [
  { to: '/app/sheets', label: 'Minhas planilhas', desc: 'Ver ou criar um treino', icon: ClipboardList },
  { to: '/app/exercises', label: 'Biblioteca de exercícios', desc: 'Buscar por grupo muscular', icon: Dumbbell },
  { to: '/app/profile', label: 'Meu perfil', desc: 'Medidas e dados pessoais', icon: UserRound },
]

export function HomePage() {
  const { profile } = useAuth()
  const name = profile?.displayName?.split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          {greeting()}{name ? `, ${name}` : ''}
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-500">O que você quer fazer hoje?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="flex h-full flex-col gap-3 transition-shadow hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-bold text-ink-900">{label}</p>
                <p className="mt-0.5 text-xs font-medium text-ink-500">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
