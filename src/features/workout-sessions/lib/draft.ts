import type { SheetDay } from '@/features/workout-sheets'
import type { SessionExerciseInput, WorkoutSession } from '@/features/workout-sessions/api'

/**
 * Local copy of an in-progress session. It's the source of truth while the workout runs —
 * the server copy is synced from it, so a dropped connection never loses a set.
 */
export interface DraftSet {
  reps: number
  weightKg: number
  completed: boolean
}

export interface DraftExercise {
  key: string
  exerciseId?: string
  customExerciseId?: string
  name: string
  targetReps?: number
  /** From the sheet; drives the rest timer. */
  restSeconds?: number
  /** The last-session load was already offered once, so a later edit to 0 kg isn't overwritten. */
  prefilled?: boolean
  sets: DraftSet[]
}

export interface SessionDraft {
  sheetId: string
  sheetName: string
  weekday: number
  startedAt: string
  /** Set once the first sync (`POST /workout-sessions`) succeeds. */
  sessionId?: string
  /** Backdated entry ("Lançar treino"): `startedAt` is in the past and the duration is typed in. */
  retroactive?: { durationMinutes: number }
  activeIndex: number
  exercises: DraftExercise[]
}

const DEFAULT_SETS = 3
/** Backdated drafts live under their own key, so logging a past workout never touches a live one. */
const storageKey = (sheetId: string, retroactive = false) =>
  `forma:session-draft:${sheetId}${retroactive ? ':retro' : ''}`

export const draftStorage = {
  load(sheetId: string, retroactive = false): SessionDraft | null {
    try {
      const raw = localStorage.getItem(storageKey(sheetId, retroactive))
      return raw ? (JSON.parse(raw) as SessionDraft) : null
    } catch {
      return null
    }
  },
  save(draft: SessionDraft) {
    try {
      localStorage.setItem(storageKey(draft.sheetId, !!draft.retroactive), JSON.stringify(draft))
    } catch {
      // Storage full/blocked: the server sync still runs, we just lose the offline copy.
    }
  },
  clear(sheetId: string, retroactive = false) {
    try {
      localStorage.removeItem(storageKey(sheetId, retroactive))
    } catch {
      // ignore
    }
  },
}

export function hasProgress(draft: SessionDraft) {
  return !!draft.sessionId || draft.exercises.some((ex) => ex.sets.some((s) => s.completed))
}

export function isExerciseDone(ex: DraftExercise) {
  return ex.sets.every((s) => s.completed)
}

export function buildDraft(sheetId: string, sheetName: string, day: SheetDay): SessionDraft {
  return {
    sheetId,
    sheetName,
    weekday: day.weekday,
    startedAt: new Date().toISOString(),
    activeIndex: 0,
    exercises: day.exercises
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ex) => ({
        key: ex.id,
        exerciseId: ex.exerciseId ?? undefined,
        customExerciseId: ex.customExerciseId ?? undefined,
        name: ex.name,
        targetReps: ex.targetReps ?? undefined,
        restSeconds: ex.defaultRestSeconds ?? undefined,
        sets: Array.from({ length: ex.targetSets ?? DEFAULT_SETS }, () => ({
          reps: ex.targetReps ?? 0,
          weightKg: 0,
          completed: false,
        })),
      })),
  }
}

/**
 * Rebuilds a draft from the server copy, for resuming a session this device has no local draft of.
 * The session payload doesn't say which sheet day it came from, so the weekday is the one it was performed on.
 */
export function sessionToDraft(session: WorkoutSession): SessionDraft {
  const exercises = session.exercises.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const firstOpen = exercises.findIndex((ex) => ex.sets.some((s) => !s.completed))
  return {
    sheetId: session.sheetId,
    sheetName: session.sheetName,
    weekday: new Date(session.performedAt).getDay(),
    startedAt: session.performedAt,
    sessionId: session.id,
    activeIndex: Math.max(0, firstOpen),
    exercises: exercises.map((ex) => ({
      key: ex.id,
      exerciseId: ex.exerciseId ?? undefined,
      customExerciseId: ex.customExerciseId ?? undefined,
      name: ex.name,
      sets: ex.sets
        .slice()
        .sort((a, b) => a.setNumber - b.setNumber)
        .map(({ reps, weightKg, completed }) => ({ reps, weightKg, completed })),
    })),
  }
}

export function draftToInput(draft: SessionDraft): SessionExerciseInput[] {
  return draft.exercises.map((ex, sortOrder) => ({
    exerciseId: ex.exerciseId,
    customExerciseId: ex.customExerciseId,
    sortOrder,
    sets: ex.sets.map((set, i) => ({ setNumber: i + 1, ...set })),
  }))
}
