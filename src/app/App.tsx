import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireAuth } from '@/shared/auth/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { OnboardingGate } from '@/features/auth/components/OnboardingGate'
import { HomePage } from '@/app/pages/HomePage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { ExercisesPage } from '@/features/exercises'
import { WorkoutSheetsListPage, WorkoutSheetFormPage } from '@/features/workout-sheets'
import { WorkoutRunPage, SessionDetailPage, SessionHistoryPage } from '@/features/workout-sessions'
import { ActivitiesPage } from '@/features/activities'
import { ComingSoon } from '@/app/pages/ComingSoon'
import { NotFoundPage } from '@/app/pages/NotFoundPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ComingSoon title="Recuperar senha" />} />

      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route element={<OnboardingGate />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="sheets" element={<WorkoutSheetsListPage />} />
            <Route path="sheets/new" element={<WorkoutSheetFormPage />} />
            <Route path="sheets/:id" element={<WorkoutSheetFormPage />} />
            <Route path="sheets/:id/run" element={<WorkoutRunPage />} />
            <Route path="sessions" element={<SessionHistoryPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
