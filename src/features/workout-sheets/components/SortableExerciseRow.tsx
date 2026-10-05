import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { formatRest } from '@/features/workout-sheets/lib/rest'

export interface ExerciseDraft {
  localId: string
  sheetExerciseId?: string
  exerciseId?: string
  customExerciseId?: string
  name: string
  muscleGroup?: string | null
  targetSets?: number
  targetReps?: number
  defaultRestSeconds?: number
}

export type ExerciseTargets = Pick<ExerciseDraft, 'targetSets' | 'targetReps' | 'defaultRestSeconds'>

/** Empty → undefined; anything else must be a whole number within the API bounds. */
function parseTarget(raw: string, min: number, max: number) {
  if (raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value >= min && value <= max ? value : null
}

const targetFieldClass =
  'h-9 w-full rounded-lg border border-border bg-surface-muted px-2 text-center text-sm font-bold text-ink-900 tabular-nums focus:border-primary-500 focus:bg-surface focus:outline-2 focus:outline-primary-100'

export function SortableExerciseRow({
  item,
  index,
  onRemove,
  onChange,
}: {
  item: ExerciseDraft
  index: number
  onRemove: () => void
  onChange: (patch: ExerciseTargets) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId })

  const summary = [
    item.targetSets || item.targetReps ? `${item.targetSets ?? '—'} × ${item.targetReps ?? '—'}` : null,
    item.defaultRestSeconds != null ? `descanso ${formatRest(item.defaultRestSeconds)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-surface p-3',
        isDragging && 'z-10 border-primary-500 shadow-lg',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Reordenar"
        className="flex h-11 w-8 shrink-0 touch-none items-center justify-center text-ink-200"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-xs font-extrabold text-ink-600">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">{item.name}</p>
        {summary && <p className="text-xs font-semibold text-ink-400">{summary}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover exercício"
        className="order-last flex h-11 w-11 shrink-0 items-center justify-center text-ink-300 hover:text-danger-500 sm:order-none"
      >
        <X size={16} />
      </button>

      <div className="grid w-full grid-cols-3 gap-2 pl-[76px] sm:w-auto sm:pl-0 sm:[grid-template-columns:56px_56px_72px]">
        <TargetField
          label="Séries"
          ariaLabel={`Séries de ${item.name}`}
          value={item.targetSets}
          onCommit={(v) => onChange({ targetSets: v })}
          parse={(raw) => parseTarget(raw, 1, 99)}
        />
        <TargetField
          label="Reps"
          ariaLabel={`Repetições de ${item.name}`}
          value={item.targetReps}
          onCommit={(v) => onChange({ targetReps: v })}
          parse={(raw) => parseTarget(raw, 1, 999)}
        />
        <TargetField
          label="Desc. (s)"
          ariaLabel={`Descanso em segundos de ${item.name}`}
          value={item.defaultRestSeconds}
          onCommit={(v) => onChange({ defaultRestSeconds: v })}
          parse={(raw) => parseTarget(raw, 0, 3600)}
        />
      </div>
    </div>
  )
}

function TargetField({
  label,
  ariaLabel,
  value,
  parse,
  onCommit,
}: {
  label: string
  ariaLabel: string
  value: number | undefined
  parse: (raw: string) => number | undefined | null
  onCommit: (value: number | undefined) => void
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-bold tracking-wide text-ink-300 uppercase">{label}</span>
      <input
        // Remount when the committed value changes, so an invalid entry snaps back to it on blur.
        key={value ?? 'empty'}
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        defaultValue={value ?? ''}
        onBlur={(e) => {
          const parsed = parse(e.target.value)
          if (parsed === null) e.target.value = value != null ? String(value) : ''
          else if (parsed !== value) onCommit(parsed)
        }}
        className={targetFieldClass}
      />
    </label>
  )
}
