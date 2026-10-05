import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect, WEEKDAY_LABELS } from './support/fixtures'

const sheetCard = (page: Page, name: string) => page.getByRole('article', { name, exact: true })

const rowNames = (page: Page) => page.getByRole('button', { name: 'Reordenar' }).locator('xpath=..').locator('p.font-bold')

test.describe('1.4 Planilhas', () => {
  test('estado vazio quando não há planilhas', async ({ authedPage: page }) => {
    await page.goto('/app/sheets')
    await expect(page.getByText('Nenhuma planilha ainda')).toBeVisible()
    await expect(page.getByText('0 criadas')).toBeVisible()
  })

  test('cria planilha com dois dias e exercícios da biblioteca', async ({ authedPage: page, api }) => {
    const [a, b, c] = await api.catalog()
    const name = `Treino QA ${randomUUID().slice(0, 6)}`

    await page.goto('/app/sheets')
    await page.getByRole('link', { name: 'Nova planilha' }).click()
    await expect(page).toHaveURL(/\/app\/sheets\/new$/)
    await expect(page.getByRole('button', { name: 'Salvar planilha' })).toBeDisabled()

    await page.getByLabel('Nome da planilha').fill(name)
    await page.getByRole('button', { name: 'Seg', exact: true }).click()
    const picker = page.getByText('Adicionar da biblioteca').locator('xpath=../..')
    await picker.getByPlaceholder('Buscar…').fill(a.name)
    await picker.getByRole('button', { name: a.name }).click()
    await picker.getByPlaceholder('Buscar…').fill(b.name)
    await picker.getByRole('button', { name: b.name }).click()
    // Already-added exercises are disabled in the picker.
    await expect(picker.getByRole('button', { name: b.name })).toBeDisabled()

    await page.getByRole('button', { name: 'Qua', exact: true }).click()
    await picker.getByPlaceholder('Buscar…').fill(c.name)
    await picker.getByRole('button', { name: c.name }).click()
    await expect(page.getByRole('button', { name: 'Seg · 2' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Qua · 1' })).toBeVisible()

    await page.getByRole('button', { name: 'Salvar planilha' }).click()
    await expect(page.getByText('Planilha criada.')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/sheets$/)
    await expect(sheetCard(page, name)).toBeVisible()
  })

  test('não salva com dia sem exercícios', async ({ authedPage: page }) => {
    await page.goto('/app/sheets/new')
    await page.getByLabel('Nome da planilha').fill('Incompleta')
    await page.getByRole('button', { name: 'Ter', exact: true }).click()
    await page.getByRole('button', { name: 'Salvar planilha' }).click()

    await expect(page.getByText('Adicione ao menos um exercício em Ter.')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/sheets\/new$/)
  })

  test('nome é obrigatório', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    await page.goto('/app/sheets/new')
    await page.getByRole('button', { name: 'Seg', exact: true }).click()
    await page.getByPlaceholder('Buscar…').fill(a.name)
    await page.getByRole('button', { name: a.name }).click()
    await page.getByRole('button', { name: 'Salvar planilha' }).click()
    await expect(page.getByText('Informe o nome da planilha')).toBeVisible()
  })

  test('desmarcar o dia remove a aba e seus exercícios', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    await page.goto('/app/sheets/new')
    await page.getByRole('button', { name: 'Sex', exact: true }).click()
    await page.getByPlaceholder('Buscar…').fill(a.name)
    await page.getByRole('button', { name: a.name }).click()
    await expect(page.getByRole('button', { name: 'Sex · 1' })).toBeVisible()

    await page.getByRole('button', { name: 'Sex', exact: true }).click()
    await expect(page.getByText('Escolha ao menos um dia da semana para começar.')).toBeVisible()
  })

  test('remove exercício de um dia', async ({ authedPage: page, api }) => {
    const [a, b] = await api.catalog()
    const sheet = await api.createSheet('Remover QA', [{ weekday: 1, exercises: [{ exerciseId: a.id }, { exerciseId: b.id }] }])
    await page.goto(`/app/sheets/${sheet.id}`)
    await expect(rowNames(page)).toHaveText([a.name, b.name])

    await page.getByRole('button', { name: 'Remover exercício' }).first().click()
    await expect(rowNames(page)).toHaveText([b.name])
  })

  test('edita planilha existente', async ({ authedPage: page, api }) => {
    const [a, b] = await api.catalog()
    const sheet = await api.createSheet('Edição QA', [{ weekday: 2, exercises: [{ exerciseId: a.id }] }])

    await page.goto('/app/sheets')
    await sheetCard(page, 'Edição QA').getByRole('link', { name: 'Editar planilha' }).click()
    await expect(page.getByRole('heading', { name: 'Editar planilha' })).toBeVisible()
    await expect(page.getByLabel('Nome da planilha')).toHaveValue('Edição QA')
    await expect(rowNames(page)).toHaveText([a.name])

    await page.getByLabel('Nome da planilha').fill('Edição QA v2')
    await page.getByPlaceholder('Buscar…').fill(b.name)
    await page.getByRole('button', { name: b.name }).click()
    await page.getByRole('button', { name: 'Salvar planilha' }).click()

    await expect(page.getByText('Planilha atualizada.')).toBeVisible()
    await expect(sheetCard(page, 'Edição QA v2')).toBeVisible()
    const saved = await api.getSheet(sheet.id)
    expect(saved.days[0].exercises.map((e) => e.name)).toEqual([a.name, b.name])
  })

  test('exclui planilha', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    await api.createSheet('Excluir QA', [{ weekday: 3, exercises: [{ exerciseId: a.id }] }])
    await page.goto('/app/sheets')

    page.once('dialog', (dialog) => dialog.accept())
    await sheetCard(page, 'Excluir QA').getByRole('button', { name: 'Excluir planilha' }).click()

    await expect(page.getByText('Planilha excluída.')).toBeVisible()
    await expect(page.getByText('Nenhuma planilha ainda')).toBeVisible()
  })

  test('reordena exercícios com drag and drop e persiste sem salvar', async ({ authedPage: page, api, isMobile }) => {
    test.skip(isMobile, 'arrasto por toque (TouchSensor) não é simulável de forma confiável; mouse cobre a lógica')
    const [a, b, c] = await api.catalog()
    const sheet = await api.createSheet('Ordem QA', [
      { weekday: 4, exercises: [{ exerciseId: a.id }, { exerciseId: b.id }, { exerciseId: c.id }] },
    ])
    await page.goto(`/app/sheets/${sheet.id}`)
    await expect(rowNames(page)).toHaveText([a.name, b.name, c.name])

    const handles = page.getByRole('button', { name: 'Reordenar' })
    const from = (await handles.nth(0).boundingBox())!
    const to = (await handles.nth(2).boundingBox())!
    const reorder = page.waitForResponse((r) => r.url().endsWith('/reorder') && r.request().method() === 'PATCH')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2 + 10, { steps: 12 })
    await page.mouse.up()

    await expect(rowNames(page)).toHaveText([b.name, c.name, a.name])
    expect((await reorder).ok()).toBeTruthy()

    await page.reload()
    await expect(rowNames(page)).toHaveText([b.name, c.name, a.name])
  })

  test('card da planilha leva para a execução', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Iniciar QA', [{ weekday: 0, exercises: [{ exerciseId: a.id }] }])
    await page.goto('/app/sheets')
    await sheetCard(page, 'Iniciar QA').getByRole('link', { name: 'Iniciar' }).click()
    await expect(page).toHaveURL(new RegExp(`/app/sheets/${sheet.id}/run$`))
    await expect(page.getByRole('heading', { name: `Iniciar QA · ${WEEKDAY_LABELS[0]}` })).toBeVisible()
  })
})
