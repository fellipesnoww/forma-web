import { cn } from '@/shared/lib/cn'
import type { RatingRank } from '@/features/ratings/api'
import { RANKS, RANK_TONE } from '@/features/ratings/lib/rank'

const HEIGHTS = ['h-[9px]', 'h-[12px]', 'h-[15px]', 'h-[18px]', 'h-[21px]']

/** Score badge + five rising bars filled up to the score (design: admin ratings table). */
export function RankBars({ rank }: { rank: RatingRank }) {
  const tone = RANK_TONE[rank]
  return (
    <div className="flex items-center gap-2.5" aria-label={`Nota ${rank} de 5`} role="img">
      <span
        className={cn('flex h-7 w-7 items-center justify-center rounded-[9px] text-sm font-extrabold', tone.badge)}
      >
        {rank}
      </span>
      <span className="flex h-[21px] items-end gap-0.5" aria-hidden>
        {RANKS.map((n, i) => (
          <span key={n} className={cn('w-[5px] rounded-[2px]', HEIGHTS[i], n <= rank ? tone.bar : 'bg-border-strong')} />
        ))}
      </span>
    </div>
  )
}
