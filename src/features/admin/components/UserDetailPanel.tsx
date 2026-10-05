import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, RotateCcw, ShieldCheck, UserX } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthContext'
import type { AccountStatus } from '@/shared/auth/types'
import { adminApi, type AdminUserDetail } from '@/features/admin/api'
import { Avatar, Pill } from '@/features/admin/components/controls'
import { ConfirmActionModal, type PendingAction } from '@/features/admin/components/ConfirmActionModal'
import {
  ROLE_LABEL,
  ROLE_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  displayName,
  formatDate,
  formatDateTime,
} from '@/features/admin/lib/format'

/** Profile + usage stats + account actions for one user (3.3). Rendered in the side panel or a modal. */
export function UserDetailPanel({ userId }: { userId: string }) {
  const { user: me } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingAction | null>(null)

  const detail = useQuery({ queryKey: ['admin', 'users', 'detail', userId], queryFn: () => adminApi.users.get(userId) })

  const onError = (err: unknown) => {
    toast(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.', 'error')
    throw err
  }
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
  }

  const setStatus = useMutation({
    mutationFn: ({ status, reason }: { status: AccountStatus; reason?: string }) =>
      adminApi.users.setStatus(userId, { status, reason }),
    onSuccess: (updated) => {
      refresh()
      toast(`Conta de ${displayName(updated)}: ${STATUS_LABEL[updated.status].toLowerCase()}.`, 'success')
    },
  })

  const promote = useMutation({
    mutationFn: (reason?: string) => adminApi.users.promote(userId, reason),
    onSuccess: (updated) => {
      refresh()
      toast(`${displayName(updated)} agora é administrador.`, 'success')
    },
  })

  if (detail.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner />
      </div>
    )
  }
  if (detail.isError || !detail.data) {
    return <p className="py-10 text-center text-sm text-ink-400">Não foi possível carregar o usuário.</p>
  }

  const u = detail.data
  const name = displayName(u)
  const isSelf = u.id === me?.id
  const isSuper = me?.role === 'super_user'
  // Admins can only act on plain users; a super_user can act on anyone but themselves.
  const canChangeStatus = !isSelf && (isSuper || u.role === 'user')
  const canPromote = isSuper && !isSelf && u.role === 'user' && u.status === 'active'

  const confirmStatus = (status: AccountStatus) => {
    const copy: Record<AccountStatus, Omit<PendingAction, 'run'>> = {
      active: {
        title: 'Reativar conta',
        description: <>{name} volta a acessar o app normalmente.</>,
        confirmLabel: 'Reativar conta',
      },
      inactive: {
        title: 'Desativar conta',
        description: (
          <>
            {name} perde o acesso no próximo request e as sessões abertas são encerradas. Dá para reativar depois.
          </>
        ),
        confirmLabel: 'Desativar conta',
      },
      banned: {
        title: 'Banir usuário',
        description: <>{name} é bloqueado imediatamente, inclusive nas sessões abertas.</>,
        confirmLabel: 'Banir usuário',
        danger: true,
      },
    }
    setPending({
      ...copy[status],
      withReason: true,
      run: (reason) => setStatus.mutateAsync({ status, reason }).catch(onError),
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col items-center pt-1.5 text-center">
        <Avatar src={u.avatarUrl} size={76} className="border border-border-strong" />
        <h2 className="mt-3 text-lg font-extrabold text-ink-900">{name}</h2>
        <p className="max-w-full truncate text-[12.5px] font-medium text-ink-400">{u.email}</p>
        <div className="mt-2.5 flex gap-1.5">
          <Pill tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Pill>
          <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Pill>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <Stat label="Treinos" value={u.stats.completedWorkoutSessions} />
        <Stat label="Atividades" value={u.stats.freeActivities} />
        <Stat label="Planilhas" value={u.stats.workoutSheets} />
        <Stat label="Conquistas" value={u.stats.achievementsUnlocked} />
      </dl>

      <dl className="flex flex-col gap-2 text-[13px]">
        <Info label="Último treino ou atividade" value={u.stats.lastActivityAt ? formatDateTime(u.stats.lastActivityAt) : '—'} />
        <Info label="Cadastro" value={formatDate(u.createdAt)} />
        <Info label="Login" value={loginMethods(u)} />
        <Info label="Desafios" value={String(u.stats.challengesJoined)} />
        <Info label="Exercícios próprios" value={String(u.stats.customExercises)} />
        <Info label="Fuso" value={u.profile.timezone} />
      </dl>

      <div className="flex-1" />

      {isSelf && <p className="text-center text-xs font-semibold text-ink-400">Você não pode alterar a própria conta.</p>}
      {!isSelf && !canChangeStatus && (
        <p className="text-center text-xs font-semibold text-ink-400">Contas de administradores só podem ser alteradas por um super user.</p>
      )}

      {(canPromote || canChangeStatus) && (
        <div className="flex flex-col gap-2">
          {canPromote && (
            <Button
              onClick={() =>
                setPending({
                  title: 'Promover a administrador',
                  description: <>{name} passa a acessar o painel administrativo no próximo request.</>,
                  confirmLabel: 'Promover',
                  withReason: true,
                  run: (reason) => promote.mutateAsync(reason).catch(onError),
                })
              }
            >
              <ShieldCheck size={16} />
              Promover a administrador
            </Button>
          )}
          {canChangeStatus && u.status !== 'active' && (
            <Button variant="secondary" onClick={() => confirmStatus('active')}>
              <RotateCcw size={16} />
              Reativar conta
            </Button>
          )}
          {canChangeStatus && u.status === 'active' && (
            <Button variant="secondary" onClick={() => confirmStatus('inactive')}>
              <UserX size={16} />
              Desativar conta
            </Button>
          )}
          {canChangeStatus && u.status !== 'banned' && (
            <Button
              className="bg-danger-50 font-extrabold text-danger-500 shadow-none hover:bg-danger-50/70"
              variant="ghost"
              onClick={() => confirmStatus('banned')}
            >
              <Ban size={16} />
              Banir usuário
            </Button>
          )}
        </div>
      )}

      <ConfirmActionModal action={pending} onClose={() => setPending(null)} />
    </div>
  )
}

function loginMethods(u: AdminUserDetail) {
  const methods = [u.authMethods.password && 'E-mail e senha', u.authMethods.oauthProvider === 'google' && 'Google', u.authMethods.oauthProvider === 'apple' && 'Apple']
  return methods.filter(Boolean).join(' · ') || '—'
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-surface-muted p-3">
      <dt className="text-[11.5px] font-semibold text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-xl font-extrabold text-ink-900">{value}</dd>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-semibold text-ink-400">{label}</dt>
      <dd className="min-w-0 truncate text-right font-bold text-ink-700">{value}</dd>
    </div>
  )
}
