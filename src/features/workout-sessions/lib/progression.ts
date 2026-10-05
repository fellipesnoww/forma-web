import type { LastSession } from '@/features/exercises'

/** Smallest plate pair most gyms have. */
export const LOAD_STEP_KG = 2.5

export interface LoadSuggestion {
  /** What the run screen prefills. */
  weightKg: number
  /** The set it's based on: "última 60 × 8". */
  last: { weightKg: number; reps: number }
}

/**
 * The server returns the last session's heaviest set and leaves progression to the client.
 * Rule: if every set last time was completed and the heaviest one reached the target reps,
 * add one step; otherwise repeat the load. Bodyweight (0 kg) stays at 0.
 */
export function suggestLoad(data: LastSession | undefined, targetReps?: number): LoadSuggestion | null {
  const last = data?.lastSession
  if (!last) return null
  const { weightKg, reps } = last.suggestion
  const allDone = last.sets.every((s) => s.completed)
  const hitTarget = targetReps == null || reps >= targetReps
  const progress = weightKg > 0 && allDone && hitTarget
  return { weightKg: progress ? weightKg + LOAD_STEP_KG : weightKg, last: { weightKg, reps } }
}
