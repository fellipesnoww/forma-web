import { fileURLToPath } from 'node:url'

export const API_PORT = 3334
export const WEB_PORT = 4174
export const API_URL = process.env.E2E_API_URL ?? `http://localhost:${API_PORT}`
export const WEB_URL = `http://localhost:${WEB_PORT}`

/** Sibling `forma-server` checkout: Playwright boots it, and admin tests use its role CLI. */
export const SERVER_DIR = process.env.FORMA_SERVER_DIR ?? fileURLToPath(new URL('../../../forma-server', import.meta.url))
