import type { Page } from '@playwright/test'
import { test, expect, pngBuffer, todayWeekday, WEEKDAY_LABELS } from './support/fixtures'
import type { Api, CatalogExercise, SeedSheet } from './support/api'

const CONCLUDE = /^(OK|Concluir)$/

/** Sheet whose first day is today, so the run screen opens on it. Optionally a second day. */
async function seedSheet(api: Api, { extraDay = false, name = 'Treino QA' } = {}) {
  const [a, b, c] = await api.catalog()
  const today = todayWeekday()
  const days = [
    {
      weekday: today,
      exercises: [
        { exerciseId: a.id, targetSets: 3, targetReps: 10 },
        { exerciseId: b.id, targetSets: 2, targetReps: 12 },
      ],
    },
  ]
  if (extraDay) days.push({ weekday: (today + 3) % 7, exercises: [{ exerciseId: c.id, targetSets: 4, targetReps: 8 }] })
  const sheet = await api.createSheet(name, days)
  return { sheet, a, b, c, today }
}

const sessionCreated = (page: Page) =>
  page.waitForResponse((r) => r.url().endsWith('/workout-sessions') && r.request().method() === 'POST')
const sessionPatched = (page: Page) =>
  page.waitForResponse((r) => /\/workout-sessions\/[\w-]+$/.test(r.url()) && r.request().method() === 'PATCH')

async function openRun(page: Page, sheet: SeedSheet) {
  await page.goto(`/app/sheets/${sheet.id}/run`)
  await expect(page.getByRole('button', { name: CONCLUDE })).toBeVisible()
}

/** Completes the active set and waits for the session to exist on the server. Returns its id. */
async function completeFirstSet(page: Page) {
  const created = sessionCreated(page)
  await page.getByRole('button', { name: CONCLUDE }).click()
  const res = await created
  expect(res.status()).toBe(201)
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
  return ((await res.json()) as { id: string }).id
}

test.describe('1.5 Execução de treino', () => {
  test('abre no dia de hoje com séries e repetições alvo da planilha', async ({ authedPage: page, api }) => {
    const { sheet, a, b, today } = await seedSheet(api)
    await openRun(page, sheet)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Treino QA · ${WEEKDAY_LABELS[today]}`)
    await expect(page.getByRole('heading', { level: 2, name: a.name })).toBeVisible()
    await expect(page.getByText('Série 1 de 3 · alvo 10 reps')).toBeVisible()
    await expect(page.getByLabel('Série 1 · repetições')).toHaveValue('10')
    await expect(page.getByLabel('Série 1 · carga em kg')).toHaveValue('0')
    await expect(page.getByText('Não iniciado')).toBeVisible()
    await expect(page.getByLabel('Tempo de treino')).toHaveText(/\d{2}:\d{2}/)
    await expect(page.getByRole('button', { name: b.name })).toBeVisible()
  })

  test('troca o dia antes de começar; depois da primeira série o dia fica fixo', async ({ authedPage: page, api }) => {
    const { sheet, c, today } = await seedSheet(api, { extraDay: true })
    const otherDay = WEEKDAY_LABELS[(today + 3) % 7]
    await openRun(page, sheet)

    await page.getByRole('button', { name: otherDay, exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: c.name })).toBeVisible()
    await expect(page.getByText('Série 1 de 4 · alvo 8 reps')).toBeVisible()

    await completeFirstSet(page)
    await expect(page.getByText('Dia do treino')).toBeHidden()
    await expect(page.getByText('Em andamento')).toBeVisible()
  })

  test('concluir série cria a sessão, leva carga para a próxima e aceita vírgula', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)

    await page.getByLabel('Série 1 · repetições').fill('8')
    await page.getByLabel('Série 1 · carga em kg').fill('62,5')
    const id = await completeFirstSet(page)

    await expect(page.getByRole('button', { name: 'Desfazer Série 1' })).toBeVisible()
    await expect(page.getByLabel('Série 2 · repetições')).toHaveValue('8')
    await expect(page.getByLabel('Série 2 · carga em kg')).toHaveValue('62,5')

    const session = await api.getSession(id)
    expect(session.completedAt).toBeNull()
    expect(session.exercises[0].sets[0]).toMatchObject({ reps: 8, weightKg: 62.5, completed: true })
    expect(session.exercises[0].sets[1]).toMatchObject({ completed: false })
  })

  test('alterações seguintes são sincronizadas via PATCH', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    const id = await completeFirstSet(page)

    const patched = sessionPatched(page)
    await page.getByRole('button', { name: CONCLUDE }).click()
    expect((await patched).ok()).toBeTruthy()
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible()

    const session = await api.getSession(id)
    expect(session.exercises[0].sets.filter((s) => s.completed)).toHaveLength(2)
  })

  test('desfaz série concluída', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    await completeFirstSet(page)

    await page.getByRole('button', { name: 'Desfazer Série 1' }).click()
    await expect(page.getByLabel('Série 1 · repetições')).toBeVisible()
    await expect(page.getByText('Série 1 de 3 · alvo 10 reps')).toBeVisible()
  })

  test('adiciona e remove séries (mínimo de uma)', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)

    await page.getByRole('button', { name: 'Série', exact: true }).click()
    await expect(page.getByText('Série 1 de 4 · alvo 10 reps')).toBeVisible()

    const remove = page.getByRole('button', { name: 'Remover última' })
    for (let i = 0; i < 3; i++) await remove.click()
    await expect(page.getByText('Série 1 de 1 · alvo 10 reps')).toBeVisible()
    await expect(remove).toBeDisabled()
  })

  test('navega entre exercícios', async ({ authedPage: page, api, isMobile }) => {
    const { sheet, a, b } = await seedSheet(api)
    await openRun(page, sheet)

    if (isMobile) {
      await page.getByRole('button', { name: 'Próximo', exact: true }).click()
      await expect(page.getByRole('heading', { level: 2, name: b.name })).toBeVisible()
      // Last exercise: the docked bar turns into "Finalizar treino".
      await expect(page.getByRole('button', { name: 'Finalizar treino' })).toHaveCount(2)
      await page.getByRole('button', { name: 'Exercício anterior' }).click()
    } else {
      await page.getByRole('button', { name: 'Próximo exercício' }).click()
      await expect(page.getByRole('heading', { level: 2, name: b.name })).toBeVisible()
      await page.getByRole('button', { name: 'Anterior' }).click()
    }
    await expect(page.getByRole('heading', { level: 2, name: a.name })).toBeVisible()

    await page.getByRole('button', { name: b.name }).click()
    await expect(page.getByRole('heading', { level: 2, name: b.name })).toBeVisible()
    await expect(page.getByText('Exercício 2 de 2')).toBeVisible()
  })

  test('progresso sobrevive a um reload (rascunho local)', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    await page.getByLabel('Série 1 · carga em kg').fill('40')
    await completeFirstSet(page)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Desfazer Série 1' })).toBeVisible()
    await expect(page.getByText('Série 2 de 3 · alvo 10 reps')).toBeVisible()
    await expect(page.getByLabel('Série 2 · carga em kg')).toHaveValue('40')
    expect((await api.listSessions()).total).toBe(1)
  })

  test('sem conexão mantém o treino no aparelho e sincroniza ao voltar', async ({ authedPage: page, api, context }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    const id = await completeFirstSet(page)

    await context.setOffline(true)
    await page.getByRole('button', { name: CONCLUDE }).click()
    await expect(page.getByText('Sem conexão · salvo no aparelho')).toBeVisible()

    await page.getByRole('button', { name: 'Finalizar treino' }).first().click()
    await expect(page.getByText(/Sem conexão\. Seu treino está salvo neste aparelho/)).toBeVisible()
    await expect(page).toHaveURL(/\/run$/)

    const patched = sessionPatched(page)
    await context.setOffline(false)
    expect((await patched).ok()).toBeTruthy()
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible()
    expect((await api.getSession(id)).exercises[0].sets.filter((s) => s.completed)).toHaveLength(2)
  })

  test('não finaliza sem nenhuma série concluída', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    await page.getByRole('button', { name: 'Finalizar treino' }).first().click()
    await expect(page.getByText('Conclua ao menos uma série para finalizar o treino.')).toBeVisible()
    expect((await api.listSessions()).total).toBe(0)
  })

  test('finaliza com foto e comentário e mostra o resumo', async ({ authedPage: page, api }) => {
    const { sheet, a } = await seedSheet(api)
    await openRun(page, sheet)
    await page.getByLabel('Série 1 · carga em kg').fill('50')
    const id = await completeFirstSet(page)

    await page.getByRole('button', { name: 'Finalizar treino' }).first().click()
    await expect(page).toHaveURL(new RegExp(`/app/sessions/${id}$`))
    await expect(page.getByRole('heading', { name: 'Finalizar treino' })).toBeVisible()
    await expect(page.getByText('Séries').locator('xpath=..')).toContainText('1')
    await expect(page.getByText('Carga total').locator('xpath=..')).toContainText('500')

    await page.locator('input[type=file]').setInputFiles({ name: 'treino.png', mimeType: 'image/png', buffer: pngBuffer() })
    await expect(page.getByAltText('Foto do treino selecionada')).toBeVisible()
    await page.getByLabel('Comentário').fill('Subi a carga, última série no limite.')
    await expect(page.getByText('37/1000')).toBeVisible()
    await page.getByRole('button', { name: 'Salvar treino' }).click()

    await expect(page.getByText('Treino salvo!')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Treino concluído' })).toBeVisible()
    await expect(page.getByText(a.name)).toBeVisible()
    await expect(page.getByText('Subi a carga, última série no limite.')).toBeVisible()
    await expect(page.getByAltText('Foto do treino')).toBeVisible()

    const session = await api.getSession(id)
    expect(session.completedAt).not.toBeNull()
    expect(session.comment).toBe('Subi a carga, última série no limite.')
    expect(session.photoUrl).toMatch(/^https:\/\/.+\.jpg\?.*X-Amz-Signature=/)

    // The local draft is gone: starting the sheet again is a fresh workout.
    await page.goto(`/app/sheets/${sheet.id}/run`)
    await expect(page.getByText('Não iniciado')).toBeVisible()
  })

  test('rejeita arquivo que não é imagem', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    await completeFirstSet(page)
    await page.getByRole('button', { name: 'Finalizar treino' }).first().click()

    await page.locator('input[type=file]').setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByText('Use uma imagem JPG, PNG ou WebP.')).toBeVisible()
  })

  test('"Voltar ao treino" retoma a sessão mesmo sem rascunho local', async ({ authedPage: page, api }) => {
    const { sheet } = await seedSheet(api)
    await openRun(page, sheet)
    const id = await completeFirstSet(page)

    // Simulates opening the session on another device: no local draft.
    await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('forma:session-draft:')).forEach((k) => localStorage.removeItem(k)))
    await page.goto(`/app/sessions/${id}`)
    await page.getByRole('button', { name: 'Voltar ao treino' }).click()

    await expect(page).toHaveURL(new RegExp(`/app/sheets/${sheet.id}/run$`))
    await expect(page.getByRole('button', { name: 'Desfazer Série 1' })).toBeVisible()

    // And keeps writing to the same session instead of creating a new one.
    const patched = sessionPatched(page)
    await page.getByRole('button', { name: CONCLUDE }).click()
    expect((await patched).url()).toContain(id)
    expect((await api.listSessions()).total).toBe(1)
  })

  test('planilha inexistente mostra mensagem', async ({ authedPage: page }) => {
    await page.goto('/app/sheets/00000000-0000-0000-0000-000000000000/run')
    await expect(page.getByText('Planilha não encontrada')).toBeVisible()
  })
})

test.describe('1.5 Histórico de sessões', () => {
  async function seedHistory(api: Api) {
    const catalog = await api.catalog()
    const sheetA = await api.createSheet('Peito QA', [{ weekday: 1, exercises: [{ exerciseId: catalog[0].id }] }])
    const sheetB = await api.createSheet('Costas QA', [{ weekday: 2, exercises: [{ exerciseId: catalog[1].id }] }])
    const set = (ex: CatalogExercise) => [{ exerciseId: ex.id, sets: [{ reps: 10, weightKg: 20, completed: true }] }]
    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

    const old = await api.createSession({ sheetId: sheetA.id, performedAt: daysAgo(10), comment: 'treino antigo', exercises: set(catalog[0]) })
    await api.completeSession(old.id)
    const recent = await api.createSession({ sheetId: sheetB.id, performedAt: daysAgo(1), exercises: set(catalog[1]) })
    await api.completeSession(recent.id)
    const open = await api.createSession({ sheetId: sheetA.id, exercises: set(catalog[0]) })
    return { sheetA, sheetB, old, recent, open }
  }

  test('estado vazio sem treinos', async ({ authedPage: page }) => {
    await page.goto('/app/sessions')
    await expect(page.getByText('Nenhum treino registrado')).toBeVisible()
    await page.getByRole('link', { name: 'Ver planilhas' }).click()
    await expect(page).toHaveURL(/\/app\/sheets$/)
  })

  test('lista sessões, mais recentes primeiro, com status', async ({ authedPage: page, api }) => {
    await seedHistory(api)
    await page.goto('/app/sessions')

    await expect(page.getByText('3 sessões')).toBeVisible()
    const rows = page.getByRole('listitem')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Peito QA')
    await expect(rows.nth(0)).toContainText('Em andamento')
    await expect(rows.nth(1)).toContainText('Costas QA')
    await expect(rows.nth(1)).toContainText('Concluído')
    await expect(rows.nth(2)).toContainText('treino antigo')
  })

  test('filtra por planilha e por período, e limpa filtros', async ({ authedPage: page, api }) => {
    const { sheetB } = await seedHistory(api)
    await page.goto('/app/sessions')
    await expect(page.getByText('3 sessões')).toBeVisible()

    await page.getByLabel('Planilha').selectOption(sheetB.id)
    await expect(page.getByText('1 sessão')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`sheet=${sheetB.id}`))
    await expect(page.getByRole('listitem')).toContainText(['Costas QA'])

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByText('3 sessões')).toBeVisible()

    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    await page.getByLabel('De').fill(fiveDaysAgo)
    await expect(page.getByText('2 sessões')).toBeVisible()
    await expect(page.getByText('treino antigo')).toBeHidden()

    const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    await page.getByLabel('De').fill(twentyDaysAgo)
    await page.getByLabel('Até').fill(new Date(Date.now() - 15 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
    await expect(page.getByText('Nenhuma sessão nesse filtro')).toBeVisible()
  })

  test('filtros vêm da URL', async ({ authedPage: page, api }) => {
    const { sheetA } = await seedHistory(api)
    await page.goto(`/app/sessions?sheet=${sheetA.id}`)
    await expect(page.getByText('2 sessões')).toBeVisible()
    await expect(page.getByLabel('Planilha')).toHaveValue(sheetA.id)
  })

  test('pagina de 20 em 20', async ({ authedPage: page, api }) => {
    const [ex] = await api.catalog()
    const sheet = await api.createSheet('Volume QA', [{ weekday: 1, exercises: [{ exerciseId: ex.id }] }])
    for (let i = 0; i < 21; i++) {
      await api.createSession({
        sheetId: sheet.id,
        performedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
        exercises: [{ exerciseId: ex.id, sets: [{ reps: 5, weightKg: 10, completed: true }] }],
      })
    }
    await page.goto('/app/sessions')
    await expect(page.getByText('Página 1 de 2')).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(20)

    await page.getByRole('button', { name: 'Próxima' }).click()
    await expect(page.getByText('Página 2 de 2')).toBeVisible()
    await expect(page.getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  test('abre a sessão concluída e a em andamento', async ({ authedPage: page, api }) => {
    const { recent, open } = await seedHistory(api)
    await page.goto('/app/sessions')

    await page.getByRole('link', { name: /Costas QA/ }).click()
    await expect(page).toHaveURL(new RegExp(`/app/sessions/${recent.id}$`))
    await expect(page.getByRole('heading', { name: 'Treino concluído' })).toBeVisible()
    await expect(page.getByText('10 × 20 kg')).toBeVisible()

    await page.getByRole('link', { name: 'Voltar para o histórico' }).click()
    await page.getByRole('link', { name: /Peito QA.*Em andamento/ }).click()
    await expect(page).toHaveURL(new RegExp(`/app/sessions/${open.id}$`))
    await expect(page.getByRole('heading', { name: 'Finalizar treino' })).toBeVisible()
  })

  test('sessão inexistente mostra mensagem', async ({ authedPage: page }) => {
    await page.goto('/app/sessions/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText('Sessão não encontrada')).toBeVisible()
  })
})
