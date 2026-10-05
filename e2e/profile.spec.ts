import type { Page } from '@playwright/test'
import { test, expect, pngBuffer } from './support/fixtures'

/** Header button on `sm`+, pencil on the identity card on phones — same accessible name. */
async function openEditProfile(page: Page) {
  await page.getByRole('button', { name: 'Editar perfil' }).filter({ visible: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Editar perfil' })).toBeVisible()
  return dialog
}

async function openMeasurements(page: Page) {
  await page.getByRole('button', { name: 'Registrar medidas' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Registrar medidas' })).toBeVisible()
  return dialog
}

const physicalData = (page: Page) => page.getByRole('region', { name: 'Dados físicos' })
const history = (page: Page) => page.getByRole('region', { name: 'Histórico de medidas' })

test.describe('1.2 Perfil', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/app/profile')
    await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  })

  test('mostra nome e e-mail do usuário', async ({ authedPage: page, user }) => {
    await expect(page.getByRole('main').getByText(user.email)).toBeVisible()
    await expect(page.getByRole('main').getByText(user.displayName, { exact: true })).toBeVisible()
  })

  test('layout: cabeçalho com "Editar perfil" no desktop, lápis no cartão no mobile', async ({ authedPage: page, isMobile }) => {
    const buttons = page.getByRole('main').getByRole('button', { name: 'Editar perfil' })
    await expect(buttons.filter({ visible: true })).toHaveCount(1)
    // Larger screens show the labelled header button; phones only the pencil icon on the card.
    await expect(buttons.filter({ hasText: 'Editar perfil' })).toBeVisible({ visible: !isMobile })
  })

  test('sem rolagem horizontal mesmo com e-mail longo', async ({ authedPage: page }) => {
    // Test accounts have long e-mails (e2e+<timestamp>-<id>@example.com), which used to widen the grid.
    await expect(page.getByRole('region', { name: 'Dados físicos' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('edita o nome de exibição', async ({ authedPage: page, api }) => {
    const dialog = await openEditProfile(page)
    await expect(dialog.getByLabel('Nome de exibição')).toHaveValue('Ana Teste')
    await dialog.getByLabel('Nome de exibição').fill('Ana Atualizada')
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()

    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('main').getByText('Ana Atualizada', { exact: true })).toBeVisible()
    expect((await api.me()).profile.displayName).toBe('Ana Atualizada')
  })

  test('nome de exibição vazio é rejeitado no cliente', async ({ authedPage: page }) => {
    const dialog = await openEditProfile(page)
    await dialog.getByLabel('Nome de exibição').fill('')
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(dialog.getByText('Informe seu nome')).toBeVisible()
  })

  test('envia foto de avatar', async ({ authedPage: page, api }) => {
    await page.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: pngBuffer() })

    await expect(page.getByText('Foto atualizada.')).toBeVisible()
    // Compressed to JPEG client-side; the API answers with a presigned S3 link rendered as-is.
    expect((await api.me()).profile.avatarUrl).toMatch(/^https:\/\/.+\.jpg\?.*X-Amz-Signature=/)
    await expect(page.getByAltText('Sua foto')).toHaveAttribute('src', /X-Amz-Signature=/)
  })

  test('sem medidas: dados físicos vazios e histórico com convite', async ({ authedPage: page }) => {
    await expect(physicalData(page).getByText('—')).toHaveCount(4)
    await expect(history(page).getByText('Registre suas medidas para acompanhar a evolução.')).toBeVisible()
  })

  test('registra medidas: atualiza dados físicos, histórico e gráfico a partir de 2 registros', async ({ authedPage: page, api }) => {
    let dialog = await openMeasurements(page)
    await dialog.getByLabel('Peso (kg)').fill('80.5')
    await dialog.getByLabel('Altura (cm)').fill('178')
    await dialog.getByRole('button', { name: 'Registrar medida' }).click()
    await expect(page.getByText('Medida registrada.')).toBeVisible()
    await expect(dialog).toBeHidden()

    await expect(physicalData(page)).toContainText('80,5 kg')
    await expect(physicalData(page)).toContainText('1,78 m')
    await expect(history(page).getByText('80,5 kg')).toBeVisible()
    await expect(history(page).getByText('Registre pelo menos 2 medidas para ver o gráfico.')).toBeVisible()

    dialog = await openMeasurements(page)
    await dialog.getByLabel('Peso (kg)').fill('79')
    await dialog.getByLabel('Altura (cm)').fill('178')
    await dialog.getByLabel('Cintura (cm)').fill('84')
    await dialog.getByRole('button', { name: 'Registrar medida' }).click()

    await expect(physicalData(page)).toContainText('79 kg')
    await expect(physicalData(page)).toContainText('84 cm')
    const rows = history(page).getByRole('listitem')
    await expect(rows).toHaveCount(2)
    // Newest first.
    await expect(rows.first()).toContainText('79 kg')
    await expect(rows.first()).toContainText('84 cm')
    await expect(rows.last()).toContainText('80,5 kg')
    await expect(history(page).locator('svg polyline')).toBeVisible()

    expect((await api.listMeasurements()).items).toHaveLength(2)
  })

  test('medidas precisam ser maiores que zero', async ({ authedPage: page }) => {
    const dialog = await openMeasurements(page)
    await dialog.getByLabel('Peso (kg)').fill('0')
    await dialog.getByLabel('Altura (cm)').fill('-3')
    await dialog.getByRole('button', { name: 'Registrar medida' }).click()
    await expect(dialog.getByText('Deve ser maior que 0')).toHaveCount(2)
  })
})
