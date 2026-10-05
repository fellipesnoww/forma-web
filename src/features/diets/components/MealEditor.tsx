import { useState } from 'react'
import { Plus, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'
import { FOOD_UNITS, type FoodUnit } from '@/features/diets/api'
import { formatKcal } from '@/features/diets/lib/format'
import { mealKcal, parseDecimal, type FieldErrors, type FoodDraft, type MealDraft } from '@/features/diets/lib/editor'

/** What the page does with the AI button; `null` means the AI is off (503) and the button is disabled. */
export type EstimateFn = ((food: FoodDraft) => Promise<{ kcal: number; notes: string } | { error: string }>) | null

interface Props {
  meal: MealDraft
  index: number
  errors: FieldErrors
  estimate: EstimateFn
  onChange: (patch: Partial<Omit<MealDraft, 'key' | 'foods'>>) => void
  onFoodChange: (foodKey: string, patch: Partial<FoodDraft>) => void
  onAddFood: () => void
  onRemoveFood: (foodKey: string) => void
  onRemove: () => void
}

const inputClass =
  'h-11 min-w-0 rounded-[10px] border border-border-strong bg-surface px-3 text-sm font-semibold text-ink-900 placeholder:text-ink-200 focus:border-primary-500 focus:outline-2 focus:outline-primary-100 sm:h-10 aria-[invalid=true]:border-danger-500'

/** Same columns for the header and every row on `sm`+; on phones each food is a two-line card. */
const gridCols = 'sm:grid-cols-[minmax(0,1fr)_70px_76px_104px_64px_32px]'

export function MealEditor({ meal, index, errors, estimate, onChange, onFoodChange, onAddFood, onRemoveFood, onRemove }: Props) {
  const label = meal.name.trim() || `Refeição ${index + 1}`
  const mealError = errors[`meal:${meal.key}:name`] ?? errors[`meal:${meal.key}:time`]

  return (
    <section aria-label={label} className="rounded-[20px] border border-border bg-surface p-4 sm:p-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:flex-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[12.5px] font-extrabold text-primary-500">
            {index + 1}
          </span>
          <input
            value={meal.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nome da refeição"
            aria-label={`Nome da refeição ${index + 1}`}
            aria-invalid={!!errors[`meal:${meal.key}:name`]}
            maxLength={80}
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-transparent bg-transparent px-2 text-base font-extrabold text-ink-900 placeholder:text-ink-200 hover:bg-surface-muted focus:border-primary-500 focus:bg-surface focus:outline-none aria-[invalid=true]:border-danger-500 sm:h-[38px]"
          />
        </div>
        <div className="flex w-full items-center gap-2 pl-[38px] sm:w-auto sm:pl-0">
          <input
            type="time"
            value={meal.time}
            onChange={(e) => onChange({ time: e.target.value })}
            aria-label={`Horário de ${label}`}
            aria-invalid={!!errors[`meal:${meal.key}:time`]}
            className="h-11 w-[112px] rounded-[10px] border border-border-strong bg-surface px-2.5 text-sm font-bold text-ink-900 focus:border-primary-500 focus:outline-2 focus:outline-primary-100 aria-[invalid=true]:border-danger-500 sm:h-[38px]"
          />
          <span className="flex-1 rounded-[10px] bg-surface-muted px-3 py-[9px] text-center text-[12.5px] font-extrabold whitespace-nowrap text-ink-700 tabular-nums sm:flex-none">
            {formatKcal(mealKcal(meal))} kcal
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover ${label}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-danger-50 text-danger-500 sm:h-[38px] sm:w-[38px]"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {mealError && <p className="mt-1.5 text-xs font-semibold text-danger-500">{mealError}</p>}

      {meal.foods.length > 0 && (
        <div
          aria-hidden
          className={cn('mt-3.5 hidden gap-2 px-0.5 text-[11.5px] font-extrabold tracking-[0.4px] text-ink-200 sm:grid', gridCols)}
        >
          <span>ALIMENTO</span>
          <span>QTD.</span>
          <span>UNIDADE</span>
          <span>CALORIAS</span>
          <span />
          <span />
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-2.5 sm:mt-1.5 sm:gap-2">
        {meal.foods.map((food) => (
          <FoodRow
            key={food.key}
            food={food}
            errors={errors}
            estimate={estimate}
            onChange={(patch) => onFoodChange(food.key, patch)}
            onRemove={() => onRemoveFood(food.key)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAddFood}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-[10px] bg-primary-50 px-3 text-[13px] font-bold text-primary-500 sm:min-h-9"
      >
        <Plus size={15} strokeWidth={2.4} />
        Adicionar alimento
      </button>
    </section>
  )
}

type AiState = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: string }

function FoodRow({
  food,
  errors,
  estimate,
  onChange,
  onRemove,
}: {
  food: FoodDraft
  errors: FieldErrors
  estimate: EstimateFn
  onChange: (patch: Partial<FoodDraft>) => void
  onRemove: () => void
}) {
  const [ai, setAi] = useState<AiState>({ status: 'idle' })
  const name = food.name.trim() || 'alimento'
  const quantity = parseDecimal(food.quantity)
  const canAsk = !!estimate && !!food.name.trim() && quantity != null && quantity > 0 && ai.status !== 'loading'
  const fromAi = food.aiNotes != null

  const ask = async () => {
    if (!estimate || !canAsk) return
    setAi({ status: 'loading' })
    const result = await estimate(food)
    if ('error' in result) return setAi({ status: 'error', message: result.error })
    setAi({ status: 'idle' })
    onChange({ kcal: String(result.kcal), aiNotes: result.notes })
  }

  const fieldError = (field: string) => errors[`food:${food.key}:${field}`]
  const rowError = fieldError('name') ?? fieldError('quantity') ?? fieldError('kcal')

  return (
    <li className="rounded-[14px] border border-border p-2.5 sm:rounded-none sm:border-0 sm:p-0">
      <div className={cn('grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-center gap-2', gridCols)}>
        <input
          value={food.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex.: Arroz integral"
          aria-label="Alimento"
          aria-invalid={!!fieldError('name')}
          maxLength={120}
          className={cn(inputClass, 'col-span-3 sm:col-span-1')}
        />
        <input
          value={food.quantity}
          onChange={(e) => onChange({ quantity: e.target.value })}
          inputMode="decimal"
          placeholder="0"
          aria-label={`Quantidade de ${name}`}
          aria-invalid={!!fieldError('quantity')}
          className={cn(inputClass, 'text-right font-bold')}
        />
        <select
          value={food.unit}
          onChange={(e) => onChange({ unit: e.target.value as FoodUnit })}
          aria-label={`Unidade de ${name}`}
          className={cn(inputClass, 'cursor-pointer px-2 font-bold')}
        >
          {FOOD_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <label
          className={cn(
            'flex h-11 items-center gap-1 rounded-[10px] border px-2.5 focus-within:border-primary-500 sm:h-10',
            fromAi ? 'border-ai-200 bg-ai-50' : 'border-border-strong bg-surface',
            fieldError('kcal') && 'border-danger-500',
          )}
        >
          <input
            value={food.kcal}
            onChange={(e) => onChange({ kcal: e.target.value, aiNotes: undefined })}
            inputMode="numeric"
            placeholder="0"
            aria-label={`Calorias de ${name}`}
            aria-invalid={!!fieldError('kcal')}
            className="w-full min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-ink-900 outline-none placeholder:text-ink-200"
          />
          <span className="text-[11.5px] font-bold text-ink-200">kcal</span>
        </label>
        <button
          type="button"
          onClick={ask}
          disabled={!canAsk}
          title={
            !estimate
              ? 'IA indisponível no momento — digite as calorias'
              : canAsk
                ? 'Consultar calorias com IA'
                : 'Informe o alimento e a quantidade'
          }
          aria-label={`Estimar calorias de ${name} com IA`}
          className="col-span-2 flex h-11 items-center justify-center gap-1 rounded-[10px] bg-ai-100 sm:col-span-1 text-[12.5px] font-extrabold text-ai-600 disabled:opacity-45 sm:h-10"
        >
          {ai.status === 'loading' ? <Spinner size="sm" /> : <Sparkles size={14} fill="currentColor" />}
          IA
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${name}`}
          className="flex h-11 items-center justify-center rounded-[10px] text-ink-200 hover:text-danger-500 sm:h-10"
        >
          <X size={18} />
        </button>
      </div>
      {fromAi && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-ai-600">
          <Sparkles size={12} className="mt-0.5 shrink-0" />
          Estimativa da IA: {food.aiNotes}. Revise antes de salvar.
        </p>
      )}
      {ai.status === 'error' && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-danger-500">
          {ai.message}
        </p>
      )}
      {rowError && <p className="mt-1.5 text-xs font-semibold text-danger-500">{rowError}</p>}
    </li>
  )
}
