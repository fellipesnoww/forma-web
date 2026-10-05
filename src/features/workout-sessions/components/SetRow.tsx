import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { DraftSet } from '@/features/workout-sessions/lib/draft'
import { formatKg, parseDecimal } from '@/features/workout-sessions/lib/format'

type RowState = 'done' | 'active' | 'pending'

/** Commits on blur/Enter, so a half-typed "62," never gets normalized away mid-edit. */
function NumberField({
  value,
  onCommit,
  label,
  decimal,
}: {
  value: number
  onCommit: (value: number) => void
  label: string
  decimal?: boolean
}) {
  const format = (v: number) => (decimal ? formatKg(v) : String(v))
  const [text, setText] = useState(format(value))
  const [shownValue, setShownValue] = useState(value)
  if (shownValue !== value) {
    setShownValue(value)
    setText(format(value))
  }

  const commit = () => {
    const parsed = parseDecimal(text)
    if (parsed === null) return setText(format(value))
    const next = decimal ? Math.round(parsed * 100) / 100 : Math.round(parsed)
    if (next !== value) onCommit(next)
    setText(format(next))
  }

  return (
    <input
      aria-label={label}
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="h-11 w-full max-w-24 rounded-[9px] border border-primary-200 bg-surface-muted px-3 text-center text-lg font-extrabold text-primary-500 tabular-nums focus:border-primary-500 focus:outline-2 focus:outline-primary-100 sm:text-left"
    />
  )
}

export function SetRow({
  index,
  set,
  state,
  onChange,
  onToggle,
}: {
  index: number
  set: DraftSet
  state: RowState
  onChange: (patch: Partial<DraftSet>) => void
  onToggle: () => void
}) {
  const label = `Série ${index + 1}`

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 sm:gap-3 sm:px-4',
        state === 'done' && 'border border-success-100 bg-success-50 py-2.5',
        state === 'active' && 'border-2 border-primary-500 bg-surface py-2 shadow-[0_6px_16px_rgba(45,91,255,0.12)]',
        state === 'pending' && 'border border-border bg-surface py-2.5 opacity-60',
      )}
    >
      <div
        className={cn(
          'w-14 shrink-0 text-[13px] font-extrabold sm:w-16 sm:text-sm',
          state === 'done' && 'text-success-600',
          state === 'active' && 'text-primary-500',
          state === 'pending' && 'text-ink-200',
        )}
      >
        {label}
      </div>

      {state === 'active' ? (
        <>
          <div className="flex flex-1 justify-center sm:justify-start">
            <NumberField label={`${label} · repetições`} value={set.reps} onCommit={(reps) => onChange({ reps })} />
          </div>
          <div className="flex flex-1 justify-center sm:justify-start">
            <NumberField
              label={`${label} · carga em kg`}
              value={set.weightKg}
              decimal
              onCommit={(weightKg) => onChange({ weightKg })}
            />
          </div>
        </>
      ) : (
        <>
          <div
            className={cn(
              'flex-1 text-center text-base font-extrabold tabular-nums sm:text-left sm:text-lg',
              state === 'pending' && 'font-bold text-ink-100',
            )}
          >
            {set.reps}
          </div>
          <div
            className={cn(
              'flex-1 text-center text-base font-extrabold tabular-nums sm:text-left sm:text-lg',
              state === 'pending' && 'font-bold text-ink-100',
            )}
          >
            {formatKg(set.weightKg)}
          </div>
        </>
      )}

      <div className="flex shrink-0 justify-end sm:w-28">
        {state === 'active' ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-11 items-center rounded-[9px] bg-primary-500 px-3.5 text-[13px] font-extrabold text-white sm:px-4"
          >
            <span className="sm:hidden">OK</span>
            <span className="hidden sm:inline">Concluir</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            disabled={state === 'pending'}
            aria-label={state === 'done' ? `Desfazer ${label}` : label}
            aria-pressed={state === 'done'}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-[9px]',
              state === 'done' ? 'text-white' : 'text-ink-100',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-[9px]',
                state === 'done' ? 'bg-success-500' : 'bg-surface-sunken',
              )}
            >
              <Check size={16} strokeWidth={3} />
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
