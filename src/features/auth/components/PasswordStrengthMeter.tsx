import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const requirements = [
  { test: (p: string) => p.length >= 8, label: 'Mínimo de 8 caracteres' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uma letra maiúscula' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Um número' },
]

export function PasswordStrengthMeter({ password }: { password: string }) {
  const passed = requirements.map((r) => r.test(password))
  const score = passed.filter(Boolean).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < score ? 'bg-success-500' : 'bg-border')} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1">
        {requirements.map((r, i) => (
          <div
            key={r.label}
            className={cn('flex items-center gap-1.5 text-xs font-semibold', passed[i] ? 'text-success-600' : 'text-ink-300')}
          >
            <span className={cn('flex h-3.5 w-3.5 items-center justify-center rounded-full', passed[i] ? 'bg-success-500' : 'bg-border')}>
              <Check size={8} className="text-white" strokeWidth={4} />
            </span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}
