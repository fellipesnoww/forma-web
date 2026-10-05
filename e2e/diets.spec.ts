import type { Page } from '@playwright/test'
import { test, expect } from './support/fixtures'

const ESTIMATE = '**/diets/calorie-estimate'

const dietCard = (page: Page, name: string) => page.getByRole('article', { name, exact: true })
const meal = (page: Page, name: string) => page.getByRole('region', { name, exact: true })

/** Fills the first (blank) food row of a meal. */
async function fillFood(page: Page, mealName: string, food: { name: string; qty: string; kcal?: string; row?: number }) {
  const section = meal(page, mealName)
  const row = food.row ?? 0
  await section.getByLabel('Alimento').nth(row).fill(food.name)
  await section.getByLabel(`Quantidade de ${food.name}`).fill(food.qty)
  if (food.kcal != null) await section.getByLabel(`Calorias de ${food.name}`, { exact: true }).fill(food.kcal)
}

test.describe('Dietas', () => {
  test('cria dieta com refeições e alimentos; totais ao vivo', async ({ authedPage: page, api }) => {
    await page.goto('/app/diets')
    await expect(page.getByText('Nenhuma dieta ainda')).toBeVisible()
    await page.getByRole('link', { name: 'Nova dieta' }).click()
    await expect(page.getByRole('heading', { name: 'Nova dieta' })).toBeVisible()

    await page.getByLabel('Nome da dieta').fill('Cutting QA')
    await page.getByLabel('Objetivo').fill('Perder gordura')
    await page.getByLabel('Nome da refeição 1').fill('Café da manhã')
    await page.getByLabel('Horário de Café da manhã').fill('07:00')
    await fillFood(page, 'Café da manhã', { name: 'Leite desnatado', qty: '200', kcal: '70' })
    await meal(page, 'Café da manhã').getByLabel('Unidade de Leite desnatado').selectOption('ML')
    await meal(page, 'Café da manhã').getByRole('button', { name: 'Adicionar alimento' }).click()
    await fillFood(page, 'Café da manhã', { name: 'Pão integral', qty: '50', kcal: '125', row: 1 })

    await page.getByRole('button', { name: 'Adicionar refeição' }).click()
    await page.getByLabel('Nome da refeição 2').fill('Almoço')
    await page.getByLabel('Horário de Almoço').fill('12:30')
    await fillFood(page, 'Almoço', { name: 'Arroz integral', qty: '0,15', kcal: '170' })
    await meal(page, 'Almoço').getByLabel('Unidade de Arroz integral').selectOption('KG')

    const total = page.getByRole('region', { name: 'Total aproximado' })
    await expect(total).toContainText('≈ 365')
    await expect(total).toContainText('2 refeições · 3 alimentos')
    await expect(meal(page, 'Café da manhã')).toContainText('195 kcal')

    const created = page.waitForResponse((r) => r.url().endsWith('/diets') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Salvar dieta' }).click()
    const body = (await created).request().postDataJSON()
    expect(body.meals[1].foods[0]).toEqual({ name: 'Arroz integral', quantity: 0.15, unit: 'KG', kcal: 170 })

    await expect(page.getByText('Dieta criada.')).toBeVisible()
    await expect(page).toHaveURL(/\/app\/diets$/)
    const card = dietCard(page, 'Cutting QA')
    await expect(card.getByText('Inativa')).toBeVisible()
    await expect(card.getByText('Perder gordura')).toBeVisible()
    await expect(card.getByText('2 refeições · 3 alimentos')).toBeVisible()
    await expect(card.getByText('≈ 365')).toBeVisible()
    expect((await api.listDiets()).items).toHaveLength(1)
  })

  test('valida antes de salvar e descarta linhas em branco', async ({ authedPage: page }) => {
    await page.goto('/app/diets/new')
    await page.getByRole('button', { name: 'Salvar dieta' }).click()
    await expect(page.getByText('Informe o nome da dieta')).toBeVisible()
    await expect(page.getByText('Dê um nome à refeição')).toBeVisible()

    await page.getByLabel('Nome da dieta').fill('Validação QA')
    await page.getByLabel('Nome da refeição 1').fill('Lanche')
    await expect(page.getByText('Informe o nome da dieta')).toBeHidden()
    await fillFood(page, 'Lanche', { name: 'Banana', qty: '0' })
    await expect(page.getByText('Quantidade > 0')).toBeVisible()
    await meal(page, 'Lanche').getByLabel('Quantidade de Banana').fill('120')
    await meal(page, 'Lanche').getByLabel('Calorias de Banana', { exact: true }).fill('107')
    await meal(page, 'Lanche').getByRole('button', { name: 'Adicionar alimento' }).click()

    const created = page.waitForResponse((r) => r.url().endsWith('/diets') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Salvar dieta' }).click()
    // The trailing blank row isn't sent.
    expect((await created).request().postDataJSON().meals[0].foods).toHaveLength(1)
  })

  test('IA estima calorias e marca o valor para revisão', async ({ authedPage: page }) => {
    await page.route(ESTIMATE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ kcal: 192, notes: 'arroz branco cozido, ~128 kcal/100 g', provider: 'anthropic', model: 'claude' }),
      }),
    )
    await page.goto('/app/diets/new')
    await page.getByLabel('Nome da refeição 1').fill('Almoço')
    const lunch = meal(page, 'Almoço')
    const ai = lunch.getByRole('button', { name: /Estimar calorias de .* com IA/ })
    await expect(ai).toBeDisabled()

    await fillFood(page, 'Almoço', { name: 'Arroz branco cozido', qty: '150' })
    const request = page.waitForRequest(ESTIMATE)
    await ai.click()
    expect((await request).postDataJSON()).toEqual({ name: 'Arroz branco cozido', quantity: 150, unit: 'G' })
    await expect(lunch.getByLabel('Calorias de Arroz branco cozido', { exact: true })).toHaveValue('192')
    await expect(lunch.getByText(/Estimativa da IA: arroz branco cozido, ~128 kcal\/100 g/)).toBeVisible()

    await lunch.getByLabel('Calorias de Arroz branco cozido', { exact: true }).fill('200')
    await expect(lunch.getByText(/Estimativa da IA/)).toBeHidden()
  })

  test('IA indisponível (503) desliga o botão; alimento não reconhecido mostra erro', async ({ authedPage: page }) => {
    let calls = 0
    await page.route(ESTIMATE, (route) => {
      calls += 1
      const unavailable = calls > 1
      return route.fulfill({
        status: unavailable ? 503 : 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: unavailable ? 'SERVICE_UNAVAILABLE' : 'VALIDATION_ERROR', message: 'x' } }),
      })
    })
    await page.goto('/app/diets/new')
    await page.getByLabel('Nome da refeição 1').fill('Ceia')
    const supper = meal(page, 'Ceia')
    await fillFood(page, 'Ceia', { name: 'Teclado', qty: '1' })
    const ai = supper.getByRole('button', { name: 'Estimar calorias de Teclado com IA' })

    await ai.click()
    await expect(supper.getByRole('alert')).toHaveText(/A IA não reconheceu esse alimento/)

    await ai.click()
    await expect(page.getByText('IA indisponível no momento. Digite as calorias.')).toBeVisible()
    await expect(ai).toBeDisabled()
  })

  test('ativa pela listagem; só uma ativa; aparece no início com a próxima refeição', async ({ authedPage: page, api }) => {
    const a = await api.createDiet({
      name: 'Dieta A',
      meals: [
        { name: 'Café', time: '00:00', foods: [{ name: 'Ovo', quantity: 100, unit: 'G', kcal: 155 }] },
        { name: 'Ceia tardia', time: '23:59', foods: [] },
      ],
    })
    await api.createDiet({ name: 'Dieta B', meals: [] })
    await api.activateDiet(a.id)

    await page.goto('/app/diets')
    // Active diet comes first.
    await expect(page.getByRole('article').first()).toHaveAccessibleName('Dieta A')
    await expect(dietCard(page, 'Dieta A').getByText('Ativa agora')).toBeVisible()

    await dietCard(page, 'Dieta B').getByRole('button', { name: 'Ativar dieta' }).click()
    await expect(page.getByText('Dieta B é a dieta ativa agora.')).toBeVisible()
    await expect(dietCard(page, 'Dieta B').getByText('Ativa agora')).toBeVisible()
    await expect(dietCard(page, 'Dieta A').getByText('Inativa')).toBeVisible()

    await page.goto('/app')
    await expect(page.getByRole('link', { name: 'Dieta ativa: Dieta B' })).toBeVisible()

    await api.activateDiet(a.id)
    await page.reload()
    const card = page.getByRole('link', { name: 'Dieta ativa: Dieta A' })
    await expect(card).toContainText('≈ 155')
    // Every time from 00:00 on is at or before 23:59, so the next meal is always "Ceia tardia" (or "Café" exactly at midnight).
    await expect(card).toContainText(/Próxima refeição(Ceia tardia|Café)/)
  })

  test('edita: substitui refeições e liga/desliga pelo editor', async ({ authedPage: page, api }) => {
    const diet = await api.createDiet({
      name: 'Bulking QA',
      goal: 'Ganho de massa',
      meals: [{ name: 'Almoço', time: '12:00', foods: [{ name: 'Frango', quantity: 150, unit: 'G', kcal: 250 }] }],
    })
    await page.goto('/app/diets')
    await dietCard(page, 'Bulking QA').getByRole('link', { name: 'Editar dieta' }).click()

    await expect(page.getByRole('heading', { name: 'Editar dieta' })).toBeVisible()
    await expect(page.getByLabel('Objetivo')).toHaveValue('Ganho de massa')
    await expect(meal(page, 'Almoço').getByLabel('Calorias de Frango', { exact: true })).toHaveValue('250')

    await meal(page, 'Almoço').getByLabel('Calorias de Frango', { exact: true }).fill('300')
    await page.getByLabel('Objetivo').fill('')
    const toggle = page.getByRole('switch', { name: /Dieta ativa/ })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()

    await page.getByRole('button', { name: 'Salvar dieta' }).click()
    await expect(page.getByText('Dieta atualizada.')).toBeVisible()
    const saved = await api.getDiet(diet.id)
    expect(saved).toMatchObject({ isActive: true, goal: null, totalKcal: 300 })
    await expect(dietCard(page, 'Bulking QA').getByText('Ativa agora')).toBeVisible()
  })

  test('exclui dieta', async ({ authedPage: page, api }) => {
    await api.createDiet({ name: 'Excluir QA' })
    await page.goto('/app/diets')
    page.once('dialog', (d) => d.accept())
    await dietCard(page, 'Excluir QA').getByRole('button', { name: 'Excluir dieta' }).click()
    await expect(page.getByText('Dieta excluída.')).toBeVisible()
    await expect(page.getByText('Nenhuma dieta ainda')).toBeVisible()
  })

  test('dieta de outro usuário não abre', async ({ authedPage: page }) => {
    await page.goto('/app/diets/00000000-0000-4000-8000-000000000000')
    await expect(page.getByText('Dieta não encontrada')).toBeVisible()
  })
})
