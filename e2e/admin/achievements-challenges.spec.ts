import type { Page } from '@playwright/test'
import { test, expect, tag } from '../support/admin'
import { pngBuffer } from '../support/fixtures'

/** `<input type="datetime-local">` value, `days` from now (browser timezone is pinned to São Paulo). */
function localInput(days: number) {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16).replace(' ', 'T')
}

const iso = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const challengeRow = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Desafios' }).getByRole('row').filter({ hasText: name })
const achievementRow = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Conquistas' }).getByRole('row').filter({ hasText: name })

async function searchChallenge(page: Page, name: string) {
  await page.getByLabel('Buscar desafio').fill(name)
  await expect(challengeRow(page, name)).toBeVisible()
}

async function searchAchievement(page: Page, name: string) {
  await page.getByLabel('Buscar conquista').fill(name)
  await expect(achievementRow(page, name)).toBeVisible()
}

test.describe('3.5 Admin · desafios', () => {
  test('cria desafio de minutos por tipo de atividade', async ({ adminPage: page, admin }) => {
    const name = `Pedal E2E ${tag()}`
    const cycling = (await admin.api.activityTypes()).find((t) => t.source === 'default')!
    await page.goto('/admin/gamification')
    await page.getByRole('button', { name: 'Novo desafio' }).click()

    const dialog = page.getByRole('dialog', { name: 'Novo desafio' })
    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByLabel('Tipo de meta').selectOption('activity_minutes')
    await dialog.getByLabel('Meta (min)').fill('600')
    await dialog.getByLabel('Tipo de atividade').selectOption(cycling.id)
    await dialog.getByLabel('Recompensa').fill('Medalha de ouro')
    await dialog.getByLabel('Início').fill(localInput(-1))
    await dialog.getByLabel('Fim').fill(localInput(29))
    await dialog.getByRole('button', { name: 'Criar desafio' }).click()

    await expect(page.getByText('Desafio criado.')).toBeVisible()
    await searchChallenge(page, name)
    const row = challengeRow(page, name)
    await expect(row).toContainText(`600 min de atividade de ${cycling.name}`)
    await expect(row).toContainText('Medalha de ouro')
    await expect(row).toContainText('Em andamento')
  })

  test('valida meta e datas', async ({ adminPage: page }) => {
    await page.goto('/admin/gamification')
    await page.getByRole('button', { name: 'Novo desafio' }).click()
    const dialog = page.getByRole('dialog', { name: 'Novo desafio' })

    await dialog.getByRole('button', { name: 'Criar desafio' }).click()
    await expect(dialog.getByText('Informe o nome')).toBeVisible()
    await expect(dialog.getByText('Informe a meta')).toBeVisible()
    await expect(dialog.getByText('Informe o início')).toBeVisible()

    // The date order check runs once the other fields are valid.
    await dialog.getByLabel('Nome').fill('Datas invertidas')
    await dialog.getByLabel('Meta', { exact: true }).fill('3')
    await dialog.getByLabel('Início').fill(localInput(5))
    await dialog.getByLabel('Fim').fill(localInput(2))
    await dialog.getByRole('button', { name: 'Criar desafio' }).click()
    await expect(dialog.getByText('O fim deve ser depois do início')).toBeVisible()
  })

  test('edita recompensa e desativa pelo switch', async ({ adminPage: page, admin }) => {
    const c = await admin.api.adminCreateChallenge({
      name: `Treinos E2E ${tag()}`,
      goal: { type: 'workout_count', count: 12 },
      startsAt: iso(3),
      endsAt: iso(30),
    })
    await page.goto('/admin/gamification')
    await searchChallenge(page, c.name)
    await expect(challengeRow(page, c.name)).toContainText('Em breve')

    await challengeRow(page, c.name).click()
    const dialog = page.getByRole('dialog', { name: 'Editar desafio' })
    await expect(dialog.getByLabel('Meta', { exact: true })).toHaveValue('12')
    await dialog.getByLabel('Recompensa').fill('Camiseta')
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Desafio atualizado.')).toBeVisible()
    await expect(challengeRow(page, c.name)).toContainText('Camiseta')

    await challengeRow(page, c.name).getByRole('switch', { name: `Desativar desafio ${c.name}` }).click()
    await expect(page.getByText(`Desafio “${c.name}” desativado.`)).toBeVisible()
    expect(await admin.api.adminGetChallenge(c.id)).toMatchObject({ isActive: false, reward: 'Camiseta' })
  })

  test('exclui desafio sem inscritos', async ({ adminPage: page, admin }) => {
    const c = await admin.api.adminCreateChallenge({
      name: `Descartável E2E ${tag()}`,
      goal: { type: 'workout_count', count: 3 },
      startsAt: iso(1),
      endsAt: iso(8),
    })
    await page.goto('/admin/gamification')
    await searchChallenge(page, c.name)
    await challengeRow(page, c.name).click()

    const dialog = page.getByRole('dialog', { name: 'Editar desafio' })
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialog.getByRole('button', { name: 'Excluir desafio' }).click()
    await expect(page.getByText('Desafio excluído.')).toBeVisible()
    expect(await admin.api.status('GET', `/admin/challenges/${c.id}`)).toBe(404)
  })

  test('filtra por período', async ({ adminPage: page, admin }) => {
    const c = await admin.api.adminCreateChallenge({
      name: `Futuro E2E ${tag()}`,
      goal: { type: 'workout_count', count: 5 },
      startsAt: iso(10),
      endsAt: iso(20),
    })
    await page.goto('/admin/gamification')
    await searchChallenge(page, c.name)
    await page.getByLabel('Período dos desafios').selectOption('ended')
    await expect(page.getByText('Nenhum desafio encontrado.')).toBeVisible()
    await page.getByLabel('Período dos desafios').selectOption('upcoming')
    await expect(challengeRow(page, c.name)).toBeVisible()
  })
})

test.describe('3.5 Admin · conquistas', () => {
  test('cria conquista de streak com ícone', async ({ adminPage: page, admin }) => {
    const name = `Semana E2E ${tag()}`
    await page.goto('/admin/gamification')
    await page.getByRole('button', { name: 'Nova conquista' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova conquista' })
    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByLabel('Descrição').fill('Sete dias seguidos treinando')
    await dialog.getByLabel('Critério').selectOption('streak_days')
    await dialog.getByLabel('Dias').fill('7')
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'icone.png', mimeType: 'image/png', buffer: pngBuffer() })
    await dialog.getByRole('button', { name: 'Criar conquista' }).click()

    await expect(page.getByText('Conquista criada.')).toBeVisible()
    await searchAchievement(page, name)
    await expect(achievementRow(page, name)).toContainText('Critério: 7 dias seguidos')

    const { items } = await admin.api.call<{ items: { id: string; criteria: unknown; iconUrl: string | null }[] }>(
      'GET',
      `/admin/achievements?q=${encodeURIComponent(name)}`,
    )
    expect(items[0].criteria).toEqual({ type: 'streak_days', days: 7 })
    expect(items[0].iconUrl).not.toBeNull()
  })

  test('critério "concluir desafio" e nome duplicado', async ({ adminPage: page, admin }) => {
    const challenge = await admin.api.adminCreateChallenge({
      name: `Base E2E ${tag()}`,
      goal: { type: 'workout_count', count: 4 },
      startsAt: iso(1),
      endsAt: iso(10),
    })
    const existing = await admin.api.adminCreateAchievement({
      name: `Existente E2E ${tag()}`,
      criteria: { type: 'workout_count', count: 1 },
    })
    const name = `Campeã E2E ${tag()}`
    await page.goto('/admin/gamification')
    await page.getByRole('button', { name: 'Nova conquista' }).click()

    const dialog = page.getByRole('dialog', { name: 'Nova conquista' })
    await dialog.getByLabel('Nome').fill(existing.name)
    await dialog.getByLabel('Critério').selectOption('challenge_complete')
    await dialog.getByRole('button', { name: 'Criar conquista' }).click()
    await expect(dialog.getByText('Escolha o desafio')).toBeVisible()

    await dialog.getByLabel('Desafio').selectOption({ label: challenge.name })
    await dialog.getByRole('button', { name: 'Criar conquista' }).click()
    await expect(dialog.getByText('Já existe uma conquista com esse nome')).toBeVisible()

    await dialog.getByLabel('Nome').fill(name)
    await dialog.getByRole('button', { name: 'Criar conquista' }).click()
    await expect(page.getByText('Conquista criada.')).toBeVisible()
    await searchAchievement(page, name)
    await expect(achievementRow(page, name)).toContainText(`Critério: concluir "${challenge.name}"`)
  })

  test('edita critério, desativa e exclui', async ({ adminPage: page, admin }) => {
    const a = await admin.api.adminCreateAchievement({ name: `Dez E2E ${tag()}`, criteria: { type: 'workout_count', count: 10 } })
    await page.goto('/admin/gamification')
    await searchAchievement(page, a.name)

    await achievementRow(page, a.name).click()
    let dialog = page.getByRole('dialog', { name: 'Editar conquista' })
    await expect(dialog.getByLabel('Treinos')).toHaveValue('10')
    await dialog.getByLabel('Treinos').fill('20')
    await dialog.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Conquista atualizada.')).toBeVisible()
    await expect(achievementRow(page, a.name)).toContainText('20 treinos concluídos')

    await achievementRow(page, a.name).getByRole('switch', { name: `Desativar conquista ${a.name}` }).click()
    await expect(page.getByText(`Conquista “${a.name}” desativada.`)).toBeVisible()
    expect((await admin.api.adminGetAchievement(a.id)).isActive).toBe(false)

    await achievementRow(page, a.name).click()
    dialog = page.getByRole('dialog', { name: 'Editar conquista' })
    await dialog.getByRole('button', { name: 'Excluir', exact: true }).click()
    await dialog.getByRole('button', { name: 'Excluir conquista' }).click()
    await expect(page.getByText('Conquista excluída.')).toBeVisible()
    expect(await admin.api.status('GET', `/admin/achievements/${a.id}`)).toBe(404)
  })

  test('"ver usuários" lista quem desbloqueou', async ({ adminPage: page, admin }) => {
    const a = await admin.api.adminCreateAchievement({ name: `Ninguém E2E ${tag()}`, criteria: { type: 'streak_days', days: 90 } })
    await page.goto('/admin/gamification')
    await searchAchievement(page, a.name)

    await achievementRow(page, a.name).getByRole('button', { name: /Ver usuários que desbloquearam/ }).click()
    const dialog = page.getByRole('dialog', { name: `Quem desbloqueou “${a.name}”` })
    await expect(dialog.getByText('Ninguém desbloqueou essa conquista ainda.')).toBeVisible()
  })
})
