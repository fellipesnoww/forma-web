import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Activity as ActivityIcon, ChevronRight, Dumbbell, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { Spinner } from '@/shared/ui/Spinner'
import { formatDuration, type Activity } from '@/features/activities'
import type { WorkoutSessionSummary } from '@/features/workout-sessions'
import { calendarApi } from '@/features/calendar/api'
import { formatDayTitle, formatTime } from '@/features/calendar/lib/dates'
import { plural } from '@/features/calendar/lib/describe'

interface Props {
  date: string
  onEditActivity: (activity: Activity) => void
  onAddActivity: () => void
  /** Opens "Lançar registro" for a backdated workout on this day. */
  onAddWorkout: () => void
}

/** "Detalhe do dia": side panel on `lg`, card under the grid below that. */
export function DayDetail({ date, onEditActivity, onAddActivity, onAddWorkout }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['calendar', 'day', date],
    queryFn: () => calendarApi.day(date),
  })

  const empty = data && data.workouts.length === 0 && data.activities.length === 0

  return (
    <section
      data-testid="day-panel"
      aria-label="Detalhe do dia"
      className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-white p-3.5 sm:p-5 lg:sticky lg:top-7 lg:rounded-[22px]"
    >
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.6px] text-ink-200 sm:text-xs">DETALHE DO DIA</p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-ink-900 sm:text-xl">{formatDayTitle(date)}</h2>
        {data && !empty && (
          <p className="mt-1 text-xs font-semibold text-ink-400">
            {[
              data.summary.workoutCount > 0 && plural(data.summary.workoutCount, 'treino', 'treinos'),
              data.summary.activityCount > 0 &&
                `${plural(data.summary.activityCount, 'atividade', 'atividades')} · ${formatDuration(data.summary.activityMinutes)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-ink-400">Não foi possível carregar o dia.</p>}
      {empty && <p className="py-4 text-center text-sm font-medium text-ink-400">Nada registrado neste dia.</p>}

      {data?.workouts.map((session) => <WorkoutCard key={session.id} session={session} />)}
      {data?.activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} onClick={() => onEditActivity(activity)} />
      ))}

      <button
        type="button"
        onClick={onAddWorkout}
        className="mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[13px] bg-primary-50 text-sm font-extrabold text-primary-500 hover:bg-primary-100"
      >
        <Dumbbell size={15} strokeWidth={2.6} />
        Lançar treino neste dia
      </button>
      <button
        type="button"
        onClick={onAddActivity}
        className="flex h-11 items-center justify-center gap-1.5 rounded-[13px] bg-activity-50 text-sm font-extrabold text-activity-500 hover:bg-activity-500/15"
      >
        <Plus size={15} strokeWidth={2.6} />
        Lançar atividade livre
      </button>
    </section>
  )
}

function WorkoutCard({ session }: { session: WorkoutSessionSummary }) {
  // Older sessions predate `durationMinutes`; fall back to the completion gap.
  const durationMin =
    session.durationMinutes ??
    (session.completedAt ? Math.round((Date.parse(session.completedAt) - Date.parse(session.performedAt)) / 60000) : null)

  return (
    <Link
      to={`/app/sessions/${session.id}`}
      aria-label={`${session.sheetName} às ${formatTime(session.performedAt)}`}
      className="overflow-hidden rounded-2xl border border-border transition-shadow hover:shadow-sm"
    >
      {session.photoUrl && (
        <div className="h-32 bg-surface-soft">
          <AuthedImage src={session.photoUrl} alt={`Foto do treino ${session.sheetName}`} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />
            <span className="truncate text-[14.5px] font-extrabold text-ink-900">{session.sheetName}</span>
          </div>
          <span className="shrink-0 text-xs font-bold text-ink-400">{formatTime(session.performedAt)}</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-400">
          <span>
            {[
              durationMin != null && formatDuration(Math.max(durationMin, 0)),
              plural(session.exerciseCount, 'exercício', 'exercícios'),
              plural(session.setCount, 'série', 'séries'),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {!session.completedAt && <span className="text-warning-600">· Em andamento</span>}
        </p>
        {session.comment && (
          <p className="mt-2.5 rounded-[10px] bg-surface-muted px-3 py-2.5 text-[13px] leading-normal font-medium text-ink-700">
            “{session.comment}”
          </p>
        )}
      </div>
    </Link>
  )
}

function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Editar ${activity.activityTypeName} às ${formatTime(activity.performedAt)}`}
      className="flex w-full items-center gap-3 rounded-2xl border border-border p-3.5 text-left transition-shadow hover:shadow-sm"
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl',
          !activity.photoUrl && 'bg-activity-50 text-activity-500',
        )}
      >
        {activity.photoUrl ? (
          <AuthedImage src={activity.photoUrl} alt={`Foto de ${activity.activityTypeName}`} className="h-full w-full object-cover" />
        ) : (
          <ActivityIcon size={18} strokeWidth={2.2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-ink-900">{activity.activityTypeName}</p>
        <p className="text-xs font-semibold text-ink-400">
          {formatDuration(activity.durationMinutes)} · {formatTime(activity.performedAt)}
        </p>
        {activity.comment && <p className="mt-1 truncate text-xs font-medium text-ink-500">{activity.comment}</p>}
      </div>
      <ChevronRight size={16} className="shrink-0 text-ink-200" />
    </button>
  )
}
