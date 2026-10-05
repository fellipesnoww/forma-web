import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Spinner } from '@/shared/ui/Spinner'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** CSS grid track for desktop, e.g. `minmax(0,2fr)` or `60px`. */
  width?: string
  align?: 'left' | 'right'
  /**
   * Below `md` rows become cards: `primary` cells fill the first line, `meta` cells wrap under it,
   * `hidden` cells are dropped. Defaults to `meta`.
   */
  mobile?: 'primary' | 'meta' | 'hidden'
}

export interface Pagination {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Accessible name for the table (also used by tests). */
  label: string
  loading?: boolean
  error?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
  rowClassName?: (row: T) => string | undefined
  pagination?: Pagination
  /** Rendered above the header row, inside the card. */
  title?: ReactNode
  className?: string
}

/**
 * Generic admin table (3.1): CSS-grid rows on desktop, stacked cards on mobile, server-side pagination.
 * Search and filters live outside (see `ListToolbar`) and drive the query that feeds `rows`.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  label,
  loading,
  error,
  emptyMessage = 'Nada encontrado.',
  onRowClick,
  selectedKey,
  rowClassName,
  pagination,
  title,
  className,
}: DataTableProps<T>) {
  // One layout in the DOM at a time (not CSS-hidden twins), so text and controls aren't duplicated.
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const template = columns.map((c) => c.width ?? 'minmax(0,1fr)').join(' ')
  const primary = columns.filter((c) => c.mobile === 'primary')
  const meta = columns.filter((c) => (c.mobile ?? 'meta') === 'meta')

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div role="table" aria-label={label} className="overflow-hidden rounded-[20px] border border-border bg-surface">
        {title}
        {isDesktop && (
          <div
            role="row"
            className="grid items-center gap-3 border-b border-surface-sunken px-[18px] py-3 text-[11.5px] font-bold tracking-[0.4px] text-ink-200 uppercase"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} role="columnheader" className={cn(c.align === 'right' && 'text-right')}>
                {c.header}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
        {!loading && error && (
          <p className="px-5 py-10 text-center text-sm text-ink-400">Não foi possível carregar os dados.</p>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-400">{emptyMessage}</p>
        )}

        {!loading &&
          !error &&
          rows.map((row) => {
            const key = rowKey(row)
            const clickable = !!onRowClick
            return (
              <div
                key={key}
                role="row"
                aria-selected={selectedKey ? selectedKey === key : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-surface-soft last:border-b-0',
                  clickable && 'cursor-pointer hover:bg-surface-soft/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500',
                  selectedKey === key && 'bg-primary-50/60 hover:bg-primary-50/60',
                  rowClassName?.(row),
                )}
              >
                {isDesktop ? (
                  <div className="grid items-center gap-3 px-[18px] py-3" style={{ gridTemplateColumns: template }}>
                    {columns.map((c) => (
                      <div key={c.key} role="cell" className={cn('min-w-0', c.align === 'right' && 'flex justify-end')}>
                        {c.cell(row)}
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="flex flex-col gap-2 px-4 py-3.5">
                  {primary.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      {primary.map((c) => (
                        <div key={c.key} className={cn('min-w-0', c.align === 'right' ? 'shrink-0' : 'flex-1')}>
                          {c.cell(row)}
                        </div>
                      ))}
                    </div>
                  )}
                  {meta.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                      {meta.map((c) => (
                        <div key={c.key} className="min-w-0">
                          {c.cell(row)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </div>
            )
          })}
      </div>

      {pagination && <PaginationBar {...pagination} />}
    </div>
  )
}

export function PaginationBar({ page, total, limit, onPageChange }: Pagination) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-sm font-bold text-ink-700 disabled:opacity-40"
      >
        <ChevronLeft size={16} />
        Anterior
      </button>
      <span className="text-sm font-semibold text-ink-400">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-sm font-bold text-ink-700 disabled:opacity-40"
      >
        Próxima
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
