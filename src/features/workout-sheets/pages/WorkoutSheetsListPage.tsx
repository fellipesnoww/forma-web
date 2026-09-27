import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/shared/ui/Spinner'
import { Card } from '@/shared/ui/Card'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { workoutSheetsApi } from '@/features/workout-sheets/api'
import { SheetCard } from '@/features/workout-sheets/components/SheetCard'

export function WorkoutSheetsListPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workout-sheets'],
    queryFn: workoutSheetsApi.list,
  })

  const remove = useMutation({
    mutationFn: (id: string) => workoutSheetsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-sheets'] })
      toast('Planilha excluída.', 'success')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Não foi possível excluir.', 'error'),
  })

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Planilhas</h1>
          <span className="text-sm font-semibold text-ink-400">{items.length} criadas</span>
        </div>
        <Link
          to="/app/sheets/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-500 px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(45,91,255,0.28)] hover:bg-primary-600"
        >
          <Plus size={16} />
          Nova planilha
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-ink-400">Não foi possível carregar as planilhas.</p>}
      {!isLoading && !isError && items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-bold text-ink-900">Nenhuma planilha ainda</p>
          <p className="max-w-xs text-sm text-ink-500">
            Crie sua primeira planilha e organize os exercícios por dia da semana.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((sheet) => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            onDelete={() => {
              if (window.confirm(`Excluir "${sheet.name}"?`)) remove.mutate(sheet.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
