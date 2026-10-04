import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { activitiesApi } from '@/features/activities'
import { adminApi, type Challenge, type ChallengeGoal, type ChallengeInput } from '@/features/admin/api'
import { challengeSchema, type ChallengeFormInput, type ChallengeFormValues } from '@/features/admin/schemas'
import { SelectField, TextareaField } from '@/features/admin/components/controls'
import { describeGoal } from '@/features/admin/lib/format'

const GOAL_LABEL: Record<ChallengeGoal['type'], string> = {
  workout_count: 'Quantidade de treinos',
  activity_count: 'Quantidade de atividades',
  activity_minutes: 'Minutos de atividade',
}

/** ISO instant → `<input type="datetime-local">` value in the browser's timezone. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goalFromForm(data: ChallengeFormInput): ChallengeGoal {
  const activityTypeId = data.activityTypeId || undefined
  switch (data.goalType) {
    case 'workout_count':
      return { type: 'workout_count', count: data.goalValue }
    case 'activity_count':
      return { type: 'activity_count', count: data.goalValue, activityTypeId }
    case 'activity_minutes':
      return { type: 'activity_minutes', minutes: data.goalValue, activityTypeId }
  }
}

export function ChallengeFormModal({
  open,
  onClose,
  challenge,
}: {
  open: boolean
  onClose: () => void
  challenge: Challenge | null
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!challenge
  // The API refuses goal changes once someone joined (409), so the goal is read-only then.
  const goalLocked = (challenge?.participantCount ?? 0) > 0
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Goals can only target default activity types.
  const types = useQuery({ queryKey: ['activity-types'], queryFn: activitiesApi.listTypes, enabled: open })
  const defaultTypes = (types.data?.items ?? []).filter((t) => t.source === 'default')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChallengeFormValues, unknown, ChallengeFormInput>({ resolver: zodResolver(challengeSchema) })

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    const goal = challenge?.goal
    reset({
      name: challenge?.name ?? '',
      description: challenge?.description ?? '',
      goalType: goal?.type ?? 'workout_count',
      goalValue: goal ? (goal.type === 'activity_minutes' ? goal.minutes : goal.count) : '',
      activityTypeId: goal && goal.type !== 'workout_count' ? (goal.activityTypeId ?? '') : '',
      reward: challenge?.reward ?? '',
      startsAt: challenge ? toLocalInput(challenge.startsAt) : '',
      endsAt: challenge ? toLocalInput(challenge.endsAt) : '',
      isActive: challenge?.isActive ?? true,
    })
  }, [open, challenge, reset])

  const goalType = watch('goalType')

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
    toast(message, 'success')
    onClose()
  }

  const save = useMutation({
    mutationFn: (data: ChallengeFormInput) => {
      const body: ChallengeInput = {
        name: data.name,
        description: data.description || (isEditing ? null : undefined),
        goal: goalFromForm(data),
        reward: data.reward || (isEditing ? null : undefined),
        startsAt: new Date(data.startsAt).toISOString(),
        endsAt: new Date(data.endsAt).toISOString(),
        isActive: data.isActive,
      }
      if (!challenge) return adminApi.challenges.create(body)
      const { goal, ...rest } = body
      return adminApi.challenges.update(challenge.id, goalLocked ? rest : { ...rest, goal })
    },
    onSuccess: () => done(isEditing ? 'Desafio atualizado.' : 'Desafio criado.'),
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível salvar o desafio.', 'error'),
  })

  const remove = useMutation({
    mutationFn: () => adminApi.challenges.remove(challenge!.id),
    onSuccess: () => done('Desafio excluído.'),
    onError: (err) => {
      setConfirmDelete(false)
      toast(
        err instanceof ApiError && err.status === 409
          ? 'Esse desafio tem inscritos ou uma conquista depende dele. Desative-o em vez de excluir.'
          : err instanceof ApiError
            ? err.message
            : 'Não foi possível excluir.',
        'error',
      )
    },
  })

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar desafio' : 'Novo desafio'}>
      <form onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-3.5" noValidate>
        <Input label="Nome" placeholder="Ex.: 30 dias em movimento" error={errors.name?.message} {...register('name')} />
        <TextareaField label="Descrição" error={errors.description?.message} {...register('description')} />

        {goalLocked && challenge ? (
          <div className="flex items-start gap-2.5 rounded-xl bg-surface-muted p-3 text-sm">
            <Lock size={16} className="mt-0.5 shrink-0 text-ink-400" />
            <p className="text-ink-600">
              Meta: <strong className="text-ink-900">{describeGoal(challenge.goal)}</strong>. Não pode mudar porque já há
              inscritos.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <SelectField label="Tipo de meta" {...register('goalType')}>
                {Object.entries(GOAL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
              <Input
                label={goalType === 'activity_minutes' ? 'Meta (min)' : 'Meta'}
                type="number"
                inputMode="numeric"
                min={1}
                error={errors.goalValue?.message}
                {...register('goalValue')}
              />
            </div>
            {goalType !== 'workout_count' && (
              <SelectField label="Tipo de atividade" {...register('activityTypeId')}>
                <option value="">Qualquer atividade</option>
                {defaultTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            )}
          </>
        )}

        <Input label="Recompensa" placeholder="Ex.: Medalha de ouro" error={errors.reward?.message} {...register('reward')} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Início" type="datetime-local" error={errors.startsAt?.message} {...register('startsAt')} />
          <Input label="Fim" type="datetime-local" error={errors.endsAt?.message} {...register('endsAt')} />
        </div>
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-semibold text-ink-700">
          <input type="checkbox" className="h-5 w-5 accent-primary-500" {...register('isActive')} />
          Desafio ativo
        </label>

        {confirmDelete ? (
          <div className="flex flex-col gap-2.5 rounded-xl bg-danger-50 p-3">
            <p className="text-sm font-semibold text-danger-600">Excluir “{challenge?.name}”? Não dá para desfazer.</p>
            <div className="flex gap-2.5">
              <Button type="button" variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="danger" fullWidth loading={remove.isPending} onClick={() => remove.mutate()}>
                Excluir desafio
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
              {isEditing ? 'Salvar alterações' : 'Criar desafio'}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}
