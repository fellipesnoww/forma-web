import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * List state (search, filters, page) kept in the URL so admin lists are linkable and survive reloads.
 * `prefix` lets two lists share one page (e.g. `c.page` and `a.page` on the gamification screen).
 * Changing any filter goes back to page 1.
 */
export function useListParams(prefix = '') {
  const [params, setParams] = useSearchParams()
  const key = (name: string) => (prefix ? `${prefix}.${name}` : name)

  const get = (name: string) => params.get(key(name)) ?? ''
  const page = Math.max(1, Number(params.get(key('page'))) || 1)

  const set = useCallback(
    (values: Record<string, string | undefined>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [name, value] of Object.entries(values)) {
            const k = prefix ? `${prefix}.${name}` : name
            if (value) next.set(k, value)
            else next.delete(k)
          }
          if (!('page' in values)) next.delete(prefix ? `${prefix}.page` : 'page')
          return next
        },
        { replace: true },
      ),
    [prefix, setParams],
  )

  return { get, page, set, setPage: (p: number) => set({ page: p > 1 ? String(p) : undefined }) }
}
