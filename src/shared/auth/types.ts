export type Role = 'user' | 'admin' | 'super_user'
export type AccountStatus = 'active' | 'inactive' | 'banned'

export interface User {
  id: string
  email: string
  role: Role
  status: AccountStatus
}

export interface Profile {
  displayName: string | null
  avatarUrl: string | null
  onboardingCompletedAt: string | null
}

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
  profile: Profile
}
