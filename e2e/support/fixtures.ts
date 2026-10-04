import { test as base, type Page } from '@playwright/test'
import { Api, type TestUser } from './api'

/** Same keys the app uses (`shared/auth/tokenStorage.ts`, `features/auth/hooks/useOnboardingCompleted.ts`). */
export const STORAGE = {
  access: 'forma.accessToken',
  refresh: 'forma.refreshToken',
  onboarding: 'onboarding_completed',
}

/** Logs the page in by seeding tokens before any app script runs. Onboarding is marked done unless told otherwise. */
export async function signIn(page: Page, user: TestUser, { onboarded = true } = {}) {
  await page.addInitScript(
    ({ keys, access, refresh, onboarded }) => {
      // Only seed once per page: later reloads must see what the app itself wrote (e.g. after logout).
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem(keys.access, access)
      localStorage.setItem(keys.refresh, refresh)
      if (onboarded) localStorage.setItem(keys.onboarding, 'true')
    },
    { keys: STORAGE, access: user.accessToken, refresh: user.refreshToken, onboarded },
  )
}

interface Fixtures {
  /** API client, authenticated as `user` once that fixture is used. */
  api: Api
  /** A brand-new account for this test. */
  user: TestUser
  /** `page` already logged in as `user`. */
  authedPage: Page
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, provide) => {
    await provide(new Api(request))
  },
  user: async ({ api }, provide) => {
    await provide(await api.createUser())
  },
  authedPage: async ({ page, user }, provide) => {
    await signIn(page, user)
    await provide(page)
  },
})

export { expect } from '@playwright/test'

/** 0 = Sunday … 6 = Saturday (API convention), same labels as the app. */
export const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Today's weekday in the browser's timezone (config pins America/Sao_Paulo). */
export function todayWeekday() {
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date())
  return WEEKDAY_INDEX[short]
}

/** A small valid PNG, generated so tests don't depend on binary fixtures in the repo. */
export function pngBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGPQjf5PEmIY1TCqYfhqAAAMGocQRxYH0AAAAABJRU5ErkJggg==',
    'base64',
  )
}
