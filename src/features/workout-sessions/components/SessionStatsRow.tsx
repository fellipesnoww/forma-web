import { formatKg, type SessionStats } from '@/features/workout-sessions/lib/format'

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[18px] border border-border bg-surface p-4">
      <p className="text-[12.5px] font-semibold text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-900">
        {value}
        {unit && <span className="ml-1 text-[13px] text-ink-200">{unit}</span>}
      </p>
    </div>
  )
}

export function SessionStatsRow({ stats }: { stats: SessionStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5">
      <Stat label="Duração" value={String(stats.durationMin)} unit="min" />
      <Stat label="Exercícios" value={String(stats.exercisesDone)} unit={`/${stats.exercisesTotal}`} />
      <Stat label="Séries" value={String(stats.setsDone)} />
      <Stat label="Carga total" value={formatKg(stats.volumeKg)} unit="kg" />
    </div>
  )
}
