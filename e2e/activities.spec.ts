import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import type { Api, SeedActivityType } from './support/api'
import { test, expect, pngBuffer } from './support/fixtures'

const TZ = 'America/Sao_Paulo'

/** Calendar day (YYYY-MM-DD) in the browser's pinned timezone, `daysAgo` days back. */
function localDay(daysAgo = 0) {
  return new Date(Date.now() - daysAgo * 86_400_000).toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Noon São Paulo time on that day: far from day boundaries, never in the future for daysAgo ≥ 1. */
const noonOf = (daysAgo: number) => `${localDay(daysAgo)}T12:00:00-03:00`

async function defaultType(api: Api, name = 'Corrida'): Promise<SeedActivityType> {
  const type = (await api.activityTypes()).find((t) => t.name === name)
  expect(type, `tipo padrão "${name}" (rode o seed do forma-server)`).toBeTruthy()
  return type!
}

async function openNewActivity(page: Page) {
  await page.goto('/app/activities')
  await page.getByRole('button', { name: 'Registrar atividade' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Registrar atividade' })).toBeVisible()
  // Types load when the modal opens.
  await expect(dialog.getByLabel('Tipo', { exact: true }).locator('option', { hasText: 'Corrida' })).toHaveCount(1)
  return dialog
}

const row = (page: Page, typeName: string) => page.getByRole('button', { name: new RegExp(`^Editar ${typeName} de`) })

test.describe('2.1 Atividades livres', () => {
  test('estado vazio', async ({ authedPage: page }) => {
    await page.goto('/app/activities')
    await expect(page.getByRole('heading', { level: 1, name: 'Atividades' })).toBeVisible()
    await expect(page.getByText('Nenhuma atividade registrada')).toBeVisible()
    await expect(page.getByText('0 atividades')).toBeVisible()
  })

  test('registra atividade com tipo padrão, duração e comentário', async ({ authedPage: page, api }) => {
    const dialog = await openNewActivity(page)
    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Corrida' })
    await dialog.getByLabel('Duração (min)').fill('90')
    await dialog.getByLabel(/Comentário/).fill('5 km no parque')
    await dialog.getByRole('button', { name: 'Registrar atividade' }).click()

    await expect(page.getByText('Atividade registrada.')).toBeVisible()
    await expect(dialog).toBeHidden()
    const item = row(page, 'Corrida')
    await expect(item).toContainText('1 h 30 min')
    await expect(item).toContainText('5 km no parque')
    await expect(page.getByText('1 atividade', { exact: true })).toBeVisible()

    const { items } = await api.listActivities()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ activityTypeName: 'Corrida', durationMinutes: 90, comment: '5 km no parque' })
    // Defaults to "now" (input has minute precision).
    expect(Math.abs(Date.parse(items[0].performedAt) - Date.now())).toBeLessThan(5 * 60_000)
  })

  test('validações do formulário', async ({ authedPage: page, api }) => {
    const dialog = await openNewActivity(page)
    const submit = dialog.getByRole('button', { name: 'Registrar atividade' })
    const duration = dialog.getByLabel('Duração (min)')

    await submit.click()
    await expect(dialog.getByText('Escolha o tipo')).toBeVisible()
    await expect(dialog.getByText('Informe a duração')).toBeVisible()

    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Natação' })
    await duration.fill('0')
    await submit.click()
    await expect(dialog.getByText('Deve ser maior que 0')).toBeVisible()

    await duration.fill('1441')
    await submit.click()
    await expect(dialog.getByText(/Máximo de 1440 min/)).toBeVisible()

    await duration.fill('45')
    await dialog.getByLabel('Data e hora').fill(`${localDay(-2)}T10:00`)
    await submit.click()
    await expect(dialog.getByText('A data não pode estar no futuro')).toBeVisible()

    await expect(dialog).toBeVisible()
    expect((await api.listActivities()).total).toBe(0)
  })

  test('campo de data bloqueia o futuro no próprio input', async ({ authedPage: page }) => {
    const dialog = await openNewActivity(page)
    const max = await dialog.getByLabel('Data e hora').getAttribute('max')
    expect(max?.slice(0, 10)).toBe(localDay())
  })

  test('registro retroativo grava a data escolhida', async ({ authedPage: page, api }) => {
    const day = localDay(6)
    const dialog = await openNewActivity(page)
    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Futebol' })
    await dialog.getByLabel('Data e hora').fill(`${day}T19:30`)
    await dialog.getByLabel('Duração (min)').fill('60')
    await dialog.getByRole('button', { name: 'Registrar atividade' }).click()

    await expect(row(page, 'Futebol')).toContainText('19:30')
    const [activity] = (await api.listActivities()).items
    expect(new Date(activity.performedAt).toISOString()).toBe(new Date(`${day}T19:30:00-03:00`).toISOString())
  })

  test('cria tipo personalizado no formulário e já o seleciona', async ({ authedPage: page, api }) => {
    const typeName = `Remo QA ${randomUUID().slice(0, 6)}`
    const dialog = await openNewActivity(page)
    await dialog.getByRole('button', { name: 'Novo tipo' }).click()
    await dialog.getByLabel('Nome do novo tipo').fill(typeName)
    await dialog.getByRole('button', { name: 'Adicionar' }).click()

    const select = dialog.getByLabel('Tipo', { exact: true })
    await expect(select.locator('optgroup[label="Seus tipos"] option')).toHaveText([typeName])
    await expect(select.locator('option:checked')).toHaveText(typeName)

    await dialog.getByLabel('Duração (min)').fill('40')
    await dialog.getByRole('button', { name: 'Registrar atividade' }).click()
    await expect(row(page, typeName)).toBeVisible()

    const custom = (await api.activityTypes()).filter((t) => t.source === 'custom')
    expect(custom.map((t) => t.name)).toEqual([typeName])
  })

  test('tipo personalizado: nome repetido e nome vazio', async ({ authedPage: page }) => {
    const dialog = await openNewActivity(page)
    await dialog.getByRole('button', { name: 'Novo tipo' }).click()

    await dialog.getByRole('button', { name: 'Adicionar' }).click()
    await expect(dialog.getByText('Informe o nome')).toBeVisible()

    // Case-insensitive clash with the default "Corrida"; Enter submits the type, not the activity.
    await dialog.getByLabel('Nome do novo tipo').fill('corrida')
    await dialog.getByLabel('Nome do novo tipo').press('Enter')
    await expect(dialog.getByText('Já existe um tipo com esse nome.')).toBeVisible()
    await expect(dialog.getByText('Escolha o tipo')).toBeHidden()

    await dialog.getByRole('button', { name: 'Cancelar novo tipo' }).click()
    await expect(dialog.getByLabel('Nome do novo tipo')).toBeHidden()
  })

  test('edita tipo, duração e remove o comentário', async ({ authedPage: page, api }) => {
    const corrida = await defaultType(api)
    const yoga = await defaultType(api, 'Yoga')
    const seeded = await api.createActivity({
      activityTypeId: corrida.id,
      durationMinutes: 30,
      performedAt: noonOf(2),
      comment: 'Treino leve',
    })

    await page.goto('/app/activities')
    await row(page, 'Corrida').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Editar atividade' })).toBeVisible()
    await expect(dialog.getByLabel('Duração (min)')).toHaveValue('30')
    await expect(dialog.getByLabel(/Comentário/)).toHaveValue('Treino leve')
    await expect(dialog.getByLabel('Data e hora')).toHaveValue(`${localDay(2)}T12:00`)

    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Yoga' })
    await dialog.getByLabel('Duração (min)').fill('75')
    await dialog.getByLabel(/Comentário/).fill('')
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Atividade atualizada.')).toBeVisible()
    await expect(row(page, 'Yoga')).toContainText('1 h 15 min')
    await expect(row(page, 'Corrida')).toHaveCount(0)

    const updated = await api.getActivity(seeded.id)
    expect(updated).toMatchObject({ activityTypeId: yoga.id, durationMinutes: 75, comment: null })
    // Untouched date isn't re-sent, so it keeps its exact value.
    expect(updated.performedAt).toBe(seeded.performedAt)
  })

  test('exclui atividade com confirmação', async ({ authedPage: page, api }) => {
    const type = await defaultType(api)
    await api.createActivity({ activityTypeId: type.id, durationMinutes: 20, performedAt: noonOf(1) })

    await page.goto('/app/activities')
    await row(page, 'Corrida').click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Excluir' }).click()
    await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click()

    await expect(page.getByText('Atividade excluída.')).toBeVisible()
    await expect(page.getByText('Nenhuma atividade registrada')).toBeVisible()
    expect((await api.listActivities()).total).toBe(0)
  })

  test('registra atividade com foto', async ({ authedPage: page, api }) => {
    const dialog = await openNewActivity(page)
    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Trilha' })
    await dialog.getByLabel('Duração (min)').fill('120')
    await dialog.locator('input[type=file]').setInputFiles({ name: 'trilha.png', mimeType: 'image/png', buffer: pngBuffer() })
    await expect(dialog.getByAltText('Foto da atividade selecionada')).toBeVisible()
    await dialog.getByRole('button', { name: 'Registrar atividade' }).click()

    await expect(page.getByText('Atividade registrada.')).toBeVisible()
    await expect(row(page, 'Trilha').locator('img')).toBeVisible()
    const [activity] = (await api.listActivities()).items
    expect(activity.photoUrl).toMatch(/^\/media\//)
  })

  test('remove a foto de uma atividade existente', async ({ authedPage: page, api }) => {
    const type = await defaultType(api)
    const seeded = await api.createActivity({ activityTypeId: type.id, durationMinutes: 50, performedAt: noonOf(1) })
    await api.uploadActivityPhoto(seeded.id, pngBuffer())

    await page.goto('/app/activities')
    await row(page, 'Corrida').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByAltText('Foto da atividade')).toBeVisible()
    await dialog.getByRole('button', { name: 'Remover foto' }).click()
    await expect(dialog.getByAltText('Foto da atividade')).toBeHidden()
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Atividade atualizada.')).toBeVisible()
    await expect(row(page, 'Corrida').locator('img')).toHaveCount(0)
    expect((await api.getActivity(seeded.id)).photoUrl).toBeNull()
  })

  test('rejeita arquivo que não é imagem', async ({ authedPage: page }) => {
    const dialog = await openNewActivity(page)
    await dialog.locator('input[type=file]').setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByText('Use uma imagem JPG, PNG ou WebP.')).toBeVisible()
  })

  test('lista em ordem decrescente de data', async ({ authedPage: page, api }) => {
    const [natacao, ciclismo, yoga] = await Promise.all([
      defaultType(api, 'Natação'),
      defaultType(api, 'Ciclismo'),
      defaultType(api, 'Yoga'),
    ])
    await api.createActivity({ activityTypeId: ciclismo.id, durationMinutes: 60, performedAt: noonOf(5) })
    await api.createActivity({ activityTypeId: yoga.id, durationMinutes: 60, performedAt: noonOf(1) })
    await api.createActivity({ activityTypeId: natacao.id, durationMinutes: 60, performedAt: noonOf(3) })

    await page.goto('/app/activities')
    await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(3)
    const names = await page.getByRole('button', { name: /^Editar / }).evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label')!.replace(/^Editar (.+) de .*$/, '$1')),
    )
    expect(names).toEqual(['Yoga', 'Natação', 'Ciclismo'])
  })

  test('filtra por período e guarda o filtro na URL', async ({ authedPage: page, api }) => {
    const [antiga, recente] = await Promise.all([defaultType(api, 'Basquete'), defaultType(api, 'Pilates')])
    await api.createActivity({ activityTypeId: antiga.id, durationMinutes: 45, performedAt: noonOf(10) })
    await api.createActivity({ activityTypeId: recente.id, durationMinutes: 45, performedAt: noonOf(2) })

    await page.goto('/app/activities')
    await expect(page.getByText('2 atividades')).toBeVisible()

    await page.getByLabel('De', { exact: true }).fill(localDay(5))
    await expect(row(page, 'Pilates')).toBeVisible()
    await expect(row(page, 'Basquete')).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`from=${localDay(5)}`))

    await page.reload()
    await expect(page.getByLabel('De', { exact: true })).toHaveValue(localDay(5))
    await expect(page.getByText('1 atividade', { exact: true })).toBeVisible()

    await page.getByLabel('De', { exact: true }).fill('')
    await page.getByLabel('Até', { exact: true }).fill(localDay(5))
    await expect(row(page, 'Basquete')).toBeVisible()
    await expect(row(page, 'Pilates')).toHaveCount(0)

    await page.getByLabel('De', { exact: true }).fill(localDay(4))
    await expect(page.getByText('Nenhuma atividade nesse período')).toBeVisible()

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByText('2 atividades')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/activities$/)
  })

  test('paginação', async ({ authedPage: page, api }) => {
    const type = await defaultType(api, 'Caminhada')
    for (let i = 0; i < 21; i++) {
      await api.createActivity({ activityTypeId: type.id, durationMinutes: i + 1, performedAt: noonOf(i + 1) })
    }

    await page.goto('/app/activities')
    await expect(page.getByText('21 atividades')).toBeVisible()
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(row(page, 'Caminhada')).toHaveCount(20)

    await page.getByRole('button', { name: 'Próxima' }).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(row(page, 'Caminhada')).toHaveCount(1)
    await expect(row(page, 'Caminhada')).toContainText('21 min')
    await expect(page).toHaveURL(/page=2/)
  })
})
