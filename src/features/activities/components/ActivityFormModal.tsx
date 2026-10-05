import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { PhotoDropzone } from '@/shared/ui/PhotoDropzone'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { performedAtErrorMessage } from '@/shared/api/performedAtError'
import { compressImage } from '@/shared/lib/image'
import { activitiesApi, type Activity, type UpdateActivityInput } from '@/features/activities/api'
import {
  COMMENT_MAX,
  activitySchema,
  activityTypeNameSchema,
  type ActivityFormInput,
  type ActivityFormValues,
} from '@/features/activities/schemas'
import { toLocalDateTimeInput } from '@/features/activities/lib/format'

interface Props {
  open: boolean
  onClose: () => void
  activity: Activity | null
  /** Prefills the date when creating (e.g. from a calendar day). Defaults to now. */
  defaultPerformedAt?: Date
}

const fieldClass =
  'h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100'

export function ActivityFormModal({ open, onClose, activity, defaultPerformedAt }: Props) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEditing = !!activity

  const [photo, setPhoto] = useState<File | null>(null)
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [initialPerformedAt, setInitialPerformedAt] = useState('')
  const [maxPerformedAt, setMaxPerformedAt] = useState('')

  const { data: types } = useQuery({
    queryKey: ['activity-types'],
    queryFn: activitiesApi.listTypes,
    enabled: open,
  })
  const defaultTypes = types?.items.filter((t) => t.source === 'default') ?? []
  const customTypes = types?.items.filter((t) => t.source === 'custom') ?? []

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActivityFormValues, unknown, ActivityFormInput>({ resolver: zodResolver(activitySchema) })

  useEffect(() => {
    if (!open) return
    const performedAt = toLocalDateTimeInput(activity ? new Date(activity.performedAt) : (defaultPerformedAt ?? new Date()))
    setInitialPerformedAt(performedAt)
    setMaxPerformedAt(toLocalDateTimeInput(new Date()))
    reset({
      activityTypeId: activity?.activityTypeId ?? '',
      performedAt,
      durationMinutes: activity ? String(activity.durationMinutes) : '',
      comment: activity?.comment ?? '',
    })
    setPhoto(null)
    setRemoveExistingPhoto(false)
    setConfirmDelete(false)
  }, [open, activity, defaultPerformedAt, reset])

  const comment = watch('comment') ?? ''

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['activities'] })
    queryClient.invalidateQueries({ queryKey: ['calendar'] })
  }

  const save = useMutation({
    mutationFn: async (data: ActivityFormInput) => {
      const trimmedComment = data.comment.trim()
      let saved: Activity
      if (isEditing) {
        const body: UpdateActivityInput = {
          activityTypeId: data.activityTypeId,
          durationMinutes: data.durationMinutes,
          comment: trimmedComment || null,
        }
        // Re-sending an untouched value would drop the seconds the input can't show.
        if (data.performedAt !== initialPerformedAt) body.performedAt = new Date(data.performedAt).toISOString()
        if (removeExistingPhoto && !photo) body.photoUrl = null
        saved = await activitiesApi.update(activity.id, body)
      } else {
        saved = await activitiesApi.create({
          activityTypeId: data.activityTypeId,
          performedAt: new Date(data.performedAt).toISOString(),
          durationMinutes: data.durationMinutes,
          comment: trimmedComment || undefined,
        })
      }

      if (!photo) return { photoFailed: false }
      try {
        await activitiesApi.uploadPhoto(saved.id, await compressImage(photo))
        return { photoFailed: false }
      } catch {
        return { photoFailed: true }
      }
    },
    onSuccess: ({ photoFailed }) => {
      invalidate()
      if (photoFailed) toast('Atividade salva, mas não foi possível enviar a foto.', 'warning')
      else toast(isEditing ? 'Atividade atualizada.' : 'Atividade registrada.', 'success')
      onClose()
    },
    onError: (err) =>
      toast(performedAtErrorMessage(err) ?? (err instanceof ApiError ? err.message : 'Não foi possível salvar.'), 'error'),
  })

  const remove = useMutation({
    mutationFn: () => activitiesApi.remove(activity!.id),
    onSuccess: () => {
      invalidate()
      toast('Atividade excluída.', 'success')
      onClose()
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível excluir.', 'error'),
  })

  const showExistingPhoto = isEditing && !!activity.photoUrl && !removeExistingPhoto && !photo

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar atividade' : 'Registrar atividade'}>
      <form noValidate onSubmit={handleSubmit((data) => save.mutate(data))} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-700" htmlFor="activityTypeId">
            Tipo
          </label>
          <Controller
            control={control}
            name="activityTypeId"
            render={({ field }) => (
              <select
                id="activityTypeId"
                aria-invalid={!!errors.activityTypeId}
                className={fieldClass}
                {...field}
              >
                <option value="">Selecione…</option>
                <optgroup label="Padrão">
                  {defaultTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                {customTypes.length > 0 && (
                  <optgroup label="Seus tipos">
                    {customTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          />
          {errors.activityTypeId && (
            <p className="text-xs font-medium text-danger-500">{errors.activityTypeId.message}</p>
          )}
          <NewTypeField
            onCreated={(id) => setValue('activityTypeId', id, { shouldValidate: true })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <Input
            label="Data e hora"
            type="datetime-local"
            max={maxPerformedAt}
            error={errors.performedAt?.message}
            {...register('performedAt')}
          />
          <Input
            label="Duração (min)"
            type="number"
            inputMode="numeric"
            step="1"
            error={errors.durationMinutes?.message}
            {...register('durationMinutes')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="activity-comment" className="text-sm font-semibold text-ink-700">
              Comentário <span className="font-medium text-ink-200">· opcional</span>
            </label>
            <span className="text-xs font-semibold text-ink-200">
              {comment.length}/{COMMENT_MAX}
            </span>
          </div>
          <textarea
            id="activity-comment"
            maxLength={COMMENT_MAX}
            rows={3}
            placeholder="Distância, ritmo, como foi…"
            className="min-h-20 w-full resize-y rounded-lg border border-border p-3.5 text-sm leading-relaxed font-medium text-ink-700 placeholder:text-ink-200 focus:border-primary-500 focus:outline-2 focus:outline-primary-100"
            {...register('comment')}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-700">
            Foto <span className="font-medium text-ink-200">· opcional</span>
          </p>
          {showExistingPhoto ? (
            <div className="relative mt-3.5 h-[200px] overflow-hidden rounded-2xl bg-surface-soft">
              <AuthedImage src={activity.photoUrl!} alt="Foto da atividade" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setRemoveExistingPhoto(true)}
                aria-label="Remover foto"
                className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <PhotoDropzone
              file={photo}
              onChange={setPhoto}
              onReject={(msg) => toast(msg, 'error')}
              previewAlt="Foto da atividade selecionada"
            />
          )}
        </div>

        <div className="flex gap-2.5 pt-1">
          {isEditing &&
            (confirmDelete ? (
              <Button type="button" variant="danger" onClick={() => remove.mutate()} loading={remove.isPending}>
                Confirmar exclusão
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            ))}
          <Button type="submit" fullWidth loading={save.isPending}>
            {isEditing ? 'Salvar alterações' : 'Registrar atividade'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Inline "new custom type" row. Not a nested <form>: it lives inside the activity form. */
function NewTypeField({ onCreated }: { onCreated: (id: string) => void }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (value: string) => activitiesApi.createType(value),
    onSuccess: async (type) => {
      await queryClient.invalidateQueries({ queryKey: ['activity-types'] })
      onCreated(type.id)
      setName('')
      setOpen(false)
    },
    onError: (err) =>
      setError(err instanceof ApiError && err.status === 409 ? 'Já existe um tipo com esse nome.' : 'Não foi possível criar o tipo.'),
  })

  const submit = () => {
    const parsed = activityTypeNameSchema.safeParse(name)
    if (!parsed.success) return setError(parsed.error.issues[0].message)
    setError(null)
    create.mutate(parsed.data)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-primary-500"
      >
        <Plus size={16} />
        Novo tipo
      </button>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-xl bg-surface-muted p-3">
      <label htmlFor="new-activity-type" className="text-xs font-semibold text-ink-700">
        Nome do novo tipo
      </label>
      <div className="flex gap-2">
        <input
          id="new-activity-type"
          value={name}
          autoFocus
          maxLength={80}
          aria-invalid={!!error}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Ex.: Remo"
          className={fieldClass}
        />
        <Button type="button" size="md" onClick={submit} loading={create.isPending}>
          Adicionar
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setName('')
            setError(null)
          }}
          aria-label="Cancelar novo tipo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-soft"
        >
          <X size={18} />
        </button>
      </div>
      {error && <p className="text-xs font-medium text-danger-500">{error}</p>}
    </div>
  )
}
