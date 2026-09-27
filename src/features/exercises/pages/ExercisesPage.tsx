import { type ReactNode, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { exercisesApi, type Exercise } from '@/features/exercises/api'
import { toMuscleGroupSlug } from '@/features/exercises/lib/muscleGroup'
import { ExerciseCard } from '@/features/exercises/components/ExerciseCard'
import { ExerciseFormModal } from '@/features/exercises/components/ExerciseFormModal'

type Filter = 'all' | 'custom' | string

export function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exercises', search],
    queryFn: () => exercisesApi.list(search || undefined),
  })

  const items = data?.items ?? []

  const groups = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>()
    for (const ex of items) {
      if (!ex.muscleGroup) continue
      const slug = toMuscleGroupSlug(ex.muscleGroup)
      const entry = map.get(slug)
      if (entry) entry.count += 1
      else map.set(slug, { slug, label: ex.muscleGroup, count: 1 })
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const customCount = items.filter((ex) => ex.source === 'custom').length

  const filtered = items.filter((ex) => {
    if (filter === 'all') return true
    if (filter === 'custom') return ex.source === 'custom'
    return toMuscleGroupSlug(ex.muscleGroup ?? '') === filter
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Biblioteca</h1>
          <span className="text-sm font-semibold text-ink-400">{items.length} exercícios</span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus size={16} />
          Exercício personalizado
        </Button>
      </div>

      <div className="relative sm:max-w-xs">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-200" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar exercício…"
          className="h-11 w-full rounded-lg border border-border bg-white pl-10 pr-3.5 text-sm focus:border-primary-500 focus:outline-2 focus:outline-primary-100"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos · {items.length}
        </FilterChip>
        {groups.map((g) => (
          <FilterChip key={g.slug} active={filter === g.slug} onClick={() => setFilter(g.slug)}>
            {g.label} · {g.count}
          </FilterChip>
        ))}
        {customCount > 0 && (
          <FilterChip active={filter === 'custom'} onClick={() => setFilter('custom')} tone="purple">
            Personalizados · {customCount}
          </FilterChip>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-ink-400">Não foi possível carregar a biblioteca.</p>}
      {!isLoading && !isError && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-400">Nenhum exercício encontrado.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onEdit={
              ex.source === 'custom'
                ? () => {
                    setEditing(ex)
                    setModalOpen(true)
                  }
                : undefined
            }
          />
        ))}
      </div>

      <ExerciseFormModal open={modalOpen} onClose={() => setModalOpen(false)} exercise={editing} groups={groups} />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  tone = 'primary',
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  tone?: 'primary' | 'purple'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-bold',
        active && tone === 'primary' && 'border-transparent bg-primary-500 text-white',
        active && tone === 'purple' && 'border-purple-100 bg-purple-50 text-purple-600',
        !active && 'border-border bg-white text-ink-600',
      )}
    >
      {children}
    </button>
  )
}
