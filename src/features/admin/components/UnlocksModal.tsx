import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { adminApi, type Achievement } from '@/features/admin/api'
import { PaginationBar } from '@/features/admin/components/DataTable'
import { Avatar } from '@/features/admin/components/controls'
import { displayName, formatDateTime } from '@/features/admin/lib/format'

const PAGE_SIZE = 20

/** Who unlocked an achievement, newest first. */
export function UnlocksModal({ achievement, onClose }: { achievement: Achievement | null; onClose: () => void }) {
  const [page, setPage] = useState(1)

  useEffect(() => setPage(1), [achievement])

  const unlocks = useQuery({
    queryKey: ['admin', 'achievements', 'unlocks', achievement?.id, page],
    queryFn: () => adminApi.achievements.unlocks(achievement!.id, { page, limit: PAGE_SIZE }),
    enabled: !!achievement,
    placeholderData: keepPreviousData,
  })

  return (
    <Modal open={!!achievement} onClose={onClose} title={achievement ? `Quem desbloqueou “${achievement.name}”` : ''}>
      {unlocks.isLoading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {unlocks.isError && <p className="py-8 text-center text-sm text-ink-400">Não foi possível carregar a lista.</p>}
      {unlocks.data?.items.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-400">Ninguém desbloqueou essa conquista ainda.</p>
      )}
      <ul className="flex flex-col">
        {unlocks.data?.items.map((u) => (
          <li key={u.userId} className="border-b border-[#F4F5F8] last:border-b-0">
            <Link to={`/admin/users?user=${u.userId}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-soft/60">
              <Avatar />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink-900">{displayName(u)}</p>
                <p className="truncate text-xs text-ink-400">{u.email}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-ink-400">{formatDateTime(u.unlockedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {unlocks.data && (
        <div className="mt-3">
          <PaginationBar page={page} total={unlocks.data.total} limit={unlocks.data.limit} onPageChange={setPage} />
        </div>
      )}
    </Modal>
  )
}
