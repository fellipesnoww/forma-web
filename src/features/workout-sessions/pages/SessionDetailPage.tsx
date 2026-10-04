import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import { AuthedImage } from '@/shared/ui/AuthedImage'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { workoutSessionsApi, type WorkoutSession } from '@/features/workout-sessions/api'
import { draftStorage, sessionToDraft } from '@/features/workout-sessions/lib/draft'
import { compressImage } from '@/shared/lib/image'
import { computeStats, formatKg, formatLongDate, formatTime } from '@/features/workout-sessions/lib/format'
import { PhotoDropzone } from '@/shared/ui/PhotoDropzone'
import { SessionStatsRow } from '@/features/workout-sessions/components/SessionStatsRow'

const COMMENT_MAX = 1000

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['workout-sessions', id],
    queryFn: () => workoutSessionsApi.get(id!),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (isError || !session) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-bold text-ink-900">Sessão não encontrada</p>
        <Link to="/app/sessions" className="text-sm font-bold text-primary-500">
          Ver histórico
        </Link>
      </Card>
    )
  }

  const ended = session.completedAt ?? null
  const stats = computeStats(session.exercises, session.performedAt, ended)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/app/sessions"
            aria-label="Voltar para o histórico"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ink-600 ring-1 ring-border"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-extrabold tracking-tight text-ink-900">
              {ended ? 'Treino concluído' : 'Finalizar treino'}
            </h1>
            <span className="truncate rounded-full bg-success-50 px-2.5 py-1 text-xs font-extrabold text-success-600">
              {session.sheetName}
            </span>
          </div>
        </div>
        <span className="text-[13px] font-semibold text-ink-400">
          {formatLongDate(session.performedAt)} · {formatTime(session.performedAt)}
          {ended && ` – ${formatTime(ended)}`}
        </span>
      </div>

      <SessionStatsRow stats={stats} />

      {ended ? <CompletedSummary session={session} /> : <FinishForm session={session} />}
    </div>
  )
}

function FinishForm({ session }: { session: WorkoutSession }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [photo, setPhoto] = useState<File | null>(null)
  const [comment, setComment] = useState(session.comment ?? '')
  // A retry after a later step failed shouldn't upload the same photo twice.
  const uploadedPhoto = useRef<File | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      if (photo && uploadedPhoto.current !== photo) {
        await workoutSessionsApi.uploadPhoto(session.id, await compressImage(photo))
        uploadedPhoto.current = photo
      }
      const trimmed = comment.trim()
      if (trimmed !== (session.comment ?? '')) {
        await workoutSessionsApi.update(session.id, { comment: trimmed || null })
      }
      return workoutSessionsApi.complete(session.id)
    },
    onSuccess: (completed) => {
      draftStorage.clear(completed.sheetId)
      queryClient.setQueryData(['workout-sessions', session.id], completed)
      queryClient.invalidateQueries({ queryKey: ['workout-sessions'] })
      toast('Treino salvo!', 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível salvar o treino.', 'error'),
  })

  const backToWorkout = () => {
    const local = draftStorage.load(session.sheetId)
    if (local?.sessionId !== session.id) draftStorage.save(sessionToDraft(session))
    navigate(`/app/sheets/${session.sheetId}/run`)
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <section className="rounded-[22px] border border-border bg-white p-4 sm:p-[22px]">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-extrabold text-ink-900">Foto do treino</h2>
          <span className="text-[12.5px] font-semibold text-ink-200">opcional</span>
        </div>
        <PhotoDropzone file={photo} onChange={setPhoto} onReject={(msg) => toast(msg, 'error')} />
      </section>

      <section className="rounded-[22px] border border-border bg-white p-4 sm:p-[22px]">
        <div className="flex items-baseline gap-2">
          <label htmlFor="session-comment" className="text-base font-extrabold text-ink-900">
            Comentário
          </label>
          <span className="text-[12.5px] font-semibold text-ink-200">opcional</span>
        </div>
        <textarea
          id="session-comment"
          value={comment}
          maxLength={COMMENT_MAX}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Como foi o treino?"
          rows={3}
          className="mt-3 min-h-20 w-full resize-y rounded-[14px] border border-[#E6E8EF] p-3.5 text-sm leading-relaxed font-medium text-ink-700 placeholder:text-ink-200 focus:border-primary-500 focus:outline-2 focus:outline-primary-100"
        />
        <p className="mt-1 text-right text-xs font-semibold text-ink-200">
          {comment.length}/{COMMENT_MAX}
        </p>
      </section>

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={backToWorkout} className="h-[50px] rounded-[14px] px-5 text-[14.5px]">
          Voltar ao treino
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} className="h-[50px] rounded-[14px] px-6 text-[15px]">
          Salvar treino
        </Button>
      </div>
    </div>
  )
}

function CompletedSummary({ session }: { session: WorkoutSession }) {
  const exercises = session.exercises.slice().sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-[22px] border border-border bg-white p-4 sm:p-[22px]">
        <h2 className="text-base font-extrabold text-ink-900">Exercícios</h2>
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {exercises.map((ex) => (
            <li key={ex.id} className="py-3">
              <p className="font-bold text-ink-900">{ex.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ex.sets
                  .slice()
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((set) => (
                    <span
                      key={set.id}
                      className={
                        set.completed
                          ? 'flex items-center gap-1 rounded-lg bg-success-50 px-2.5 py-1 text-xs font-bold text-success-600'
                          : 'rounded-lg bg-surface-soft px-2.5 py-1 text-xs font-bold text-ink-300'
                      }
                    >
                      {set.completed && <Check size={12} strokeWidth={3} />}
                      {set.reps} × {formatKg(set.weightKg)} kg
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-4">
        {session.photoUrl && (
          <div className="overflow-hidden rounded-[22px] border border-border bg-white">
            <AuthedImage src={session.photoUrl} alt="Foto do treino" className="aspect-[4/5] w-full object-cover" />
          </div>
        )}
        {session.comment && (
          <section className="rounded-[22px] border border-border bg-white p-4 sm:p-[22px]">
            <h2 className="text-sm font-extrabold text-ink-900">Comentário</h2>
            <p className="mt-2 text-sm leading-relaxed font-medium whitespace-pre-line text-ink-700">{session.comment}</p>
          </section>
        )}
      </div>
    </div>
  )
}
