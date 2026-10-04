import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { adminApi, type AdminExercise, type MuscleGroup } from '@/features/admin/api'
import { adminExerciseSchema, type AdminExerciseFormInput } from '@/features/admin/schemas'
import { SelectField } from '@/features/admin/components/controls'
import { ImageField } from '@/features/admin/components/ImageField'
import { toMediaInput } from '@/features/admin/lib/media'

/** Create/edit form for a catalog exercise. Lives in the side panel (desktop) or a modal (mobile). */
export function ExerciseForm({
  exercise,
  groups,
  onSaved,
  onCancel,
}: {
  exercise: AdminExercise | null
  groups: MuscleGroup[]
  onSaved: (exercise: AdminExercise) => void
  onCancel?: () => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!exercise
  const [file, setFile] = useState<File | null>(null)
  const [mediaRemoved, setMediaRemoved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AdminExerciseFormInput>({ resolver: zodResolver(adminExerciseSchema) })

  useEffect(() => {
    reset({ name: exercise?.name ?? '', muscleGroupSlug: exercise?.muscleGroup?.slug ?? '', isActive: exercise?.isActive ?? true })
    setFile(null)
    setMediaRemoved(false)
  }, [exercise, reset])

  const save = useMutation({
    mutationFn: async (data: AdminExerciseFormInput) => {
      const media = file ? await toMediaInput(file) : undefined
      if (!exercise) {
        return adminApi.exercises.create({
          name: data.name,
          muscleGroupSlug: data.muscleGroupSlug || undefined,
          isActive: data.isActive,
          media,
        })
      }
      return adminApi.exercises.update(exercise.id, {
        name: data.name,
        muscleGroupSlug: data.muscleGroupSlug || null,
        ...(media ? { media } : mediaRemoved ? { mediaUrl: null } : {}),
      })
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exercises'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'muscle-groups'] })
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast(isEditing ? 'Exercício atualizado.' : 'Exercício cadastrado na biblioteca.', 'success')
      if (!isEditing) {
        reset({ name: '', muscleGroupSlug: '', isActive: true })
        setFile(null)
      }
      onSaved(saved)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setError('name', { message: 'Já existe um exercício com esse nome' })
        return
      }
      toast(err instanceof ApiError ? err.message : 'Não foi possível salvar.', 'error')
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-1 flex-col gap-3.5" noValidate>
      <Input label="Nome" placeholder="Ex.: Stiff com halteres" error={errors.name?.message} {...register('name')} />
      <SelectField label="Grupo muscular" {...register('muscleGroupSlug')}>
        <option value="">Sem grupo</option>
        {groups.map((g) => (
          <option key={g.id} value={g.slug}>
            {g.name}
          </option>
        ))}
      </SelectField>
      <ImageField
        label="Imagem"
        currentUrl={exercise?.mediaUrl ?? null}
        file={file}
        removed={mediaRemoved}
        onFile={setFile}
        onRemove={() => setMediaRemoved(true)}
        onReject={(message) => toast(message, 'error')}
      />
      {!isEditing && (
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="h-5 w-5 accent-primary-500" {...register('isActive')} />
          Disponível no app
        </label>
      )}
      <div className="min-h-2 flex-1" />
      <div className="flex gap-2.5">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" fullWidth loading={save.isPending}>
          {isEditing ? 'Salvar alterações' : 'Cadastrar na biblioteca'}
        </Button>
      </div>
    </form>
  )
}
