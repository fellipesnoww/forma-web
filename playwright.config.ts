import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { API_PORT, API_URL, WEB_PORT, WEB_URL } from './e2e/support/env'

/**
 * E2E suite against the real API.
 *
 * By default Playwright boots its own forma-server (sibling checkout, `FORMA_SERVER_DIR`) on
 * API_PORT with rate limits raised — the dev defaults (100 req/min, 10/min on auth and uploads)
 * would throttle a full run. It shares the dev database; every test creates its own user, so
 * runs don't collide. Point `E2E_API_URL` at an already running API to skip booting one.
 */
const SERVER_DIR = process.env.FORMA_SERVER_DIR ?? fileURLToPath(new URL('../forma-server', import.meta.url))

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    ...(process.env.E2E_API_URL
      ? []
      : [
          {
            command: 'npx tsx src/server.ts',
            cwd: SERVER_DIR,
            url: `${API_URL}/health`,
            env: {
              PORT: String(API_PORT),
              RATE_LIMIT_MAX: '100000',
              RATE_LIMIT_UPLOAD_MAX: '100000',
              LOG_LEVEL: 'warn',
            },
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ]),
    {
      // A production build, not the dev server: Vite's on-demand dependency pre-bundling reloads
      // pages mid-test on a cold start. `outDir` keeps it apart from the real `dist`.
      command: `npx vite build --outDir node_modules/.e2e-dist --emptyOutDir --logLevel warn && npx vite preview --outDir node_modules/.e2e-dist --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { VITE_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
