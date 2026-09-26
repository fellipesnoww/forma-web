import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { RequireAuth } from '@/shared/auth/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { HomePage } from '@/app/pages/HomePage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { ComingSoon } from '@/app/pages/ComingSoon'
import { NotFoundPage } from '@/app/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="exercises" element={<ComingSoon title="Biblioteca de exercícios" />} />
          <Route path="sheets" element={<ComingSoon title="Planilhas de treino" />} />
          <Route path="sheets/:id" element={<ComingSoon title="Planilha" />} />
          <Route path="sheets/:id/run" element={<ComingSoon title="Execução de treino" />} />
          <Route path="sessions" element={<ComingSoon title="Histórico de sessões" />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
