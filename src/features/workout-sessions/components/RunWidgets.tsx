import { useEffect, useState, type ReactNode } from 'react'
import { Check, Clock, Cloud, CloudOff, AlertTriangle, Pause, Play, Timer, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'
import { isExerciseDone, type DraftExercise } from '@/features/workout-sessions/lib/draft'
import type { SyncStatus } from '@/features/workout-sessions/hooks/useSessionRunner'
import { formatClock, formatKg } from '@/features/workout-sessions/lib/format'
import type { RestTimer } from '@/features/workout-sessions/hooks/useRestTimer'
import type { LoadSuggestion } from '@/features/workout-sessions/lib/progression'
import { formatRest } from '@/features/workout-sheets/lib/rest'

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

/** "Sugestão: 62,5 kg · última 60 × 8". Tapping it puts the load on every set not done yet. */
export function SuggestionPill({ suggestion, onApply }: { suggestion: LoadSuggestion; onApply: () => void }) {
  return (
    <button
      type="button"
      onClick={onApply}
      title="Usar esta carga nas séries restantes"
      className="flex min-h-11 items-center gap-2 rounded-[11px] bg-primary-50 px-3.5 py-2 text-left text-[12.5px] font-bold text-primary-600 hover:bg-primary-100"
    >
      <Clock size={16} className="shrink-0 text-primary-500" />
      <span>
        Sugestão: {formatKg(suggestion.weightKg)} kg · última {formatKg(suggestion.last.weightKg)} × {suggestion.last.reps}
      </span>
    </button>
  )
}

/** Desktop rail: big countdown with −15/+15. Idle, it offers to start a rest manually. */
export function RestTimerCard({
  timer,
  restSeconds,
  configured,
}: {
  timer: RestTimer
  restSeconds: number
  configured: boolean
}) {
  const active = timer.status !== 'idle'
  const shown = active ? timer.remaining : restSeconds

  return (
    <section
      aria-label="Descanso"
      className="rounded-[20px] bg-[linear-gradient(160deg,#1C2C6B,#2D5BFF)] p-[22px] text-center text-white shadow-[0_14px_26px_rgba(45,91,255,0.3)]"
    >
      <p className="text-xs font-extrabold tracking-[1px] text-white/75">DESCANSO</p>
      <p role="timer" aria-live="off" className="mt-1 text-[46px] leading-tight font-extrabold tracking-[-1.5px] tabular-nums">
        {formatRest(shown)}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-white/75">
        {timer.finished && !active
          ? 'Descanso concluído · bora pra próxima série'
          : `de ${formatRest(active ? timer.total : restSeconds)} · ${configured ? 'configurado para este exercício' : 'padrão'}`}
      </p>
      <div className="mt-3.5 flex items-center justify-center gap-3">
        {active ? (
          <>
            <RoundButton label="Menos 15 segundos" onClick={() => timer.adjust(-15)}>
              −15
            </RoundButton>
            <RoundButton label={timer.status === 'paused' ? 'Retomar descanso' : 'Pausar descanso'} onClick={timer.togglePause} big>
              {timer.status === 'paused' ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
            </RoundButton>
            <RoundButton label="Mais 15 segundos" onClick={() => timer.adjust(15)}>
              +15
            </RoundButton>
            <RoundButton label="Pular descanso" onClick={timer.stop}>
              <X size={16} />
            </RoundButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => timer.start(restSeconds)}
            className="flex h-11 items-center gap-2 rounded-full bg-white/16 px-4 text-[13px] font-extrabold hover:bg-white/25"
          >
            <Timer size={16} />
            Iniciar descanso
          </button>
        )}
      </div>
    </section>
  )
}

function RoundButton({
  label,
  onClick,
  big,
  children,
}: {
  label: string
  onClick: () => void
  big?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-full text-xs font-extrabold',
        big ? 'h-[52px] w-[52px] bg-white text-primary-500' : 'h-11 w-11 bg-white/16 hover:bg-white/25',
      )}
    >
      {children}
    </button>
  )
}

/** Mobile action bar: compact countdown; tap pauses/resumes. */
export function RestPill({ timer }: { timer: RestTimer }) {
  if (timer.status === 'idle') return null
  return (
    <button
      type="button"
      onClick={timer.togglePause}
      aria-label={`Descanso ${formatRest(timer.remaining)}${timer.status === 'paused' ? ' (pausado)' : ''}`}
      className={cn(
        'flex h-12 shrink-0 items-center gap-1.5 rounded-[13px] bg-activity-50 px-3.5 text-[15px] font-extrabold text-activity-500 tabular-nums',
        timer.status === 'paused' && 'opacity-60',
      )}
    >
      <Timer size={16} strokeWidth={2.2} />
      {formatRest(timer.remaining)}
    </button>
  )
}
