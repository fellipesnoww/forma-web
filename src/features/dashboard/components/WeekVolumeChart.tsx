import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { WEEKDAY_LABELS } from '@/features/workout-sheets'
import type { StatsOverview } from '@/features/dashboard/api'

const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** "Volume por dia": 7 bars, today highlighted; hover/focus a bar for its value. */
export function WeekVolumeChart({ days, today }: { days: StatsOverview['week']['days']; today: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(...days.map((d) => d.volumeKg), 1)

  return (
    <section aria-label="Volume por dia" className="rounded-[20px] border border-border bg-surface px-4 py-5 sm:px-[22px]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-ink-900">Volume por dia</h2>
        <span className="text-[12.5px] font-bold text-ink-400">Últimos 7 dias</span>
      </div>
      <ul className="mt-5 flex h-[140px] items-end gap-2 sm:gap-3.5">
        {days.map((day) => {
          const isToday = day.date === today
          const pct = day.volumeKg > 0 ? Math.max(6, (day.volumeKg / max) * 100) : 4
          const label = `${WEEKDAY_LABELS[day.weekday]}: ${kg.format(day.volumeKg)} kg`
          return (
            <li key={day.date} className="relative flex h-full flex-1 flex-col items-center justify-end gap-2">
              {active === day.date && (
                <span
                  role="status"
                  className="absolute -top-2 z-10 -translate-y-full rounded-lg bg-ink-900 px-2 py-1 text-xs font-extrabold whitespace-nowrap text-white tabular-nums"
                >
                  {kg.format(day.volumeKg)} kg
                </span>
              )}
              <button
                type="button"
                aria-label={label}
                onPointerEnter={() => setActive(day.date)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(day.date)}
                onBlur={() => setActive(null)}
                className="flex w-full flex-1 items-end"
              >
                <span
                  className={cn(
                    'block w-full rounded-t-[9px] rounded-b-[4px] transition-opacity',
                    isToday
                      ? 'bg-[linear-gradient(180deg,#2D5BFF,#5A7BFF)]'
                      : day.volumeKg > 0
                        ? 'bg-primary-100'
                        : 'bg-surface-sunken',
                    active && active !== day.date && 'opacity-70',
                  )}
                  style={{ height: `${pct}%` }}
                />
              </button>
              <span className={cn('text-[11px]', isToday ? 'font-extrabold text-primary-500' : 'font-bold text-ink-200')}>
                {WEEKDAY_LABELS[day.weekday]}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
