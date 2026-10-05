import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Spinner } from '@/shared/ui/Spinner'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import type { Exercise } from '@/features/exercises'
import { workoutSheetsApi, type SheetDayInput, type WorkoutSheet } from '@/features/workout-sheets/api'
import { WEEKDAY_LABELS } from '@/features/workout-sheets/lib/weekday'
import { sheetNameSchema, type SheetNameInput } from '@/features/workout-sheets/schemas'
import { WeekdayPicker } from '@/features/workout-sheets/components/WeekdayPicker'
import {
  SortableExerciseRow,
  type ExerciseDraft,
  type ExerciseTargets,
} from '@/features/workout-sheets/components/SortableExerciseRow'
import { ExercisePickerPanel } from '@/features/workout-sheets/components/ExercisePickerPanel'

interface DayDraft {
  dayId?: string
  weekday: number
  exercises: ExerciseDraft[]
}

function sheetToDrafts(sheet: WorkoutSheet): DayDraft[] {
  return sheet.days
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((day) => ({
      dayId: day.id,
      weekday: day.weekday,
      exercises: day.exercises
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((ex) => ({
          localId: ex.id,
          sheetExerciseId: ex.id,
          exerciseId: ex.exerciseId ?? undefined,
          customExerciseId: ex.customExerciseId ?? undefined,
          name: ex.name,
          targetSets: ex.targetSets ?? undefined,
          targetReps: ex.targetReps ?? undefined,
          defaultRestSeconds: ex.defaultRestSeconds ?? undefined,
        })),
    }))
}

function draftsToInput(days: DayDraft[]): SheetDayInput[] {
  return days.map((day, order) => ({
    weekday: day.weekday,
    order,
    exercises: day.exercises.map((ex, sortOrder) => ({
      exerciseId: ex.exerciseId,
      customExerciseId: ex.customExerciseId,
      sortOrder,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      defaultRestSeconds: ex.defaultRestSeconds,
    })),
  }))
}

let draftIdCounter = 0
function nextLocalId() {
  draftIdCounter += 1
  return `draft-${draftIdCounter}`
}

export function WorkoutSheetFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['workout-sheets', id],
    queryFn: () => workoutSheetsApi.get(id!),
    enabled: isEditing,
  })

  const [days, setDays] = useState<DayDraft[]>([])
  const [activeWeekday, setActiveWeekday] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(!isEditing)

  useEffect(() => {
    if (sheet && !hydrated) {
      const drafts = sheetToDrafts(sheet)
      setDays(drafts)
      setActiveWeekday(drafts[0]?.weekday ?? null)
      setHydrated(true)
    }
  }, [sheet, hydrated])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SheetNameInput>({ resolver: zodResolver(sheetNameSchema), defaultValues: { name: '' } })

  useEffect(() => {
    if (sheet) reset({ name: sheet.name })
  }, [sheet, reset])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const save = useMutation({
    mutationFn: (name: string) => {
      const body = { name, days: draftsToInput(days) }
      return isEditing ? workoutSheetsApi.update(id!, body) : workoutSheetsApi.create(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sheets'] })
      toast(isEditing ? 'Planilha atualizada.' : 'Planilha criada.', 'success')
      navigate('/app/sheets')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível salvar a planilha.', 'error'),
  })

  const reorder = useMutation({
    mutationFn: ({ dayId, exercises }: { dayId: string; exercises: { id: string; sortOrder: number }[] }) =>
      workoutSheetsApi.reorder(id!, { dayId, exercises }),
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível reordenar.', 'error'),
  })

  const toggleWeekday = (weekday: number) => {
    setDays((prev) => {
      const exists = prev.some((d) => d.weekday === weekday)
      if (exists) {
        const next = prev.filter((d) => d.weekday !== weekday)
        setActiveWeekday((current) => (current === weekday ? (next[0]?.weekday ?? null) : current))
        return next
      }
      setActiveWeekday(weekday)
      return [...prev, { weekday, exercises: [] }]
    })
  }

  const activeDay = days.find((d) => d.weekday === activeWeekday) ?? null

  const addExercise = (exercise: Exercise) => {
    if (activeWeekday === null) return
    const draft: ExerciseDraft = {
      localId: nextLocalId(),
      exerciseId: exercise.source === 'catalog' ? exercise.id : undefined,
      customExerciseId: exercise.source === 'custom' ? exercise.id : undefined,
      name: exercise.name,
    }
    setDays((prev) =>
      prev.map((d) => (d.weekday === activeWeekday ? { ...d, exercises: [...d.exercises, draft] } : d)),
    )
  }

  const removeExercise = (localId: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === activeWeekday ? { ...d, exercises: d.exercises.filter((e) => e.localId !== localId) } : d,
      ),
    )
  }

  const updateTargets = (localId: string, patch: ExerciseTargets) => {
    setDays((prev) =>
      prev.map((d) =>
        d.weekday === activeWeekday
          ? { ...d, exercises: d.exercises.map((e) => (e.localId === localId ? { ...e, ...patch } : e)) }
          : d,
      ),
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || activeWeekday === null) return

    setDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== activeWeekday) return d
        const oldIndex = d.exercises.findIndex((e) => e.localId === active.id)
        const newIndex = d.exercises.findIndex((e) => e.localId === over.id)
        const reordered = arrayMove(d.exercises, oldIndex, newIndex)

        if (d.dayId && reordered.every((e) => e.sheetExerciseId)) {
          reorder.mutate({
            dayId: d.dayId,
            exercises: reordered.map((e, sortOrder) => ({ id: e.sheetExerciseId!, sortOrder })),
          })
        }

        return { ...d, exercises: reordered }
      }),
    )
  }

  const onSubmit = (data: SheetNameInput) => {
    if (days.length === 0) return
    const emptyDay = days.find((d) => d.exercises.length === 0)
    if (emptyDay) {
      toast(`Adicione ao menos um exercício em ${WEEKDAY_LABELS[emptyDay.weekday]}.`, 'error')
      setActiveWeekday(emptyDay.weekday)
      return
    }
    save.mutate(data.name)
  }

  const addedIds = new Set(
    (activeDay?.exercises ?? []).map((e) => e.exerciseId ?? e.customExerciseId).filter((v): v is string => !!v),
  )

  if (isEditing && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/sheets')}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-700 hover:bg-surface-soft"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            {isEditing ? 'Editar planilha' : 'Nova planilha'}
          </h1>
        </div>
        <Button type="submit" loading={save.isPending} disabled={days.length === 0}>
          Salvar planilha
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 rounded-3xl border border-border bg-white p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input label="Nome da planilha" error={errors.name?.message} {...register('name')} />
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink-700">Dias da semana</p>
              <WeekdayPicker selected={days.map((d) => d.weekday)} onToggle={toggleWeekday} />
            </div>
          </div>

          {days.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-white py-8 text-center text-sm text-ink-400">
              Escolha ao menos um dia da semana para começar.
            </p>
          )}

          {days.length > 0 && (
            <div className="rounded-3xl border border-border bg-white p-5">
              <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-surface-soft p-1">
                {days.map((d) => (
                  <button
                    key={d.weekday}
                    type="button"
                    onClick={() => setActiveWeekday(d.weekday)}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-extrabold',
                      d.weekday === activeWeekday ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400',
                    )}
                  >
                    {WEEKDAY_LABELS[d.weekday]} · {d.exercises.length}
                  </button>
                ))}
              </div>

              {activeDay && (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={activeDay.exercises.map((e) => e.localId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="mt-4 flex flex-col gap-2.5">
                      {activeDay.exercises.length === 0 && (
                        <p className="py-6 text-center text-sm text-ink-400">
                          Nenhum exercício ainda — adicione da biblioteca ao lado.
                        </p>
                      )}
                      {activeDay.exercises.map((ex, index) => (
                        <SortableExerciseRow
                          key={ex.localId}
                          item={ex}
                          index={index}
                          onRemove={() => removeExercise(ex.localId)}
                          onChange={(patch) => updateTargets(ex.localId, patch)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>

        <div>
          {activeDay ? (
            <ExercisePickerPanel
              dayLabel={WEEKDAY_LABELS[activeDay.weekday]}
              addedIds={addedIds}
              onAdd={addExercise}
            />
          ) : (
            <p className="rounded-3xl border border-dashed border-border bg-white p-5 text-center text-sm text-ink-400">
              Selecione um dia para adicionar exercícios.
            </p>
          )}
        </div>
      </div>
    </form>
  )
}
