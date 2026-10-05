import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Plus } from 'lucide-react'
import { exercisesApi } from '@/features/exercises'
import { estimateMinutes, occurrenceLabel } from '@/features/workout-sheets'
import type { useNextWorkout } from '@/features/dashboard/hooks/useNextWorkout'

const chip = 'rounded-full bg-white/18 px-3 py-[5px] text-[12.5px] font-bold'

export function TodayWorkoutCard({ workout, hasSheets }: Pick<ReturnType<typeof useNextWorkout>, 'workout' | 'hasSheets'>) {
  const { data: library } = useQuery({ queryKey: ['exercises', ''], queryFn: () => exercisesApi.list() })

  const day = workout?.next.day
  const groups = new Map((library?.items ?? []).map((e) => [e.id, e.muscleGroup]))
  const muscles = [
    ...new Set(
      (day?.exercises ?? []).map((ex) => groups.get(ex.exerciseId ?? ex.customExerciseId ?? '')).filter((g): g is string => !!g),
    ),
  ].slice(0, 3)

  return (
    <section
      aria-label="Treino de hoje"
      className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#2D5BFF,#4E78FF)] p-5 text-white shadow-[0_16px_32px_rgba(45,91,255,0.28)] sm:p-[26px]"
    >
      <div className="absolute -top-[50px] -right-[30px] h-[200px] w-[200px] rounded-full bg-white/10" aria-hidden />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold tracking-[0.8px] text-white/82">
            {workout && workout.next.offset > 0 ? `PRÓXIMO TREINO · ${occurrenceLabel(workout.next).toUpperCase()}` : 'TREINO DE HOJE'}
          </p>
          <p className="mt-[7px] text-[22px] font-extrabold tracking-[-0.5px] sm:text-[27px]">
            {workout ? workout.sheet.name : hasSheets ? 'Dia de descanso' : 'Monte seu primeiro treino'}
          </p>
          {day && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={chip}>
                {day.exercises.length} {day.exercises.length === 1 ? 'exercício' : 'exercícios'}
              </span>
              <span className={chip}>~{estimateMinutes(day)} min</span>
              {muscles.length > 0 && <span className={chip}>🎽 {muscles.join(' · ')}</span>}
            </div>
          )}
        </div>
        {workout ? (
          <Link
            to={`/app/sheets/${workout.sheet.id}/run`}
            className="flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-[15px] bg-white px-[26px] text-base font-extrabold text-primary-500 shadow-[0_10px_22px_rgba(0,0,0,0.16)]"
          >
            <Play size={16} fill="currentColor" />
            Iniciar treino
          </Link>
        ) : (
          !hasSheets && (
            <Link
              to="/app/sheets/new"
              className="flex h-[54px] shrink-0 items-center justify-center gap-2 rounded-[15px] bg-white px-[26px] text-base font-extrabold text-primary-500"
            >
              <Plus size={18} />
              Criar planilha
            </Link>
          )
        )}
      </div>
    </section>
  )
}
