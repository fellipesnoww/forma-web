import { test, expect, pngBuffer } from './support/fixtures'

test.describe('1.2 Perfil', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/app/profile')
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible()
  })

  test('mostra nome e e-mail do usuário', async ({ authedPage: page, user }) => {
    await expect(page.getByRole('main').getByText(user.email)).toBeVisible()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(user.displayName)
  })

  test('edita o nome de exibição', async ({ authedPage: page, api }) => {
    await page.getByLabel('Nome de exibição').fill('Ana Atualizada')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()

    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await expect(page.getByRole('main').getByText('Ana Atualizada', { exact: true })).toBeVisible()
    expect((await api.me()).profile.displayName).toBe('Ana Atualizada')
  })

  test('nome de exibição vazio é rejeitado no cliente', async ({ authedPage: page }) => {
    await page.getByLabel('Nome de exibição').fill('')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Informe seu nome')).toBeVisible()
  })

  test('envia foto de avatar', async ({ authedPage: page, api }) => {
    await page.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: pngBuffer() })

    await expect(page.getByText('Foto atualizada.')).toBeVisible()
    expect((await api.me()).profile.avatarUrl).toMatch(/^\/media\//)
    // AuthedImage fetches the bytes with the bearer token and renders a blob: URL.
    await expect(page.locator('img[src^="blob:"]').first()).toBeVisible()
  })

  test('registra medidas e mostra histórico com gráfico a partir de 2 registros', async ({ authedPage: page, api }) => {
    await page.getByLabel('Peso (kg)').fill('80.5')
    await page.getByLabel('Altura (cm)').fill('178')
    await page.getByRole('button', { name: 'Registrar medida' }).click()
    await expect(page.getByText('Medida registrada.')).toBeVisible()
    await expect(page.getByText('80.5 kg')).toBeVisible()
    await expect(page.getByText('Registre pelo menos 2 medidas para ver o gráfico.')).toBeVisible()

    await page.getByLabel('Peso (kg)').fill('79')
    await page.getByLabel('Altura (cm)').fill('178')
    await page.getByLabel('Cintura (cm)').fill('84')
    await page.getByRole('button', { name: 'Registrar medida' }).click()
    await expect(page.getByText('79 kg')).toBeVisible()
    await expect(page.locator('svg polyline')).toBeVisible()

    expect((await api.listMeasurements()).items).toHaveLength(2)
  })

  test('medidas precisam ser maiores que zero', async ({ authedPage: page }) => {
    await page.getByLabel('Peso (kg)').fill('0')
    await page.getByLabel('Altura (cm)').fill('-3')
    await page.getByRole('button', { name: 'Registrar medida' }).click()
    await expect(page.getByText('Deve ser maior que 0')).toHaveCount(2)
  })
})
