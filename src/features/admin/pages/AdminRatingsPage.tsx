import { useState } from 'react'
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { Download, Monitor, Smartphone, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useToast } from '@/shared/ui/Toast'
import { Button } from '@/shared/ui/Button'
import { adminApi, type AdminRating, type AdminRatingParams } from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { DataTable, type Column } from '@/features/admin/components/DataTable'
import { AdminHeader, Segmented } from '@/features/admin/components/controls'
import { displayName, formatDateTime } from '@/features/admin/lib/format'
import { RANKS, RANK_TONE, RankBars, type RatingPlatform, type RatingRank } from '@/features/ratings'

const PAGE_SIZE = 20

const avgFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const formatAvg = (value: number | null | undefined) => (value == null ? '—' : avgFmt.format(value))

const PLATFORM_TABS: { value: '' | RatingPlatform; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
]

const RANK_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  ...RANKS.map((n) => ({ value: String(n), label: String(n) })),
]

function parseRank(value: string): RatingRank | undefined {
  const n = Number(value)
  return RANKS.includes(n as RatingRank) ? (n as RatingRank) : undefined
}

function parsePlatform(value: string): RatingPlatform | undefined {
  return value === 'web' || value === 'mobile' ? value : undefined
}

/** Totals behind the summary cards: one `limit=1` call per slice, the server does the counting. */
function useRatingSummary() {
  const slices: { key: string; params: AdminRatingParams }[] = [
    { key: 'all', params: {} },
    ...RANKS.map((rank) => ({ key: `rank-${rank}`, params: { rank } })),
    { key: 'web', params: { platform: 'web' } },
    { key: 'mobile', params: { platform: 'mobile' } },
  ]
  const results = useQueries({
    queries: slices.map(({ params }) => ({
      queryKey: ['admin', 'ratings', 'summary', params],
      queryFn: () => adminApi.ratings.list({ ...params, limit: 1 }),
    })),
  })
  const byKey = Object.fromEntries(slices.map((s, i) => [s.key, results[i].data]))
  return {
    total: byKey.all?.total,
    average: byKey.all?.averageRank,
    distribution: RANKS.map((rank) => ({ rank, count: byKey[`rank-${rank}`]?.total })),
    web: byKey.web,
    mobile: byKey.mobile,
  }
}

function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** No export route yet: walks every page of the current filters and builds the CSV here. */
async function exportCsv(filters: AdminRatingParams) {
  const items: AdminRating[] = []
  for (let page = 1; ; page++) {
    const res = await adminApi.ratings.list({ ...filters, page, limit: 100 })
    items.push(...res.items)
    if (items.length >= res.total || res.items.length === 0) break
  }
  const header = ['data', 'nota', 'comentario', 'plataforma', 'dispositivo', 'usuario_id', 'email', 'nome']
  const rows = items.map((r) =>
    [r.date, String(r.rank), r.observation ?? '', r.platform, r.device, r.user.id, r.user.email, r.user.displayName ?? '']
      .map(csvCell)
      .join(','),
  )
  const blob = new Blob(['﻿' + [header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `avaliacoes-${new Date().toLocaleDateString('en-CA')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Admin and super user (5.4): app ratings with average, score distribution and per-platform split. */
export function AdminRatingsPage() {
  const toast = useToast()
  const list = useListParams()
  const platform = parsePlatform(list.get('platform'))
  const rank = parseRank(list.get('rank'))
  const userId = list.get('user') || undefined
  const filters: AdminRatingParams = { platform, rank, userId }
  const [exporting, setExporting] = useState(false)

  const ratings = useQuery({
    queryKey: ['admin', 'ratings', { ...filters, page: list.page }],
    queryFn: () => adminApi.ratings.list({ ...filters, page: list.page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const summary = useRatingSummary()

  const filteredUser = userId ? ratings.data?.items.find((r) => r.user.id === userId)?.user : undefined
  const positive =
    summary.distribution[3].count != null && summary.distribution[4].count != null
      ? summary.distribution[3].count + summary.distribution[4].count
      : undefined

  const onExport = async () => {
    setExporting(true)
    try {
      await exportCsv(filters)
    } catch {
      toast('Não foi possível exportar as avaliações.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const columns: Column<AdminRating>[] = [
    {
      key: 'rank',
      header: 'Nota',
      width: '120px',
      mobile: 'primary',
      cell: (r) => <RankBars rank={r.rank} />,
    },
    {
      key: 'observation',
      header: 'Descrição',
      width: 'minmax(0,1fr)',
      cell: (r) => (
        <div className="min-w-0">
          {r.observation ? (
            <p className="text-[13.5px] leading-[1.45] font-medium text-pretty break-words text-ink-700">{r.observation}</p>
          ) : (
            <p className="text-[13px] font-medium text-ink-200 italic">Sem comentário</p>
          )}
          <p className="mt-1 truncate text-[11.5px] font-semibold text-ink-200">
            {formatDateTime(r.date)} · {r.device}
          </p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Usuário',
      width: '190px',
      cell: (r) => (
        <button
          type="button"
          onClick={() => list.set({ user: r.user.id })}
          title={`${r.user.email}\n${r.user.id}`}
          className="flex min-h-11 max-w-full min-w-0 flex-col items-start justify-center rounded-lg text-left hover:text-primary-500 md:-mx-1.5 md:px-1.5"
        >
          <span className="max-w-full truncate text-[13px] font-bold text-ink-900">{displayName(r.user)}</span>
          <span className="max-w-full truncate font-mono text-xs font-semibold text-ink-600">{r.user.id.slice(0, 8)}</span>
        </button>
      ),
    },
    {
      key: 'platform',
      header: 'Plataforma',
      width: '120px',
      mobile: 'primary',
      align: 'right',
      cell: (r) => <PlatformPill platform={r.platform} />,
    },
  ]

  return (
    <>
      <AdminHeader
        title="Avaliações"
        meta={
          ratings.data && (
            <span className="text-[13px] font-semibold text-ink-400">
              {ratings.data.total.toLocaleString('pt-BR')} {ratings.data.total === 1 ? 'avaliação' : 'avaliações'}
            </span>
          )
        }
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          loading={exporting}
          disabled={!ratings.data?.total}
          className="rounded-[11px] text-[13px]"
        >
          {!exporting && <Download size={15} />}
          Exportar CSV
        </Button>
      </AdminHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:px-7 md:py-[22px]">
        <div className="grid gap-3.5 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
          <div className="flex flex-col justify-between rounded-[18px] border border-border bg-surface p-[18px]">
            <p className="text-[12.5px] font-semibold text-ink-400">Nota média</p>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[38px] font-extrabold tracking-[-1px] text-ink-900 tabular-nums">
                {formatAvg(summary.average)}
              </span>
              <span className="text-sm font-bold text-ink-200">/ 5</span>
            </p>
            <p className="mt-0.5 text-xs font-bold text-success-600">
              {positive == null ? '—' : `${positive.toLocaleString('pt-BR')} notas 4 ou 5`}
            </p>
          </div>

          <ul aria-label="Distribuição das notas" className="flex flex-col justify-center gap-1.5 rounded-[18px] border border-border bg-surface px-[18px] py-4">
            {[...summary.distribution].reverse().map(({ rank: n, count }) => {
              const pct = summary.total && count ? (count / summary.total) * 100 : 0
              return (
                <li key={n} className="flex items-center gap-2.5">
                  <span className="w-3 text-xs font-extrabold text-ink-600">{n}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={cn('block h-full rounded-full', RANK_TONE[n].bar)} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-8 text-right text-xs font-bold text-ink-400 tabular-nums">{count ?? '—'}</span>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col justify-center gap-3 rounded-[18px] border border-border bg-surface p-[18px]">
            <PlatformSummary label="Web" dot="bg-primary-500" data={summary.web} />
            <PlatformSummary label="Mobile" dot="bg-activity-500" data={summary.mobile} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Filtrar por plataforma"
            options={PLATFORM_TABS}
            value={platform ?? ''}
            onChange={(value) => list.set({ platform: value })}
          />
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
            <span className="shrink-0 pr-2 pl-1.5 text-xs font-bold text-ink-200">Nota</span>
            <div role="radiogroup" aria-label="Filtrar por nota" className="flex gap-1">
              {RANK_TABS.map((tab) => {
                const active = (rank ? String(rank) : '') === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => list.set({ rank: tab.value })}
                    className={cn(
                      'min-h-9 min-w-[30px] shrink-0 rounded-[9px] px-2.5 text-[12.5px] font-bold',
                      active ? 'bg-primary-50 font-extrabold text-primary-500' : 'text-ink-600 hover:bg-surface-soft',
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {userId && (
          <div className="flex w-fit max-w-full items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 py-1 pr-1 pl-3 text-[13px] font-semibold text-primary-600">
            <span className="truncate">
              Avaliações de <b>{filteredUser ? displayName(filteredUser) : userId.slice(0, 8)}</b>
            </span>
            <button
              type="button"
              onClick={() => list.set({ user: undefined })}
              aria-label="Remover filtro de usuário"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-primary-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <DataTable
          label="Avaliações"
          columns={columns}
          rows={ratings.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={ratings.isLoading}
          error={ratings.isError}
          emptyMessage="Nenhuma avaliação com esses filtros."
          pagination={
            ratings.data && {
              page: list.page,
              total: ratings.data.total,
              limit: ratings.data.limit,
              onPageChange: list.setPage,
            }
          }
        />
      </div>
    </>
  )
}

function PlatformSummary({
  label,
  dot,
  data,
}: {
  label: string
  dot: string
  data: { total: number; averageRank: number | null } | undefined
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-[13px] font-bold text-ink-700">
        <span className={cn('h-2 w-2 rounded-full', dot)} />
        {label}
      </span>
      <span className="text-[13px] font-extrabold text-ink-900 tabular-nums">
        {formatAvg(data?.averageRank)} <span className="font-semibold text-ink-200">· {data?.total ?? '—'}</span>
      </span>
    </div>
  )
}

function PlatformPill({ platform }: { platform: RatingPlatform }) {
  const web = platform === 'web'
  const Icon = web ? Monitor : Smartphone
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-extrabold',
        web ? 'bg-primary-50 text-primary-500' : 'bg-activity-50 text-activity-500',
      )}
    >
      <Icon size={13} strokeWidth={2.2} />
      {web ? 'Web' : 'Mobile'}
    </span>
  )
}
