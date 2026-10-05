import { Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { describeCounts, formatKcal } from '@/features/diets/lib/format'
import { draftTotals, mealKcal, type DietDraft } from '@/features/diets/lib/editor'

interface Props {
  draft: DietDraft
  active: boolean
  onToggleActive: () => void
  /** Another diet is active now and would be switched off. */
  replacesActive: string | null
}

/** Right rail: total, "Dieta ativa" switch and the per-meal breakdown (bars share one scale: the biggest meal). */
export function EditorSummary({ draft, active, onToggleActive, replacesActive }: Props) {
  const totals = draftTotals(draft)
  const meals = draft.meals
    .map((m) => ({ key: m.key, name: m.name.trim() || 'Sem nome', time: m.time, kcal: mealKcal(m) }))
    .sort((a, b) => a.time.localeCompare(b.time))
  const biggest = Math.max(...meals.map((m) => m.kcal), 1)

  const hint = active
    ? 'Aparece no início com a próxima refeição'
    : replacesActive
      ? `Ativar substitui "${replacesActive}"`
      : 'Ative para acompanhar no início'

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Total aproximado"
        className="rounded-[20px] bg-[linear-gradient(135deg,#2D5BFF,#4E78FF)] p-5 text-white shadow-[0_14px_28px_rgba(45,91,255,0.26)]"
      >
        <p className="text-xs font-extrabold tracking-[0.8px] text-white/85">TOTAL APROXIMADO</p>
        <p className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[34px] font-extrabold tracking-[-1px] tabular-nums sm:text-[38px]">≈ {formatKcal(totals.kcal)}</span>
          <span className="text-[15px] font-bold">kcal / dia</span>
        </p>
        <p className="mt-1 text-[12.5px] font-semibold text-white/88">{describeCounts(totals.mealCount, totals.foodCount)}</p>
      </section>

      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={onToggleActive}
        className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 text-left"
      >
        <span className="flex-1">
          <span className="block text-sm font-extrabold text-ink-900">Dieta ativa</span>
          <span className="mt-0.5 block text-xs font-semibold text-ink-400">{hint}</span>
        </span>
        <span className={cn('flex h-6 w-11 shrink-0 items-center rounded-full p-0.5', active ? 'bg-success-500' : 'bg-[#D5D9E2]')}>
          <span className={cn('h-5 w-5 rounded-full bg-white shadow-sm transition-transform', active && 'translate-x-5')} />
        </span>
      </button>

      {meals.length > 0 && (
        <section aria-label="Por refeição">
          <h2 className="text-[15px] font-extrabold text-ink-900">Por refeição</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {meals.map((m) => (
              <li key={m.key}>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-[42px] font-extrabold text-ink-600 tabular-nums">{m.time || '--:--'}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{m.name}</span>
                  <span className="font-extrabold text-ink-900 tabular-nums">{formatKcal(m.kcal)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F0F2F6]">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${(m.kcal / biggest) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-start gap-2.5 rounded-[14px] bg-[#F7F3FF] px-3.5 py-3 text-[12.5px] leading-[1.45] font-semibold text-[#5B2BB5]">
        <Sparkles size={16} className="mt-px shrink-0" fill="currentColor" />
        O botão IA estima as calorias pelo nome e quantidade do alimento. Valores aproximados — revise antes de salvar.
      </p>
    </div>
  )
}
