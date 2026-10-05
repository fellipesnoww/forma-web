import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatMonth, formatNumber, formatShortDate } from '@/features/progress/lib/format'

export interface ChartPoint {
  /** YYYY-MM-DD or ISO datetime; also the tooltip/table label. */
  date: string
  value: number
}

interface Props {
  points: ChartPoint[]
  /** Inclusive range the x axis spans, YYYY-MM-DD. */
  from: string
  to: string
  unit: string
  /** Names the series for screen readers and the table view. */
  label: string
  height?: number
}

const PAD = { top: 16, right: 16, bottom: 28, left: 44 }
const Y_TICKS = 4

const toTime = (date: string) => (date.length === 10 ? Date.parse(`${date}T12:00:00`) : Date.parse(date))

/** A "nice" step (1, 2, 2.5, 5 × 10ⁿ) so gridlines land on round numbers. */
function niceStep(span: number, ticks: number) {
  const raw = span / ticks || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
}

/** x ticks: month starts for long ranges, ~5 evenly spaced days for short ones. */
function xTicks(fromTs: number, toTs: number) {
  const days = (toTs - fromTs) / 86_400_000
  const ticks: { ts: number; label: string }[] = []
  if (days > 45) {
    const d = new Date(fromTs)
    d.setDate(1)
    d.setHours(12, 0, 0, 0)
    if (d.getTime() < fromTs) d.setMonth(d.getMonth() + 1)
    while (d.getTime() <= toTs) {
      ticks.push({ ts: d.getTime(), label: formatMonth(d.toISOString()) })
      d.setMonth(d.getMonth() + 1)
    }
  } else {
    const count = 5
    for (let i = 0; i < count; i++) {
      const ts = fromTs + ((toTs - fromTs) * i) / (count - 1)
      ticks.push({ ts, label: formatShortDate(new Date(ts).toISOString()) })
    }
  }
  return ticks
}

/**
 * Single-series line chart, sized by its container (no horizontal overflow on phones).
 * Hover/touch/arrow keys move a crosshair that snaps to the nearest point; a hidden table
 * carries every value for screen readers.
 */
export function LineChart({ points, from, to, unit, label, height = 260 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // Tied to the series it was set on: a new series (exercise/period change) starts with no selection.
  const [selection, setSelection] = useState<{ points: ChartPoint[]; index: number } | null>(null)
  const active = selection?.points === points ? selection.index : null
  const setActive = (update: number | null | ((i: number | null) => number | null)) => {
    const index = typeof update === 'function' ? update(active) : update
    setSelection(index == null ? null : { points, index })
  }
  const gradientId = useId()

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fromTs = toTime(from)
  const toTs = Math.max(toTime(to), fromTs + 86_400_000)
  const values = points.map((p) => p.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const step = niceStep((rawMax - rawMin) * 1.2 || Math.abs(rawMax) || 1, Y_TICKS)
  const yMin = Math.max(0, Math.floor((rawMin - step * 0.5) / step) * step)
  const yMax = Math.ceil((rawMax + step * 0.5) / step) * step

  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = height - PAD.top - PAD.bottom
  const x = (ts: number) => PAD.left + ((ts - fromTs) / (toTs - fromTs)) * innerW
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH

  const coords = points.map((p) => ({ x: x(toTime(p.date)), y: y(p.value) }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const baseline = PAD.top + innerH
  const area = coords.length ? `${path} L${coords[coords.length - 1].x},${baseline} L${coords[0].x},${baseline} Z` : ''
  const gridValues = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step)

  const nearest = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    const px = clientX - rect.left
    let best = 0
    for (let i = 1; i < coords.length; i++) {
      if (Math.abs(coords[i].x - px) < Math.abs(coords[best].x - px)) best = i
    }
    return best
  }

  const onPointer = (e: PointerEvent) => coords.length && setActive(nearest(e.clientX))
  const onKey = (e: KeyboardEvent) => {
    if (!coords.length) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const delta = e.key === 'ArrowRight' ? 1 : -1
      setActive((i) => Math.min(coords.length - 1, Math.max(0, (i ?? (delta > 0 ? -1 : coords.length)) + delta)))
    }
    if (e.key === 'Escape') setActive(null)
  }

  const activePoint = active != null ? points[active] : null
  const activeCoord = active != null ? coords[active] : null

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label}: ${points.length} pontos. Use as setas para navegar.`}
          tabIndex={0}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className="block touch-pan-y focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          {gridValues.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-surface-sunken)" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-ink-200 text-[11px] font-semibold">
                {formatNumber(v)}
              </text>
            </g>
          ))}
          {xTicks(fromTs, toTs).map((t) => (
            <text
              key={t.ts}
              x={x(t.ts)}
              y={height - 8}
              textAnchor="middle"
              className="fill-ink-200 text-[11px] font-semibold"
            >
              {t.label}
            </text>
          ))}

          {activeCoord && (
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="var(--color-ink-100)"
              strokeWidth={1}
            />
          )}

          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2D5BFF" stopOpacity={0.16} />
              <stop offset="1" stopColor="#2D5BFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke="#2D5BFF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === active ? 6 : 4}
              fill="#2D5BFF"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          ))}
          {/* Direct label on the latest value only (the headline); the rest live in the tooltip/table. */}
          {active == null && coords.length > 0 && (
            <text
              x={Math.min(coords[coords.length - 1].x, width - PAD.right - 4)}
              y={coords[coords.length - 1].y - 12}
              textAnchor="end"
              className="fill-ink-900 text-[12px] font-extrabold"
            >
              {formatNumber(points[points.length - 1].value)} {unit}
            </text>
          )}
        </svg>
      )}

      {activePoint && activeCoord && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink-900 px-2.5 py-1.5 text-center whitespace-nowrap shadow-lg"
          style={{
            left: Math.min(Math.max(activeCoord.x, 60), width - 60),
            top: Math.max(activeCoord.y - 10, 44),
          }}
        >
          <p className="text-sm font-extrabold text-white tabular-nums">
            {formatNumber(activePoint.value)} {unit}
          </p>
          <p className="text-[11px] font-semibold text-ink-200">{formatShortDate(activePoint.date)}</p>
        </div>
      )}

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Valor ({unit})</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{formatShortDate(p.date)}</td>
              <td>{formatNumber(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
