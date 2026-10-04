import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Spinner } from '@/shared/ui/Spinner'
import {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  adminApi,
  type AuditAction,
  type AuditTargetType,
} from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { PaginationBar } from '@/features/admin/components/DataTable'
import { AdminHeader, FilterSelect, Pill } from '@/features/admin/components/controls'
import { AuditEntry } from '@/features/admin/components/AuditEntry'
import { AUDIT_ACTION_LABEL, AUDIT_TARGET_LABEL } from '@/features/admin/lib/format'

const PAGE_SIZE = 30

const dateInputClass =
  'h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100'

/** `YYYY-MM-DD` from the date input → inclusive ISO bound in the browser's timezone. */
function dayBoundary(date: string, end: boolean) {
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString()
}

/** Super user only (3.4): full audit log with actor/action/target/period filters, kept in the URL. */
export function AdminAuditPage() {
  const list = useListParams()
  const actorId = list.get('actor')
  const action = list.get('action') as AuditAction | ''
  const targetType = list.get('target') as AuditTargetType | ''
  const from = list.get('from')
  const to = list.get('to')
  const hasFilters = !!(actorId || action || targetType || from || to)

  const logs = useQuery({
    queryKey: ['admin', 'audit-logs', { actorId, action, targetType, from, to, page: list.page }],
    queryFn: () =>
      adminApi.auditLogs.list({
        actorId: actorId || undefined,
        action: action || undefined,
        targetType: targetType || undefined,
        from: from ? dayBoundary(from, false) : undefined,
        to: to ? dayBoundary(to, true) : undefined,
        page: list.page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const actors = useQuery({
    queryKey: ['admin', 'admins', 'all'],
    queryFn: () => adminApi.admins.list({ limit: 100 }),
  })

  const today = new Date().toLocaleDateString('en-CA')

  return (
    <>
      <AdminHeader
        title="Auditoria"
        meta={
          <>
            <Pill tone="warning">Somente super user</Pill>
            {logs.data && (
              <span className="text-[13px] font-semibold text-ink-400">
                {logs.data.total.toLocaleString('pt-BR')} {logs.data.total === 1 ? 'registro' : 'registros'}
              </span>
            )}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-3.5 overflow-auto p-4 md:px-7 md:py-[22px]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_160px_160px_auto]">
          <FilterSelect
            label="Filtrar por autor"
            value={actorId}
            onChange={(value) => list.set({ actor: value })}
            options={[
              { value: '', label: 'Todos os autores' },
              ...(actors.data?.items ?? []).map((a) => ({ value: a.id, label: a.email })),
            ]}
          />
          <FilterSelect
            label="Filtrar por ação"
            value={action}
            onChange={(value) => list.set({ action: value })}
            options={[
              { value: '', label: 'Todas as ações' },
              ...AUDIT_ACTIONS.map((a) => ({ value: a, label: `${a} · ${AUDIT_ACTION_LABEL[a]}` })),
            ]}
          />
          <FilterSelect
            label="Filtrar por tipo de alvo"
            value={targetType}
            onChange={(value) => list.set({ target: value })}
            options={[
              { value: '', label: 'Todos os alvos' },
              ...AUDIT_TARGET_TYPES.map((t) => ({ value: t, label: AUDIT_TARGET_LABEL[t] })),
            ]}
          />
          <input
            type="date"
            aria-label="De"
            value={from}
            max={to || today}
            onChange={(e) => list.set({ from: e.target.value })}
            className={dateInputClass}
          />
          <input
            type="date"
            aria-label="Até"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => list.set({ to: e.target.value })}
            className={dateInputClass}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={() => list.set({ actor: undefined, action: undefined, target: undefined, from: undefined, to: undefined })}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ink-600 hover:bg-white"
            >
              <X size={15} />
              Limpar
            </button>
          )}
        </div>

        <section aria-label="Registros de auditoria" className="rounded-[20px] border border-border bg-white px-5 py-2">
          {logs.isLoading && (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          )}
          {logs.isError && <p className="py-10 text-center text-sm text-ink-400">Não foi possível carregar o log.</p>}
          {logs.data?.items.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-400">Nenhum registro para esses filtros.</p>
          )}
          <ul>
            {logs.data?.items.map((log) => <AuditEntry key={log.id} log={log} />)}
          </ul>
        </section>

        {logs.data && (
          <PaginationBar page={list.page} total={logs.data.total} limit={logs.data.limit} onPageChange={list.setPage} />
        )}
      </div>
    </>
  )
}
