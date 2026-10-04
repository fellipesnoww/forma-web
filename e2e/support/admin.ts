import { execFileSync } from 'node:child_process'
import { request as playwrightRequest, type Page } from '@playwright/test'
import { Api, type TestUser } from './api'
import { test as base, signIn } from './fixtures'
import { SERVER_DIR } from './env'

/**
 * Admin fixtures (Fase 3). Through the API only a super_user can promote someone, so each worker
 * bootstraps one "root" super_user with the backend CLI (`yarn user:set-role`), and that root
 * promotes the per-test accounts over the API. Everything is demoted back to `user` on teardown,
 * so e2e runs don't pile up admins in the shared dev database.
 */
function setRoleViaCli(email: string, role: 'user' | 'admin' | 'super_user') {
  execFileSync('npx', ['tsx', 'src/scripts/set-role.ts', `--email=${email}`, `--role=${role}`], {
    cwd: SERVER_DIR,
    stdio: 'pipe',
  })
}

export interface Account {
  user: TestUser
  /** API client authenticated as this account. */
  api: Api
}

interface WorkerFixtures {
  root: Account
}

interface AdminFixtures {
  /** A fresh account promoted to `admin`. */
  admin: Account
  /** A fresh account promoted to `super_user`. */
  superUser: Account
  /** Factory for extra plain accounts (targets of admin actions). */
  makeUser: (displayName?: string) => Promise<Account>
  adminPage: Page
  superPage: Page
}

export const test = base.extend<AdminFixtures, WorkerFixtures>({
  root: [
    async ({}, provide) => {
      const ctx = await playwrightRequest.newContext()
      const api = new Api(ctx)
      const user = await api.createUser('Root E2E')
      setRoleViaCli(user.email, 'super_user')
      await provide({ user, api })
      setRoleViaCli(user.email, 'user')
      await ctx.dispose()
    },
    { scope: 'worker' },
  ],

  makeUser: async ({ request }, provide) => {
    await provide(async (displayName = 'Usuária Alvo') => {
      const api = new Api(request)
      const user = await api.createUser(displayName)
      return { user, api }
    })
  },

  admin: async ({ root, makeUser }, provide) => {
    const account = await makeUser('Admin E2E')
    await root.api.adminSetRole(account.user.id, 'admin')
    await provide(account)
    await root.api.status('PATCH', `/admin/admins/${account.user.id}/role`, { role: 'user' })
  },

  superUser: async ({ root, makeUser }, provide) => {
    const account = await makeUser('Super E2E')
    await root.api.adminSetRole(account.user.id, 'admin')
    await root.api.adminSetRole(account.user.id, 'super_user')
    await provide(account)
    await root.api.status('PATCH', `/admin/admins/${account.user.id}/role`, { role: 'user' })
  },

  adminPage: async ({ page, admin }, provide) => {
    await signIn(page, admin.user)
    await provide(page)
  },

  superPage: async ({ page, superUser }, provide) => {
    await signIn(page, superUser.user)
    await provide(page)
  },
})

export { expect } from '@playwright/test'

/** Unique suffix so parallel tests sharing the dev database never match each other's rows. */
export const tag = () => Math.random().toString(36).slice(2, 8)
