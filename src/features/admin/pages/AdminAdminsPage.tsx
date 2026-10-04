import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/shared/ui/Toast'
import { Spinner } from '@/shared/ui/Spinner'
import { ApiError } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import type { Role } from '@/shared/auth/types'
import { adminApi, type AdminUserSummary } from '@/features/admin/api'
import { useListParams } from '@/features/admin/hooks/useListParams'
import { DataTable, type Column } from '@/features/admin/components/DataTable'
import { AdminHeader, Avatar, Pill, SearchField, Segmented } from '@/features/admin/components/controls'
import { ConfirmActionModal, type PendingAction } from '@/features/admin/components/ConfirmActionModal'
import { AuditEntry } from '@/features/admin/components/AuditEntry'
import { ROLE_LABEL, ROLE_TONE, STATUS_LABEL, STATUS_TONE, displayName, formatDate } from '@/features/admin/lib/format'

const PAGE_SIZE = 20

type RoleTab = 'all' | 'admin' | 'super_user'

const ROLE_TABS: { value: RoleTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'admin', label: 'Admins' },
  { value: 'super_user', label: 'Super users' },
]

/** Super user only (3.4): promote/demote/revoke admins, with the latest audit entries alongside. */
export function AdminAdminsPage() {
  const { user: me } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const list = useListParams()
  const q = list.get('q')
  const role = (list.get('role') || 'all') as RoleTab
  const [pending, setPending] = useState<PendingAction | null>(null)

  const admins = useQuery({
    queryKey: ['admin', 'admins', { q, role, page: list.page }],
    queryFn: () =>
      adminApi.admins.list({ q: q || undefined, role: role === 'all' ? undefined : role, page: list.page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const audit = useQuery({
    queryKey: ['admin', 'audit-logs', 'recent'],
    queryFn: () => adminApi.auditLogs.list({ limit: 8 }),
  })

  const setRole = useMutation({
    mutationFn: ({ id, role, reason }: { id: string; role: Role; reason?: string }) =>
      adminApi.admins.setRole(id, { role, reason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
      toast(
        updated.role === 'user'
          ? `Acesso ao painel revogado para ${displayName(updated)}.`
          : `${displayName(updated)} agora é ${ROLE_LABEL[updated.role].toLowerCase()}.`,
        'success',
      )
    },
  })

  const confirmRole = (target: AdminUserSummary, nextRole: Role) => {
    const name = displayName(target)
    const copy: Record<Role, Omit<PendingAction, 'run'>> = {
      super_user: {
        title: 'Promover a super user',
        description: <>{name} passa a gerenciar administradores e ver o log de auditoria.</>,
        confirmLabel: 'Promover',
      },
      admin: {
        title: 'Rebaixar a admin',
        description: <>{name} continua no painel, mas perde a gestão de administradores e a auditoria.</>,
        confirmLabel: 'Rebaixar',
      },
      user: {
        title: 'Revogar acesso ao painel',
        description: <>{name} volta a ser um usuário comum e perde o acesso ao painel no próximo request.</>,
        confirmLabel: 'Revogar',
        danger: true,
      },
    }
    setPending({
      ...copy[nextRole],
      withReason: true,
      run: (reason) =>
        setRole.mutateAsync({ id: target.id, role: nextRole, reason }).catch((err) => {
          toast(err instanceof ApiError ? err.message : 'Não foi possível alterar o papel.', 'error')
          throw err
        }),
    })
  }

  const columns: Column<AdminUserSummary>[] = [
    {
      key: 'admin',
      header: 'Administrador',
      width: 'minmax(0,1fr)',
      mobile: 'primary',
      cell: (a) => (
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar src={a.avatarUrl} size={42} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[14.5px] font-extrabold text-ink-900">{displayName(a)}</span>
              <Pill tone={ROLE_TONE[a.role]} className="text-[11px]">
                {ROLE_LABEL[a.role]}
              </Pill>
              {a.status !== 'active' && <Pill tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Pill>}
            </div>
            <p className="mt-0.5 truncate text-[12.5px] font-medium text-ink-400">
              {a.email} · desde {formatDate(a.createdAt)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      width: 'auto',
      align: 'right',
      cell: (a) => {
        if (a.id === me?.id) return <span className="text-[12.5px] font-semibold text-ink-200">Você</span>
        return (
          <div className="flex flex-wrap gap-2">
            {a.role === 'admin' && (
              <ActionButton tone="primary" onClick={() => confirmRole(a, 'super_user')}>
                Promover a super user
              </ActionButton>
            )}
            {a.role === 'super_user' && (
              <ActionButton tone="neutral" onClick={() => confirmRole(a, 'admin')}>
                Rebaixar a admin
              </ActionButton>
            )}
            <ActionButton tone="danger" onClick={() => confirmRole(a, 'user')}>
              Revogar
            </ActionButton>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <AdminHeader
        title="Administradores"
        meta={<Pill tone="warning">Somente super user</Pill>}
      >
        <SearchField
          label="Buscar administrador"
          placeholder="Nome ou e-mail…"
          value={q}
          onChange={(value) => list.set({ q: value })}
          className="w-full sm:w-60"
        />
      </AdminHeader>

      <div className="grid flex-1 grid-cols-1 content-start gap-[22px] overflow-auto p-4 md:px-7 md:py-[26px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3.5">
          <Segmented
            label="Filtrar por papel"
            options={ROLE_TABS}
            value={role}
            onChange={(value) => list.set({ role: value === 'all' ? undefined : value })}
          />
          <DataTable
            label="Administradores"
            columns={columns}
            rows={admins.data?.items ?? []}
            rowKey={(a) => a.id}
            loading={admins.isLoading}
            error={admins.isError}
            emptyMessage="Nenhum administrador encontrado."
            pagination={
              admins.data && {
                page: list.page,
                total: admins.data.total,
                limit: admins.data.limit,
                onPageChange: list.setPage,
              }
            }
          />
        </div>

        <section aria-label="Log de auditoria recente" className="self-start rounded-[20px] border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-900">Log de auditoria</h2>
            <Link to="/admin/audit" className="flex min-h-11 items-center text-[12.5px] font-bold text-primary-500">
              Ver tudo
            </Link>
          </div>
          {audit.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
          {audit.isError && <p className="py-6 text-sm text-ink-400">Não foi possível carregar o log.</p>}
          {audit.data?.items.length === 0 && <p className="py-6 text-sm text-ink-400">Nenhuma alteração registrada.</p>}
          <ul className="mt-1.5">
            {audit.data?.items.map((log) => <AuditEntry key={log.id} log={log} compact />)}
          </ul>
        </section>
      </div>

      <ConfirmActionModal action={pending} onClose={() => setPending(null)} />
    </>
  )
}

function ActionButton({
  tone,
  onClick,
  children,
}: {
  tone: 'primary' | 'danger' | 'neutral'
  onClick: () => void
  children: string
}) {
  const classes = {
    primary: 'bg-primary-50 text-primary-500',
    danger: 'bg-danger-50 text-danger-500',
    neutral: 'bg-surface-soft text-ink-700',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center rounded-[10px] px-3.5 text-[12.5px] font-extrabold whitespace-nowrap ${classes[tone]}`}
    >
      {children}
    </button>
  )
}
