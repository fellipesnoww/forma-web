import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { adminApi, type Achievement, type AchievementCriteria } from '@/features/admin/api'
import { achievementSchema, type AchievementFormInput, type AchievementFormValues } from '@/features/admin/schemas'
import { SelectField, TextareaField } from '@/features/admin/components/controls'
import { ImageField } from '@/features/admin/components/ImageField'
import { toMediaInput } from '@/features/admin/lib/media'

const CRITERIA_LABEL: Record<AchievementCriteria['type'], string> = {
  streak_days: 'Dias seguidos (streak)',
  workout_count: 'Treinos concluídos',
  challenge_complete: 'Concluir um desafio',
}

function criteriaFromForm(data: AchievementFormInput): AchievementCriteria {
  switch (data.criteriaType) {
    case 'streak_days':
      return { type: 'streak_days', days: data.criteriaValue! }
    case 'workout_count':
      return { type: 'workout_count', count: data.criteriaValue! }
    case 'challenge_complete':
      return { type: 'challenge_complete', challengeId: data.challengeId }
  }
}

export function AchievementFormModal({
  open,
  onClose,
  achievement,
}: {
  open: boolean
  onClose: () => void
  achievement: Achievement | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!achievement
  const [file, setFile] = useState<File | null>(null)
  const [iconRemoved, setIconRemoved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const challenges = useQuery({
    queryKey: ['admin', 'challenges', 'options'],
    queryFn: () => adminApi.challenges.list({ limit: 100 }),
    enabled: open,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<AchievementFormValues, unknown, AchievementFormInput>({ resolver: zodResolver(achievementSchema) })

  useEffect(() => {
    if (!open) return
    setFile(null)
    setIconRemoved(false)
    setConfirmDelete(false)
    const c = achievement?.criteria
    reset({
      name: achievement?.name ?? '',
      description: achievement?.description ?? '',
      criteriaType: c?.type ?? 'workout_count',
      criteriaValue: c?.type === 'streak_days' ? c.days : c?.type === 'workout_count' ? c.count : '',
      challengeId: c?.type === 'challenge_complete' ? c.challengeId : '',
      isActive: achievement?.isActive ?? true,
    })
  }, [open, achievement, reset])

  const criteriaType = watch('criteriaType')

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    toast(message, 'success')
    onClose()
  }

  const save = useMutation({
    mutationFn: async (data: AchievementFormInput) => {
      const icon = file ? await toMediaInput(file) : undefined
      const criteria = criteriaFromForm(data)
      if (!achievement) {
        return adminApi.achievements.create({
          name: data.name,
          description: data.description || undefined,
          criteria,
          isActive: data.isActive,
          icon,
        })
      }
      return adminApi.achievements.update(achievement.id, {
        name: data.name,
        description: data.description || null,
        criteria,
        isActive: data.isActive,
        ...(icon ? { icon } : iconRemoved ? { iconUrl: null } : {}),
      })
    },
    onSuccess: () => done(isEditing ? 'Conquista atualizada.' : 'Conquista criada.'),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setError('name', { message: 'Já existe uma conquista com esse nome' })
        return
      }
      toast(err instanceof ApiError ? err.message : 'Não foi possível salvar a conquista.', 'error')
    },
  })

  const remove = useMutation({
    mutationFn: () => adminApi.achievements.remove(achievement!.id),
    onSuccess: () => done('Conquista excluída.'),
    onError: (err) => {
      setConfirmDelete(false)
      toast(
        err instanceof ApiError && err.status === 409
          ? 'Alguém já desbloqueou essa conquista. Desative-a em vez de excluir.'
          : err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir.',
        'error',
      )
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar conquista' : 'Nova conquista'}>
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-3.5" noValidate>
        <Input label="Nome" placeholder="Ex.: Uma semana em chamas" error={errors.name?.message} {...register('name')} />
        <TextareaField label="Descrição" error={errors.description?.message} {...register('description')} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <SelectField label="Critério" {...register('criteriaType')}>
            {Object.entries(CRITERIA_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          {criteriaType !== 'challenge_complete' && (
            <Input
              label={criteriaType === 'streak_days' ? 'Dias' : 'Treinos'}
              type="number"
              inputMode="numeric"
              min={1}
              error={errors.criteriaValue?.message}
              {...register('criteriaValue')}
            />
          )}
        </div>
        {criteriaType === 'challenge_complete' && (
          <SelectField label="Desafio" error={errors.challengeId?.message} {...register('challengeId')}>
            <option value="">Selecione…</option>
            {(challenges.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
        )}
        {isEditing && (
          <p className="text-xs text-ink-400">Mudar o critério não retira a conquista de quem já desbloqueou.</p>
        )}

        <ImageField
          label="Ícone"
          currentUrl={achievement?.iconUrl ?? null}
          file={file}
          removed={iconRemoved}
          onFile={setFile}
          onRemove={() => setIconRemoved(true)}
          onReject={(message) => toast(message, 'error')}
        />
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="h-5 w-5 accent-primary-500" {...register('isActive')} />
          Conquista ativa
        </label>

        {confirmDelete ? (
          <div className="flex flex-col gap-2.5 rounded-xl bg-danger-50 p-3">
            <p className="text-sm font-semibold text-danger-600">Excluir “{achievement?.name}”? Não dá para desfazer.</p>
            <div className="flex gap-2.5">
              <Button type="button" variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" fullWidth loading={remove.isPending} onClick={() => remove.mutate()}>
                Excluir conquista
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5 pt-1">
            {isEditing && (
              <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            )}
            <Button type="submit" fullWidth loading={save.isPending}>
              {isEditing ? 'Salvar alterações' : 'Criar conquista'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}
