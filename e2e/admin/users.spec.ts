import type { Page } from '@playwright/test'
import { test, expect } from '../support/admin'

const isMobile = () => test.info().project.name === 'mobile'

/** User detail: side panel on desktop, modal on mobile. */
const detail = (page: Page) =>
  isMobile() ? page.getByRole('dialog', { name: 'Perfil do usuário' }) : page.getByRole('complementary', { name: 'Detalhes do usuário' })

async function openUser(page: Page, email: string) {
  await page.goto('/admin/users')
  await page.getByLabel('Buscar usuário').fill(email)
  await page.getByRole('table', { name: 'Usuários' }).getByRole('row').filter({ hasText: email }).click()
  await expect(detail(page).getByText(email)).toBeVisible()
}

/** Confirmation dialog for account actions; fills the optional audit reason when given. */
async function confirmAction(page: Page, title: string, confirmLabel: string, reason?: string) {
  const dialog = page.getByRole('dialog', { name: title })
  if (reason) await dialog.getByLabel('Motivo (opcional)').fill(reason)
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await expect(dialog).toBeHidden()
}

test.describe('3.3 Admin · usuários', () => {
  test('perfil individual mostra dados e estatísticas', async ({ adminPage: page, makeUser }) => {
    const target = await makeUser('Marina Souza')
    await target.api.createActivity({
      activityTypeId: (await target.api.activityTypes())[0].id,
      durationMinutes: 30,
    })

    await openUser(page, target.user.email)
    const panel = detail(page)
    await expect(panel.getByRole('heading', { name: 'Marina Souza' })).toBeVisible()
    await expect(panel.getByText('Ativo', { exact: true })).toBeVisible()
    await expect(panel.getByText('Usuário', { exact: true })).toBeVisible()
    await expect(panel.getByText('Atividades', { exact: true }).locator('xpath=..')).toHaveText('Atividades1')
    await expect(panel.getByText('E-mail e senha')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`user=${target.user.id}`))
  })

  test('link direto ?user= abre o perfil', async ({ adminPage: page, makeUser }) => {
    const target = await makeUser('Link Direto')
    await page.goto(`/admin/users?user=${target.user.id}`)
    await expect(detail(page).getByText(target.user.email)).toBeVisible()
  })

  test('desativa com motivo, reativa, e o motivo vai para a auditoria', async ({ adminPage: page, makeUser, root }) => {
    const target = await makeUser()
    await openUser(page, target.user.email)

    await detail(page).getByRole('button', { name: 'Desativar conta' }).click()
    await confirmAction(page, 'Desativar conta', 'Desativar conta', 'Conta duplicada')
    await expect(page.getByText(/: inativo\.$/)).toBeVisible()
    await expect(detail(page).getByText('Inativo', { exact: true })).toBeVisible()
    expect((await root.api.adminGetUser(target.user.id)).status).toBe('inactive')

    const { items } = await root.api.adminAuditLogs(`targetId=${target.user.id}&action=user.status_changed`)
    expect(items[0].metadata).toMatchObject({ from: 'active', to: 'inactive', reason: 'Conta duplicada' })

    await detail(page).getByRole('button', { name: 'Reativar conta' }).click()
    await confirmAction(page, 'Reativar conta', 'Reativar conta')
    await expect(detail(page).getByText('Ativo', { exact: true })).toBeVisible()
  })

  test('banir bloqueia o usuário imediatamente', async ({ adminPage: page, makeUser }) => {
    const target = await makeUser()
    await openUser(page, target.user.email)

    await detail(page).getByRole('button', { name: 'Banir usuário' }).click()
    await confirmAction(page, 'Banir usuário', 'Banir usuário')
    await expect(detail(page).getByText('Banido', { exact: true })).toBeVisible()
    await expect(detail(page).getByRole('button', { name: 'Banir usuário' })).toHaveCount(0)

    expect(await target.api.status('GET', '/auth/me')).toBe(403)
  })

  test('cancelar a confirmação não altera nada', async ({ adminPage: page, makeUser, root }) => {
    const target = await makeUser()
    await openUser(page, target.user.email)
    await detail(page).getByRole('button', { name: 'Banir usuário' }).click()
    await page.getByRole('dialog', { name: 'Banir usuário' }).getByRole('button', { name: 'Cancelar' }).click()
    expect((await root.api.adminGetUser(target.user.id)).status).toBe('active')
  })

  test('filtra por status nas abas', async ({ adminPage: page, makeUser, admin }) => {
    const target = await makeUser()
    await admin.api.adminSetStatus(target.user.id, 'inactive')
    await page.goto('/admin/users')
    await page.getByLabel('Buscar usuário').fill(target.user.email)
    const table = page.getByRole('table', { name: 'Usuários' })

    await page.getByRole('radio', { name: 'Ativos', exact: true }).click()
    await expect(table.getByText('Nenhum usuário encontrado.')).toBeVisible()
    await page.getByRole('radio', { name: 'Inativos', exact: true }).click()
    await expect(table.getByText(target.user.email)).toBeVisible()
  })

  test('admin não altera outros admins nem a própria conta, e não vê "Promover"', async ({ adminPage: page, admin, makeUser, root }) => {
    const otherAdmin = await makeUser('Outro Admin')
    await root.api.adminSetRole(otherAdmin.user.id, 'admin')

    await openUser(page, otherAdmin.user.email)
    await expect(detail(page).getByText('Contas de administradores só podem ser alteradas por um super user.')).toBeVisible()
    await expect(detail(page).getByRole('button', { name: 'Banir usuário' })).toHaveCount(0)

    await openUser(page, admin.user.email)
    await expect(detail(page).getByText('Você não pode alterar a própria conta.')).toBeVisible()

    const plain = await makeUser()
    await openUser(page, plain.user.email)
    await expect(detail(page).getByRole('button', { name: 'Desativar conta' })).toBeVisible()
    await expect(detail(page).getByRole('button', { name: 'Promover a administrador' })).toHaveCount(0)

    await root.api.adminSetRole(otherAdmin.user.id, 'user')
  })

  test('super user promove usuário a administrador', async ({ superPage: page, makeUser, root }) => {
    const target = await makeUser('Futuro Admin')
    await openUser(page, target.user.email)

    await detail(page).getByRole('button', { name: 'Promover a administrador' }).click()
    await confirmAction(page, 'Promover a administrador', 'Promover', 'Ajuda com o catálogo')
    await expect(page.getByText('Futuro Admin agora é administrador.')).toBeVisible()
    await expect(detail(page).getByText('Admin', { exact: true })).toBeVisible()
    expect((await root.api.adminGetUser(target.user.id)).role).toBe('admin')

    // The promoted account reaches the panel without logging in again.
    expect(await target.api.status('GET', '/admin/users?limit=1')).toBe(200)
    await root.api.adminSetRole(target.user.id, 'user')
  })
})
