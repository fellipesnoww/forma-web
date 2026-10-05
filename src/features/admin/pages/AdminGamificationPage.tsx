import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Medal, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { useToast } from '@/shared/ui/Toast'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { ApiError } from '@/shared/api/client'
import { activitiesApi } from '@/features/activities'
import {
  adminApi,
  type Achievement,
  type ActiveFilter,
  type Challenge,
  type ChallengePeriod,
} from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { DataTable, type Column } from '@/features/admin/components/DataTable'
import { AdminHeader, FilterSelect, Pill, SearchField, Segmented, Toggle } from '@/features/admin/components/controls'
import { ChallengeFormModal } from '@/features/admin/components/ChallengeFormModal'
import { AchievementFormModal } from '@/features/admin/components/AchievementFormModal'
import { UnlocksModal } from '@/features/admin/components/UnlocksModal'
import { PERIOD_LABEL, PERIOD_TONE, describeCriteria, describeGoal, formatRange } from '@/features/admin/lib/format'

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

/** 3.5: challenges and achievements side by side (stacked on mobile), each with its own filters and pages. */
export function AdminGamificationPage() {
  const [challengeModal, setChallengeModal] = useState<{ open: boolean; challenge: Challenge | null }>({
    open: false,
    challenge: null,
  })
  const [achievementModal, setAchievementModal] = useState<{ open: boolean; achievement: Achievement | null }>({
    open: false,
    achievement: null,
  })
  const [unlocksOf, setUnlocksOf] = useState<Achievement | null>(null)

  return (
    <>
      <AdminHeader title="Conquistas e desafios">
        <Button variant="secondary" size="sm" className="h-11" onClick={() => setAchievementModal({ open: true, achievement: null })}>
          <Plus size={15} />
          Nova conquista
        </Button>
        <Button size="sm" className="h-11" onClick={() => setChallengeModal({ open: true, challenge: null })}>
          <Plus size={15} />
          Novo desafio
        </Button>
      </AdminHeader>

      <div className="grid flex-1 grid-cols-1 content-start gap-[22px] overflow-auto p-4 md:px-7 md:py-[26px] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ChallengesSection onEdit={(challenge) => setChallengeModal({ open: true, challenge })} />
        <AchievementsSection
          onEdit={(achievement) => setAchievementModal({ open: true, achievement })}
          onShowUnlocks={setUnlocksOf}
        />
      </div>

      <ChallengeFormModal
        open={challengeModal.open}
        challenge={challengeModal.challenge}
        onClose={() => setChallengeModal((m) => ({ ...m, open: false }))}
      />
      <AchievementFormModal
        open={achievementModal.open}
        achievement={achievementModal.achievement}
        onClose={() => setAchievementModal((m) => ({ ...m, open: false }))}
      />
      <UnlocksModal achievement={unlocksOf} onClose={() => setUnlocksOf(null)} />
    </>
  )
}

function useActivityTypeNames() {
  const types = useQuery({ queryKey: ['activity-types'], queryFn: activitiesApi.listTypes })
  return new Map((types.data?.items ?? []).map((t) => [t.id, t.name]))
}

function ChallengesSection({ onEdit }: { onEdit: (challenge: Challenge) => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const list = useListParams('c')
  const q = list.get('q')
  const status = (list.get('status') || 'all') as ActiveFilter
  const period = list.get('period') as ChallengePeriod | ''
  const typeNames = useActivityTypeNames()

  const challenges = useQuery({
    queryKey: ['admin', 'challenges', { q, status, period, page: list.page }],
    queryFn: () =>
      adminApi.challenges.list({ q: q || undefined, status, period: period || undefined, page: list.page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.challenges.update(id, { isActive }),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] })
      toast(c.isActive ? `Desafio “${c.name}” ativado.` : `Desafio “${c.name}” desativado.`, 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível alterar o desafio.', 'error'),
  })

  const columns: Column<Challenge>[] = [
    {
      key: 'name',
      header: 'Nome e meta',
      width: 'minmax(0,1.4fr)',
      mobile: 'primary',
      cell: (c) => {
        const typeId = c.goal.type !== 'workout_count' ? c.goal.activityTypeId : undefined
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink-900">{c.name}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-ink-400">
              {describeGoal(c.goal, typeId ? typeNames.get(typeId) : undefined)}
            </p>
          </div>
        )
      },
    },
    {
      key: 'period',
      header: 'Período',
      cell: (c) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-[13px] font-semibold text-ink-600">{formatRange(c.startsAt, c.endsAt)}</span>
          <Pill tone={PERIOD_TONE[c.period]} className="px-2 py-0.5 text-[10.5px]">
            {PERIOD_LABEL[c.period]}
          </Pill>
        </div>
      ),
    },
    {
      key: 'reward',
      header: 'Recompensa',
      cell: (c) =>
        c.reward ? (
          <span className="text-[12.5px] font-bold text-warning-700">{c.reward}</span>
        ) : (
          <span className="hidden text-[12.5px] font-bold text-ink-200 md:inline">—</span>
        ),
    },
    {
      key: 'people',
      header: 'Inscritos',
      width: '70px',
      cell: (c) => (
        <span className="text-[13px] font-bold text-ink-900">
          {c.participantCount}
          <span className="font-semibold text-ink-400 md:hidden"> inscritos</span>
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Ativo',
      width: '50px',
      align: 'right',
      mobile: 'primary',
      cell: (c) => (
        <Toggle
          checked={c.isActive}
          label={`${c.isActive ? 'Desativar' : 'Ativar'} desafio ${c.name}`}
          disabled={toggle.isPending && toggle.variables?.id === c.id}
          onChange={(isActive) => toggle.mutate({ id: c.id, isActive })}
        />
      ),
    },
  ]

  return (
    <section aria-labelledby="challenges-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          label="Buscar desafio"
          placeholder="Buscar desafio…"
          value={q}
          onChange={(value) => list.set({ q: value })}
          className="w-full sm:w-52"
        />
        <Segmented label="Status dos desafios" options={STATUS_OPTIONS} value={status} onChange={(v) => list.set({ status: v === 'all' ? undefined : v })} />
        <FilterSelect
          label="Período dos desafios"
          value={period}
          onChange={(value) => list.set({ period: value })}
          options={[
            { value: '', label: 'Qualquer período' },
            ...(Object.keys(PERIOD_LABEL) as ChallengePeriod[]).map((p) => ({ value: p, label: PERIOD_LABEL[p] })),
          ]}
          className="w-full sm:w-44"
        />
      </div>
      <DataTable
        label="Desafios"
        title={
          <h2 id="challenges-title" className="px-5 pt-[18px] pb-3 text-base font-extrabold text-ink-900">
            Desafios
          </h2>
        }
        columns={columns}
        rows={challenges.data?.items ?? []}
        rowKey={(c) => c.id}
        loading={challenges.isLoading}
        error={challenges.isError}
        emptyMessage="Nenhum desafio encontrado."
        onRowClick={onEdit}
        rowClassName={(c) => (c.isActive ? undefined : 'opacity-55')}
        pagination={
          challenges.data && {
            page: list.page,
            total: challenges.data.total,
            limit: challenges.data.limit,
            onPageChange: list.setPage,
          }
        }
      />
    </section>
  )
}

const ICON_TONES = [
  'bg-warning-50 text-warning-700',
  'bg-primary-50 text-primary-500',
  'bg-success-50 text-success-600',
  'bg-danger-50 text-danger-500',
]

function AchievementsSection({
  onEdit,
  onShowUnlocks,
}: {
  onEdit: (achievement: Achievement) => void
  onShowUnlocks: (achievement: Achievement) => void
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const list = useListParams('a')
  const q = list.get('q')
  const status = (list.get('status') || 'all') as ActiveFilter

  const achievements = useQuery({
    queryKey: ['admin', 'achievements', { q, status, page: list.page }],
    queryFn: () => adminApi.achievements.list({ q: q || undefined, status, page: list.page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  // Names for "concluir <desafio>" criteria.
  const challengeOptions = useQuery({
    queryKey: ['admin', 'challenges', 'options'],
    queryFn: () => adminApi.challenges.list({ limit: 100 }),
  })
  const challengeNames = new Map((challengeOptions.data?.items ?? []).map((c) => [c.id, c.name]))

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.achievements.update(id, { isActive }),
    onSuccess: (a) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] })
      toast(a.isActive ? `Conquista “${a.name}” ativada.` : `Conquista “${a.name}” desativada.`, 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível alterar a conquista.', 'error'),
  })

  const columns: Column<Achievement>[] = [
    {
      key: 'name',
      header: 'Conquista',
      width: 'minmax(0,1fr)',
      mobile: 'primary',
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${ICON_TONES[a.name.length % ICON_TONES.length]}`}
          >
            {a.iconUrl ? <AuthedImage src={a.iconUrl} alt="" className="h-full w-full object-cover" /> : <Medal size={18} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink-900">{a.name}</p>
            <p className="truncate text-xs font-semibold text-ink-400">
              Critério:{' '}
              {describeCriteria(
                a.criteria,
                a.criteria.type === 'challenge_complete' ? challengeNames.get(a.criteria.challengeId) : undefined,
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'unlocks',
      header: 'Desbloqueios',
      width: '96px',
      cell: (a) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShowUnlocks(a)
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="flex min-h-11 flex-col items-start justify-center text-left md:items-end md:text-right"
          aria-label={`Ver usuários que desbloquearam ${a.name} (${a.unlockCount})`}
        >
          <span className="text-[13.5px] font-extrabold text-ink-900">{a.unlockCount}</span>
          <span className="text-[11.5px] font-bold text-primary-500">ver usuários</span>
        </button>
      ),
    },
    {
      key: 'active',
      header: 'Ativa',
      width: '50px',
      align: 'right',
      mobile: 'primary',
      cell: (a) => (
        <Toggle
          checked={a.isActive}
          label={`${a.isActive ? 'Desativar' : 'Ativar'} conquista ${a.name}`}
          disabled={toggle.isPending && toggle.variables?.id === a.id}
          onChange={(isActive) => toggle.mutate({ id: a.id, isActive })}
        />
      ),
    },
  ]

  return (
    <section aria-labelledby="achievements-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          label="Buscar conquista"
          placeholder="Buscar conquista…"
          value={q}
          onChange={(value) => list.set({ q: value })}
          className="w-full sm:w-52"
        />
        <Segmented label="Status das conquistas" options={STATUS_OPTIONS} value={status} onChange={(v) => list.set({ status: v === 'all' ? undefined : v })} />
      </div>
      <DataTable
        label="Conquistas"
        title={
          <h2 id="achievements-title" className="px-5 pt-[18px] pb-3 text-base font-extrabold text-ink-900">
            Conquistas
          </h2>
        }
        columns={columns}
        rows={achievements.data?.items ?? []}
        rowKey={(a) => a.id}
        loading={achievements.isLoading}
        error={achievements.isError}
        emptyMessage="Nenhuma conquista encontrada."
        onRowClick={onEdit}
        rowClassName={(a) => (a.isActive ? undefined : 'opacity-55')}
        pagination={
          achievements.data && {
            page: list.page,
            total: achievements.data.total,
            limit: achievements.data.limit,
            onPageChange: list.setPage,
          }
        }
      />
    </section>
  )
}
