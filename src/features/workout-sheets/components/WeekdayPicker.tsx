import { cn } from '@/shared/lib/cn'
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_LABELS } from '@/features/workout-sheets/lib/weekday'

export function WeekdayPicker({
  selected,
  onToggle,
}: {
  selected: number[]
  onToggle: (weekday: number) => void
}) {
  return (
    <div className="flex gap-1.5">
      {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
        const active = selected.includes(weekday)
        return (
          <button
            key={weekday}
            type="button"
            onClick={() => onToggle(weekday)}
            aria-pressed={active}
            className={cn(
              'flex h-11 min-w-11 flex-1 items-center justify-center rounded-xl text-xs font-extrabold sm:flex-none sm:px-3',
              active ? 'bg-primary-500 text-white' : 'bg-surface-soft text-ink-400',
            )}
          >
            {WEEKDAY_LABELS[weekday]}
          </button>
        )
      })}
    </div>
  )
}
