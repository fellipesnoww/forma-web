import { ApiError } from '@/shared/api/client'

/**
 * Turns the backend's `performedAt` validation (future date, or older than `RETROACTIVE_MAX_DAYS`)
 * into copy the user can act on. Returns null for any other error, so callers keep their fallback.
 * The client already blocks future dates; this is the safety net for clock skew and server limits.
 */
export function performedAtErrorMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null
  const text = `${err.message} ${JSON.stringify(err.details ?? '')}`
  if (!text.includes('performedAt')) return null
  if (text.includes('futuro')) return 'Essa data está no futuro. Escolha hoje ou um dia anterior.'
  const limit = text.match(/anterior a (\d+) dias/)
  if (limit) return `Só é possível lançar registros dos últimos ${limit[1]} dias.`
  return 'Essa data não pode receber registros. Escolha outro dia.'
}
