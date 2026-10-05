import { useCallback, useEffect, useState } from 'react'

/** Used when the sheet has no `defaultRestSeconds` for the exercise. */
export const DEFAULT_REST_SECONDS = 90

type TimerState =
  | { status: 'idle' }
  | { status: 'running'; total: number; endsAt: number }
  | { status: 'paused'; total: number; remainingMs: number }

export interface RestTimer {
  status: TimerState['status']
  /** Seconds left, rounded up (shows 0:01 until it really ends). */
  remaining: number
  total: number
  finished: boolean
  start: (seconds: number) => void
  adjust: (deltaSeconds: number) => void
  togglePause: () => void
  stop: () => void
}

/**
 * Countdown between sets. Wall-clock based (`Date.now()`), so a backgrounded tab that throttles
 * timers still shows the right value when it comes back.
 */
export function useRestTimer(): RestTimer {
  const [state, setState] = useState<TimerState>({ status: 'idle' })
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (state.status !== 'running') return
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [state.status])

  const remainingMs =
    state.status === 'running' ? Math.max(0, state.endsAt - now) : state.status === 'paused' ? state.remainingMs : 0

  useEffect(() => {
    if (state.status !== 'running' || remainingMs > 0) return
    setState({ status: 'idle' })
    setFinished(true)
    navigator.vibrate?.([200, 100, 200])
  }, [state.status, remainingMs])

  const start = useCallback((seconds: number) => {
    const at = Date.now()
    setNow(at)
    setFinished(false)
    setState({ status: 'running', total: seconds, endsAt: at + seconds * 1000 })
  }, [])

  const adjust = useCallback((delta: number) => {
    setState((s) => {
      if (s.status === 'running') {
        const endsAt = Math.max(Date.now(), s.endsAt + delta * 1000)
        return { ...s, endsAt, total: Math.max(0, s.total + delta) }
      }
      if (s.status === 'paused') {
        return { ...s, remainingMs: Math.max(0, s.remainingMs + delta * 1000), total: Math.max(0, s.total + delta) }
      }
      return s
    })
  }, [])

  const togglePause = useCallback(() => {
    setState((s) => {
      if (s.status === 'running') return { status: 'paused', total: s.total, remainingMs: Math.max(0, s.endsAt - Date.now()) }
      if (s.status === 'paused') {
        const at = Date.now()
        setNow(at)
        return { status: 'running', total: s.total, endsAt: at + s.remainingMs }
      }
      return s
    })
  }, [])

  const stop = useCallback(() => {
    setFinished(false)
    setState({ status: 'idle' })
  }, [])

  return {
    status: state.status,
    remaining: Math.ceil(remainingMs / 1000),
    total: state.status === 'idle' ? 0 : state.total,
    finished,
    start,
    adjust,
    togglePause,
    stop,
  }
}
