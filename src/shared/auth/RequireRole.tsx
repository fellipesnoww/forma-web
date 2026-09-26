import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'
import type { Role } from '@/shared/auth/types'

export function RequireRole({ allow }: { allow: Role[] }) {
  const { user } = useAuth()

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
