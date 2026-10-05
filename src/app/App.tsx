import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RequireAuth } from '@/shared/auth/RequireAuth'
import { RequireRole } from '@/shared/auth/RequireRole'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { OnboardingPage } from '@/features/auth/pages/OnboardingPage'
import { OnboardingGate } from '@/features/auth/components/OnboardingGate'
import { DashboardPage } from '@/features/dashboard'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { ExercisesPage } from '@/features/exercises'
import { WorkoutSheetsListPage, WorkoutSheetFormPage } from '@/features/workout-sheets'
import { WorkoutRunPage, SessionDetailPage, SessionHistoryPage } from '@/features/workout-sessions'
import { ActivitiesPage } from '@/features/activities'
import { CalendarPage } from '@/features/calendar'
import { ProgressPage } from '@/features/progress'
import { DietsListPage, DietEditorPage } from '@/features/diets'
import { SettingsPage } from '@/features/settings'
import {
  AdminLayout,
  AdminExercisesPage,
  AdminUsersPage,
  AdminAdminsPage,
  AdminAuditPage,
  AdminGamificationPage,
} from '@/features/admin'
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
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="sheets" element={<WorkoutSheetsListPage />} />
            <Route path="sheets/new" element={<WorkoutSheetFormPage />} />
            <Route path="sheets/:id" element={<WorkoutSheetFormPage />} />
            <Route path="sheets/:id/run" element={<WorkoutRunPage />} />
            <Route path="sessions" element={<SessionHistoryPage />} />
            <Route path="sessions/:id" element={<SessionDetailPage />} />
            <Route path="activities" element={<ActivitiesPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="diets" element={<DietsListPage />} />
            <Route path="diets/new" element={<DietEditorPage />} />
            <Route path="diets/:id" element={<DietEditorPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole allow={['admin', 'super_user']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="exercises" replace />} />
            <Route path="exercises" element={<AdminExercisesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="gamification" element={<AdminGamificationPage />} />
            <Route element={<RequireRole allow={['super_user']} redirectTo="/admin/exercises" />}>
              <Route path="admins" element={<AdminAdminsPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
