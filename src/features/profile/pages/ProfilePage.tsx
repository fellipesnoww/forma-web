import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Pencil, Plus } from 'lucide-react'
import { useAuth } from '@/shared/auth/AuthContext'
import { ApiError } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import { fileToBase64 } from '@/shared/lib/file'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { Input } from '@/shared/ui/Input'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { useToast } from '@/shared/ui/Toast'
import { profileApi } from '@/features/profile/api'
import {
  profileUpdateSchema,
  measurementSchema,
  type Measurement,
  type ProfileUpdateInput,
  type MeasurementInput,
  type MeasurementFormValues,
} from '@/features/profile/schemas'
import { WeightSparkline } from '@/features/profile/components/WeightSparkline'
import { formatMeters, formatNumber, formatShortDate } from '@/features/profile/lib/format'

const panel = 'rounded-[20px] border border-border bg-white sm:rounded-[22px]'

export function ProfilePage() {
  const [editOpen, setEditOpen] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Perfil</h1>
        {/* Wrapper, not a class on Button: `cn` doesn't merge, so its `inline-flex` would beat `hidden`. */}
        <div className="hidden sm:block">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={15} />
            Editar perfil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <IdentityCard onEdit={() => setEditOpen(true)} />
        <div className="flex min-w-0 flex-col gap-5">
          <PhysicalData onRegister={() => setMeasureOpen(true)} />
          <MeasurementHistory />
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <MeasurementModal open={measureOpen} onClose={() => setMeasureOpen(false)} />
    </div>
  )
}

function IdentityCard({ onEdit }: { onEdit: () => void }) {
  const { user, profile, refreshMe } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const onPickAvatar = async (file: File) => {
    setUploading(true)
    try {
      const base64 = await fileToBase64(file)
      await profileApi.uploadAvatar(base64, file.type, file.name)
      await refreshMe()
      toast('Foto atualizada.', 'success')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível enviar a foto.', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section
      className={cn(
        panel,
        'flex items-center gap-3.5 p-[18px]',
        'sm:flex-col sm:gap-0 sm:p-[26px] sm:text-center',
      )}
    >
      <div className="relative shrink-0">
        <div className="h-[68px] w-[68px] overflow-hidden rounded-full border border-border bg-surface-soft sm:h-[104px] sm:w-[104px]">
          {profile?.avatarUrl && <AuthedImage src={profile.avatarUrl} alt="Sua foto" className="h-full w-full object-cover" />}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Alterar foto"
          className="absolute -right-0.5 -bottom-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[2.5px] border-white bg-primary-500 text-white disabled:opacity-60 sm:right-0 sm:bottom-0.5 sm:h-[34px] sm:w-[34px] sm:border-[3px]"
        >
          <Camera size={14} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onPickAvatar(file)
            e.target.value = ''
          }}
        />
      </div>
      <div className="min-w-0 flex-1 sm:mt-3.5">
        <p className="truncate text-lg font-extrabold tracking-tight text-ink-900 sm:text-xl">
          {profile?.displayName || 'Sem nome'}
        </p>
        <p className="truncate text-xs font-medium text-ink-400 sm:mt-0.5 sm:text-[13px]">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar perfil"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-200 hover:bg-surface-soft sm:hidden"
      >
        <Pencil size={18} />
      </button>
    </section>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3.5 sm:border-0 sm:bg-surface-muted sm:p-4">
      <p className="text-xs font-semibold text-ink-400 sm:text-[12.5px]">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tracking-tight text-ink-900 sm:text-[26px]">
        {value}
        {value !== '—' && <span className="text-xs text-ink-200 sm:text-[13px]"> {unit}</span>}
      </p>
    </div>
  )
}

function useMeasurements() {
  return useQuery({ queryKey: ['profile', 'measurements'], queryFn: profileApi.listMeasurements })
}

/** Newest first, regardless of the order the API returns. */
function sortNewest(items: Measurement[]) {
  return items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function PhysicalData({ onRegister }: { onRegister: () => void }) {
  const { data: details } = useQuery({ queryKey: ['profile', 'details'], queryFn: profileApi.get })
  const { data: measurements } = useMeasurements()
  const latest = measurements && measurements.length > 0 ? sortNewest(measurements)[0] : null

  return (
    <section aria-labelledby="physical-data" className="sm:rounded-[22px] sm:border sm:border-border sm:bg-white sm:p-[22px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="physical-data" className="text-base font-extrabold text-ink-900">
            Dados físicos
          </h2>
          <p className="mt-0.5 hidden text-[12.5px] font-semibold text-ink-400 sm:block">
            {latest ? `Última atualização em ${formatShortDate(latest.createdAt)}` : 'Nenhuma medida registrada ainda'}
          </p>
        </div>
        <Button size="sm" onClick={onRegister} className="h-10">
          <Plus size={15} strokeWidth={2.4} />
          Registrar medidas
        </Button>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-[18px] sm:grid-cols-4 sm:gap-3">
        <Stat label="Peso" value={formatNumber(details?.weightKg ?? null)} unit="kg" />
        <Stat label="Altura" value={formatMeters(details?.heightCm ?? null)} unit="m" />
        <Stat label="Cintura" value={formatNumber(details?.waistCm ?? null)} unit="cm" />
        <Stat label="Peitoral" value={formatNumber(details?.chestCm ?? null)} unit="cm" />
      </div>
    </section>
  )
}

function MeasurementHistory() {
  const { data, isLoading, isError } = useMeasurements()
  const items = data ? sortNewest(data) : []

  return (
    <section aria-labelledby="measurement-history" className={cn(panel, 'p-3.5 sm:p-[22px]')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="measurement-history" className="text-base font-extrabold text-ink-900">
          Histórico de medidas
        </h2>
        {items.length > 0 && (
          <div className="w-full sm:w-48">
            <WeightSparkline measurements={items} />
          </div>
        )}
      </div>

      {isLoading && <p className="mt-3 text-sm text-ink-400">Carregando histórico…</p>}
      {isError && <p className="mt-3 text-sm text-ink-400">Histórico ainda não disponível.</p>}
      {data && items.length === 0 && (
        <p className="py-6 text-center text-sm font-medium text-ink-400">Registre suas medidas para acompanhar a evolução.</p>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-3.5 hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 px-3 pb-2.5 text-[11.5px] font-bold tracking-[0.4px] text-ink-200 sm:grid">
            <div>DATA</div>
            <div>PESO</div>
            <div>CINTURA</div>
            <div>PEITORAL</div>
          </div>
          <ul className="mt-1 flex flex-col divide-y divide-surface-soft sm:mt-0 sm:gap-1.5 sm:divide-y-0">
            {items.map((m, i) => (
              <HistoryRow key={m.id} measurement={m} current={i === 0} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** One markup for both layouts: table row on `sm`+, "64,2 kg · 71 cm · 92 cm" line on phones. */
function HistoryRow({ measurement: m, current }: { measurement: Measurement; current: boolean }) {
  const values: ReactNode[] = [
    m.weightKg != null ? `${formatNumber(m.weightKg)} kg` : '—',
    m.waistCm != null ? `${formatNumber(m.waistCm)} cm` : '—',
    m.chestCm != null ? `${formatNumber(m.chestCm)} cm` : '—',
  ]

  return (
    <li
      className={cn(
        'flex items-center gap-3 py-3 sm:grid sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:rounded-xl sm:px-3 sm:py-[13px] sm:text-sm',
        current ? 'sm:bg-[#F4F7FF]' : 'sm:border sm:border-[#F0F2F6]',
      )}
    >
      <div className={cn('flex-1 text-[13.5px] font-bold sm:text-sm', current ? 'font-extrabold text-primary-500' : 'text-ink-900')}>
        {formatShortDate(m.createdAt)}
        {current && <span className="hidden sm:inline"> · atual</span>}
      </div>
      {values.map((value, i) => (
        <div
          key={i}
          className={cn(
            'text-[12.5px] font-semibold text-ink-600 sm:text-sm sm:text-ink-700',
            current && 'sm:font-bold sm:text-ink-900',
            i > 0 && "before:mr-1.5 before:content-['·'] sm:before:hidden",
          )}
        >
          {value}
        </div>
      ))}
    </li>
  )
}

function EditProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Editar perfil">
      {/* Mounted per opening, so the form starts from the current name without a reset effect. */}
      {open && <EditProfileForm onDone={onClose} />}
    </Modal>
  )
}

function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { profile, refreshMe } = useAuth()
  const toast = useToast()
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
      onDone()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Nome de exibição" error={errors.displayName?.message} {...register('displayName')} />
      <Button type="submit" fullWidth loading={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}

function MeasurementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Registrar medidas">
      {open && <MeasurementForm onDone={onClose} />}
    </Modal>
  )
}

function MeasurementForm({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormValues, unknown, MeasurementInput>({ resolver: zodResolver(measurementSchema) })

  const addMeasurement = useMutation({
    mutationFn: profileApi.addMeasurement,
    onSuccess: () => {
      // Also refreshes the current values (`GET /profile`), which the measurement updates.
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast('Medida registrada.', 'success')
      onDone()
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível registrar.', 'error'),
  })

  return (
    <form onSubmit={handleSubmit((data) => addMeasurement.mutate(data))} className="grid grid-cols-2 gap-3">
      <Input label="Peso (kg)" type="number" step="0.1" inputMode="decimal" error={errors.weightKg?.message} {...register('weightKg')} />
      <Input label="Altura (cm)" type="number" step="0.1" inputMode="decimal" error={errors.heightCm?.message} {...register('heightCm')} />
      <Input label="Cintura (cm)" type="number" step="0.1" inputMode="decimal" error={errors.waistCm?.message} {...register('waistCm')} />
      <Input label="Peitoral (cm)" type="number" step="0.1" inputMode="decimal" error={errors.chestCm?.message} {...register('chestCm')} />
      <p className="col-span-2 text-xs font-medium text-ink-400">Cintura e peitoral são opcionais.</p>
      <div className="col-span-2">
        <Button type="submit" fullWidth loading={isSubmitting || addMeasurement.isPending}>
          Registrar medida
        </Button>
      </div>
    </form>
  )
}
