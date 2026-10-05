import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { adminApi, type MuscleGroup } from '@/features/admin/api'
import { muscleGroupSchema, type MuscleGroupFormInput } from '@/features/admin/schemas'

/** Muscle group CRUD (no delete in the API). One form, switching between "new" and editing a row. */
export function MuscleGroupsModal({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: MuscleGroup[] }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<MuscleGroup | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MuscleGroupFormInput>({ resolver: zodResolver(muscleGroupSchema) })

  useEffect(() => {
    if (!open) setEditing(null)
  }, [open])

  useEffect(() => {
    reset({ name: editing?.name ?? '', slug: editing?.slug ?? '' })
  }, [editing, reset])

  const save = useMutation({
    mutationFn: (data: MuscleGroupFormInput) => {
      if (!editing) return adminApi.muscleGroups.create({ name: data.name, slug: data.slug || undefined })
      const body: { name?: string; slug?: string } = {}
      if (data.name !== editing.name) body.name = data.name
      if (data.slug && data.slug !== editing.slug) body.slug = data.slug
      if (!body.name && !body.slug) return Promise.resolve(editing)
      return adminApi.muscleGroups.update(editing.id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'muscle-groups'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] })
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast(editing ? 'Grupo muscular atualizado.' : 'Grupo muscular criado.', 'success')
      setEditing(null)
      reset({ name: '', slug: '' })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setError('name', { message: 'Nome ou slug já usado por outro grupo' })
        return
      }
      toast(err instanceof ApiError ? err.message : 'Não foi possível salvar.', 'error')
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Grupos musculares">
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-3" noValidate>
        <p className="text-xs font-extrabold tracking-[0.4px] text-ink-400 uppercase">
          {editing ? `Editando “${editing.name}”` : 'Novo grupo'}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nome" placeholder="Ex.: Glúteo médio" error={errors.name?.message} {...register('name')} />
          <Input
            label="Slug"
            placeholder={editing ? undefined : 'gerado do nome'}
            error={errors.slug?.message}
            {...register('slug')}
          />
        </div>
        {editing && (
          <p className="text-xs text-ink-400">
            Os apps filtram pelo slug: trocar o slug muda os links e filtros salvos que o usam.
          </p>
        )}
        <div className="flex gap-2.5">
          {editing && (
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          )}
          <Button type="submit" fullWidth loading={save.isPending}>
            {editing ? 'Salvar grupo' : 'Criar grupo'}
          </Button>
        </div>
      </form>

      <ul aria-label="Grupos cadastrados" className="mt-5 flex max-h-[45vh] flex-col overflow-y-auto border-t border-border">
        {groups.map((g) => (
          <li key={g.id} className="flex items-center gap-3 border-b border-surface-soft py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink-900">{g.name}</p>
              <p className="truncate text-xs text-ink-400">
                {g.slug} · {g.exerciseCount} {g.exerciseCount === 1 ? 'exercício' : 'exercícios'}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Editar ${g.name}`}
              onClick={() => setEditing(g)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-soft hover:text-ink-700"
            >
              <Pencil size={16} />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
