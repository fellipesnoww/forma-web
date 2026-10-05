import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, ImageIcon, Minus, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { useToast } from '@/shared/ui/Toast'
import { cn } from '@/shared/lib/cn'
import { exercisesApi } from '@/features/exercises'
import { WEEKDAY_LABELS, workoutSheetsApi, type WorkoutSheet } from '@/features/workout-sheets'
import { buildDraft, draftStorage, hasProgress, type SessionDraft } from '@/features/workout-sessions/lib/draft'
import { formatLongDate, formatTime } from '@/features/workout-sessions/lib/format'
import { suggestLoad } from '@/features/workout-sessions/lib/progression'
import { useSessionRunner } from '@/features/workout-sessions/hooks/useSessionRunner'
import { DEFAULT_REST_SECONDS, useRestTimer } from '@/features/workout-sessions/hooks/useRestTimer'
import { SetRow } from '@/features/workout-sessions/components/SetRow'
import {
  ElapsedTimer,
  ExerciseRail,
  RestPill,
  RestTimerCard,
  SuggestionPill,
  SyncBadge,
} from '@/features/workout-sessions/components/RunWidgets'

export function WorkoutRunPage() {
  const { id } = useParams<{ id: string }>()
  const { data: sheet, isLoading, isError } = useQuery({
    queryKey: ['workout-sheets', id],
    queryFn: () => workoutSheetsApi.get(id!),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (isError || !sheet || sheet.days.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-bold text-ink-900">
          {isError || !sheet ? 'Planilha não encontrada' : 'Esta planilha não tem dias de treino'}
        </p>
        <Link to="/app/sheets" className="text-sm font-bold text-primary-500">
          Voltar para planilhas
        </Link>
      </Card>
    )
  }

  return <WorkoutRunner key={sheet.id} sheet={sheet} />
}

/** Backdated entry: see `retroRunPath`. `?retro=1` alone resumes the backdated draft saved on this device. */
function initialDraft(sheet: WorkoutSheet, params: URLSearchParams): SessionDraft {
  if (!params.has('retro')) {
    const stored = draftStorage.load(sheet.id)
    return stored && hasProgress(stored) ? stored : buildDraft(sheet.id, sheet.name, pickDay(sheet))
  }

  const stored = draftStorage.load(sheet.id, true)
  const at = params.get('at')
  const durationMinutes = Number(params.get('duration'))
  const startedAt = at ? new Date(at) : null
  if (!startedAt || Number.isNaN(startedAt.getTime()) || !(durationMinutes > 0)) {
    // Resuming: whatever backdated draft this device has (the form only links here with full params).
    if (stored) return stored
  } else if (stored && hasProgress(stored) && stored.startedAt === startedAt.toISOString()) {
    return stored
  }

  const weekday = Number(params.get('weekday'))
  const days = sheet.days.slice().sort((a, b) => a.order - b.order)
  const day = days.find((d) => d.weekday === weekday) ?? days[0]
  return {
    ...buildDraft(sheet.id, sheet.name, day),
    startedAt: (startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt : new Date()).toISOString(),
    retroactive: { durationMinutes: durationMinutes > 0 ? durationMinutes : 60 },
  }
}

/** Today's day of the sheet if it has one, else the first day in display order. */
function pickDay(sheet: WorkoutSheet) {
  const days = sheet.days.slice().sort((a, b) => a.order - b.order)
  return days.find((d) => d.weekday === new Date().getDay()) ?? days[0]
}

function WorkoutRunner({ sheet }: { sheet: WorkoutSheet }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [initial] = useState(() => initialDraft(sheet, params))
  const { draft, status, syncError, syncNow, actions } = useSessionRunner(initial)
  const [finishing, setFinishing] = useState(false)
  const rest = useRestTimer()
  const retro = !!draft.retroactive

  // Catalog GIFs live on the exercise, not on the sheet/session payloads.
  const { data: library } = useQuery({ queryKey: ['exercises', ''], queryFn: () => exercisesApi.list() })
  const mediaById = useMemo(
    () => new Map((library?.items ?? []).filter((e) => e.mediaUrl).map((e) => [e.id, e.mediaUrl!])),
    [library],
  )

  const exIdx = Math.min(draft.activeIndex, draft.exercises.length - 1)
  const exercise = draft.exercises[exIdx]
  const activeSetIdx = exercise.sets.findIndex((s) => !s.completed)
  const mediaUrl = exercise.exerciseId ? mediaById.get(exercise.exerciseId) : undefined
  const isLast = exIdx === draft.exercises.length - 1
  const started = hasProgress(draft)
  const days = sheet.days.slice().sort((a, b) => a.order - b.order)
  const restSeconds = exercise.restSeconds ?? DEFAULT_REST_SECONDS

  // Last time this exercise was done (not counting this session), for the load suggestion.
  const exerciseRef = exercise.exerciseId ?? exercise.customExerciseId
  const { data: lastSession } = useQuery({
    queryKey: ['exercises', exerciseRef, 'last-session', draft.sessionId ?? null],
    queryFn: () => exercisesApi.lastSession(exerciseRef!, draft.sessionId),
    enabled: !!exerciseRef,
    staleTime: 5 * 60 * 1000,
  })
  const suggestion = suggestLoad(lastSession, exercise.targetReps)

  const { prefill } = actions
  const suggestedKg = suggestion?.weightKg
  useEffect(() => {
    if (suggestedKg != null && suggestedKg > 0 && !exercise.prefilled) prefill(exIdx, suggestedKg)
  }, [suggestedKg, exIdx, exercise.prefilled, prefill])

  const toggleSet = (setIdx: number) => {
    const completing = !exercise.sets[setIdx].completed
    actions.toggleSet(exIdx, setIdx)
    // Rest starts on finishing a set, unless it was the exercise's last one (or this is a backdated log).
    const remaining = exercise.sets.filter((s, i) => !s.completed && i !== setIdx).length
    if (completing && !retro && remaining > 0) rest.start(restSeconds)
  }

  const finish = async () => {
    if (!started) {
      toast('Conclua ao menos uma série para finalizar o treino.', 'warning')
      return
    }
    setFinishing(true)
    const { ok, sessionId, error } = await syncNow()
    setFinishing(false)
    if (ok && sessionId) {
      navigate(`/app/sessions/${sessionId}`)
    } else {
      toast(error ?? 'Sem conexão. Seu treino está salvo neste aparelho — tente de novo.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/app/sheets"
            aria-label="Voltar para planilhas"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ink-600 ring-1 ring-border"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-ink-900">
                {draft.sheetName} · {WEEKDAY_LABELS[draft.weekday]}
              </h1>
              {retro ? (
                <span className="flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-extrabold text-warning-600">
                  <CalendarClock size={13} />
                  Registro retroativo
                </span>
              ) : (
                started && (
                  <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-extrabold text-success-600">
                    Em andamento
                  </span>
                )
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[12.5px] font-semibold text-ink-400">
                {formatLongDate(draft.startedAt)} · {retro ? 'início' : 'iniciado'} às {formatTime(draft.startedAt)}
                {draft.retroactive && ` · ${draft.retroactive.durationMinutes} min`}
              </span>
              <SyncBadge status={status} error={syncError} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!retro && <ElapsedTimer startedAt={draft.startedAt} />}
          <Button variant="dark" onClick={finish} loading={finishing} className="h-11">
            Finalizar treino
          </Button>
        </div>
      </div>

      {!started && days.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-wide text-ink-400 uppercase">Dia do treino</p>
          <div className="flex flex-wrap gap-1.5">
            {days.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => actions.switchDay(day)}
                aria-pressed={day.weekday === draft.weekday}
                className={cn(
                  'flex h-11 min-w-14 items-center justify-center rounded-xl px-3 text-xs font-extrabold',
                  day.weekday === draft.weekday ? 'bg-primary-500 text-white' : 'bg-white text-ink-400 ring-1 ring-border',
                )}
              >
                {WEEKDAY_LABELS[day.weekday]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {mediaUrl && (
            <div className="relative h-44 overflow-hidden rounded-[18px] bg-sidebar sm:h-[300px] sm:rounded-[20px]">
              <AuthedImage src={mediaUrl} alt={`Demonstração: ${exercise.name}`} className="h-full w-full object-contain" />
              <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-bold text-white">
                <ImageIcon size={13} />
                Execução do movimento
              </span>
            </div>
          )}

          <section className="rounded-[20px] border border-border bg-white p-4 sm:p-[22px]" aria-label={exercise.name}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[19px] font-extrabold tracking-tight text-ink-900 sm:text-[21px]">{exercise.name}</h2>
                <p className="mt-0.5 text-[13px] font-semibold text-ink-400">
                  {activeSetIdx === -1
                    ? `${exercise.sets.length} séries concluídas`
                    : `Série ${activeSetIdx + 1} de ${exercise.sets.length}`}
                  {exercise.targetReps ? ` · alvo ${exercise.targetReps} reps` : ''}
                </p>
              </div>
              <span className="text-xs font-bold text-ink-400">
                Exercício {exIdx + 1} de {draft.exercises.length}
              </span>
            </div>
            {suggestion && (
              <div className="mt-3">
                <SuggestionPill suggestion={suggestion} onApply={() => actions.applyLoad(exIdx, suggestion.weightKg)} />
              </div>
            )}

            <div className="mt-[18px] flex gap-2.5 px-3 pb-2.5 text-[11.5px] font-bold tracking-wide text-ink-200 sm:gap-3 sm:px-4">
              <div className="w-14 shrink-0 sm:w-16">SÉRIE</div>
              <div className="flex-1 text-center sm:text-left">REPS</div>
              <div className="flex-1 text-center sm:text-left">CARGA (KG)</div>
              <div className="w-11 text-right sm:w-28">FEITO</div>
            </div>
            <div className="flex flex-col gap-2.5">
              {exercise.sets.map((set, i) => (
                <SetRow
                  key={i}
                  index={i}
                  set={set}
                  state={set.completed ? 'done' : i === activeSetIdx ? 'active' : 'pending'}
                  onChange={(patch) => actions.updateSet(exIdx, i, patch)}
                  onToggle={() => toggleSet(i)}
                />
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => actions.addSet(exIdx)} className="h-11">
                <Plus size={16} />
                Série
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => actions.removeLastSet(exIdx)}
                disabled={exercise.sets.length <= 1}
                className="h-11 disabled:opacity-40"
              >
                <Minus size={16} />
                Remover última
              </Button>
            </div>
          </section>

          <div className="hidden justify-between gap-3 lg:flex">
            <Button variant="secondary" onClick={() => actions.setActive(exIdx - 1)} disabled={exIdx === 0} className="disabled:opacity-40">
              <ChevronLeft size={16} />
              Anterior
            </Button>
            {!isLast && (
              <Button onClick={() => actions.setActive(exIdx + 1)}>
                Próximo exercício
                <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-[18px]">
          <ExerciseRail exercises={draft.exercises} activeIndex={exIdx} onSelect={actions.setActive} />
          {!retro && (
            <div className="hidden lg:block">
              <RestTimerCard timer={rest} restSeconds={restSeconds} configured={exercise.restSeconds != null} />
            </div>
          )}
        </aside>
      </div>

      {/* Mobile action bar, docked to the bottom (main scrolls with the page, so it's fixed, not sticky). */}
      <div className="h-16 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 flex pb-[max(12px,env(safe-area-inset-bottom))] md:left-60 items-center gap-2.5 border-t border-border bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => actions.setActive(exIdx - 1)}
          disabled={exIdx === 0}
          aria-label="Exercício anterior"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-surface-soft text-ink-700 disabled:opacity-40"
        >
          <ChevronLeft size={20} />
        </button>
        <RestPill timer={rest} />
        {isLast ? (
          <Button onClick={finish} loading={finishing} fullWidth className="h-12 rounded-[13px] text-[15px]">
            Finalizar treino
          </Button>
        ) : (
          <Button onClick={() => actions.setActive(exIdx + 1)} fullWidth className="h-12 rounded-[13px] text-[15px]">
            Próximo
            <ChevronRight size={18} />
          </Button>
        )}
      </div>
    </div>
  )
}
