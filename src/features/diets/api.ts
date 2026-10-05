import { apiFetch } from '@/shared/api/client'

export const FOOD_UNITS = ['G', 'KG', 'ML', 'L'] as const
export type FoodUnit = (typeof FOOD_UNITS)[number]

export interface Food {
  id: string
  name: string
  quantity: number
  unit: FoodUnit
  /** For the whole portion. */
  kcal: number
}

export interface MealSummary {
  id: string
  name: string
  /** "HH:mm", local routine time. Meals come back sorted by it. */
  time: string
  totalKcal: number
  foodCount: number
}

export interface Meal extends MealSummary {
  /** In the order they were sent. */
  foods: Food[]
}

interface DietBase {
  id: string
  name: string
  goal: string | null
  /** At most one per user. */
  isActive: boolean
  /** Worked out on every read, never stale. */
  totalKcal: number
  mealCount: number
  foodCount: number
  createdAt: string
  updatedAt: string
}

/** List items (and `/auth/me`'s `activeDiet`): meals with totals but no foods. */
export interface DietSummary extends DietBase {
  meals: MealSummary[]
}

export interface Diet extends DietBase {
  meals: Meal[]
}

export interface DietInput {
  name: string
  goal?: string | null
  meals: { name: string; time: string; foods: Omit<Food, 'id'>[] }[]
}

export interface CalorieEstimate {
  kcal: number
  /** The basis of the estimate, shown next to the value for the user to review. */
  notes: string
  provider: 'anthropic' | 'gemini'
  model: string
}

export const dietsApi = {
  /** Active first, then newest. */
  list: () => apiFetch<{ items: DietSummary[] }>('/diets'),

  get: (id: string) => apiFetch<Diet>(`/diets/${id}`),

  /** Created inactive. */
  create: (body: DietInput) => apiFetch<Diet>('/diets', { method: 'POST', json: body }),

  /** Sending `meals` replaces every meal and food. */
  update: (id: string, body: Partial<DietInput>) => apiFetch<Diet>(`/diets/${id}`, { method: 'PATCH', json: body }),

  remove: (id: string) => apiFetch<void>(`/diets/${id}`, { method: 'DELETE' }),

  /** Deactivates whichever diet was active. Idempotent. */
  activate: (id: string) => apiFetch<Diet>(`/diets/${id}/activate`, { method: 'POST' }),

  deactivate: (id: string) => apiFetch<Diet>(`/diets/${id}/deactivate`, { method: 'POST' }),

  /** Nothing is saved. 503 when the server has no AI configured; 429 under the strict per-route limit. */
  estimateCalories: (body: { name: string; quantity: number; unit: FoodUnit }) =>
    apiFetch<CalorieEstimate>('/diets/calorie-estimate', { method: 'POST', json: body }),
}
