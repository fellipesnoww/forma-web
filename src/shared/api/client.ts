import { tokenStorage } from '@/shared/auth/tokenStorage'

const BASE_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  json?: unknown
  skipAuth?: boolean
  /** internal: prevents infinite refresh loops */
  _retried?: boolean
}

let refreshInFlight: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) throw new ApiError(401, 'UNAUTHORIZED', 'No refresh token')

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError(res.status, 'UNAUTHORIZED', 'Refresh failed')
        const data = (await res.json()) as { accessToken: string }
        tokenStorage.setAccess(data.accessToken)
        return data.accessToken
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { json, skipAuth, _retried, headers, ...rest } = opts

  const finalHeaders = new Headers(headers)
  if (json !== undefined) finalHeaders.set('content-type', 'application/json')
  if (!skipAuth) {
    const accessToken = tokenStorage.getAccess()
    if (accessToken) finalHeaders.set('authorization', `Bearer ${accessToken}`)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })

  if (res.status === 204) return undefined as T

  if (res.status === 401 && !skipAuth && !_retried) {
    try {
      await refreshAccessToken()
      return apiFetch<T>(path, { ...opts, _retried: true })
    } catch {
      tokenStorage.clear()
      window.dispatchEvent(new Event('forma:session-expired'))
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired')
    }
  }

  const contentType = res.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await res.json() : undefined

  if (!res.ok) {
    const err = body?.error ?? { code: 'UNKNOWN', message: res.statusText }
    throw new ApiError(res.status, err.code, err.message, err.details)
  }

  return body as T
}
