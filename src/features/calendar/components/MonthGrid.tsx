import { cn } from '@/shared/lib/cn'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import type { CalendarDay } from '@/features/calendar/api'
import { WEEKDAY_HEADERS, monthGrid } from '@/features/calendar/lib/dates'
import { describeDay } from '@/features/calendar/lib/describe'

interface Props {
  year: number
  month: number
  days: Map<string, CalendarDay>
  selected: string | null
  today: string
  onSelect: (date: string) => void
}

export function Legend({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3.5 text-[12.5px] font-bold text-ink-600', className)}>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-primary-500" />
        Treino
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-activity-500" />
        Atividade
      </span>
    </div>
  )
}

/**
 * One grid for every breakpoint, as in the design: 106px cells with the photo beside the dots on
 * `sm`+, compact 58px cells with the photo stacked above the dots on phones.
 */
export function MonthGrid({ year, month, days, selected, today, onSelect }: Props) {
  const cells = monthGrid(year, month)

  return (
    <div data-testid="calendar-grid">
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold tracking-wide text-ink-200 sm:mb-2 sm:gap-2 sm:text-[11.5px]">
        {WEEKDAY_HEADERS.map((label) => (
          <div key={label} aria-hidden="true">
            <span className="sm:hidden">{label.charAt(0)}</span>
            <span className="hidden sm:inline">{label.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} aria-hidden="true" />
          const day = days.get(date)
          const isFuture = date > today
          const isSelected = selected === date
          const photo = day?.photoUrls[0]
          return (
            <button
              key={date}
              type="button"
              disabled={isFuture}
              aria-pressed={isSelected}
              aria-label={describeDay(date, day)}
              onClick={() => onSelect(date)}
              className={cn(
                'flex h-[58px] min-w-0 flex-col items-center justify-between rounded-[10px] border p-1 transition-colors sm:h-[106px] sm:items-stretch sm:rounded-xl sm:p-2',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500',
                isFuture ? 'border-transparent bg-transparent' : 'border-border bg-surface hover:border-primary-100',
                isSelected && 'border-[1.5px] border-primary-500 bg-primary-50 hover:border-primary-500',
              )}
            >
              <span
                className={cn(
                  'flex h-4 min-w-4 items-center justify-center self-center rounded-full px-1 text-xs font-extrabold sm:h-6 sm:min-w-6 sm:self-start sm:text-[13px]',
                  isFuture ? 'text-ink-100' : 'text-ink-900',
                  date === today && 'bg-primary-500 text-white',
                )}
              >
                {Number(date.slice(8))}
              </span>
              {day && (
                <div className="flex flex-col-reverse items-center gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex gap-[3px] sm:gap-1">
                    {day.hasWorkout && <span className="h-1.5 w-1.5 rounded-full bg-primary-500 sm:h-2 sm:w-2" />}
                    {day.hasActivity && <span className="h-1.5 w-1.5 rounded-full bg-activity-500 sm:h-2 sm:w-2" />}
                  </div>
                  {photo && (
                    <div className="h-[22px] w-[26px] overflow-hidden rounded-md bg-surface-soft sm:h-10 sm:w-10 sm:rounded-[9px]">
                      <AuthedImage src={photo} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
