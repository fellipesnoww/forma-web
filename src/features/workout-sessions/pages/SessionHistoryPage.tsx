import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { cn } from '@/shared/lib/cn'
import { workoutSheetsApi } from '@/features/workout-sheets'
import { workoutSessionsApi, type WorkoutSessionSummary } from '@/features/workout-sessions/api'
import { formatTime } from '@/features/workout-sessions/lib/format'

const PAGE_SIZE = 20

/** `<input type="date">` gives a local calendar day; the API filters on full ISO datetimes. */
function dayBoundary(day: string, end: boolean) {
  return new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString()
}

const fieldClass =
  'h-11 rounded-lg border border-border bg-white px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100'

export function SessionHistoryPage() {
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const sheetId = params.get('sheet') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const setFilter = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )

  const { data: sheets } = useQuery({ queryKey: ['workout-sheets'], queryFn: workoutSheetsApi.list })

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['workout-sessions', 'list', { from, to, sheetId, page }],
    queryFn: () =>
      workoutSessionsApi.list({
        from: from ? dayBoundary(from, false) : undefined,
        to: to ? dayBoundary(to, true) : undefined,
        sheetId: sheetId || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const items = data?.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const today = new Date().toLocaleDateString('en-CA')
  const hasFilters = !!(from || to || sheetId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-2.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Histórico</h1>
        {data && (
          <span className="text-sm font-semibold text-ink-400">
            {data.total} {data.total === 1 ? 'sessão' : 'sessões'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-ink-700">De</span>
          <input type="date" value={from} max={to || today} onChange={(e) => setFilter('from', e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-ink-700">Até</span>
          <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setFilter('to', e.target.value)} className={fieldClass} />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 sm:min-w-52">
          <span className="text-xs font-semibold text-ink-700">Planilha</span>
          <select value={sheetId} onChange={(e) => setFilter('sheet', e.target.value)} className={fieldClass}>
            <option value="">Todas</option>
            {sheets?.items.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="col-span-2 h-11" onClick={() => setParams({}, { replace: true })}>
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-ink-400">Não foi possível carregar o histórico.</p>}
      {!isLoading && !isError && items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-bold text-ink-900">{hasFilters ? 'Nenhuma sessão nesse filtro' : 'Nenhum treino registrado'}</p>
          <p className="max-w-xs text-sm text-ink-500">
            {hasFilters ? 'Tente outro período ou planilha.' : 'Inicie um treino a partir de uma das suas planilhas.'}
          </p>
          {!hasFilters && (
            <Link to="/app/sheets" className="mt-2 text-sm font-bold text-primary-500">
              Ver planilhas
            </Link>
          )}
        </Card>
      )}

      <ul className={cn('flex flex-col gap-3', isFetching && !isLoading && 'opacity-60')}>
        {items.map((session) => (
          <li key={session.id}>
            <SessionRow session={session} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" className="h-11 disabled:opacity-40" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>
            <ChevronLeft size={16} />
            Anterior
          </Button>
          <span className="text-sm font-semibold text-ink-500">
            Página {page} de {totalPages}
          </span>
          <Button variant="secondary" size="sm" className="h-11 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))}>
            Próxima
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}

function SessionRow({ session }: { session: WorkoutSessionSummary }) {
  const date = new Date(session.performedAt)
  const done = !!session.completedAt

  return (
    <Link
      to={`/app/sessions/${session.id}`}
      className="flex items-center gap-4 rounded-[18px] border border-border bg-white p-3.5 transition-shadow hover:shadow-md sm:p-4"
    >
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[14px] bg-primary-50 text-primary-500">
        <span className="text-lg leading-none font-extrabold">{date.getDate()}</span>
        <span className="mt-0.5 text-[11px] font-bold uppercase">
          {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate font-extrabold text-ink-900">{session.sheetName}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-extrabold',
              done ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600',
            )}
          >
            {done ? 'Concluído' : 'Em andamento'}
          </span>
        </div>
        <p className="mt-0.5 text-xs font-semibold text-ink-400">
          {date.toLocaleDateString('pt-BR', { weekday: 'long' })} · {formatTime(session.performedAt)}
          {session.completedAt && ` – ${formatTime(session.completedAt)}`}
        </p>
        {session.comment && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-ink-500">
            <MessageSquare size={12} className="shrink-0" />
            <span className="truncate">{session.comment}</span>
          </p>
        )}
      </div>
      {session.photoUrl && (
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-surface-soft">
          <AuthedImage src={session.photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <ChevronRight size={18} className="shrink-0 text-ink-200" />
    </Link>
  )
}
