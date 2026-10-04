import { test, expect } from '../support/admin'
import { signIn } from '../support/fixtures'

const adminNav = (page: import('@playwright/test').Page) =>
  page.getByRole('navigation', { name: 'Painel administrativo' })

test.describe('3.1 Infra admin — guard por role', () => {
  test('sem login, /admin manda para o login', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('usuário comum é redirecionado para o app com aviso', async ({ page, makeUser }) => {
    const { user } = await makeUser()
    await signIn(page, user)

    await page.goto('/admin/exercises')
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByText('Você não tem permissão para acessar essa área.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Painel admin' })).toHaveCount(0)
  })

  test('usuário comum também não abre rotas de super user', async ({ page, makeUser }) => {
    const { user } = await makeUser()
    await signIn(page, user)
    await page.goto('/admin/audit')
    await expect(page).toHaveURL(/\/app$/)
  })

  test('admin entra pelo atalho do app e vê o menu sem as áreas de super user', async ({ adminPage: page }) => {
    await page.goto('/app')
    await page.getByRole('link', { name: 'Painel admin' }).click()

    await expect(page).toHaveURL(/\/admin\/exercises$/)
    const nav = adminNav(page)
    await expect(nav.getByRole('link', { name: 'Exercícios' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Usuários' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Conquistas e desafios' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Administradores' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Auditoria' })).toHaveCount(0)
  })

  test('admin é barrado nas rotas exclusivas de super user', async ({ adminPage: page }) => {
    await page.goto('/admin/admins')
    await expect(page).toHaveURL(/\/admin\/exercises$/)
    await expect(page.getByText('Você não tem permissão para acessar essa área.')).toBeVisible()

    await page.goto('/admin/audit')
    await expect(page).toHaveURL(/\/admin\/exercises$/)
  })

  test('super user acessa administradores e auditoria', async ({ superPage: page }) => {
    await page.goto('/admin')
    const nav = adminNav(page)
    await nav.getByRole('link', { name: 'Administradores' }).click()
    await expect(page.getByRole('heading', { name: 'Administradores' })).toBeVisible()

    await nav.getByRole('link', { name: 'Auditoria' }).click()
    await expect(page.getByRole('heading', { name: 'Auditoria' })).toBeVisible()
  })

  test('"Voltar ao app" sai do painel', async ({ adminPage: page }) => {
    await page.goto('/admin/users')
    await page.getByRole('link', { name: /Voltar ao app|^App$/ }).click()
    await expect(page).toHaveURL(/\/app$/)
  })

  test('rebaixado durante a sessão, o admin perde o painel ao recarregar', async ({ adminPage: page, admin, root }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible()

    await root.api.adminSetRole(admin.user.id, 'user')
    await page.reload()
    await expect(page).toHaveURL(/\/app$/)
  })

  test('tabela genérica: busca e filtros ficam na URL e sobrevivem ao reload', async ({ adminPage: page, makeUser }) => {
    const target = await makeUser('Pessoa Buscável')
    await page.goto('/admin/users')

    await page.getByLabel('Buscar usuário').fill(target.user.email)
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(target.user.email)
    const table = page.getByRole('table', { name: 'Usuários' })
    await expect(table.getByText(target.user.email)).toBeVisible()
    await expect(table.getByRole('row').filter({ hasText: '@' })).toHaveCount(1)

    await page.getByRole('radio', { name: 'Banidos' }).click()
    await expect(page).toHaveURL(/tab=banned/)
    await expect(table.getByText('Nenhum usuário encontrado.')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('radio', { name: 'Banidos' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByLabel('Buscar usuário')).toHaveValue(target.user.email)
  })

  test('sem rolagem horizontal no painel', async ({ superPage: page }) => {
    for (const path of ['/admin/exercises', '/admin/users', '/admin/admins', '/admin/gamification', '/admin/audit']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
  })
})
