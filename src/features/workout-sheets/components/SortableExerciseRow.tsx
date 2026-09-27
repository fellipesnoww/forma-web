import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface ExerciseDraft {
  localId: string
  sheetExerciseId?: string
  exerciseId?: string
  customExerciseId?: string
  name: string
  targetSets?: number
  targetReps?: number
}

export function SortableExerciseRow({
  item,
  index,
  onRemove,
}: {
  item: ExerciseDraft
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-white p-3',
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
        {(item.targetSets || item.targetReps) && (
          <p className="text-xs font-semibold text-ink-400">
            {item.targetSets ?? '—'} × {item.targetReps ?? '—'}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover exercício"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-300 hover:text-danger-500"
      >
        <X size={16} />
      </button>
    </div>
  )
}
