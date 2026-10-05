import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'
import { exercisesApi, type Exercise } from '@/features/exercises'
import { workoutSessionsApi } from '@/features/workout-sessions'
import { progressApi, type MeasurementMetric, type ProgressRange } from '@/features/progress/api'
import { LineChart } from '@/features/progress/components/LineChart'
import { describeChange, formatNumber, rangeDays } from '@/features/progress/lib/format'

const PERIODS = [
  { value: '30', label: '30d' },
  { value: '60', label: '60d' },
  { value: '90', label: '90d' },
  { value: 'custom', label: 'Personalizado' },
] as const
type PeriodValue = (typeof PERIODS)[number]['value']

/** Backend cap for a custom range. */
const MAX_RANGE_DAYS = 1098

const METRICS: { value: MeasurementMetric; label: string; unit: string }[] = [
  { value: 'weight', label: 'Peso corporal', unit: 'kg' },
  { value: 'waist', label: 'Cintura', unit: 'cm' },
  { value: 'chest', label: 'Peitoral', unit: 'cm' },
  { value: 'height', label: 'Altura', unit: 'cm' },
]
const KPI_METRICS = METRICS.filter((m) => m.value !== 'height')

const fieldClass =
  'h-11 rounded-[11px] border border-border bg-surface px-3 text-sm font-semibold text-ink-700 focus:border-primary-500 focus:outline-2 focus:outline-primary-100 sm:h-10'

/** `?exercise=catalog:<id>` / `custom:<id>` */
function parseExerciseParam(value: string | null) {
  const match = value?.match(/^(catalog|custom):([\w-]+)$/)
  return match ? { source: match[1] as Exercise['source'], id: match[2] } : null
}

export function ProgressPage() {
  const [params, setParams] = useSearchParams()
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

  const period = (PERIODS.find((p) => p.value === params.get('period'))?.value ?? '90') as PeriodValue
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const view = params.get('view') === 'measures' ? 'measures' : 'load'
  const metric = METRICS.find((m) => m.value === params.get('metric')) ?? METRICS[0]
  const today = new Date().toLocaleDateString('en-CA')

  const customError =
    period !== 'custom'
      ? null
      : !from || !to
        ? 'Escolha o início e o fim do período.'
        : from > to
          ? 'O início precisa ser antes do fim.'
          : rangeDays(from, to) > MAX_RANGE_DAYS
            ? 'O período máximo é de 3 anos.'
            : null
  const range: ProgressRange | null =
    period === 'custom' ? (customError ? null : { from, to }) : { period }
  const rangeKey = range ? ('period' in range ? range.period : `${range.from}_${range.to}`) : null

  const { data: library } = useQuery({ queryKey: ['exercises', ''], queryFn: () => exercisesApi.list() })
  // Default exercise: the first one of the latest session, so the page opens on something with history.
  const requested = parseExerciseParam(params.get('exercise'))
  const { data: latest } = useQuery({
    queryKey: ['workout-sessions', 'latest-exercise'],
    queryFn: async () => {
      const { items } = await workoutSessionsApi.list({ limit: 1 })
      if (!items[0]) return null
      const session = await workoutSessionsApi.get(items[0].id)
      const first = session.exercises.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0]
      if (!first) return null
      return first.exerciseId
        ? { source: 'catalog' as const, id: first.exerciseId }
        : { source: 'custom' as const, id: first.customExerciseId! }
    },
    enabled: !requested,
  })
  const selected = requested ?? latest ?? (library?.items[0] ? { source: library.items[0].source, id: library.items[0].id } : null)
  const selectedName = library?.items.find((e) => e.id === selected?.id)?.name

  const load = useQuery({
    queryKey: ['progress', 'load', selected?.source, selected?.id, rangeKey],
    queryFn: () => progressApi.load(selected!, range!),
    enabled: !!selected && !!range,
    placeholderData: keepPreviousData,
  })

  const measurements = useQueries({
    queries: METRICS.map((m) => ({
      queryKey: ['progress', 'measurements', m.value, rangeKey],
      queryFn: () => progressApi.measurements(m.value, range!),
      enabled: !!range,
      placeholderData: keepPreviousData,
    })),
  })
  const measurementOf = (value: MeasurementMetric) => measurements[METRICS.findIndex((m) => m.value === value)]

  const loadPoints = (load.data?.points ?? []).map((p) => ({ date: p.date, value: p.maxWeightKg }))
  const metricQuery = measurementOf(metric.value)
  const metricPoints = (metricQuery.data?.points ?? []).map((p) => ({ date: p.measuredAt, value: p.value }))
  const days = load.data ? rangeDays(load.data.from, load.data.to) : Number(period === 'custom' ? 0 : period)

  const chart = view === 'load' ? { query: load, points: loadPoints, unit: 'kg' } : { query: metricQuery, points: metricPoints, unit: metric.unit }
  const chartRange = chart.query.data ?? (range && 'from' in range ? range : null)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Evolução</h1>
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <label className="sr-only" htmlFor="progress-exercise">
            Exercício
          </label>
          <select
            id="progress-exercise"
            value={selected ? `${selected.source}:${selected.id}` : ''}
            onChange={(e) => update({ exercise: e.target.value })}
            className={cn(fieldClass, 'min-w-0 flex-1 bg-surface-soft sm:w-56 sm:flex-none')}
          >
            {!library && <option value="">Carregando…</option>}
            {library?.items.map((ex) => (
              <option key={ex.id} value={`${ex.source}:${ex.id}`}>
                {ex.name}
                {ex.source === 'custom' ? ' (seu)' : ''}
              </option>
            ))}
          </select>
          <div role="radiogroup" aria-label="Período" className="flex h-11 items-center gap-0.5 rounded-[11px] border border-border-strong bg-surface p-[3px] sm:h-10">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={period === p.value}
                onClick={() => update({ period: p.value === '90' ? null : p.value })}
                className={cn(
                  'h-full rounded-lg px-2.5 text-[13px] font-bold sm:px-[11px]',
                  period === p.value ? 'bg-primary-50 text-primary-500' : 'text-ink-600 hover:bg-surface-soft',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-500">
            De
            <input type="date" max={to || today} value={from} onChange={(e) => update({ from: e.target.value })} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-ink-500">
            Até
            <input type="date" min={from} max={today} value={to} onChange={(e) => update({ to: e.target.value })} className={fieldClass} />
          </label>
          {customError && <p className="pb-3 text-sm font-semibold text-ink-400">{customError}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          label="Carga máxima atual"
          unit="kg"
          values={loadPoints.map((p) => p.value)}
          mode="percent"
          days={days}
          higherIsBetter
        />
        {KPI_METRICS.map((m) => (
          <KpiCard
            key={m.value}
            label={m.label}
            unit={m.unit}
            values={(measurementOf(m.value).data?.points ?? []).map((p) => p.value)}
            mode="absolute"
            days={days}
            higherIsBetter={m.value === 'chest'}
          />
        ))}
      </div>

      <section className="rounded-[22px] border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-extrabold text-ink-900">
            {view === 'load' ? `Progressão de carga${selectedName ? ` — ${selectedName}` : ''}` : metric.label}
          </h2>
          <div role="tablist" aria-label="Gráfico" className="flex gap-2">
            {(
              [
                ['load', 'Carga por exercício'],
                ['measures', 'Medidas corporais'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={view === value}
                onClick={() => update({ view: value === 'load' ? null : value })}
                className={cn(
                  'min-h-11 rounded-full px-3.5 text-[12.5px] font-bold sm:min-h-0 sm:py-[7px]',
                  view === value ? 'bg-primary-500 text-white' : 'bg-surface-soft text-ink-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {view === 'measures' && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={metric.value === m.value}
                onClick={() => update({ metric: m.value === 'weight' ? null : m.value })}
                className={cn(
                  'min-h-11 rounded-lg px-3 text-xs font-extrabold sm:min-h-9',
                  metric.value === m.value ? 'bg-ink-900 text-white' : 'bg-surface-soft text-ink-500',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className={cn('mt-4', chart.query.isFetching && !chart.query.isLoading && 'opacity-60')} data-testid="progress-chart">
          {!range ? (
            <p className="py-16 text-center text-sm font-medium text-ink-400">Defina um período válido para ver o gráfico.</p>
          ) : chart.query.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : chart.query.isError ? (
            <p className="py-16 text-center text-sm text-ink-400">Não foi possível carregar o gráfico.</p>
          ) : chart.points.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-ink-400">
              {view === 'load'
                ? 'Nenhum treino com este exercício no período.'
                : 'Nenhuma medida registrada no período. Registre no seu perfil.'}
            </p>
          ) : (
            chartRange && (
              <LineChart
                points={chart.points}
                from={chartRange.from}
                to={chartRange.to}
                unit={chart.unit}
                label={view === 'load' ? `Carga máxima por dia — ${selectedName ?? 'exercício'}` : metric.label}
              />
            )
          )}
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  unit,
  values,
  mode,
  days,
  higherIsBetter,
}: {
  label: string
  unit: string
  values: number[]
  mode: 'percent' | 'absolute'
  days: number
  higherIsBetter?: boolean
}) {
  const last = values[values.length - 1]
  const change = values.length >= 2 ? describeChange(values[0], last, mode, unit) : null
  const good = change && change.direction !== 0 && (change.direction > 0) === !!higherIsBetter

  return (
    <div className="rounded-[18px] border border-border bg-surface p-4 sm:p-[18px]">
      <p className="text-[12.5px] font-semibold text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.6px] text-ink-900 tabular-nums sm:text-[28px]">
        {last != null ? formatNumber(last) : '—'} <span className="text-[13px] text-ink-200">{unit}</span>
      </p>
      <p
        className={cn(
          'mt-1 text-xs font-bold',
          !change || change.direction === 0 ? 'text-ink-300' : good ? 'text-success-600' : 'text-ink-500',
        )}
      >
        {change ? `${change.text}${days ? ` em ${days} dias` : ''}` : 'Sem variação no período'}
      </p>
    </div>
  )
}
