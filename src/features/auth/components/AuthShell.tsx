import type { ReactNode } from 'react'

interface AuthShellProps {
  headline: string
  panel?: ReactNode
  children: ReactNode
}

export function AuthShell({ headline, panel, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex flex-col overflow-hidden bg-sidebar px-6 py-8 text-white lg:w-[560px] lg:flex-shrink-0 lg:px-[52px] lg:py-12">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary-500/20" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-lg font-extrabold shadow-[0_6px_14px_rgba(45,91,255,0.35)] lg:h-10 lg:w-10 lg:text-xl">
            F
          </div>
          <span className="text-lg font-extrabold tracking-tight lg:text-xl">Forma</span>
        </div>
        <div className="lg:flex-1" />
        <p className="relative mt-6 text-balance text-2xl font-extrabold leading-tight tracking-tight lg:mt-0 lg:text-[42px]">
          {headline}
        </p>
        {panel && <div className="relative mt-6 hidden flex-col gap-3.5 lg:flex">{panel}</div>}
      </div>
      <div className="flex flex-1 items-center justify-center bg-surface-muted p-6 lg:p-10">
        <div className="w-full max-w-[420px] rounded-3xl border border-border bg-white p-7 shadow-[0_20px_40px_rgba(18,20,26,0.06)] lg:p-9">
          {children}
        </div>
      </div>
    </div>
  )
}
