import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { exercisesApi, type Exercise } from '@/features/exercises'

export function ExercisePickerPanel({
  dayLabel,
  addedIds,
  onAdd,
}: {
  dayLabel: string
  addedIds: Set<string>
  onAdd: (exercise: Exercise) => void
}) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => exercisesApi.list(search || undefined),
  })
  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
      <div>
        <p className="font-extrabold text-ink-900">Adicionar da biblioteca</p>
        <p className="text-xs font-semibold text-ink-400">para {dayLabel}</p>
      </div>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-200" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="h-10 w-full rounded-lg border border-border bg-surface-soft pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-2 focus:outline-primary-100"
        />
      </div>
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {isLoading && <p className="py-3 text-center text-xs text-ink-400">Carregando…</p>}
        {!isLoading && items.length === 0 && (
          <p className="py-3 text-center text-xs text-ink-400">Nada encontrado.</p>
        )}
        {items.map((ex) => {
          const added = addedIds.has(ex.id)
          return (
            <button
              key={ex.id}
              type="button"
              disabled={added}
              onClick={() => onAdd(ex)}
              className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-soft disabled:opacity-50"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-soft" />
              <span className="flex-1 truncate text-sm font-bold text-ink-900">{ex.name}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-500">
                <Plus size={14} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
