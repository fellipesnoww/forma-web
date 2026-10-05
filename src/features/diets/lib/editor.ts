import type { Diet, DietInput, FoodUnit } from '@/features/diets/api'

/** Mirrors the backend limits (`diets.schemas.ts`). */
export const LIMITS = { meals: 20, foodsPerMeal: 50, kcal: 20_000, quantity: 100_000, name: 120, goal: 255, mealName: 80 }

/**
 * Editor state. Numbers stay as the typed text until save, so "0,12" or a half-typed value
 * is never normalized away mid-edit.
 */
export interface FoodDraft {
  key: string
  name: string
  quantity: string
  unit: FoodUnit
  kcal: string
  /** Set when the kcal came from the AI button; cleared as soon as the user edits it. */
  aiNotes?: string
}

export interface MealDraft {
  key: string
  name: string
  time: string
  foods: FoodDraft[]
}

export interface DietDraft {
  name: string
  goal: string
  meals: MealDraft[]
}

let keyCounter = 0
export const newKey = () => `k${++keyCounter}`

export const emptyFood = (): FoodDraft => ({ key: newKey(), name: '', quantity: '', unit: 'G', kcal: '' })

/** New meal: an hour after the last one (or 07:00), with one blank food row to type in. */
export function emptyMeal(previous?: MealDraft): MealDraft {
  let time = '07:00'
  if (previous?.time) {
    const [h, m] = previous.time.split(':').map(Number)
    time = `${String(Math.min(h + 3, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return { key: newKey(), name: '', time, foods: [emptyFood()] }
}

export function dietToDraft(diet: Diet): DietDraft {
  return {
    name: diet.name,
    goal: diet.goal ?? '',
    meals: diet.meals.map((meal) => ({
      key: meal.id,
      name: meal.name,
      time: meal.time,
      foods: meal.foods.map((f) => ({
        key: f.id,
        name: f.name,
        quantity: String(f.quantity).replace('.', ','),
        unit: f.unit,
        kcal: String(f.kcal),
      })),
    })),
  }
}

/** Accepts "62,5" and "62.5". */
export function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

const isBlankFood = (f: FoodDraft) => !f.name.trim() && !f.quantity.trim() && !f.kcal.trim()

/** kcal that counts toward totals while typing: anything that parses, else 0. */
export function foodKcal(food: FoodDraft) {
  const value = parseDecimal(food.kcal)
  return value != null && value > 0 ? Math.round(value) : 0
}

export function mealKcal(meal: MealDraft) {
  return meal.foods.reduce((sum, f) => sum + foodKcal(f), 0)
}

export function draftTotals(draft: DietDraft) {
  const foodCount = draft.meals.reduce((n, m) => n + m.foods.filter((f) => !isBlankFood(f)).length, 0)
  return { kcal: draft.meals.reduce((sum, m) => sum + mealKcal(m), 0), mealCount: draft.meals.length, foodCount }
}

export type FieldErrors = Record<string, string>

/** Error keys: `name`, `goal`, `meal:<key>:name|time`, `food:<key>:name|quantity|kcal`. */
export function validateDraft(draft: DietDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (!draft.name.trim()) errors.name = 'Informe o nome da dieta'
  else if (draft.name.trim().length > LIMITS.name) errors.name = `Máximo de ${LIMITS.name} caracteres`
  if (draft.goal.trim().length > LIMITS.goal) errors.goal = `Máximo de ${LIMITS.goal} caracteres`
  if (draft.meals.length > LIMITS.meals) errors.meals = `No máximo ${LIMITS.meals} refeições`

  for (const meal of draft.meals) {
    if (!meal.name.trim()) errors[`meal:${meal.key}:name`] = 'Dê um nome à refeição'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(meal.time)) errors[`meal:${meal.key}:time`] = 'Horário inválido'
    const foods = meal.foods.filter((f) => !isBlankFood(f))
    if (foods.length > LIMITS.foodsPerMeal) errors[`meal:${meal.key}:name`] = `No máximo ${LIMITS.foodsPerMeal} alimentos`
    for (const food of foods) {
      if (!food.name.trim()) errors[`food:${food.key}:name`] = 'Informe o alimento'
      const qty = parseDecimal(food.quantity)
      if (qty == null || qty <= 0 || qty > LIMITS.quantity) errors[`food:${food.key}:quantity`] = 'Quantidade > 0'
      const kcal = parseDecimal(food.kcal)
      if (kcal == null || !Number.isInteger(kcal) || kcal < 0 || kcal > LIMITS.kcal) {
        errors[`food:${food.key}:kcal`] = `Calorias inteiras de 0 a ${LIMITS.kcal}`
      }
    }
  }
  return errors
}

/** Fully blank food rows (the one a new meal starts with) are dropped, not sent. */
export function draftToInput(draft: DietDraft): DietInput {
  const goal = draft.goal.trim()
  return {
    name: draft.name.trim(),
    goal: goal || null,
    meals: draft.meals.map((meal) => ({
      name: meal.name.trim(),
      time: meal.time,
      foods: meal.foods
        .filter((f) => !isBlankFood(f))
        .map((f) => ({
          name: f.name.trim(),
          quantity: parseDecimal(f.quantity)!,
          unit: f.unit,
          kcal: parseDecimal(f.kcal)!,
        })),
    })),
  }
}
