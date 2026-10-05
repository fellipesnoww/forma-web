import { test, expect, tag } from '../support/admin'
import { signIn } from '../support/fixtures'

test.describe('5.4 Avaliações do app', () => {
  test('usuário avalia o Forma pelo início', async ({ page, makeUser, admin }) => {
    const { user } = await makeUser('Avaliadora E2E')
    const comment = `Treinos ficaram fáceis de lançar ${tag()}`
    await signIn(page, user)

    await page.goto('/app')
    await page.getByRole('button', { name: 'Avaliar o Forma' }).click()
    const dialog = page.getByRole('dialog', { name: 'Como está sua experiência com o Forma?' })
    await expect(dialog.getByRole('button', { name: 'Enviar avaliação' })).toBeDisabled()

    await dialog.getByRole('radio', { name: '4 · Bom' }).click()
    await dialog.getByLabel(/Conte mais/).fill(comment)
    await dialog.getByRole('button', { name: 'Enviar avaliação' }).click()

    const thanks = page.getByRole('dialog', { name: 'Obrigado pela avaliação!' })
    await expect(thanks).toContainText('Bom')
    await thanks.getByRole('button', { name: 'Fechar' }).click()
    await expect(thanks).toBeHidden()

    const res = await admin.api.call<{ items: { rank: number; observation: string; platform: string; device: string }[] }>(
      'GET',
      `/admin/ratings?userId=${user.id}`,
    )
    expect(res.items).toHaveLength(1)
    expect(res.items[0]).toMatchObject({ rank: 4, observation: comment, platform: 'web' })
    expect(res.items[0].device.length).toBeGreaterThan(0)
  })

  test('admin vê as avaliações e filtra por usuário e nota', async ({ adminPage: page, makeUser }) => {
    const { user, api } = await makeUser('Fã E2E')
    const comment = `Agora com as dietas ficou completo ${tag()}`
    await api.call('POST', '/ratings', { rank: 5, observation: comment, platform: 'mobile', device: 'iPhone 15 · iOS 26.1' })
    await api.call('POST', '/ratings', { rank: 2, platform: 'web', device: 'Chrome 141 · macOS' })

    await page.goto(`/admin/ratings?user=${user.id}`)
    const table = page.getByRole('table', { name: 'Avaliações' })
    await expect(table.getByRole('row').filter({ hasText: comment })).toContainText('Mobile')
    await expect(table.getByRole('row').filter({ hasText: 'Sem comentário' })).toContainText('Web')
    await expect(page.getByText('2 avaliações')).toBeVisible()

    await page.getByRole('radiogroup', { name: 'Filtrar por nota' }).getByRole('radio', { name: '5' }).click()
    await expect(page).toHaveURL(/rank=5/)
    await expect(table.getByRole('row').filter({ hasText: comment })).toBeVisible()
    await expect(table.getByRole('row').filter({ hasText: 'Sem comentário' })).toHaveCount(0)
  })

  test('usuário comum não abre a tela de avaliações', async ({ page, makeUser }) => {
    const { user, api } = await makeUser()
    expect(await api.status('GET', '/admin/ratings')).toBe(403)

    await signIn(page, user)
    await page.goto('/admin/ratings')
    await expect(page).toHaveURL(/\/app$/)
  })
})
