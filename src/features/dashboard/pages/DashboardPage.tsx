import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity, CalendarDays, ClipboardList, Dumbbell, LineChart, UserRound } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/shared/auth/AuthContext'
import { statsApi } from '@/features/dashboard/api'
import { TodayWorkoutCard } from '@/features/dashboard/components/TodayWorkoutCard'
import { useNextWorkout } from '@/features/dashboard/hooks/useNextWorkout'
import { WeekVolumeChart } from '@/features/dashboard/components/WeekVolumeChart'
import { ActiveDietCard } from '@/features/dashboard/components/ActiveDietCard'

const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** "Quinta, 14 de junho" */
function todayTitle() {
  const text = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1).replace('-feira', '')
}

const shortcuts = [
  { to: '/app/sheets', label: 'Minhas planilhas', desc: 'Ver ou criar um treino', icon: ClipboardList },
  { to: '/app/exercises', label: 'Biblioteca de exercícios', desc: 'Buscar por grupo muscular', icon: Dumbbell },
  { to: '/app/activities', label: 'Atividades livres', desc: 'Corrida, futebol, natação…', icon: Activity },
  { to: '/app/progress', label: 'Evolução', desc: 'Carga e medidas no tempo', icon: LineChart },
  { to: '/app/calendar', label: 'Calendário', desc: 'Lançar treino em outro dia', icon: CalendarDays },
  { to: '/app/profile', label: 'Meu perfil', desc: 'Medidas e dados pessoais', icon: UserRound },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const name = profile?.displayName?.split(' ')[0]
  const { workout, hasSheets } = useNextWorkout()
  const { data: stats, isError } = useQuery({ queryKey: ['stats', 'overview'], queryFn: statsApi.overview })

  const subtitle = [
    todayTitle(),
    workout?.next.offset === 0 ? `${workout.sheet.name} programado para hoje` : hasSheets ? 'Dia de descanso' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const change = stats?.week.volumeChangePct
  const plan = stats?.month.planCompletionPct

  return (
    <div className="flex flex-col gap-5 sm:gap-[22px]">
      <div>
        <h1 className="text-2xl font-extrabold tracking-[-0.5px] text-ink-900">
          {greeting()}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="mt-0.5 text-sm font-medium text-ink-500">{subtitle}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <TodayWorkoutCard workout={workout} hasSheets={hasSheets} />

          {isError && <p className="text-sm text-ink-400">Não foi possível carregar suas estatísticas.</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatTile
              label="Volume na semana"
              value={stats ? kg.format(stats.week.volumeKg) : '—'}
              unit="kg"
              note={change == null ? 'sem semana anterior' : `${change >= 0 ? '↑' : '↓'} ${Math.abs(change)}%`}
              tone={change == null ? 'muted' : change >= 0 ? 'good' : 'muted'}
            />
            <StatTile
              label="Treinos no mês"
              value={stats ? String(stats.month.workoutCount) : '—'}
              note={plan == null ? 'sem planilha ativa' : `${plan}% do plano`}
              tone={plan == null ? 'muted' : 'good'}
            />
            <StatTile
              className="col-span-2 sm:col-span-1"
              label="Atividades livres"
              value={stats ? String(stats.month.activityCount) : '—'}
              note={
                stats?.month.activityTypes.length
                  ? stats.month.activityTypes
                      .slice(0, 3)
                      .map((t) => t.name.toLowerCase())
                      .join(' · ')
                  : 'nenhuma este mês'
              }
              tone={stats?.month.activityTypes.length ? 'activity' : 'muted'}
            />
          </div>

          {stats && <WeekVolumeChart days={stats.week.days} today={stats.today} />}
        </div>

        <div className="flex flex-col gap-5">
          <ActiveDietCard />
          <section aria-label="Atalhos" className="flex flex-col gap-3">
            <h2 className="text-base font-extrabold text-ink-900">Atalhos</h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              {shortcuts.map(({ to, label, desc, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-[18px] border border-border bg-surface p-3.5 transition-shadow hover:shadow-md"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-ink-900">{label}</span>
                    <span className="block text-xs font-medium text-ink-500">{desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  unit,
  note,
  tone,
  className,
}: {
  label: string
  value: string
  unit?: string
  note: string
  tone: 'good' | 'activity' | 'muted'
  className?: string
}) {
  return (
    <div className={cn('rounded-[18px] border border-border bg-surface p-4 sm:p-[18px]', className)}>
      <p className="text-[12.5px] font-semibold text-ink-400">{label}</p>
      <p className="mt-1 text-[22px] font-extrabold tracking-[-0.5px] text-ink-900 tabular-nums sm:text-[26px]">
        {value}
        {unit && <span className="text-[13px] font-bold text-ink-200"> {unit}</span>}
      </p>
      <p
        className={cn(
          'mt-1 truncate text-xs font-bold',
          tone === 'good' && 'text-success-600',
          tone === 'activity' && 'text-activity-500',
          tone === 'muted' && 'text-ink-300',
        )}
      >
        {note}
      </p>
    </div>
  )
}
