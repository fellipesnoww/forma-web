import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { ApiError } from '@/shared/api/client'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { adminApi, type ActiveFilter, type AdminExercise } from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { DataTable, type Column } from '@/features/admin/components/DataTable'
import { AdminHeader, FilterSelect, Pill, SearchField, Segmented, Toggle } from '@/features/admin/components/controls'
import { ExerciseForm } from '@/features/admin/components/ExerciseForm'
import { MuscleGroupsModal } from '@/features/admin/components/MuscleGroupsModal'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Desativados' },
]

export function AdminExercisesPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const list = useListParams()
  const q = list.get('q')
  const muscleGroup = list.get('group')
  const status = (list.get('status') || 'all') as ActiveFilter

  const [selected, setSelected] = useState<AdminExercise | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)

  const exercises = useQuery({
    queryKey: ['admin', 'exercises', { q, muscleGroup, status, page: list.page }],
    queryFn: () =>
      adminApi.exercises.list({ q: q || undefined, muscleGroup: muscleGroup || undefined, status, page: list.page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  // Header totals ("86 ativos · 4 desativados") ignore the filters, so they come from two 1-item queries.
  const activeCount = useQuery({
    queryKey: ['admin', 'exercises', 'count', 'active'],
    queryFn: () => adminApi.exercises.list({ status: 'active', limit: 1 }),
  })
  const inactiveCount = useQuery({
    queryKey: ['admin', 'exercises', 'count', 'inactive'],
    queryFn: () => adminApi.exercises.list({ status: 'inactive', limit: 1 }),
  })

  const groups = useQuery({ queryKey: ['admin', 'muscle-groups'], queryFn: adminApi.muscleGroups.list })
  const groupItems = groups.data?.items ?? []

  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.exercises.setStatus(id, isActive),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] })
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      if (selected?.id === updated.id) setSelected(updated)
      toast(updated.isActive ? `${updated.name} ativado.` : `${updated.name} desativado.`, 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível alterar o status.', 'error'),
  })

  const openForm = (exercise: AdminExercise | null) => {
    setSelected(exercise)
    setFormOpen(true)
  }

  const columns: Column<AdminExercise>[] = [
    {
      key: 'media',
      header: 'Imagem',
      width: '52px',
      mobile: 'hidden',
      cell: (ex) => (
        <div
          className="h-10 w-10 overflow-hidden rounded-[10px]"
          style={{ background: 'repeating-linear-gradient(135deg,#E9ECF3,#E9ECF3 5px,#F2F4F8 5px,#F2F4F8 10px)' }}
        >
          {ex.mediaUrl && <AuthedImage src={ex.mediaUrl} alt="" className="h-full w-full object-cover" />}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nome',
      width: 'minmax(0,1.6fr)',
      mobile: 'primary',
      cell: (ex) => <p className="truncate text-sm font-bold text-ink-900">{ex.name}</p>,
    },
    {
      key: 'group',
      header: 'Grupo',
      cell: (ex) =>
        ex.muscleGroup ? (
          <Pill tone="primary" className="text-[11px] font-bold">
            {ex.muscleGroup.name}
          </Pill>
        ) : (
          <span className="text-[13px] font-semibold text-ink-200">Sem grupo</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (ex) => <Pill tone={ex.isActive ? 'success' : 'neutral'}>{ex.isActive ? 'Ativo' : 'Desativado'}</Pill>,
    },
    {
      key: 'active',
      header: 'Ativo',
      width: '60px',
      align: 'right',
      mobile: 'primary',
      cell: (ex) => (
        <Toggle
          checked={ex.isActive}
          label={`${ex.isActive ? 'Desativar' : 'Ativar'} ${ex.name}`}
          disabled={setStatus.isPending && setStatus.variables?.id === ex.id}
          onChange={(isActive) => setStatus.mutate({ id: ex.id, isActive })}
        />
      ),
    },
  ]

  const formTitle = selected ? 'Editar exercício' : 'Cadastrar exercício'
  const form = (
    <ExerciseForm
      exercise={selected}
      groups={groupItems}
      onSaved={(saved) => {
        if (selected) setSelected(saved)
        if (!isDesktop) setFormOpen(false)
      }}
      onCancel={isDesktop ? (selected ? () => setSelected(null) : undefined) : () => setFormOpen(false)}
    />
  )

  return (
    <>
      <AdminHeader
        title="Exercícios da biblioteca"
        meta={
          activeCount.data &&
          inactiveCount.data && (
            <span className="text-[13px] font-semibold text-ink-400">
              {activeCount.data.total} ativos · {inactiveCount.data.total} desativados
            </span>
          )
        }
      >
        <SearchField
          label="Buscar exercício"
          placeholder="Buscar exercício…"
          value={q}
          onChange={(value) => list.set({ q: value })}
          className="w-full sm:w-60"
        />
        <Button variant="secondary" size="sm" className="h-11" onClick={() => setGroupsOpen(true)}>
          <Layers size={16} />
          Grupos musculares
        </Button>
        {!isDesktop && (
          <Button size="sm" className="h-11" onClick={() => openForm(null)}>
            <Plus size={16} />
            Novo exercício
          </Button>
        )}
      </AdminHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3.5 overflow-auto p-4 md:px-7 md:py-[22px]">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Filtrar por grupo muscular"
              value={muscleGroup}
              onChange={(value) => list.set({ group: value })}
              options={[{ value: '', label: 'Todos os grupos' }, ...groupItems.map((g) => ({ value: g.slug, label: g.name }))]}
              className="w-full sm:w-52"
            />
            <Segmented
              label="Filtrar por status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => list.set({ status: value === 'all' ? undefined : value })}
            />
          </div>

          <DataTable
            label="Exercícios"
            columns={columns}
            rows={exercises.data?.items ?? []}
            rowKey={(ex) => ex.id}
            loading={exercises.isLoading}
            error={exercises.isError}
            emptyMessage="Nenhum exercício encontrado."
            onRowClick={(ex) => openForm(ex)}
            selectedKey={isDesktop ? selected?.id : null}
            rowClassName={(ex) => (ex.isActive ? undefined : 'opacity-55')}
            pagination={
              exercises.data && {
                page: list.page,
                total: exercises.data.total,
                limit: exercises.data.limit,
                onPageChange: list.setPage,
              }
            }
          />
        </div>

        {isDesktop && (
          <aside
            aria-label={formTitle}
            className="flex flex-col gap-3.5 overflow-auto border-l border-border bg-surface p-[22px]"
          >
            <h2 className="text-base font-extrabold text-ink-900">{formTitle}</h2>
            {form}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title={formTitle}>
          {formOpen && form}
        </Modal>
      )}
      <MuscleGroupsModal open={groupsOpen} onClose={() => setGroupsOpen(false)} groups={groupItems} />
    </>
  )
}
