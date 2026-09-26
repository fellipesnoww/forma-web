import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-xl font-extrabold text-white shadow-[0_6px_14px_rgba(45,91,255,0.35)]">
            F
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-ink-800">Forma</span>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
