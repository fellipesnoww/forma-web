import { useQueries, useQuery } from '@tanstack/react-query'
import { nextOccurrence, workoutSheetsApi, type WorkoutSheet } from '@/features/workout-sheets'

/** The sheet scheduled soonest (today first), with its day. */
export function useNextWorkout() {
  const { data: list, isLoading } = useQuery({ queryKey: ['workout-sheets'], queryFn: workoutSheetsApi.list })
  const details = useQueries({
    queries: (list?.items ?? []).map((s) => ({
      queryKey: ['workout-sheets', s.id],
      queryFn: () => workoutSheetsApi.get(s.id),
    })),
  })
  const sheets = details.flatMap((q) => (q.data ? [q.data] : []))
  let best: { sheet: WorkoutSheet; next: NonNullable<ReturnType<typeof nextOccurrence>> } | null = null
  for (const sheet of sheets) {
    const next = nextOccurrence(sheet)
    if (next && (!best || next.offset < best.next.offset)) best = { sheet, next }
  }
  const loading = isLoading || details.some((q) => q.isLoading)
  return { workout: best, loading, hasSheets: (list?.items.length ?? 0) > 0 }
}
