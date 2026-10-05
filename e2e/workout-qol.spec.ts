import { test, expect, todayWeekday } from './support/fixtures'

const CONCLUDE = /^(OK|Concluir)$/

test.describe('5.1 Qualidade de vida no treino', () => {
  test('cronômetro de descanso usa o tempo do exercício, com ±15 s e pausa', async ({ authedPage: page, api, isMobile }) => {
    await page.clock.install()
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Descanso QA', [
      { weekday: todayWeekday(), exercises: [{ exerciseId: a.id, targetSets: 3, targetReps: 10, defaultRestSeconds: 60 }] },
    ])
    await page.goto(`/app/sheets/${sheet.id}/run`)
    await page.getByRole('button', { name: CONCLUDE }).click()

    if (isMobile) {
      const pill = page.getByRole('button', { name: /^Descanso 1:00/ })
      await expect(pill).toBeVisible()
      await page.clock.runFor(10_000)
      await expect(page.getByRole('button', { name: /^Descanso 0:50/ })).toBeVisible()
      return
    }

    const rest = page.getByRole('region', { name: 'Descanso' })
    await expect(rest.getByRole('timer')).toHaveText('1:00')
    await expect(rest.getByText('de 1:00 · configurado para este exercício')).toBeVisible()

    await page.clock.runFor(20_000)
    await expect(rest.getByRole('timer')).toHaveText('0:40')

    await rest.getByRole('button', { name: 'Mais 15 segundos' }).click()
    await expect(rest.getByRole('timer')).toHaveText('0:55')
    await rest.getByRole('button', { name: 'Menos 15 segundos' }).click()
    await expect(rest.getByRole('timer')).toHaveText('0:40')

    await rest.getByRole('button', { name: 'Pausar descanso' }).click()
    await page.clock.runFor(10_000)
    await expect(rest.getByRole('timer')).toHaveText('0:40')
    await rest.getByRole('button', { name: 'Retomar descanso' }).click()

    await page.clock.runFor(41_000)
    await expect(rest.getByText(/Descanso concluído/)).toBeVisible()
  })

  test('sugestão de carga vem da última sessão e preenche as séries', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Sugestão QA', [
      { weekday: todayWeekday(), exercises: [{ exerciseId: a.id, targetSets: 2, targetReps: 8 }] },
    ])
    const past = await api.createSession({
      sheetId: sheet.id,
      performedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      exercises: [
        {
          exerciseId: a.id,
          sets: [
            { reps: 10, weightKg: 50, completed: true },
            { reps: 8, weightKg: 60, completed: true },
          ],
        },
      ],
    })
    await api.completeSession(past.id)

    await page.goto(`/app/sheets/${sheet.id}/run`)
    // Every set done and the target reached last time → one 2,5 kg step up.
    await expect(page.getByRole('button', { name: 'Sugestão: 62,5 kg · última 60 × 8' })).toBeVisible()
    await expect(page.getByLabel('Série 1 · carga em kg')).toHaveValue('62,5')

    await page.getByLabel('Série 1 · carga em kg').fill('70')
    await page.getByLabel('Série 1 · carga em kg').blur()
    await page.getByRole('button', { name: /Sugestão/ }).click()
    await expect(page.getByLabel('Série 1 · carga em kg')).toHaveValue('62,5')
  })

  test('sem histórico não há sugestão e a carga começa em 0', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Sem histórico', [{ weekday: todayWeekday(), exercises: [{ exerciseId: a.id }] }])
    await page.goto(`/app/sheets/${sheet.id}/run`)
    await expect(page.getByLabel('Série 1 · carga em kg')).toHaveValue('0')
    await expect(page.getByRole('button', { name: /Sugestão/ })).toHaveCount(0)
  })

  test('duplica planilha pela listagem', async ({ authedPage: page, api }) => {
    const [a, b] = await api.catalog()
    await api.createSheet('Original QA', [
      { weekday: 1, exercises: [{ exerciseId: a.id, targetSets: 4, targetReps: 10, defaultRestSeconds: 90 }] },
      { weekday: 4, exercises: [{ exerciseId: b.id }] },
    ])
    await page.goto('/app/sheets')
    await page.getByRole('article', { name: 'Original QA' }).getByRole('button', { name: 'Duplicar planilha' }).click()

    await expect(page.getByText('Planilha duplicada: Original QA (copia).')).toBeVisible()
    const copy = page.getByRole('article', { name: 'Original QA (copia)' })
    await expect(copy).toBeVisible()
    await expect(page.getByText('2 criadas')).toBeVisible()

    await copy.getByRole('link', { name: 'Editar planilha' }).click()
    await expect(page.getByText('4 × 10 · descanso 1:30')).toBeVisible()
  })

  test('séries, repetições e descanso editáveis na planilha', async ({ authedPage: page, api }) => {
    const [a] = await api.catalog()
    const sheet = await api.createSheet('Alvos QA', [{ weekday: 2, exercises: [{ exerciseId: a.id }] }])
    await page.goto(`/app/sheets/${sheet.id}`)

    await page.getByLabel(`Séries de ${a.name}`).fill('4')
    await page.getByLabel(`Repetições de ${a.name}`).fill('12')
    await page.getByLabel(`Descanso em segundos de ${a.name}`).fill('75')
    await page.getByLabel(`Descanso em segundos de ${a.name}`).blur()
    await expect(page.getByText('4 × 12 · descanso 1:15')).toBeVisible()

    await page.getByRole('button', { name: 'Salvar planilha' }).click()
    await expect(page.getByText('Planilha atualizada.')).toBeVisible()
    const saved = (await api.call<{ days: { exercises: { targetSets: number; targetReps: number; defaultRestSeconds: number }[] }[] }>(
      'GET',
      `/workout-sheets/${sheet.id}`,
    )).days[0].exercises[0]
    expect(saved).toMatchObject({ targetSets: 4, targetReps: 12, defaultRestSeconds: 75 })
  })
})
