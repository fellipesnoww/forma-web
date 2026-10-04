import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'
import type { Role } from '@/shared/auth/types'

/**
 * Lets through only the listed roles; anyone else is redirected (not shown a 403 page) to `redirectTo`.
 * The server re-checks the role on every admin call, so this guard is UX, not security.
 */
export function RequireRole({ allow, redirectTo = '/app' }: { allow: Role[]; redirectTo?: string }) {
  const { user } = useAuth()

  if (!user || !allow.includes(user.role)) {
    return <Navigate to={redirectTo} replace state={{ forbidden: true }} />
  }

  return <Outlet />
}
