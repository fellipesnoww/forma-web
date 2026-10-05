import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { dietsApi, type Diet } from '@/features/diets/api'
import {
  LIMITS,
  dietToDraft,
  draftToInput,
  emptyFood,
  emptyMeal,
  parseDecimal,
  validateDraft,
  type DietDraft,
  type FieldErrors,
  type FoodDraft,
  type MealDraft,
} from '@/features/diets/lib/editor'
import { MealEditor, type EstimateFn } from '@/features/diets/components/MealEditor'
import { EditorSummary } from '@/features/diets/components/EditorSummary'

export function DietEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { data: diet, isLoading, isError } = useQuery({
    queryKey: ['diets', id],
    queryFn: () => dietsApi.get(id!),
    enabled: !!id,
  })

  if (id && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }
  if (id && (isError || !diet)) {
    return (
      <Card className="py-12 text-center">
        <p className="font-bold text-ink-900">Dieta não encontrada</p>
      </Card>
    )
  }
  // Keyed so switching between diets (or new → saved) starts from fresh state.
  return <DietEditor key={diet?.id ?? 'new'} diet={diet ?? null} />
}

const fieldClass =
  'h-[46px] w-full rounded-xl border-[1.5px] border-[#E6E8EF] bg-white px-3.5 text-ink-900 placeholder:text-ink-200 focus:border-primary-500 focus:outline-none aria-[invalid=true]:border-danger-500'

function DietEditor({ diet }: { diet: Diet | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<DietDraft>(() =>
    diet ? dietToDraft(diet) : { name: '', goal: '', meals: [emptyMeal()] },
  )
  const [active, setActive] = useState(diet?.isActive ?? false)
  // After the first save attempt, errors follow the draft live, so each fix clears its own message.
  const [showErrors, setShowErrors] = useState(false)
  const errors: FieldErrors = showErrors ? validateDraft(draft) : {}
  const [aiAvailable, setAiAvailable] = useState(true)

  const { data: list } = useQuery({ queryKey: ['diets'], queryFn: dietsApi.list })
  const otherActive = list?.items.find((d) => d.isActive && d.id !== diet?.id)?.name ?? null

  // Functional updates: the AI fills a food after an await, and must not undo edits made meanwhile.
  const edit = (fn: (d: DietDraft) => DietDraft) => setDraft(fn)
  const editMeal = (key: string, fn: (m: MealDraft) => MealDraft) =>
    edit((d) => ({ ...d, meals: d.meals.map((m) => (m.key === key ? fn(m) : m)) }))
  const editFood = (mealKey: string, foodKey: string, patch: Partial<FoodDraft>) =>
    editMeal(mealKey, (m) => ({ ...m, foods: m.foods.map((f) => (f.key === foodKey ? { ...f, ...patch } : f)) }))

  const estimate: EstimateFn = aiAvailable
    ? async (food) => {
        try {
          const result = await dietsApi.estimateCalories({
            name: food.name.trim(),
            quantity: parseDecimal(food.quantity)!,
            unit: food.unit,
          })
          return { kcal: result.kcal, notes: result.notes }
        } catch (err) {
          if (err instanceof ApiError && err.status === 503) {
            setAiAvailable(false)
            toast('IA indisponível no momento. Digite as calorias.', 'warning')
            return { error: 'IA indisponível. Digite as calorias.' }
          }
          if (err instanceof ApiError && err.status === 429) return { error: 'Muitas consultas seguidas. Tente em um minuto.' }
          if (err instanceof ApiError && err.status === 400) return { error: 'A IA não reconheceu esse alimento. Descreva melhor ou digite as calorias.' }
          return { error: 'Não foi possível consultar a IA.' }
        }
      }
    : null

  const save = useMutation({
    mutationFn: async () => {
      const input = draftToInput(draft)
      let saved = diet
        ? await dietsApi.update(diet.id, input)
        : await dietsApi.create({ ...input, goal: input.goal ?? undefined })
      if (active !== saved.isActive) saved = active ? await dietsApi.activate(saved.id) : await dietsApi.deactivate(saved.id)
      return saved
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['diets', saved.id], saved)
      queryClient.invalidateQueries({ queryKey: ['diets'], exact: true })
      toast(diet ? 'Dieta atualizada.' : 'Dieta criada.', 'success')
      navigate('/app/diets')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível salvar a dieta.', 'error'),
  })

  const submit = () => {
    setShowErrors(true)
    if (Object.keys(validateDraft(draft)).length) {
      toast('Revise os campos destacados antes de salvar.', 'error')
      return
    }
    save.mutate()
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/diets')}
            aria-label="Voltar para dietas"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-700 hover:bg-surface-soft"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{diet ? 'Editar dieta' : 'Nova dieta'}</h1>
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate('/app/diets')}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            Salvar dieta
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 rounded-[20px] border border-border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-5">
            <label className="flex flex-col gap-[7px]">
              <span className="text-[12.5px] font-bold text-ink-600">Nome da dieta</span>
              <input
                value={draft.name}
                onChange={(e) => edit((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex.: Cutting · semana 1"
                maxLength={LIMITS.name}
                aria-invalid={!!errors.name}
                className={`${fieldClass} text-[15px] font-bold`}
              />
              {errors.name && <span className="text-xs font-semibold text-danger-500">{errors.name}</span>}
            </label>
            <label className="flex flex-col gap-[7px]">
              <span className="text-[12.5px] font-bold text-ink-600">Objetivo</span>
              <input
                value={draft.goal}
                onChange={(e) => edit((d) => ({ ...d, goal: e.target.value }))}
                placeholder="Ex.: Ganho de massa"
                maxLength={LIMITS.goal}
                className={`${fieldClass} text-sm font-semibold`}
              />
            </label>
          </div>

          {draft.meals.map((meal, index) => (
            <MealEditor
              key={meal.key}
              meal={meal}
              index={index}
              errors={errors}
              estimate={estimate}
              onChange={(patch) => editMeal(meal.key, (m) => ({ ...m, ...patch }))}
              onFoodChange={(foodKey, patch) => editFood(meal.key, foodKey, patch)}
              onAddFood={() => editMeal(meal.key, (m) => ({ ...m, foods: [...m.foods, emptyFood()] }))}
              onRemoveFood={(foodKey) => editMeal(meal.key, (m) => ({ ...m, foods: m.foods.filter((f) => f.key !== foodKey) }))}
              onRemove={() => edit((d) => ({ ...d, meals: d.meals.filter((m) => m.key !== meal.key) }))}
            />
          ))}

          {draft.meals.length < LIMITS.meals && (
            <button
              type="button"
              onClick={() => edit((d) => ({ ...d, meals: [...d.meals, emptyMeal(d.meals[d.meals.length - 1])] }))}
              className="flex h-[54px] items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#C9D3EE] text-sm font-extrabold text-primary-500 hover:bg-[#F0F4FF]"
            >
              <Plus size={18} strokeWidth={2.4} />
              Adicionar refeição
            </button>
          )}
        </div>

        <aside className="lg:sticky lg:top-7 lg:self-start">
          <EditorSummary draft={draft} active={active} onToggleActive={() => setActive((a) => !a)} replacesActive={otherActive} />
        </aside>
      </div>
    </form>
  )
}
