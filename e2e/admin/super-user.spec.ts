import type { Page } from '@playwright/test'
import { test, expect } from '../support/admin'

const adminsTable = (page: Page) => page.getByRole('table', { name: 'Administradores' })
const adminRow = (page: Page, email: string) => adminsTable(page).getByRole('row').filter({ hasText: email })

async function findAdmin(page: Page, email: string) {
  await page.goto('/admin/admins')
  await page.getByLabel('Buscar administrador').fill(email)
  await expect(adminRow(page, email)).toBeVisible()
}

async function confirmAction(page: Page, title: string, confirmLabel: string) {
  const dialog = page.getByRole('dialog', { name: title })
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await expect(dialog).toBeHidden()
}

test.describe('3.4 Super user · administradores e auditoria', () => {
  test('lista admins e marca a própria conta sem ações', async ({ superPage: page, superUser, admin }) => {
    await findAdmin(page, admin.user.email)
    await expect(adminRow(page, admin.user.email).getByText('Admin', { exact: true })).toBeVisible()
    await expect(adminRow(page, admin.user.email).getByRole('button', { name: 'Promover a super user' })).toBeVisible()

    await findAdmin(page, superUser.user.email)
    const self = adminRow(page, superUser.user.email)
    await expect(self.getByText('Super user', { exact: true })).toBeVisible()
    await expect(self.getByText('Você')).toBeVisible()
    await expect(self.getByRole('button')).toHaveCount(0)
  })

  test('promove admin a super user e rebaixa de volta', async ({ superPage: page, admin, root }) => {
    await findAdmin(page, admin.user.email)
    await adminRow(page, admin.user.email).getByRole('button', { name: 'Promover a super user' }).click()
    await confirmAction(page, 'Promover a super user', 'Promover')
    await expect(adminRow(page, admin.user.email).getByText('Super user', { exact: true })).toBeVisible()
    expect((await root.api.adminGetUser(admin.user.id)).role).toBe('super_user')

    await adminRow(page, admin.user.email).getByRole('button', { name: 'Rebaixar a admin' }).click()
    await confirmAction(page, 'Rebaixar a admin', 'Rebaixar')
    await expect(adminRow(page, admin.user.email).getByText('Admin', { exact: true })).toBeVisible()
    expect((await root.api.adminGetUser(admin.user.id)).role).toBe('admin')
  })

  test('revoga o acesso ao painel', async ({ superPage: page, admin, root }) => {
    await findAdmin(page, admin.user.email)
    await adminRow(page, admin.user.email).getByRole('button', { name: 'Revogar' }).click()
    await confirmAction(page, 'Revogar acesso ao painel', 'Revogar')

    await expect(page.getByText(/Acesso ao painel revogado/)).toBeVisible()
    await expect(adminsTable(page).getByText('Nenhum administrador encontrado.')).toBeVisible()
    expect((await root.api.adminGetUser(admin.user.id)).role).toBe('user')
    expect(await admin.api.status('GET', '/admin/users?limit=1')).toBe(403)
  })

  test('filtra a lista por papel', async ({ superPage: page, admin }) => {
    await findAdmin(page, admin.user.email)
    await page.getByRole('radio', { name: 'Super users' }).click()
    await expect(adminsTable(page).getByText('Nenhum administrador encontrado.')).toBeVisible()
    await page.getByRole('radio', { name: 'Admins' }).click()
    await expect(adminRow(page, admin.user.email)).toBeVisible()
  })

  test('cartão de auditoria recente leva ao log completo', async ({ superPage: page, superUser, makeUser }) => {
    const target = await makeUser()
    await superUser.api.adminSetStatus(target.user.id, 'inactive', 'Teste e2e')
    await page.goto('/admin/admins')

    const card = page.getByRole('region', { name: 'Log de auditoria recente' })
    await expect(card.getByRole('listitem').first()).toBeVisible()
    await card.getByRole('link', { name: 'Ver tudo' }).click()
    await expect(page).toHaveURL(/\/admin\/audit$/)
  })

  test('log de auditoria: filtros por autor, ação e período', async ({ superPage: page, superUser, makeUser }) => {
    const target = await makeUser('Alvo Auditado')
    await superUser.api.adminSetStatus(target.user.id, 'banned', 'Spam no app')
    await page.goto('/admin/audit')

    await page.getByLabel('Filtrar por autor').selectOption({ label: superUser.user.email })
    const logs = page.getByRole('region', { name: 'Registros de auditoria' })
    const entry = logs.getByRole('listitem').filter({ hasText: 'Spam no app' })
    await expect(entry).toBeVisible()
    await expect(entry).toContainText(superUser.user.email)
    await expect(entry).toContainText('alterou o status de')
    await expect(entry).toContainText('Ativo → Banido')

    await page.getByLabel('Filtrar por ação').selectOption('exercise.created')
    await expect(logs.getByText('Nenhum registro para esses filtros.')).toBeVisible()
    await page.getByLabel('Filtrar por ação').selectOption('user.status_changed')
    await expect(entry).toBeVisible()

    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    await page.getByLabel('Até').fill(yesterday)
    await expect(logs.getByText('Nenhum registro para esses filtros.')).toBeVisible()

    await page.getByRole('button', { name: 'Limpar' }).click()
    await expect(page).toHaveURL(/\/admin\/audit$/)
  })

  test('alvo usuário no log abre o perfil', async ({ superPage: page, superUser, makeUser }) => {
    const target = await makeUser('Alvo Linkado')
    await superUser.api.adminSetStatus(target.user.id, 'inactive')
    await page.goto('/admin/audit')
    await page.getByLabel('Filtrar por autor').selectOption({ label: superUser.user.email })

    await page.getByRole('region', { name: 'Registros de auditoria' }).getByRole('link').first().click()
    await expect(page).toHaveURL(new RegExp(`/admin/users\\?user=${target.user.id}`))
    await expect(page.getByText(target.user.email).last()).toBeVisible()
  })
})
