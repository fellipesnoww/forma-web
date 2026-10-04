import type { Page } from '@playwright/test'
import { test, expect, tag } from '../support/admin'
import { pngBuffer } from '../support/fixtures'

/**
 * Catalog exercises created here start inactive: the user specs (`e2e/exercises.spec.ts`) count the
 * live catalog in parallel, and an active test exercise appearing mid-run would break their counts.
 */

const isMobile = () => test.info().project.name === 'mobile'

/** Desktop keeps the form in the side panel; mobile opens it in a modal. */
async function openCreateForm(page: Page) {
  if (isMobile()) {
    await page.getByRole('button', { name: 'Novo exercício' }).click()
    return page.getByRole('dialog')
  }
  return page.getByRole('complementary', { name: 'Cadastrar exercício' })
}

const row = (page: Page, name: string) =>
  page.getByRole('table', { name: 'Exercícios' }).getByRole('row').filter({ hasText: name })

async function search(page: Page, text: string) {
  await page.getByLabel('Buscar exercício').fill(text)
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(text)
}

test.describe('3.2 Admin · exercícios', () => {
  test('lista o catálogo com totais de ativos e desativados', async ({ adminPage: page, admin }) => {
    // Other admin tests add inactive exercises in parallel, so totals are compared as lower bounds.
    const before = await admin.api.call<{ total: number }>('GET', '/admin/exercises?status=inactive&limit=1')
    await page.goto('/admin/exercises')
    await expect(page.getByRole('heading', { name: 'Exercícios da biblioteca' })).toBeVisible()
    const totals = page.getByText(/^\d+ ativos · \d+ desativados$/)
    await expect(totals).toBeVisible()
    const [active, inactive] = ((await totals.textContent()) ?? '').match(/\d+/g)!.map(Number)
    expect(active).toBeGreaterThan(0)
    expect(inactive).toBeGreaterThanOrEqual(before.total)
    await expect(page.getByRole('table', { name: 'Exercícios' }).getByRole('row').first()).toBeVisible()
  })

  test('cadastra exercício com grupo e imagem', async ({ adminPage: page, admin }) => {
    const name = `Stiff E2E ${tag()}`
    const [group] = await admin.api.adminMuscleGroups()
    await page.goto('/admin/exercises')

    const form = await openCreateForm(page)
    await form.getByLabel('Nome').fill(name)
    await form.getByLabel('Grupo muscular').selectOption(group.slug)
    await form.locator('input[type="file"]').setInputFiles({ name: 'stiff.png', mimeType: 'image/png', buffer: pngBuffer() })
    await expect(form.getByRole('img', { name: 'Imagem selecionada' })).toBeVisible()
    await form.getByLabel('Disponível no app').uncheck()
    await form.getByRole('button', { name: 'Cadastrar na biblioteca' }).click()

    await expect(page.getByText('Exercício cadastrado na biblioteca.')).toBeVisible()
    await search(page, name)
    await expect(row(page, name).getByText(group.name)).toBeVisible()
    await expect(row(page, name).getByText('Desativado')).toBeVisible()

    const { items } = await admin.api.adminGetExercises(name)
    expect(items[0]).toMatchObject({ name, isActive: false, muscleGroup: { slug: group.slug } })
    expect(items[0].mediaUrl).not.toBeNull()
  })

  test('nome obrigatório e nome duplicado', async ({ adminPage: page, admin }) => {
    const existing = await admin.api.adminCreateExercise({ name: `Remada E2E ${tag()}`, isActive: false })
    await page.goto('/admin/exercises')
    const form = await openCreateForm(page)

    await form.getByRole('button', { name: 'Cadastrar na biblioteca' }).click()
    await expect(form.getByText('Informe o nome')).toBeVisible()

    await form.getByLabel('Nome').fill(existing.name.toUpperCase())
    await form.getByLabel('Disponível no app').uncheck()
    await form.getByRole('button', { name: 'Cadastrar na biblioteca' }).click()
    await expect(form.getByText('Já existe um exercício com esse nome')).toBeVisible()
  })

  test('edita nome e grupo pelo formulário', async ({ adminPage: page, admin }) => {
    const groups = await admin.api.adminMuscleGroups()
    const original = await admin.api.adminCreateExercise({
      name: `Puxada E2E ${tag()}`,
      muscleGroupSlug: groups[0].slug,
      isActive: false,
    })
    await page.goto('/admin/exercises')
    await search(page, original.name)
    await row(page, original.name).click()

    const form = isMobile() ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Editar exercício' })
    await expect(form.getByLabel('Nome')).toHaveValue(original.name)
    await expect(form.getByLabel('Grupo muscular')).toHaveValue(groups[0].slug)
    await expect(form.getByLabel('Disponível no app')).toHaveCount(0)

    const renamed = `${original.name} editada`
    await form.getByLabel('Nome').fill(renamed)
    await form.getByLabel('Grupo muscular').selectOption(groups[1].slug)
    await form.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByText('Exercício atualizado.')).toBeVisible()
    const { items } = await admin.api.adminGetExercises(renamed)
    expect(items[0]).toMatchObject({ id: original.id, name: renamed, muscleGroup: { slug: groups[1].slug } })
  })

  test('ativa e desativa pelo switch da tabela, com filtro por status', async ({ adminPage: page, admin }) => {
    const ex = await admin.api.adminCreateExercise({ name: `Crucifixo E2E ${tag()}`, isActive: false })
    await page.goto('/admin/exercises')
    await search(page, ex.name)

    await row(page, ex.name).getByRole('switch', { name: `Ativar ${ex.name}` }).click()
    await expect(page.getByText(`${ex.name} ativado.`)).toBeVisible()
    await expect(row(page, ex.name).getByText('Ativo', { exact: true })).toBeVisible()

    await row(page, ex.name).getByRole('switch', { name: `Desativar ${ex.name}` }).click()
    await expect(page.getByText(`${ex.name} desativado.`)).toBeVisible()
    expect((await admin.api.adminGetExercises(ex.name)).items[0].isActive).toBe(false)

    await page.getByRole('radio', { name: 'Ativos' }).click()
    await expect(page.getByText('Nenhum exercício encontrado.')).toBeVisible()
    await page.getByRole('radio', { name: 'Desativados' }).click()
    await expect(row(page, ex.name)).toBeVisible()
  })

  test('filtra por grupo muscular', async ({ adminPage: page, admin }) => {
    const groups = await admin.api.adminMuscleGroups()
    const name = `Agachamento E2E ${tag()}`
    await admin.api.adminCreateExercise({ name, muscleGroupSlug: groups[0].slug, isActive: false })
    await page.goto('/admin/exercises')
    await search(page, name)

    await page.getByLabel('Filtrar por grupo muscular').selectOption(groups[1].slug)
    await expect(page.getByText('Nenhum exercício encontrado.')).toBeVisible()
    await page.getByLabel('Filtrar por grupo muscular').selectOption(groups[0].slug)
    await expect(row(page, name)).toBeVisible()
  })

  test('grupos musculares: cria, valida slug e renomeia', async ({ adminPage: page, admin }) => {
    const t = tag()
    await page.goto('/admin/exercises')
    await page.getByRole('button', { name: 'Grupos musculares' }).click()
    const dialog = page.getByRole('dialog', { name: 'Grupos musculares' })

    await dialog.getByLabel('Nome', { exact: true }).fill(`Grupo E2E ${t}`)
    await dialog.getByLabel('Slug').fill('Slug Inválido')
    await dialog.getByRole('button', { name: 'Criar grupo' }).click()
    await expect(dialog.getByText('Use letras minúsculas, números e hífens')).toBeVisible()

    await dialog.getByLabel('Slug').fill('')
    await dialog.getByRole('button', { name: 'Criar grupo' }).click()
    await expect(page.getByText('Grupo muscular criado.')).toBeVisible()
    await expect(dialog.getByText(`grupo-e2e-${t} · 0 exercícios`)).toBeVisible()

    await dialog.getByRole('button', { name: `Editar Grupo E2E ${t}` }).click()
    await expect(dialog.getByLabel('Nome', { exact: true })).toHaveValue(`Grupo E2E ${t}`)
    await dialog.getByLabel('Nome', { exact: true }).fill(`Grupo E2E ${t} renomeado`)
    await dialog.getByRole('button', { name: 'Salvar grupo' }).click()
    await expect(page.getByText('Grupo muscular atualizado.')).toBeVisible()

    const groups = await admin.api.adminMuscleGroups()
    expect(groups.find((g) => g.slug === `grupo-e2e-${t}`)?.name).toBe(`Grupo E2E ${t} renomeado`)
  })

  test('mudanças entram no log de auditoria', async ({ admin, root }) => {
    const ex = await admin.api.adminCreateExercise({ name: `Auditado E2E ${tag()}`, isActive: false })
    const { items } = await root.api.adminAuditLogs(`targetId=${ex.id}`)
    expect(items.map((l) => l.action)).toContain('exercise.created')
  })
})
