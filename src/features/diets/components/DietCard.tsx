import { Link } from 'react-router-dom'
import { Pencil, Power, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { DietSummary } from '@/features/diets/api'
import { describeCounts, formatKcal } from '@/features/diets/lib/format'

interface Props {
  diet: DietSummary
  onActivate: () => void
  onDelete: () => void
  activating?: boolean
}

export function DietCard({ diet, onActivate, onDelete, activating }: Props) {
  const meals = diet.meals.slice().sort((a, b) => a.time.localeCompare(b.time))

  return (
    <article
      aria-label={diet.name}
      className={cn(
        'flex flex-col rounded-[22px] bg-surface p-5 sm:p-[22px]',
        diet.isActive ? 'border-2 border-primary-500 shadow-[0_10px_24px_rgba(45,91,255,0.10)]' : 'border border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {diet.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-[11.5px] font-extrabold text-success-600">
            <span className="h-[7px] w-[7px] rounded-full bg-success-500" />
            Ativa agora
          </span>
        ) : (
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-[11.5px] font-extrabold text-ink-600">Inativa</span>
        )}
        {diet.goal && <span className="truncate text-xs font-bold text-ink-400">{diet.goal}</span>}
      </div>

      <h2 className="mt-3.5 text-[19px] font-extrabold tracking-tight text-ink-900">{diet.name}</h2>
      <p className="mt-1 text-[13px] font-semibold text-ink-400">{describeCounts(diet.mealCount, diet.foodCount)}</p>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[30px] font-extrabold tracking-[-0.8px] text-ink-900 tabular-nums">≈ {formatKcal(diet.totalKcal)}</span>
        <span className="text-[13px] font-bold text-ink-200">kcal / dia</span>
      </p>

      {meals.length > 0 && (
        <ul className="mt-3.5 flex flex-col border-t border-surface-sunken pt-2.5" aria-label="Refeições">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center gap-2.5 py-[5px] text-[13px]">
              <span className="w-[42px] font-extrabold text-ink-600 tabular-nums">{meal.time}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-700">{meal.name}</span>
              <span className="text-xs font-bold text-ink-200 tabular-nums">{formatKcal(meal.totalKcal)} kcal</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <div className="flex gap-2 border-t border-surface-sunken pt-4">
          {diet.isActive ? (
            <Link
              to={`/app/diets/${diet.id}`}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-primary-500 text-[13px] font-bold text-white sm:h-10"
            >
              <Pencil size={14} />
              Editar dieta
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onActivate}
                disabled={activating}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-primary-50 text-[13px] font-bold text-primary-500 disabled:opacity-60 sm:h-10"
              >
                <Power size={14} />
                Ativar dieta
              </button>
              <Link
                to={`/app/diets/${diet.id}`}
                aria-label="Editar dieta"
                className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface-soft text-ink-600 sm:h-10 sm:w-10"
              >
                <Pencil size={16} />
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir dieta"
            className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-danger-50 text-danger-500 sm:h-10 sm:w-10"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}
