import type { Page } from '@playwright/test'
import type { Api } from './support/api'
import { test, expect, pngBuffer } from './support/fixtures'

/**
 * Seeds go into the previous month: always in the past and never split across a month boundary,
 * whatever day the suite runs on.
 */
function previousMonth() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [y, m] = today.split('-').map(Number)
  const index = y * 12 + (m - 1) - 1
  return { current: today.slice(0, 7), prev: `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}` }
}

const { current: CURRENT, prev: PREV } = previousMonth()
const day = (n: number) => `${PREV}-${String(n).padStart(2, '0')}`
/** Local São Paulo time (the profile's default timezone and the browser's in the config). */
const at = (isoDay: string, time: string) => `${isoDay}T${time}:00-03:00`

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
/** Same formatting as the app: "Sábado, 3 de outubro". */
const dayTitle = (isoDay: string) =>
  capitalize(
    new Date(`${isoDay}T12:00:00Z`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }),
  )
/** "Outubro 2026" */
const monthTitle = (month: string) =>
  capitalize(
    new Date(`${month}-01T12:00:00Z`)
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .replace(' de ', ' '),
  )

/** Calendar cell; its accessible name carries the day and its counts. */
const dayButton = (page: Page, isoDay: string, summary: string) =>
  page.getByRole('button', { name: `${dayTitle(isoDay)}: ${summary}`, exact: true })

/** "Detalhe do dia": side panel on desktop, card under the grid on mobile. */
const dayView = (page: Page) => page.getByTestId('day-panel')

async function seedSession(api: Api, performedAt: string, { photo = false, name = 'Treino A' } = {}) {
  const [exercise] = await api.catalog()
  const sheet = await api.createSheet(name, [{ weekday: 1, exercises: [{ exerciseId: exercise.id }] }])
  const session = await api.createSession({
    sheetId: sheet.id,
    performedAt,
    exercises: [{ exerciseId: exercise.id, sets: [{ reps: 10, weightKg: 20, completed: true }] }],
  })
  if (photo) await api.uploadSessionPhoto(session.id, pngBuffer())
  return session
}

async function seedActivity(
  api: Api,
  performedAt: string,
  { type = 'Corrida', minutes = 45, comment, photo = false }: { type?: string; minutes?: number; comment?: string; photo?: boolean } = {},
) {
  const activityType = (await api.activityTypes()).find((t) => t.name === type)!
  const activity = await api.createActivity({ activityTypeId: activityType.id, durationMinutes: minutes, performedAt, comment })
  if (photo) await api.uploadActivityPhoto(activity.id, pngBuffer())
  return activity
}

test.describe('2.2 Calendário', () => {
  test('grade em todos os tamanhos: células altas no desktop, compactas no mobile', async ({ authedPage: page, isMobile }) => {
    await page.goto('/app/calendar')
    await expect(page.getByRole('heading', { level: 1, name: 'Calendário' })).toBeVisible()
    await expect(page.getByRole('heading', { name: monthTitle(CURRENT) })).toBeVisible()

    const grid = page.getByTestId('calendar-grid')
    await expect(grid).toBeVisible()
    await expect(grid.getByText('SEG', { exact: true })).toBeVisible({ visible: !isMobile })

    const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const todayCell = dayButton(page, todayIso, 'sem registros')
    const box = (await todayCell.boundingBox())!
    if (isMobile) expect(box.height).toBeLessThanOrEqual(60)
    else expect(box.height).toBeGreaterThanOrEqual(100)

    // The current month opens on today.
    await expect(todayCell).toHaveAttribute('aria-pressed', 'true')
    await expect(dayView(page).getByRole('heading', { name: dayTitle(todayIso) })).toBeVisible()
    await expect(dayView(page).getByText('Nada registrado neste dia.')).toBeVisible()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('marca dias com treino e atividade, com miniatura da foto', async ({ authedPage: page, api }) => {
    await seedSession(api, at(day(10), '08:00'), { photo: true })
    await seedActivity(api, at(day(10), '18:00'), { photo: true })
    await seedActivity(api, at(day(11), '07:00'), { minutes: 90 })

    await page.goto(`/app/calendar?month=${PREV}`)
    await expect(page.getByRole('heading', { name: monthTitle(PREV) })).toBeVisible()

    const both = dayButton(page, day(10), '1 treino, 1 atividade')
    const activityOnly = dayButton(page, day(11), '1 atividade')
    await expect(both).toBeVisible()
    await expect(activityOnly).toBeVisible()
    await expect(dayButton(page, day(12), 'sem registros')).toBeVisible()
    // One thumbnail per cell (the day's oldest photo), as in the design.
    await expect(both.locator('img')).toHaveCount(1)
    await expect(activityOnly.locator('img')).toHaveCount(0)
    // Another month without `day` has nothing selected.
    await expect(page.getByText('Selecione um dia para ver os detalhes.')).toBeVisible()
  })

  test('detalhe do dia lista treinos e atividades e abre a sessão', async ({ authedPage: page, api }) => {
    const session = await seedSession(api, at(day(10), '08:00'), { name: 'Treino Peito' })
    await seedActivity(api, at(day(10), '18:30'), { type: 'Futebol', minutes: 60, comment: 'Pelada com a turma' })

    await page.goto(`/app/calendar?month=${PREV}`)
    await dayButton(page, day(10), '1 treino, 1 atividade').click()
    await expect(page).toHaveURL(new RegExp(`day=${day(10)}`))
    await expect(dayButton(page, day(10), '1 treino, 1 atividade')).toHaveAttribute('aria-pressed', 'true')

    const view = dayView(page)
    await expect(view.getByRole('heading', { name: dayTitle(day(10)) })).toBeVisible()
    await expect(view.getByText('1 treino · 1 atividade · 1 h')).toBeVisible()
    await expect(view.getByText('Treino Peito')).toBeVisible()
    await expect(view.getByText('Em andamento')).toBeVisible()
    await expect(view.getByRole('button', { name: 'Editar Futebol às 18:30' })).toContainText('1 h · 18:30')
    await expect(view.getByText('Pelada com a turma')).toBeVisible()

    await view.getByRole('link', { name: /Treino Peito/ }).click()
    await expect(page).toHaveURL(new RegExp(`/app/sessions/${session.id}$`))
  })

  test('dia sem registro mostra estado vazio', async ({ authedPage: page }) => {
    await page.goto(`/app/calendar?month=${PREV}`)
    await dayButton(page, day(5), 'sem registros').click()
    await expect(dayView(page).getByText('Nada registrado neste dia.')).toBeVisible()
  })

  test('link direto com mês e dia abre o detalhe', async ({ authedPage: page, api }) => {
    await seedActivity(api, at(day(20), '06:15'), { type: 'Natação', minutes: 30 })
    await page.goto(`/app/calendar?month=${PREV}&day=${day(20)}`)
    await expect(dayView(page).getByRole('button', { name: 'Editar Natação às 06:15' })).toBeVisible()

    await page.goto(`/app/calendar?month=${PREV}&day=${day(21)}`)
    await expect(dayView(page).getByText('Nada registrado neste dia.')).toBeVisible()
  })

  test('lança atividade livre no dia selecionado', async ({ authedPage: page, api }) => {
    await page.goto(`/app/calendar?month=${PREV}&day=${day(8)}`)
    await dayView(page).getByRole('button', { name: 'Lançar atividade livre' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Registrar atividade' })).toBeVisible()
    await expect(dialog.getByLabel('Data e hora')).toHaveValue(`${day(8)}T12:00`)
    await expect(dialog.getByLabel('Tipo', { exact: true }).locator('option', { hasText: 'Yoga' })).toHaveCount(1)
    await dialog.getByLabel('Tipo', { exact: true }).selectOption({ label: 'Yoga' })
    await dialog.getByLabel('Duração (min)').fill('40')
    await dialog.getByRole('button', { name: 'Registrar atividade' }).click()

    await expect(dialog).toBeHidden()
    await expect(dayView(page).getByRole('button', { name: 'Editar Yoga às 12:00' })).toBeVisible()
    await expect(dayButton(page, day(8), '1 atividade')).toBeVisible()
    const [activity] = (await api.listActivities()).items
    expect(new Date(activity.performedAt).toISOString()).toBe(new Date(at(day(8), '12:00')).toISOString())
  })

  test('navega entre meses e volta para hoje', async ({ authedPage: page }) => {
    await page.goto('/app/calendar')
    await expect(page.getByRole('heading', { name: monthTitle(CURRENT) })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Hoje' })).toBeHidden()

    await page.getByRole('button', { name: 'Mês anterior' }).click()
    await expect(page.getByRole('heading', { name: monthTitle(PREV) })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`month=${PREV}`))
    await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeEnabled()

    await page.getByRole('button', { name: 'Hoje' }).click()
    await expect(page.getByRole('heading', { name: monthTitle(CURRENT) })).toBeVisible()
    await expect(page).toHaveURL(/\/app\/calendar$/)
  })

  test('edita atividade a partir do dia e o calendário atualiza', async ({ authedPage: page, api }) => {
    const activity = await seedActivity(api, at(day(10), '18:00'), { minutes: 45 })
    await page.goto(`/app/calendar?month=${PREV}&day=${day(10)}`)

    const view = dayView(page)
    await view.getByRole('button', { name: 'Editar Corrida às 18:00' }).click()
    const edit = page.getByRole('dialog')
    await expect(edit.getByRole('heading', { name: 'Editar atividade' })).toBeVisible()
    await expect(edit.getByLabel('Duração (min)')).toHaveValue('45')
    await edit.getByLabel('Duração (min)').fill('60')
    await edit.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(edit).toBeHidden()
    await expect(view.getByText('1 atividade · 1 h')).toBeVisible()
    expect((await api.getActivity(activity.id)).durationMinutes).toBe(60)
  })

  test('registro às 23h30 locais fica no dia local, não no dia UTC', async ({ authedPage: page, api }) => {
    // 23:30 in São Paulo is already the next day in UTC.
    await seedActivity(api, at(day(12), '23:30'))
    await page.goto(`/app/calendar?month=${PREV}`)
    await expect(dayButton(page, day(12), '1 atividade')).toBeVisible()
    await expect(dayButton(page, day(13), 'sem registros')).toBeVisible()
  })
})

test.describe('2.2 Calendário · fuso do navegador', () => {
  test.use({ timezoneId: 'Asia/Tokyo' })

  test('grava o fuso do navegador no perfil e reagrupa os dias', async ({ authedPage: page, api }) => {
    expect((await api.profile()).timezone).toBe('America/Sao_Paulo')
    // 23:30 in São Paulo = 11:30 of the next day in Tokyo.
    await seedActivity(api, at(day(12), '23:30'))

    const patched = page.waitForResponse((r) => r.url().endsWith('/profile') && r.request().method() === 'PATCH')
    await page.goto(`/app/calendar?month=${PREV}`)
    expect((await patched).ok()).toBeTruthy()
    expect((await api.profile()).timezone).toBe('Asia/Tokyo')

    await expect(dayButton(page, day(13), '1 atividade')).toBeVisible()
    await expect(dayButton(page, day(12), 'sem registros')).toBeVisible()
  })

  test('não regrava o fuso quando o perfil já está igual', async ({ authedPage: page, api }) => {
    await api.setTimezone('Asia/Tokyo')
    let patches = 0
    page.on('request', (r) => {
      if (r.url().endsWith('/profile') && r.method() === 'PATCH') patches++
    })
    await page.goto(`/app/calendar?month=${PREV}`)
    await expect(page.getByRole('heading', { name: monthTitle(PREV) })).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(patches).toBe(0)
  })
})
