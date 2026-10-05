import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/api/client'
import { performedAtErrorMessage } from '@/shared/api/performedAtError'
import type { SheetDay } from '@/features/workout-sheets'
import { workoutSessionsApi } from '@/features/workout-sessions/api'
import {
  buildDraft,
  draftStorage,
  draftToInput,
  hasProgress,
  type DraftSet,
  type SessionDraft,
} from '@/features/workout-sessions/lib/draft'

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

const SYNC_DEBOUNCE_MS = 800

/**
 * Runs a workout against a local draft (persisted to localStorage on every change) and
 * mirrors it to the server in the background: `POST /workout-sessions` on the first
 * completed set, then `PATCH` with the full exercise list. A failed sync keeps the local
 * copy and retries on the next change, when the browser comes back online, or on `flush()`.
 */
export function useSessionRunner(initial: SessionDraft) {
  const [draft, setDraft] = useState(initial)
  const draftRef = useRef(initial)
  // A resumed draft may hold changes that never reached the server — sync it once on mount.
  const version = useRef(hasProgress(initial) ? 1 : 0)
  const syncedVersion = useRef(0)
  const chain = useRef<Promise<boolean>>(Promise.resolve(true))
  const [status, setStatus] = useState<SyncStatus>(initial.sessionId ? 'saved' : 'idle')
  const [syncError, setSyncErrorState] = useState<string | null>(null)
  const syncErrorRef = useRef<string | null>(null)
  const setSyncError = (message: string | null) => {
    syncErrorRef.current = message
    setSyncErrorState(message)
  }

  const commit = useCallback((next: SessionDraft, bump: boolean) => {
    draftRef.current = next
    if (bump) version.current += 1
    setDraft(next)
    draftStorage.save(next)
  }, [])

  const update = useCallback(
    (fn: (d: SessionDraft) => SessionDraft) => commit(fn(draftRef.current), true),
    [commit],
  )

  /** Loops until the server has the latest version, or a request fails. Never rejects. */
  const syncOnce = useCallback(async (): Promise<boolean> => {
    while (version.current !== syncedVersion.current) {
      const target = version.current
      const current = draftRef.current
      if (!hasProgress(current)) {
        syncedVersion.current = target
        continue
      }

      setStatus('saving')
      try {
        if (current.sessionId) {
          await workoutSessionsApi.update(current.sessionId, { exercises: draftToInput(current) })
        } else {
          const session = await workoutSessionsApi.create({
            sheetId: current.sheetId,
            performedAt: current.startedAt,
            durationMinutes: current.retroactive?.durationMinutes,
            exercises: draftToInput(current),
          })
          commit({ ...draftRef.current, sessionId: session.id }, false)
        }
        syncedVersion.current = target
        setSyncError(null)
      } catch (err) {
        // 4xx (other than auth/rate limit) won't fix itself on retry — surface it.
        if (err instanceof ApiError && err.status >= 400 && err.status < 500 && ![401, 429].includes(err.status)) {
          setStatus('error')
          setSyncError(performedAtErrorMessage(err) ?? err.message)
        } else {
          setStatus('offline')
        }
        return false
      }
    }
    if (hasProgress(draftRef.current)) setStatus('saved')
    return true
  }, [commit])

  /** Serialized: never two requests in flight, so the session is only POSTed once. */
  const flush = useCallback(() => {
    chain.current = chain.current.then(syncOnce)
    return chain.current
  }, [syncOnce])

  /** Pushes everything pending; the result reflects the state after the sync, not this render's. */
  const syncNow = useCallback(async () => {
    const ok = await flush()
    return { ok, sessionId: draftRef.current.sessionId, error: syncErrorRef.current }
  }, [flush])

  useEffect(() => {
    if (version.current === syncedVersion.current) return
    const timer = setTimeout(flush, SYNC_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, flush])

  useEffect(() => {
    const onOnline = () => void flush()
    const onHide = () => document.visibilityState === 'hidden' && void flush()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  const mapSets = (exIdx: number, fn: (sets: DraftSet[]) => DraftSet[]) =>
    update((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) => (i === exIdx ? { ...ex, sets: fn(ex.sets) } : ex)),
    }))

  const actions = {
    /** Offers the last-session load once per exercise: only sets still at 0 kg and not done get it. */
    prefill: (exIdx: number, weightKg: number) =>
      update((d) => ({
        ...d,
        exercises: d.exercises.map((ex, i) =>
          i === exIdx && !ex.prefilled
            ? {
                ...ex,
                prefilled: true,
                sets: ex.sets.map((s) => (!s.completed && s.weightKg === 0 ? { ...s, weightKg } : s)),
              }
            : ex,
        ),
      })),

    /** "Usar sugestão": sets the load on every set not done yet. */
    applyLoad: (exIdx: number, weightKg: number) =>
      mapSets(exIdx, (sets) => sets.map((s) => (s.completed ? s : { ...s, weightKg }))),

    setActive: (index: number) => update((d) => ({ ...d, activeIndex: index })),

    updateSet: (exIdx: number, setIdx: number, patch: Partial<DraftSet>) =>
      mapSets(exIdx, (sets) => sets.map((s, i) => (i === setIdx ? { ...s, ...patch } : s))),

    /** Completing a set carries its reps/load over to the next set if that one hasn't been given a load yet. */
    toggleSet: (exIdx: number, setIdx: number) =>
      mapSets(exIdx, (sets) => {
        const target = sets[setIdx]
        const completed = !target.completed
        return sets.map((s, i) => {
          if (i === setIdx) return { ...s, completed }
          if (completed && i === setIdx + 1 && !s.completed && s.weightKg === 0) {
            return { ...s, reps: target.reps, weightKg: target.weightKg }
          }
          return s
        })
      }),

    addSet: (exIdx: number) =>
      mapSets(exIdx, (sets) => {
        const last = sets[sets.length - 1]
        return [...sets, { reps: last?.reps ?? 0, weightKg: last?.weightKg ?? 0, completed: false }]
      }),

    /** The API requires ≥1 set per exercise. */
    removeLastSet: (exIdx: number) => mapSets(exIdx, (sets) => (sets.length > 1 ? sets.slice(0, -1) : sets)),

    /** Only before anything was recorded — after that the session is tied to this day's exercises. */
    switchDay: (day: SheetDay) => {
      if (hasProgress(draftRef.current)) return
      const d = draftRef.current
      commit(buildDraft(d.sheetId, d.sheetName, day), false)
    },
  }

  return { draft, status, syncError, syncNow, actions }
}
