import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { fileToBase64 } from '@/shared/lib/file'
import { Card } from '@/shared/ui/Card'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { profileApi } from '@/features/profile/api'
import {
  profileUpdateSchema,
  measurementSchema,
  type ProfileUpdateInput,
  type MeasurementInput,
  type MeasurementFormValues,
} from '@/features/profile/schemas'
import { WeightSparkline } from '@/features/profile/components/WeightSparkline'

export function ProfilePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Perfil</h1>
      <AvatarAndName />
      <Measurements />
    </div>
  )
}

function AvatarAndName() {
  const { user, profile, refreshMe } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { displayName: profile?.displayName ?? '' },
  })

  const onSubmit = async (data: ProfileUpdateInput) => {
    try {
      await profileApi.update(data)
      await refreshMe()
      toast('Perfil atualizado.', 'success')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  const onPickAvatar = async (file: File) => {
    setUploading(true)
    try {
      const base64 = await fileToBase64(file)
      const media = await profileApi.uploadAvatar(base64, file.type, file.name)
      await profileApi.update({ avatarUrl: media.url })
      await refreshMe()
      toast('Foto atualizada.', 'success')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível enviar a foto.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-surface-soft">
            {profile?.avatarUrl && (
              <AuthedImage src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Alterar foto"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-white shadow"
          >
            <Camera size={13} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])}
          />
        </div>
        <div>
          <p className="font-bold text-ink-900">{profile?.displayName || 'Sem nome'}</p>
          <p className="text-sm text-ink-500">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input label="Nome de exibição" error={errors.displayName?.message} {...register('displayName')} />
        </div>
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </form>
    </Card>
  )
}

function Measurements() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile', 'measurements'],
    queryFn: profileApi.listMeasurements,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormValues, unknown, MeasurementInput>({ resolver: zodResolver(measurementSchema) })

  const addMeasurement = useMutation({
    mutationFn: profileApi.addMeasurement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'measurements'] })
      reset()
      toast('Medida registrada.', 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível registrar.', 'error'),
  })

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="font-extrabold text-ink-900">Medidas corporais</h2>
        <p className="text-sm text-ink-500">Peso, altura, cintura e peitoral.</p>
      </div>

      <form
        onSubmit={handleSubmit((data) => addMeasurement.mutate(data))}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <Input label="Peso (kg)" type="number" step="0.1" error={errors.weightKg?.message} {...register('weightKg')} />
        <Input label="Altura (cm)" type="number" step="0.1" error={errors.heightCm?.message} {...register('heightCm')} />
        <Input label="Cintura (cm)" type="number" step="0.1" error={errors.waistCm?.message} {...register('waistCm')} />
        <Input label="Peitoral (cm)" type="number" step="0.1" error={errors.chestCm?.message} {...register('chestCm')} />
        <div className="col-span-2 sm:col-span-4">
          <Button type="submit" loading={isSubmitting || addMeasurement.isPending}>
            Registrar medida
          </Button>
        </div>
      </form>

      {isLoading && <p className="text-sm text-ink-400">Carregando histórico…</p>}
      {isError && <p className="text-sm text-ink-400">Histórico ainda não disponível.</p>}
      {data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          <WeightSparkline measurements={data} />
          <ul className="flex flex-col divide-y divide-border">
            {data.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-500">{new Date(m.recordedAt).toLocaleDateString('pt-BR')}</span>
                <span className="font-semibold text-ink-900">{m.weightKg} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
