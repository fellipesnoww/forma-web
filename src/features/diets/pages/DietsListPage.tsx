import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/shared/ui/Card'
import { Spinner } from '@/shared/ui/Spinner'
import { useToast } from '@/shared/ui/Toast'
import { ApiError } from '@/shared/api/client'
import { dietsApi } from '@/features/diets/api'
import { DietCard } from '@/features/diets/components/DietCard'

export function DietsListPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({ queryKey: ['diets'], queryFn: dietsApi.list })

  const errorToast = (fallback: string) => (err: unknown) =>
    toast(err instanceof ApiError ? err.message : fallback, 'error')

  const activate = useMutation({
    mutationFn: dietsApi.activate,
    onSuccess: (diet) => {
      queryClient.invalidateQueries({ queryKey: ['diets'] })
      toast(`${diet.name} é a dieta ativa agora.`, 'success')
    },
    onError: errorToast('Não foi possível ativar a dieta.'),
  })

  const remove = useMutation({
    mutationFn: dietsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diets'] })
      toast('Dieta excluída.', 'success')
    },
    onError: errorToast('Não foi possível excluir a dieta.'),
  })

  const items = data?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Dietas</h1>
          {data && <span className="text-sm font-semibold text-ink-400">{items.length} {items.length === 1 ? 'criada' : 'criadas'}</span>}
        </div>
        <Link
          to="/app/diets/new"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(45,91,255,0.28)] hover:bg-primary-600 sm:h-10"
        >
          <Plus size={16} />
          Nova dieta
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-ink-400">Não foi possível carregar as dietas.</p>}
      {data && items.length === 0 && (
        <Card className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="font-bold text-ink-900">Nenhuma dieta ainda</p>
          <p className="max-w-xs text-sm text-ink-500">
            Monte suas refeições com horários, alimentos e calorias. A IA ajuda a estimar as calorias.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-[18px] xl:grid-cols-3">
        {items.map((diet) => (
          <DietCard
            key={diet.id}
            diet={diet}
            activating={activate.isPending && activate.variables === diet.id}
            onActivate={() => activate.mutate(diet.id)}
            onDelete={() => {
              if (window.confirm(`Excluir "${diet.name}"?`)) remove.mutate(diet.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
