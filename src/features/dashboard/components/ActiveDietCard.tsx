import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Apple, ChevronRight } from 'lucide-react'
import { dietsApi, formatKcal, nextMeal } from '@/features/diets'

/**
 * "Dieta ativa · próxima refeição". The list route carries the same summary as `/auth/me`'s
 * `activeDiet` and shares the `['diets']` cache with the diet screens, so edits show up here at once.
 */
export function ActiveDietCard() {
  const { data } = useQuery({ queryKey: ['diets'], queryFn: dietsApi.list })
  if (!data) return null
  const diet = data.items.find((d) => d.isActive)

  if (!diet) {
    return (
      <Link to="/app/diets" className="flex items-center gap-2.5 rounded-[20px] border border-border bg-white p-[18px]">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0F2F6] text-ink-200">
          <Apple size={17} />
        </span>
        <span className="flex-1">
          <span className="block text-[11px] font-extrabold tracking-[0.6px] text-ink-200">DIETA</span>
          <span className="block text-sm font-bold text-ink-600">Nenhuma dieta ativa</span>
        </span>
        <ChevronRight size={16} className="text-ink-200" />
      </Link>
    )
  }

  const next = nextMeal(diet.meals)
  return (
    <Link
      to={`/app/diets/${diet.id}`}
      aria-label={`Dieta ativa: ${diet.name}`}
      className="block rounded-[20px] border border-border bg-white p-[18px] transition-shadow hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-[9px]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-success-50 text-success-600">
            <Apple size={17} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.6px] text-success-600">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              DIETA ATIVA
            </p>
            <p className="truncate text-[14.5px] font-extrabold text-ink-900">{diet.name}</p>
          </div>
        </div>
        <p className="text-xs font-extrabold whitespace-nowrap text-ink-700">
          ≈ {formatKcal(diet.totalKcal)}
          <span className="text-ink-200"> kcal</span>
        </p>
      </div>
      {next && (
        <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-surface-muted px-3 py-[9px]">
          <span className="rounded-lg border border-border bg-white px-2 py-1 text-xs font-extrabold text-ink-700 tabular-nums">
            {next.time}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-ink-400">Próxima refeição</p>
            <p className="truncate text-[13px] font-bold text-ink-900">{next.name}</p>
          </div>
          <ChevronRight size={16} className="text-ink-200" />
        </div>
      )}
    </Link>
  )
}
