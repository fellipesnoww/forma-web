import { test, expect } from './support/fixtures'
import type { Api } from './support/api'

/** Local São Paulo day `n` days ago (the browser and profile timezone in the config). */
function daysAgo(n: number) {
  const d = new Date(Date.now() - n * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
const at = (isoDay: string) => `${isoDay}T10:00:00-03:00`

/** Three training days of one exercise: 10, 40 and 75 days ago, heaviest set rising. */
async function seedLoadHistory(api: Api) {
  const [a] = await api.catalog()
  const sheet = await api.createSheet('Progressão QA', [{ weekday: 1, exercises: [{ exerciseId: a.id }] }])
  for (const [ago, kg] of [
    [75, 40],
    [40, 50],
    [10, 60],
  ] as const) {
    await api.createSession({
      sheetId: sheet.id,
      performedAt: at(daysAgo(ago)),
      exercises: [{ exerciseId: a.id, sets: [{ reps: 10, weightKg: kg, completed: true }] }],
    })
  }
  return a
}

const chartRows = (page: import('@playwright/test').Page) =>
  page.getByTestId('progress-chart').locator('table tbody tr')

test.describe('2.4 Gráficos de progressão', () => {
  test('abre no exercício do último treino com a carga máxima por dia', async ({ authedPage: page, api }) => {
    const a = await seedLoadHistory(api)
    await page.goto('/app/progress')

    await expect(page.getByRole('heading', { level: 1, name: 'Evolução' })).toBeVisible()
    await expect(page.getByLabel('Exercício')).toHaveValue(`catalog:${a.id}`)
    await expect(page.getByRole('heading', { name: `Progressão de carga — ${a.name}` })).toBeVisible()
    await expect(chartRows(page)).toHaveCount(3)
    await expect(page.getByText('↑ 50% em 90 dias')).toBeVisible()
    await expect(page.getByRole('img', { name: /Carga máxima por dia/ })).toBeVisible()
  })

  test('filtros de período 30/60/90 e personalizado', async ({ authedPage: page, api }) => {
    await seedLoadHistory(api)
    await page.goto('/app/progress')
    await expect(chartRows(page)).toHaveCount(3)

    const loaded = page.waitForResponse((r) => r.url().includes('/progress/load') && r.url().includes('period=30'))
    await page.getByRole('radio', { name: '30d' }).click()
    await loaded
    await expect(page).toHaveURL(/period=30/)
    await expect(chartRows(page)).toHaveCount(1)

    await page.getByRole('radio', { name: '60d' }).click()
    await expect(chartRows(page)).toHaveCount(2)

    await page.getByRole('radio', { name: 'Personalizado' }).click()
    await expect(page.getByText('Escolha o início e o fim do período.')).toBeVisible()
    await page.getByLabel('De').fill(daysAgo(50))
    await page.getByLabel('Até').fill(daysAgo(30))
    await expect(chartRows(page)).toHaveCount(1)

    await page.getByLabel('De').fill(daysAgo(5))
    await expect(page.getByText('O início precisa ser antes do fim.')).toBeVisible()
  })

  test('medidas corporais por métrica', async ({ authedPage: page, api }) => {
    await api.addMeasurement({ weightKg: 70, waistCm: 80 })
    await api.addMeasurement({ weightKg: 68.5 })
    await page.goto('/app/progress?view=measures')

    await expect(page.getByRole('heading', { name: 'Peso corporal' })).toBeVisible()
    await expect(chartRows(page)).toHaveCount(2)
    await expect(page.getByText('↓ 1,5 kg em 90 dias')).toBeVisible()

    await page.getByRole('button', { name: 'Cintura' }).click()
    await expect(page.getByRole('heading', { name: 'Cintura' })).toBeVisible()
    await expect(chartRows(page)).toHaveCount(1)

    await page.getByRole('button', { name: 'Peitoral' }).click()
    await expect(page.getByText('Nenhuma medida registrada no período.', { exact: false })).toBeVisible()
  })

  test('estado vazio sem histórico do exercício', async ({ authedPage: page }) => {
    await page.goto('/app/progress')
    await expect(page.getByText('Nenhum treino com este exercício no período.')).toBeVisible()
  })

  test('gráfico acompanha o container, sem overflow horizontal', async ({ authedPage: page, api }) => {
    await seedLoadHistory(api)
    await page.goto('/app/progress')
    await expect(chartRows(page)).toHaveCount(3)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    const chart = await page.getByRole('img', { name: /Carga máxima por dia/ }).boundingBox()
    const viewport = page.viewportSize()!
    expect(chart!.x + chart!.width).toBeLessThanOrEqual(viewport.width)
  })
})
