import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { exercisesApi, type Exercise } from '@/features/exercises/api'
import { customExerciseSchema, type CustomExerciseInput } from '@/features/exercises/schemas'

interface MuscleGroupOption {
  slug: string
  label: string
}

interface Props {
  open: boolean
  onClose: () => void
  exercise: Exercise | null
  groups: MuscleGroupOption[]
}

export function ExerciseFormModal({ open, onClose, exercise, groups }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!exercise

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomExerciseInput>({ resolver: zodResolver(customExerciseSchema) })

  useEffect(() => {
    if (!open) return
    reset({
      name: exercise?.name ?? '',
      muscleGroupSlug: exercise ? groups.find((g) => g.label === exercise.muscleGroup)?.slug ?? '' : '',
    })
  }, [open, exercise, groups, reset])

  const save = useMutation({
    mutationFn: (data: CustomExerciseInput) => {
      const body = { name: data.name, muscleGroupSlug: data.muscleGroupSlug || undefined }
      return isEditing ? exercisesApi.updateCustom(exercise!.id, body) : exercisesApi.createCustom(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast(isEditing ? 'Exercício atualizado.' : 'Exercício criado.', 'success')
      onClose()
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível salvar.', 'error'),
  })

  const remove = useMutation({
    mutationFn: () => exercisesApi.deleteCustom(exercise!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast('Exercício excluído.', 'success')
      onClose()
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível excluir.', 'error'),
  })

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar exercício' : 'Exercício personalizado'}>
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-4">
        <Input label="Nome" error={errors.name?.message} {...register('name')} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-700" htmlFor="muscleGroupSlug">
            Grupo muscular
          </label>
          <select
            id="muscleGroupSlug"
            className="h-11 rounded-lg border border-border bg-white px-3.5 text-sm text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100"
            {...register('muscleGroupSlug')}
          >
            <option value="">Sem grupo</option>
            {groups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2.5 pt-1">
          {isEditing && (
            <Button type="button" variant="danger" onClick={() => remove.mutate()} loading={remove.isPending}>
              Excluir
            </Button>
          )}
          <Button type="submit" fullWidth loading={isSubmitting || save.isPending}>
            {isEditing ? 'Salvar alterações' : 'Criar exercício'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
