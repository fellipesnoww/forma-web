import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { WEEKDAY_LABELS, workoutSheetsApi } from '@/features/workout-sheets'
import { retroRunPath } from '@/features/workout-sessions'
import {
  WEEKDAY_HEADERS,
  formatMonthTitle,
  monthGrid,
  shiftMonth,
  todayIsoDay,
} from '@/features/calendar/lib/dates'

export type RetroKind = 'workout' | 'activity'

interface Props {
  open: boolean
  onClose: () => void
  /** YYYY-MM-DD; clamped to today. */
  initialDate: string
  initialKind?: RetroKind
  /** Activities reuse the full activity form (type, photo, comment), prefilled with the chosen moment. */
  onContinueActivity: (performedAt: Date) => void
}

const MAX_DURATION_MINUTES = 24 * 60

const selectClass =
  'h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100'

/** "14 jun" */
function shortDay(isoDay: string) {
  return new Date(`${isoDay}T12:00:00Z`)
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace('.', '')
    .replace(' de ', ' ')
}

/** Default start time: now on today (rounded down to the hour), 18:00 on a past day. */
function defaultTime(date: string, today: string) {
  if (date !== today) return '18:00'
  return `${String(new Date().getHours()).padStart(2, '0')}:00`
}

/** Keyed by the caller on open, so every opening starts from `initialDate`/`initialKind`. */
export function RetroLogModal(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose} title="Lançar registro" size="lg">
      {props.open && <RetroLogForm {...props} />}
    </Modal>
  )
}

function RetroLogForm({ onClose, initialDate, initialKind = 'workout', onContinueActivity }: Props) {
  const navigate = useNavigate()
  const today = todayIsoDay()
  const [kind, setKind] = useState<RetroKind>(initialKind)
  const [date, setDate] = useState(initialDate > today ? today : initialDate)
  const [time, setTime] = useState(() => defaultTime(initialDate, today))
  const [duration, setDuration] = useState('60')
  const [sheetId, setSheetId] = useState('')
  const [weekday, setWeekday] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState(() => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) }))

  const { data: sheets } = useQuery({ queryKey: ['workout-sheets'], queryFn: workoutSheetsApi.list })
  const details = useQueries({
    queries: (sheets?.items ?? []).map((s) => ({
      queryKey: ['workout-sheets', s.id],
      queryFn: () => workoutSheetsApi.get(s.id),
    })),
  })
  const dateWeekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  // Until the user picks one: the sheet scheduled on the chosen date's weekday, else the first.
  const scheduled = details.find((q) => q.data?.days.some((d) => d.weekday === dateWeekday))?.data
  const selectedSheetId = sheetId || scheduled?.id || sheets?.items[0]?.id || ''
  const sheet = details.find((q) => q.data?.id === selectedSheetId)?.data

  const sheetDays = sheet?.days.slice().sort((a, b) => a.order - b.order) ?? []
  // The sheet day that matches the chosen date, unless the user picked another one.
  const chosenWeekday =
    weekday != null && sheetDays.some((d) => d.weekday === weekday)
      ? weekday
      : (sheetDays.find((d) => d.weekday === dateWeekday) ?? sheetDays[0])?.weekday

  const pickDate = (value: string) => {
    if (!value || value > today) return
    setDate(value)
    setError(null)
    setView({ year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) })
  }

  const submit = () => {
    const at = `${date}T${time}`
    const performedAt = new Date(at)
    if (!date || !time || Number.isNaN(performedAt.getTime())) return setError('Informe data e horário.')
    if (date > today || performedAt.getTime() > Date.now()) {
      return setError('Registros só podem ser lançados para agora ou para o passado.')
    }

    if (kind === 'activity') {
      onClose()
      onContinueActivity(performedAt)
      return
    }

    const minutes = Number(duration)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES) {
      return setError(`Duração entre 1 e ${MAX_DURATION_MINUTES} minutos.`)
    }
    if (!selectedSheetId || chosenWeekday == null) return setError('Escolha a planilha do treino.')
    navigate(retroRunPath(selectedSheetId, at, minutes, chosenWeekday))
  }

  const nextView = shiftMonth(view.year, view.month, 1)
  const canGoNext = `${nextView.year}-${String(nextView.month).padStart(2, '0')}` <= today.slice(0, 7)

  return (
    <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
      <div className="hidden md:block">
        <p className="text-[13px] font-extrabold text-ink-900">Escolha uma data passada</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView(shiftMonth(view.year, view.month, -1))}
            aria-label="Mês anterior"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-surface-soft text-ink-700"
          >
            <ChevronLeft size={16} strokeWidth={2.6} />
          </button>
          <span className="text-sm font-extrabold text-ink-900">{formatMonthTitle(view.year, view.month)}</span>
          <button
            type="button"
            onClick={() => setView(nextView)}
            disabled={!canGoNext}
            aria-label="Próximo mês"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-surface-soft text-ink-700 disabled:opacity-35"
          >
            <ChevronRight size={16} strokeWidth={2.6} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-200" aria-hidden="true">
          {WEEKDAY_HEADERS.map((label) => (
            <span key={label}>{label.charAt(0)}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" role="group" aria-label="Dias do mês">
          {monthGrid(view.year, view.month).map((cell, i) => {
            if (!cell) return <span key={`blank-${i}`} />
            const future = cell > today
            const selected = cell === date
            return (
              <button
                key={cell}
                type="button"
                disabled={future}
                onClick={() => pickDate(cell)}
                aria-pressed={selected}
                aria-label={cell}
                className={cn(
                  'flex h-9 items-center justify-center rounded-[9px] text-[13px] font-bold tabular-nums',
                  selected && 'bg-primary-500 text-white',
                  !selected && !future && 'text-ink-700 hover:bg-surface-soft',
                  future && 'cursor-not-allowed text-ink-100 line-through',
                  cell === today && !selected && 'ring-1 ring-primary-500',
                )}
              >
                {Number(cell.slice(8))}
              </button>
            )
          })}
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-[11px] bg-warning-50 px-3 py-2.5 text-xs font-semibold text-warning-600">
          <Info size={14} className="mt-px shrink-0" />
          Datas após hoje ({shortDay(today)}) não podem receber registros.
        </p>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-4"
      >
        <div role="tablist" aria-label="Tipo de registro" className="flex gap-1 rounded-xl bg-surface-soft p-1">
          {(
            [
              ['workout', 'Treino'],
              ['activity', 'Atividade livre'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              onClick={() => {
                setKind(value)
                setError(null)
              }}
              className={cn(
                'h-10 flex-1 rounded-lg text-sm font-extrabold',
                kind === value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Input
          label="Data"
          type="date"
          max={today}
          value={date}
          onChange={(e) => pickDate(e.target.value)}
          required
        />

        {kind === 'workout' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="retro-sheet" className="text-sm font-semibold text-ink-700">
                Planilha
              </label>
              {sheets && sheets.items.length === 0 ? (
                <p className="rounded-lg bg-surface-muted px-3.5 py-3 text-sm text-ink-500">
                  Crie uma planilha antes de lançar um treino.
                </p>
              ) : (
                <select
                  id="retro-sheet"
                  value={selectedSheetId}
                  onChange={(e) => {
                    setSheetId(e.target.value)
                    setWeekday(null)
                  }}
                  className={selectClass}
                >
                  {sheets?.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {sheetDays.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="retro-day" className="text-sm font-semibold text-ink-700">
                  Dia da planilha
                </label>
                <select
                  id="retro-day"
                  value={chosenWeekday ?? ''}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                  className={selectClass}
                >
                  {sheetDays.map((d) => (
                    <option key={d.id} value={d.weekday}>
                      {WEEKDAY_LABELS[d.weekday]} · {d.exercises.length} exercícios
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div className={cn('grid gap-4', kind === 'workout' && 'grid-cols-2')}>
          <Input label="Início" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          {kind === 'workout' && (
            <Input
              label="Duração (min)"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DURATION_MINUTES}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger-500">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth className="h-12 rounded-[13px] text-[15px]">
          {kind === 'workout' ? 'Continuar para séries e cargas' : 'Continuar para a atividade'}
        </Button>
      </form>
    </div>
  )
}
