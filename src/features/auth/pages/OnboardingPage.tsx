import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Dumbbell, TrendingUp } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

const steps = [
  {
    icon: ClipboardList,
    title: 'Monte suas planilhas',
    desc: 'Organize seus treinos por dia da semana e reordene exercícios com um arrastar simples.',
  },
  {
    icon: Dumbbell,
    title: 'Explore a biblioteca',
    desc: 'Busque exercícios por grupo muscular ou crie os seus próprios.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe sua evolução',
    desc: 'Registre séries, cargas e sessões para ver seu progresso ao longo do tempo.',
  },
]

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const isLast = step === steps.length - 1
  const { icon: Icon, title, desc } = steps[step]

  const finish = () => {
    // ponytail: PATCH /profile (onboardingCompletedAt) not built yet (1.2 pending) — flagged locally so this
    // screen doesn't loop every login; swap for a real profile update once the backend ships it.
    localStorage.setItem('forma.onboardingSeen', '1')
    navigate('/app', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
          <Icon size={30} />
        </div>
        <h1 className="mt-6 text-xl font-extrabold text-ink-900">{title}</h1>
        <p className="mt-2 text-sm font-medium text-ink-500">{desc}</p>

        <div className="mt-8 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary-500' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" fullWidth onClick={() => setStep((s) => s - 1)}>
              Voltar
            </Button>
          )}
          <Button fullWidth onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
            {isLast ? 'Começar' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
