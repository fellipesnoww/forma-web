import { Navigate, Outlet } from 'react-router-dom'
import { useOnboardingCompleted } from '@/features/auth/hooks/useOnboardingCompleted'

export function OnboardingGate() {
  const { completed } = useOnboardingCompleted()
  if (!completed) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
