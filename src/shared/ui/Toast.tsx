import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type Variant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  variant: Variant
}

const variantStyles: Record<Variant, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'bg-success-50 text-success-600 border-success-100' },
  error: { icon: XCircle, classes: 'bg-danger-50 text-danger-600 border-danger-500/20' },
  warning: { icon: AlertTriangle, classes: 'bg-warning-50 text-warning-600 border-warning-500/20' },
  info: { icon: Info, classes: 'bg-primary-50 text-primary-600 border-primary-100' },
}

const ToastContext = createContext<((message: string, variant?: Variant) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: Variant = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4">
        {toasts.map((toast) => {
          const { icon: Icon, classes } = variantStyles[toast.variant]
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg sm:w-80',
                classes,
              )}
            >
              <Icon size={18} className="shrink-0" />
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
