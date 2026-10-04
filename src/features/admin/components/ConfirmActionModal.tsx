import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { TextareaField } from '@/features/admin/components/controls'

export interface PendingAction {
  title: string
  description: ReactNode
  confirmLabel: string
  danger?: boolean
  /** Status/role changes accept an optional reason, saved in the audit log. */
  withReason?: boolean
  run: (reason?: string) => Promise<unknown>
}

/** Confirmation step for account-level actions (ban, promote, revoke…), with an optional audit reason. */
export function ConfirmActionModal({ action, onClose }: { action: PendingAction | null; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (action) setReason('')
  }, [action])

  const confirm = async () => {
    if (!action) return
    setPending(true)
    try {
      await action.run(reason.trim() || undefined)
      onClose()
    } catch {
      // The action reports its own error (toast); keep the dialog open so it can be retried.
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal open={!!action} onClose={onClose} title={action?.title ?? ''}>
      <div className="flex flex-col gap-4">
        <div className="text-sm leading-relaxed text-ink-600">{action?.description}</div>
        {action?.withReason && (
          <TextareaField
            label="Motivo (opcional)"
            placeholder="Fica registrado no log de auditoria"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={action?.danger ? 'danger' : 'primary'}
            fullWidth
            loading={pending}
            onClick={confirm}
          >
            {action?.confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
