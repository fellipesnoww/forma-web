import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Modal } from '@/shared/ui/Modal'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import type { AccountStatus } from '@/shared/auth/types'
import { adminApi, type AdminUserSummary } from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { DataTable, type Column } from '@/features/admin/components/DataTable'
import { AdminHeader, Avatar, Pill, SearchField, Segmented } from '@/features/admin/components/controls'
import { UserDetailPanel } from '@/features/admin/components/UserDetailPanel'
import { ROLE_LABEL, STATUS_LABEL, STATUS_TONE, displayName, formatDate } from '@/features/admin/lib/format'

const PAGE_SIZE = 20

type Tab = 'all' | AccountStatus | 'admins'

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'banned', label: 'Banidos' },
  { value: 'admins', label: 'Admins' },
]

const columns: Column<AdminUserSummary>[] = [
  {
    key: 'user',
    header: 'Usuário',
    width: 'minmax(0,2fr)',
    mobile: 'primary',
    cell: (u) => (
      <div className="flex min-w-0 items-center gap-[11px]">
        <Avatar src={u.avatarUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">{displayName(u)}</p>
          <p className="truncate text-xs font-medium text-ink-400">{u.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'since',
    header: 'Cadastro',
    cell: (u) => <span className="text-[13px] font-semibold text-ink-600">{formatDate(u.createdAt)}</span>,
  },
  {
    key: 'role',
    header: 'Papel',
    width: '0.8fr',
    cell: (u) => <span className="text-[13px] font-bold text-ink-900">{ROLE_LABEL[u.role]}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    width: '0.8fr',
    mobile: 'primary',
    align: 'right',
    cell: (u) => <Pill tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Pill>,
  },
]

export function AdminUsersPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const list = useListParams()
  const q = list.get('q')
  const tab = (list.get('tab') || 'all') as Tab
  const selectedId = list.get('user') || null

  const users = useQuery({
    queryKey: ['admin', 'users', 'list', { q, tab, page: list.page }],
    queryFn: () =>
      adminApi.users.list({
        q: q || undefined,
        status: tab !== 'all' && tab !== 'admins' ? tab : undefined,
        role: tab === 'admins' ? 'admin' : undefined,
        page: list.page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const allUsers = useQuery({
    queryKey: ['admin', 'users', 'count'],
    queryFn: () => adminApi.users.list({ limit: 1 }),
  })

  // `user` isn't a filter, so it mustn't reset the page.
  const select = (id: string | null) => list.set({ user: id ?? undefined, page: list.page > 1 ? String(list.page) : undefined })

  return (
    <>
      <AdminHeader
        title="Usuários"
        meta={
          allUsers.data && (
            <span className="text-[13px] font-semibold text-ink-400">
              {allUsers.data.total.toLocaleString('pt-BR')} cadastrados
            </span>
          )
        }
      >
        <SearchField
          label="Buscar usuário"
          placeholder="Nome ou e-mail…"
          value={q}
          onChange={(value) => list.set({ q: value })}
          className="w-full sm:w-[260px]"
        />
      </AdminHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3.5 overflow-auto p-4 md:px-7 md:py-[22px]">
          <Segmented
            label="Filtrar usuários"
            options={TABS}
            value={tab}
            onChange={(value) => list.set({ tab: value === 'all' ? undefined : value })}
          />
          <DataTable
            label="Usuários"
            columns={columns}
            rows={users.data?.items ?? []}
            rowKey={(u) => u.id}
            loading={users.isLoading}
            error={users.isError}
            emptyMessage="Nenhum usuário encontrado."
            onRowClick={(u) => select(u.id)}
            selectedKey={isDesktop ? selectedId : null}
            pagination={
              users.data && {
                page: list.page,
                total: users.data.total,
                limit: users.data.limit,
                onPageChange: list.setPage,
              }
            }
          />
        </div>

        {isDesktop && (
          <aside aria-label="Detalhes do usuário" className="flex flex-col overflow-auto border-l border-border bg-white p-[22px]">
            {selectedId ? (
              <UserDetailPanel key={selectedId} userId={selectedId} />
            ) : (
              <p className="m-auto max-w-[200px] text-center text-sm font-medium text-ink-400">
                Selecione um usuário para ver o perfil, as estatísticas e as ações.
              </p>
            )}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Modal open={!!selectedId} onClose={() => select(null)} title="Perfil do usuário">
          {selectedId && <UserDetailPanel key={selectedId} userId={selectedId} />}
        </Modal>
      )}
    </>
  )
}
