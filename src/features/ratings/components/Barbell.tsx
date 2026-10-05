import type { RatingRank } from '@/features/ratings/api'

type Rect = [x: number, y: number, w: number, h: number]

const CENTER: Rect = [33, 19, 22, 6]

/** Bar length and plates per score, straight from the design: more plates = higher score. */
const SHAPES: Record<RatingRank, { bar: [x: number, w: number]; plates: Rect[] }> = {
  1: { bar: [22, 44], plates: [[26, 15, 6, 14], [56, 15, 6, 14]] },
  2: { bar: [22, 44], plates: [[26, 11, 6, 22], [56, 11, 6, 22]] },
  3: {
    bar: [15, 58],
    plates: [[26, 8, 6, 28], [56, 8, 6, 28], [19, 13, 6, 18], [63, 13, 6, 18]],
  },
  4: {
    bar: [15, 58],
    plates: [[26, 5, 6, 34], [56, 5, 6, 34], [19, 9, 6, 26], [63, 9, 6, 26]],
  },
  5: {
    bar: [8, 72],
    plates: [
      [26, 2, 6, 40],
      [56, 2, 6, 40],
      [19, 6, 6, 32],
      [63, 6, 6, 32],
      [12, 11, 6, 22],
      [70, 11, 6, 22],
    ],
  },
}

/** Sized by `className` (aspect 2:1); defaults to the design's 88×44. */
export function Barbell({ rank, className = 'h-11 w-[88px]' }: { rank: RatingRank; className?: string }) {
  const { bar, plates } = SHAPES[rank]
  return (
    <svg viewBox="0 0 88 44" fill="currentColor" aria-hidden className={className}>
      <rect x={bar[0]} y={20.5} width={bar[1]} height={3} rx={1.5} />
      <rect x={CENTER[0]} y={CENTER[1]} width={CENTER[2]} height={CENTER[3]} rx={3} opacity={0.55} />
      {plates.map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={2} />
      ))}
    </svg>
  )
}
