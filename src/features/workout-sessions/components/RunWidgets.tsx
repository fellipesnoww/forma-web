import { useEffect, useState } from 'react'
import { Check, Clock, Cloud, CloudOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'
import { isExerciseDone, type DraftExercise } from '@/features/workout-sessions/lib/draft'
import type { SyncStatus } from '@/features/workout-sessions/hooks/useSessionRunner'
import { formatClock } from '@/features/workout-sessions/lib/format'

export function ElapsedTimer({ startedAt, className }: { startedAt: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3.5 py-2 text-sm font-extrabold tabular-nums text-ink-900',
        className,
      )}
      aria-label="Tempo de treino"
    >
      <Clock size={16} className="text-ink-700" />
      {formatClock((now - new Date(startedAt).getTime()) / 1000)}
    </div>
  )
}

const syncCopy: Record<SyncStatus, { label: string; className: string }> = {
  idle: { label: 'Não iniciado', className: 'text-ink-400' },
  saving: { label: 'Salvando…', className: 'text-ink-500' },
  saved: { label: 'Salvo', className: 'text-success-600' },
  offline: { label: 'Sem conexão · salvo no aparelho', className: 'text-warning-600' },
  error: { label: 'Erro ao salvar', className: 'text-danger-600' },
}

export function SyncBadge({ status, error }: { status: SyncStatus; error?: string | null }) {
  const { label, className } = syncCopy[status]
  const Icon = status === 'offline' ? CloudOff : status === 'error' ? AlertTriangle : Cloud
  return (
    <span role="status" title={error ?? undefined} className={cn('flex items-center gap-1.5 text-xs font-bold', className)}>
      {status === 'saving' ? <Spinner size="sm" /> : <Icon size={14} />}
      {label}
    </span>
  )
}

export function ExerciseRail({
  exercises,
  activeIndex,
  onSelect,
}: {
  exercises: DraftExercise[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  const doneCount = exercises.filter(isExerciseDone).length
  const pct = exercises.length ? Math.round((doneCount / exercises.length) * 100) : 0

  return (
    <div className="rounded-[20px] border border-border bg-white p-[18px]">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[15px] font-extrabold text-ink-900">Exercícios</p>
        <span className="text-xs font-bold text-ink-400">
          {doneCount}/{exercises.length}
        </span>
      </div>
      <div className="mb-3.5 h-1.5 overflow-hidden rounded-full bg-[#F0F2F6]">
        <div className="h-full rounded-full bg-primary-500 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ol className="flex flex-col gap-1.5">
        {exercises.map((ex, i) => {
          const done = isExerciseDone(ex)
          const active = i === activeIndex
          return (
            <li key={ex.key}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left',
                  active ? 'bg-primary-50' : 'hover:bg-surface-soft',
                )}
              >
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-xs font-extrabold',
                    done && !active && 'bg-success-500 text-white',
                    active && 'bg-primary-500 text-white',
                    !done && !active && 'bg-[#F0F2F6] text-ink-200',
                  )}
                >
                  {done && !active ? <Check size={14} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'flex-1 truncate text-[13.5px]',
                    active && 'font-extrabold text-primary-500',
                    done && !active && 'font-semibold text-ink-400 line-through',
                    !done && !active && 'font-semibold text-ink-700',
                  )}
                >
                  {ex.name}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
