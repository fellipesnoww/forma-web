import type { RatingRank } from '@/features/ratings/api'

export const RANKS: RatingRank[] = [1, 2, 3, 4, 5]

export const OBSERVATION_MAX = 2000

/** Each score is a heavier barbell (design: "do mais leve ao mais pesado"). */
export const RANK_INFO: Record<RatingRank, { label: string; weight: string }> = {
  1: { label: 'Ruim', weight: '2 kg' },
  2: { label: 'Fraco', weight: '6 kg' },
  3: { label: 'Ok', weight: '12 kg' },
  4: { label: 'Bom', weight: '20 kg' },
  5: { label: 'Muito bom', weight: '32 kg' },
}

/** Badge colors for a score in the admin list: red → amber → green. */
export const RANK_TONE: Record<RatingRank, { badge: string; bar: string }> = {
  1: { badge: 'bg-danger-50 text-danger-500', bar: 'bg-danger-500' },
  2: { badge: 'bg-danger-50 text-danger-500', bar: 'bg-danger-500' },
  3: { badge: 'bg-warning-50 text-warning-700', bar: 'bg-warning-500' },
  4: { badge: 'bg-success-50 text-success-600', bar: 'bg-success-500' },
  5: { badge: 'bg-success-50 text-success-600', bar: 'bg-success-500' },
}
