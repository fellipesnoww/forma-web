import { Link } from 'react-router-dom'
import { Pencil, Play, Trash2 } from 'lucide-react'
import type { WorkoutSheetSummary } from '@/features/workout-sheets/api'

export function SheetCard({ sheet, onDelete }: { sheet: WorkoutSheetSummary; onDelete: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-5">
      <div>
        <p className="text-lg font-extrabold tracking-tight text-ink-900">{sheet.name}</p>
        <p className="mt-0.5 text-xs font-semibold text-ink-400">
          Atualizada em {new Date(sheet.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <div className="flex gap-2 border-t border-border pt-4">
        <Link
          to={`/app/sheets/${sheet.id}/run`}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-50 text-sm font-bold text-primary-500"
        >
          <Play size={13} fill="currentColor" />
          Iniciar
        </Link>
        <Link
          to={`/app/sheets/${sheet.id}`}
          aria-label="Editar planilha"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-ink-600"
        >
          <Pencil size={16} />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir planilha"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50 text-danger-500"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
