import { cn } from '@/shared/lib/cn'
import type { WorkoutSheet } from '@/features/workout-sheets/api'
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABELS } from '@/features/workout-sheets/lib/weekday'
import { weekPlan } from '@/features/workout-sheets/lib/schedule'

/** "Sua semana": which sheet runs on each weekday, today highlighted. */
export function WeekPlan({ sheets }: { sheets: WorkoutSheet[] }) {
  const plan = weekPlan(sheets)
  const today = new Date().getDay()

  return (
    <section aria-label="Sua semana" className="rounded-[22px] border border-border bg-white p-5 sm:p-[22px]">
      <h2 className="text-base font-extrabold text-ink-900">Sua semana</h2>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
          const names = plan.get(weekday)
          const isToday = weekday === today
          return (
            <li
              key={weekday}
              className={cn(
                'rounded-[14px] px-3 py-3.5',
                isToday && 'bg-primary-500 text-white',
                !isToday && names && 'bg-surface-muted',
                !isToday && !names && 'border-[1.5px] border-dashed border-[#E2E6EF]',
              )}
            >
              <p className={cn('text-xs font-bold', isToday ? 'text-white/80' : 'text-ink-400')}>
                {WEEKDAY_LABELS[weekday]}
                {isToday && ' · hoje'}
              </p>
              <p
                className={cn(
                  'mt-1.5 truncate text-sm',
                  names ? 'font-extrabold' : 'font-bold',
                  !isToday && !names && 'text-ink-200',
                  !isToday && names && 'text-ink-900',
                )}
                title={names?.join(' · ')}
              >
                {names ? names.join(' · ') : 'Descanso'}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
