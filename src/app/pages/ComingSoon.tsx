import { Construction } from 'lucide-react'
import { Card } from '@/shared/ui/Card'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
          <Construction size={22} />
        </div>
        <p className="font-bold text-ink-900">Aguardando o backend</p>
        <p className="max-w-xs text-sm text-ink-500">
          Essa área depende de endpoints que ainda não existem no servidor (ver roadmap-backend.md).
        </p>
      </Card>
    </div>
  )
}
