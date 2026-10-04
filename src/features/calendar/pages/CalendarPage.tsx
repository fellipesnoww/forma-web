import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { ActivityFormModal, type Activity } from '@/features/activities'
import { calendarApi, type CalendarDay } from '@/features/calendar/api'
import { DayDetail } from '@/features/calendar/components/DayDetail'
import { Legend, MonthGrid } from '@/features/calendar/components/MonthGrid'
import {
  browserTimezone,
  formatMonthTitle,
  monthParam,
  parseMonthParam,
  shiftMonth,
  todayIsoDay,
} from '@/features/calendar/lib/dates'

/** Once per page load: the server groups days in the profile's timezone, so keep it equal to the browser's. */
let timezoneSyncAttempted = false

type ActivityModal = { activity: Activity | null; defaultPerformedAt?: Date } | null

/** New activity on a past day starts at noon; on today, at the current time (the form rejects the future). */
function defaultTimeFor(date: string, today: string) {
  return date === today ? new Date() : new Date(`${date}T12:00:00`)
}

export function CalendarPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [activityModal, setActivityModal] = useState<ActivityModal>(null)

  const today = todayIsoDay()
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }
  const { year, month } = parseMonthParam(params.get('month')) ?? current
  const isCurrentMonth = year === current.year && month === current.month
  const isFutureMonth = year * 12 + month > current.year * 12 + current.month
  // The design always shows a day: today while on the current month, otherwise whatever was picked.
  const requestedDay = params.get('day')
  const selected = requestedDay && requestedDay <= today ? requestedDay : isCurrentMonth ? today : null

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )

  const goToMonth = (delta: number) => {
    const target = shiftMonth(year, month, delta)
    update({ month: monthParam(target.year, target.month), day: null })
  }

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['calendar', 'month', year, month],
    queryFn: () => calendarApi.month(year, month),
    placeholderData: keepPreviousData,
  })

  const { mutate: syncTimezone } = useMutation({
    mutationFn: calendarApi.setTimezone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  })
  const serverTimezone = data?.timezone
  useEffect(() => {
    if (!serverTimezone || timezoneSyncAttempted) return
    timezoneSyncAttempted = true
    const local = browserTimezone()
    if (local && local !== serverTimezone) syncTimezone(local)
  }, [serverTimezone, syncTimezone])

  const days = useMemo(() => {
    const map = new Map<string, CalendarDay>()
    // While a new month loads, keepPreviousData would paint last month's days onto this grid.
    if (data && data.year === year && data.month === month) for (const day of data.days) map.set(day.date, day)
    return map
  }, [data, year, month])

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Calendário</h1>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="Mês anterior"
              className="flex h-11 w-11 items-center justify-center rounded-[9px] text-ink-700 hover:bg-surface-soft sm:h-9 sm:w-9 sm:bg-surface-soft sm:hover:bg-border"
            >
              <ChevronLeft size={16} strokeWidth={2.6} />
            </button>
            <h2 aria-live="polite" className="min-w-28 text-center text-[15px] font-extrabold text-ink-900">
              {formatMonthTitle(year, month)}
            </h2>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              disabled={isCurrentMonth || isFutureMonth}
              aria-label="Próximo mês"
              className="flex h-11 w-11 items-center justify-center rounded-[9px] text-ink-700 hover:bg-surface-soft disabled:opacity-35 disabled:hover:bg-transparent sm:h-9 sm:w-9 sm:bg-surface-soft sm:hover:bg-border"
            >
              <ChevronRight size={16} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Legend className="hidden sm:flex" />
          {!isCurrentMonth && (
            <Button variant="secondary" size="sm" className="h-11 sm:h-10" onClick={() => update({ month: null, day: null })}>
              Hoje
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cn('min-w-0', isFetching && !isLoading && 'opacity-60')}>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )}
          {isError && <p className="text-sm text-ink-400">Não foi possível carregar o calendário.</p>}
          {data && (
            <MonthGrid
              year={year}
              month={month}
              days={days}
              selected={selected}
              today={today}
              onSelect={(date) => update({ day: date })}
            />
          )}
          <Legend className="mt-3 justify-center sm:hidden" />
        </div>

        {selected ? (
          <DayDetail
            date={selected}
            onEditActivity={(activity) => setActivityModal({ activity })}
            onAddActivity={() => setActivityModal({ activity: null, defaultPerformedAt: defaultTimeFor(selected, today) })}
          />
        ) : (
          <p className="rounded-[22px] border border-dashed border-border p-6 text-center text-sm font-medium text-ink-400">
            Selecione um dia para ver os detalhes.
          </p>
        )}
      </div>

      <ActivityFormModal
        open={!!activityModal}
        onClose={() => setActivityModal(null)}
        activity={activityModal?.activity ?? null}
        defaultPerformedAt={activityModal?.defaultPerformedAt}
      />
    </div>
  )
}
