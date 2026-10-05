import { Link } from 'react-router-dom'
import { Copy, Pencil, Play, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { WorkoutSheet, WorkoutSheetSummary } from '@/features/workout-sheets/api'
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABELS } from '@/features/workout-sheets/lib/weekday'
import { estimateMinutes, nextOccurrence, occurrenceLabel } from '@/features/workout-sheets/lib/schedule'

interface Props {
  sheet: WorkoutSheetSummary
  /** Full detail, once loaded — the list route has no days. */
  detail?: WorkoutSheet
  onDelete: () => void
  onDuplicate: () => void
  duplicating?: boolean
}

export function SheetCard({ sheet, detail, onDelete, onDuplicate, duplicating }: Props) {
  const next = detail ? nextOccurrence(detail) : null
  const isToday = next?.offset === 0
  const weekdays = new Set(detail?.days.map((d) => d.weekday))

  return (
    <article
      aria-label={sheet.name}
      className={cn(
        'flex flex-col rounded-[22px] bg-surface p-5 sm:p-[22px]',
        isToday ? 'border-2 border-primary-500 shadow-[0_10px_24px_rgba(45,91,255,0.10)]' : 'border border-border',
      )}
    >
      <div className="flex min-h-6 items-center">
        {next && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11.5px] font-extrabold',
              isToday ? 'bg-success-50 text-success-600' : 'bg-surface-sunken text-ink-600',
            )}
          >
            {occurrenceLabel(next)}
          </span>
        )}
      </div>
      <p className="mt-3.5 text-[19px] font-extrabold tracking-tight text-ink-900">{sheet.name}</p>
      <p className="mt-1 text-[13px] font-semibold text-ink-400">
        {next
          ? `${next.day.exercises.length} ${next.day.exercises.length === 1 ? 'exercício' : 'exercícios'} · ~${estimateMinutes(next.day)} min`
          : `Atualizada em ${new Date(sheet.updatedAt).toLocaleDateString('pt-BR')}`}
      </p>

      <div className="mt-4 flex gap-1.5" aria-label="Dias da semana">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
          const on = weekdays.has(weekday)
          return (
            <span
              key={weekday}
              title={WEEKDAY_LABELS[weekday]}
              aria-label={`${WEEKDAY_LABELS[weekday]}${on ? '' : ' (sem treino)'}`}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-[9px] text-xs font-extrabold',
                on ? 'bg-primary-500 text-white' : 'bg-surface-sunken text-ink-200',
              )}
            >
              {WEEKDAY_LABELS[weekday][0]}
            </span>
          )
        })}
      </div>

      <div className="mt-[18px] flex gap-2 border-t border-surface-sunken pt-4">
        <Link
          to={`/app/sheets/${sheet.id}/run`}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-bold sm:h-10',
            isToday ? 'bg-primary-500 text-white' : 'bg-primary-50 text-primary-500',
          )}
        >
          <Play size={13} fill="currentColor" />
          Iniciar
        </Link>
        <Link
          to={`/app/sheets/${sheet.id}`}
          aria-label="Editar planilha"
          className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface-soft text-ink-600 sm:h-10 sm:w-10"
        >
          <Pencil size={16} />
        </Link>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={duplicating}
          aria-label="Duplicar planilha"
          className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface-soft text-ink-600 disabled:opacity-50 sm:h-10 sm:w-10"
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir planilha"
          className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-danger-50 text-danger-500 sm:h-10 sm:w-10"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  )
}
