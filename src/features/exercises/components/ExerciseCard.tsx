import { Pencil } from 'lucide-react'
import type { Exercise } from '@/features/exercises/api'

export function ExerciseCard({ exercise, onEdit }: { exercise: Exercise; onEdit?: () => void }) {
  const isCustom = exercise.source === 'custom'
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 sm:flex-col sm:items-stretch sm:gap-2.5">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-surface-soft sm:h-24 sm:w-full" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink-900">{exercise.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {exercise.muscleGroup && (
            <span className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-bold text-ink-600">
              {exercise.muscleGroup}
            </span>
          )}
          {isCustom && (
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-600">Seu</span>
          )}
        </div>
      </div>
      {isCustom && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Editar exercício"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-soft hover:text-ink-700"
        >
          <Pencil size={16} />
        </button>
      )}
    </div>
  )
}
