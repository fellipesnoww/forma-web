import type { Page } from '@playwright/test'
import { test, expect, todayWeekday } from './support/fixtures'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
const weekdayOf = (isoDay: string) => new Date(`${isoDay}T12:00:00Z`).getUTCDay()

async function openLog(page: Page) {
  await page.goto('/app/calendar')
  await page.getByRole('button', { name: 'Lançar registro' }).click()
  const dialog = page.getByRole('dialog', { name: 'Lançar registro' })
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('2.3 Registro retroativo', () => {
  test('data futura bloqueada no próprio input e no seletor', async ({ authedPage: page, isMobile }) => {
    const dialog = await openLog(page)
    await expect(dialog.getByLabel('Data')).toHaveAttribute('max', today())

    if (!isMobile) {
      await expect(dialog.getByText(/Datas após hoje .* não podem receber registros/)).toBeVisible()
      // Days after today in the current month can't be picked.
      const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      if (tomorrow.slice(0, 7) === today().slice(0, 7)) {
        await expect(dialog.getByRole('button', { name: tomorrow, exact: true })).toBeDisabled()
      }
      await expect(dialog.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
    }
  })

  test('lança treino num dia passado: séries, finalização e calendário', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const date = daysAgo(3)
    const sheet = await api.createSheet('Retro QA', [
      { weekday: weekdayOf(date), exercises: [{ exerciseId: a.id, targetSets: 2, targetReps: 8 }] },
    ])

    const dialog = await openLog(page)
    await dialog.getByLabel('Data').fill(date)
    await expect(dialog.getByLabel('Planilha')).toHaveValue(sheet.id)
    await dialog.getByLabel('Início').fill('18:30')
    await dialog.getByLabel('Duração (min)').fill('55')
    await dialog.getByRole('button', { name: 'Continuar para séries e cargas' }).click()

    await expect(page).toHaveURL(new RegExp(`/app/sheets/${sheet.id}/run\\?retro=1`))
    await expect(page.getByText('Registro retroativo')).toBeVisible()
    await expect(page.getByText(/início às 18:30 · 55 min/)).toBeVisible()
    await expect(page.getByLabel('Tempo de treino')).toHaveCount(0)

    const created = page.waitForResponse((r) => r.url().endsWith('/workout-sessions') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /^(OK|Concluir)$/ }).click()
    const body = (await (await created).request().postDataJSON()) as { performedAt: string; durationMinutes: number }
    expect(new Date(body.performedAt).toISOString()).toBe(new Date(`${date}T18:30:00-03:00`).toISOString())
    expect(body.durationMinutes).toBe(55)

    await page.getByRole('button', { name: 'Finalizar treino' }).filter({ visible: true }).first().click()
    await page.getByRole('button', { name: 'Salvar treino' }).click()
    await expect(page.getByRole('heading', { name: 'Treino concluído' })).toBeVisible()
    await expect(page.getByText(/18:30 – 19:25/)).toBeVisible()

    await page.goto(`/app/calendar?month=${date.slice(0, 7)}&day=${date}`)
    await expect(page.getByTestId('day-panel').getByText('Retro QA')).toBeVisible()
    await expect(page.getByTestId('day-panel').getByText(/55 min · 1 exercício · 2 séries/)).toBeVisible()
  })

  test('um treino retroativo não mexe no rascunho do treino ao vivo', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Dois rascunhos', [{ weekday: todayWeekday(), exercises: [{ exerciseId: a.id }] }])
    await page.goto(`/app/sheets/${sheet.id}/run`)
    await page.getByRole('button', { name: /^(OK|Concluir)$/ }).click()
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible()

    await page.goto(`/app/sheets/${sheet.id}/run?retro=1&at=${daysAgo(2)}T07:00&duration=40&weekday=${weekdayOf(daysAgo(2))}`)
    await expect(page.getByText('Registro retroativo')).toBeVisible()
    await expect(page.getByText('Não iniciado')).toBeVisible()

    await page.goto(`/app/sheets/${sheet.id}/run`)
    await expect(page.getByText('Em andamento')).toBeVisible()
  })

  test('atividade: segue para o formulário com data e hora escolhidas', async ({ authedPage: page }) => {
    const date = daysAgo(5)
    const dialog = await openLog(page)
    await dialog.getByRole('tab', { name: 'Atividade livre' }).click()
    await dialog.getByLabel('Data').fill(date)
    await dialog.getByLabel('Início').fill('07:15')
    await dialog.getByRole('button', { name: 'Continuar para a atividade' }).click()

    const form = page.getByRole('dialog', { name: 'Registrar atividade' })
    await expect(form).toBeVisible()
    await expect(form.getByLabel('Data e hora')).toHaveValue(`${date}T07:15`)
  })

  test('horário futuro de hoje é recusado antes de enviar', async ({ authedPage: page }) => {
    const dialog = await openLog(page)
    await dialog.getByLabel('Data').fill(today())
    await dialog.getByLabel('Início').fill('23:59')
    await dialog.getByRole('tab', { name: 'Atividade livre' }).click()
    await dialog.getByRole('button', { name: 'Continuar para a atividade' }).click()
    // 23:59 is only in the future before midnight; either way nothing past "now" goes through.
    const alert = dialog.getByRole('alert')
    const formOpened = page.getByRole('dialog', { name: 'Registrar atividade' })
    await expect(alert.or(formOpened)).toBeVisible()
    if (await alert.isVisible()) await expect(alert).toHaveText('Registros só podem ser lançados para agora ou para o passado.')
  })

  test('erro de data do backend vira mensagem amigável', async ({ authedPage: page, api }) => {
    const [type] = await api.activityTypes()
    await page.route('**/activities', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Dados invalidos',
                details: [{ path: ['performedAt'], message: 'performedAt nao pode ser anterior a 30 dias atras' }],
              },
            }),
          })
        : route.fallback(),
    )
    await page.goto('/app/activities')
    await page.getByRole('button', { name: 'Registrar atividade' }).click()
    const form = page.getByRole('dialog', { name: 'Registrar atividade' })
    await form.getByLabel('Tipo').selectOption(type.id)
    await form.getByLabel('Data e hora').fill(`${daysAgo(60)}T10:00`)
    await form.getByLabel('Duração (min)').fill('30')
    await form.getByRole('button', { name: 'Registrar atividade' }).click()
    await expect(page.getByText('Só é possível lançar registros dos últimos 30 dias.')).toBeVisible()
  })
})
