import { type ReactNode, useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // React propagates a nested dialog's close/cancel through the component tree; only react to our own.
      onClose={(e) => {
        if (e.target === ref.current) onClose()
      }}
      onCancel={(e) => {
        if (e.target === ref.current) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="w-[min(480px,calc(100vw-32px))] rounded-2xl border border-border p-0 shadow-2xl backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-base font-extrabold text-ink-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-400 hover:bg-surface-soft hover:text-ink-700"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
