import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import type { AuditLog } from '@/features/admin/api'
import { dotTone } from '@/features/admin/components/controls'
import {
  AUDIT_ACTION_LABEL,
  auditChange,
  auditReason,
  auditTargetName,
  auditTone,
  formatDateTime,
} from '@/features/admin/lib/format'

/** One audit line: "<actor> <action> <target>", change, reason and when. User targets link to their profile. */
export function AuditEntry({ log, compact }: { log: AuditLog; compact?: boolean }) {
  const actor = log.actor?.email ?? 'Sistema (CLI)'
  const target = auditTargetName(log)
  const change = auditChange(log)
  const reason = auditReason(log)

  return (
    <li className="flex gap-3 border-b border-[#F4F5F8] py-2.5 last:border-b-0">
      <span aria-hidden className={cn('mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full', dotTone[auditTone(log.action, log.metadata)])} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[1.45] font-medium break-words text-ink-700">
          <strong className="font-extrabold text-ink-900">{actor}</strong> {AUDIT_ACTION_LABEL[log.action] ?? log.action}{' '}
          {log.targetType === 'user' && log.targetId ? (
            <Link to={`/admin/users?user=${log.targetId}`} className="font-bold text-primary-500 hover:underline">
              {target}
            </Link>
          ) : (
            <strong className="font-bold text-ink-900">{target}</strong>
          )}
          {change && <span className="text-ink-600"> · {change}</span>}
        </p>
        {reason && !compact && <p className="mt-0.5 text-xs text-ink-500 italic">“{reason}”</p>}
        <p className="mt-0.5 text-[11.5px] font-semibold text-ink-200">{formatDateTime(log.createdAt)}</p>
      </div>
    </li>
  )
}
