import { randomUUID } from 'node:crypto'
import type { Locator, Page } from '@playwright/test'
import { test, expect } from './support/fixtures'

const card = (page: Page, name: string): Locator =>
  page.locator('div.rounded-2xl').filter({ has: page.getByText(name, { exact: true }) })

test.describe('1.3 Exercícios', () => {
  test('lista o catálogo com contagem', async ({ authedPage: page, api }) => {
    const catalog = await api.catalog()
    await page.goto('/app/exercises')
    await expect(page.getByText(`${catalog.length} exercícios`)).toBeVisible()
    await expect(page.getByText(catalog[0].name, { exact: true })).toBeVisible()
  })

  test('busca por nome', async ({ authedPage: page, api }) => {
    const catalog = await api.catalog()
    const target = catalog[3]
    await page.goto('/app/exercises')
    await expect(page.getByText(`${catalog.length} exercícios`)).toBeVisible()
    await page.getByPlaceholder('Buscar exercício…').fill(target.name)

    await expect(page.getByText(target.name, { exact: true })).toBeVisible()
    await expect(page.getByText(`${catalog.length} exercícios`)).toBeHidden()
  })

  test('busca sem resultado mostra estado vazio', async ({ authedPage: page }) => {
    await page.goto('/app/exercises')
    await page.getByPlaceholder('Buscar exercício…').fill(`zzz-${randomUUID()}`)
    await expect(page.getByText('Nenhum exercício encontrado.')).toBeVisible()
  })

  test('filtra por grupo muscular', async ({ authedPage: page, api }) => {
    const catalog = await api.catalog()
    const group = catalog.find((e) => e.muscleGroup)!.muscleGroup!
    const inGroup = catalog.filter((e) => e.muscleGroup === group)
    const outside = catalog.find((e) => e.muscleGroup && e.muscleGroup !== group)!

    await page.goto('/app/exercises')
    await page.getByRole('button', { name: `${group} · ${inGroup.length}` }).click()
    await expect(page.getByText(inGroup[0].name, { exact: true })).toBeVisible()
    await expect(page.getByText(outside.name, { exact: true })).toBeHidden()

    await page.getByRole('button', { name: /^Todos · / }).click()
    await expect(page.getByText(outside.name, { exact: true })).toBeVisible()
  })

  test('cria exercício personalizado e filtra por "Personalizados"', async ({ authedPage: page }) => {
    const name = `Remada QA ${randomUUID().slice(0, 6)}`
    await page.goto('/app/exercises')
    await page.getByRole('button', { name: 'Exercício personalizado' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByLabel('Grupo muscular').selectOption({ index: 1 })
    await dialog.getByRole('button', { name: 'Criar exercício' }).click()

    await expect(page.getByText('Exercício criado.')).toBeVisible()
    await expect(card(page, name).getByText('Seu')).toBeVisible()
    await page.getByRole('button', { name: 'Personalizados · 1' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  })

  test('nome é obrigatório ao criar exercício', async ({ authedPage: page }) => {
    await page.goto('/app/exercises')
    await page.getByRole('button', { name: 'Exercício personalizado' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Criar exercício' }).click()
    await expect(page.getByRole('dialog').locator('p.text-danger-500')).toBeVisible()
  })

  test('edita exercício personalizado', async ({ authedPage: page, api }) => {
    const original = `Puxada QA ${randomUUID().slice(0, 6)}`
    await api.createCustomExercise(original)
    await page.goto('/app/exercises')

    await card(page, original).getByRole('button', { name: 'Editar exercício' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Nome')).toHaveValue(original)
    await dialog.getByLabel('Nome').fill(`${original} editada`)
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Exercício atualizado.')).toBeVisible()
    await expect(page.getByText(`${original} editada`, { exact: true })).toBeVisible()
  })

  test('exclui exercício personalizado', async ({ authedPage: page, api }) => {
    const name = `Rosca QA ${randomUUID().slice(0, 6)}`
    await api.createCustomExercise(name)
    await page.goto('/app/exercises')

    await card(page, name).getByRole('button', { name: 'Editar exercício' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click()

    await expect(page.getByText('Exercício excluído.')).toBeVisible()
    await expect(page.getByText(name, { exact: true })).toBeHidden()
  })

  test('exercícios do catálogo não são editáveis', async ({ authedPage: page, api }) => {
    const target = (await api.catalog())[0]
    await page.goto('/app/exercises')
    await page.getByPlaceholder('Buscar exercício…').fill(target.name)
    await expect(card(page, target.name).getByRole('button', { name: 'Editar exercício' })).toHaveCount(0)
  })
})
