import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/shared/auth/api'
import { tokenStorage } from '@/shared/auth/tokenStorage'
import type { AuthPayload, Profile, User } from '@/shared/auth/types'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: Status
  user: User | null
  profile: Profile | null
  login: (email: string, password: string) => Promise<Profile>
  register: (email: string, password: string, displayName?: string) => Promise<Profile>
  loginWithGoogle: (idToken: string) => Promise<Profile>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const applyPayload = (payload: AuthPayload) => {
    tokenStorage.set(payload.accessToken, payload.refreshToken)
    setUser(payload.user)
    setProfile(payload.profile)
    setStatus('authenticated')
    return payload.profile
  }

  const clearSession = () => {
    tokenStorage.clear()
    setUser(null)
    setProfile(null)
    setStatus('unauthenticated')
  }

  useEffect(() => {
    if (!tokenStorage.getRefresh()) {
      setStatus('unauthenticated')
      return
    }
    authApi
      .me()
      .then(({ user, profile }) => {
        setUser(user)
        setProfile(profile)
        setStatus('authenticated')
      })
      .catch(clearSession)
  }, [])

  useEffect(() => {
    window.addEventListener('forma:session-expired', clearSession)
    return () => window.removeEventListener('forma:session-expired', clearSession)
  }, [])

  const value: AuthContextValue = {
    status,
    user,
    profile,
    login: async (email, password) => applyPayload(await authApi.login({ email, password })),
    register: async (email, password, displayName) =>
      applyPayload(await authApi.register({ email, password, displayName })),
    loginWithGoogle: async (idToken) => applyPayload(await authApi.loginWithGoogle(idToken)),
    logout: async () => {
      try {
        await authApi.logout()
      } finally {
        clearSession()
      }
    },
    refreshMe: async () => {
      const { user, profile } = await authApi.me()
      setUser(user)
      setProfile(profile)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
