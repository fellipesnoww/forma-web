import { test, expect, todayWeekday } from './support/fixtures'

test.describe('Início · dashboard', () => {
  test('conta nova: convida a criar a primeira planilha', async ({ authedPage: page }) => {
    await page.goto('/app')
    await expect(page.getByText('Monte seu primeiro treino')).toBeVisible()
    await expect(page.getByText('sem planilha ativa')).toBeVisible()
    await expect(page.getByText('nenhuma este mês')).toBeVisible()
  })

  test('treino de hoje, volume da semana e atividades do mês', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Treino Hoje QA', [
      { weekday: todayWeekday(), exercises: [{ exerciseId: a.id, targetSets: 3, targetReps: 10 }] },
    ])
    await api.createSession({
      sheetId: sheet.id,
      exercises: [{ exerciseId: a.id, sets: [{ reps: 10, weightKg: 50, completed: true }] }],
    })
    const [type] = await api.activityTypes()
    await api.createActivity({ activityTypeId: type.id, durationMinutes: 30 })

    await page.goto('/app')
    const today = page.getByRole('region', { name: 'Treino de hoje' })
    await expect(today.getByText('TREINO DE HOJE')).toBeVisible()
    await expect(today.getByText('Treino Hoje QA')).toBeVisible()
    await expect(today.getByText('1 exercício')).toBeVisible()
    await expect(page.getByText('Treino Hoje QA programado para hoje')).toBeVisible()

    await expect(page.getByText('500 kg')).toBeVisible()
    await expect(page.getByText(type.name.toLowerCase())).toBeVisible()

    await today.getByRole('link', { name: 'Iniciar treino' }).click()
    await expect(page).toHaveURL(new RegExp(`/app/sheets/${sheet.id}/run$`))
  })
})
