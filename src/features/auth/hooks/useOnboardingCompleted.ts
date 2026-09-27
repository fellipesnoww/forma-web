import { useState } from 'react'

const KEY = 'onboarding_completed'

export function useOnboardingCompleted() {
  const [completed, setCompleted] = useState(() => localStorage.getItem(KEY) === 'true')

  const markCompleted = () => {
    localStorage.setItem(KEY, 'true')
    setCompleted(true)
  }

  return { completed, markCompleted }
}
