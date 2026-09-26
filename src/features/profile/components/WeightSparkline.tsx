import type { Measurement } from '@/features/profile/schemas'

export function WeightSparkline({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length < 2) {
    return <p className="text-sm text-ink-400">Registre pelo menos 2 medidas para ver o gráfico.</p>
  }

  const weights = measurements.map((m) => m.weightKg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const width = 280
  const height = 64
  const step = width / (weights.length - 1)

  const points = weights
    .map((w, i) => `${i * step},${height - ((w - min) / range) * (height - 8) - 4}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full text-primary-500">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
