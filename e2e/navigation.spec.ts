import { test, expect } from './support/fixtures'

test.describe('Fase 0 · Layout e navegação', () => {
  const sections = [
    { link: 'Biblioteca', url: /\/app\/exercises$/, heading: 'Biblioteca' },
    { link: 'Planilhas', url: /\/app\/sheets$/, heading: 'Planilhas' },
    { link: 'Histórico', url: /\/app\/sessions$/, heading: 'Histórico' },
    { link: 'Atividades', url: /\/app\/activities$/, heading: 'Atividades' },
    { link: 'Dietas', url: /\/app\/diets$/, heading: 'Dietas' },
    { link: 'Evolução', url: /\/app\/progress$/, heading: 'Evolução' },
    { link: 'Calendário', url: /\/app\/calendar$/, heading: 'Calendário' },
    { link: 'Configurações', url: /\/app\/settings$/, heading: 'Configurações' },
    { link: 'Início', url: /\/app$/, heading: /Bom dia|Boa tarde|Boa noite/ },
  ]

  test('menu principal leva a cada seção (sidebar no desktop, drawer no mobile)', async ({ authedPage: page, isMobile }) => {
    await page.goto('/app')
    for (const { link, url, heading } of sections) {
      if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
      await page.getByRole('link', { name: link, exact: true }).filter({ visible: true }).click()
      await expect(page).toHaveURL(url)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    }
  })

  test('sidebar no desktop; header com menu em drawer no mobile', async ({ authedPage: page, isMobile }) => {
    await page.goto('/app')
    const sidebar = page.locator('aside')
    const openMenu = page.getByRole('button', { name: 'Abrir menu' })
    if (isMobile) {
      await expect(sidebar).toBeHidden()
      await expect(page.getByRole('link', { name: 'Perfil', exact: true })).toBeVisible()
      const drawer = page.getByRole('dialog', { name: 'Menu' })
      await expect(drawer).toBeHidden()
      await openMenu.click()
      await expect(drawer).toBeVisible()
      await expect(drawer.getByRole('link', { name: 'Evolução', exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(drawer).toBeHidden()
    } else {
      await expect(sidebar).toBeVisible()
      await expect(openMenu).toBeHidden()
    }
  })

  test('"Criar planilha" aparece no início e na lista de planilhas', async ({ authedPage: page, isMobile }) => {
    await page.goto('/app')
    if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = isMobile ? page.getByRole('dialog', { name: 'Menu' }) : page.locator('aside')
    await menu.getByRole('link', { name: 'Criar planilha' }).click()
    await expect(page).toHaveURL(/\/app\/sheets\/new$/)
    await page.goto('/app/calendar')
    if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(menu.getByRole('link', { name: 'Criar planilha' })).toHaveCount(0)
  })

  test('atalhos da home abrem as telas', async ({ authedPage: page }) => {
    await page.goto('/app')
    await page.getByRole('link', { name: /Minhas planilhas/ }).click()
    await expect(page).toHaveURL(/\/app\/sheets$/)
    await page.goBack()
    await page.getByRole('link', { name: /Biblioteca de exercícios/ }).click()
    await expect(page).toHaveURL(/\/app\/exercises$/)
    await page.goBack()
    await page.getByRole('link', { name: /Atividades livres/ }).click()
    await expect(page).toHaveURL(/\/app\/activities$/)
    await page.goBack()
    await page.getByRole('link', { name: /Meu perfil/ }).click()
    await expect(page).toHaveURL(/\/app\/profile$/)
  })

  test('rota desconhecida mostra a página 404', async ({ page }) => {
    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar para o início' }).click()
    await expect(page).toHaveURL(/\/(app|login)$/)
  })

  test('raiz redireciona para /app', async ({ authedPage: page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/app$/)
  })

  test('hit targets do menu têm ao menos 44px', async ({ authedPage: page, isMobile }) => {
    await page.goto('/app')
    if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
    const links = page.getByRole('link', { name: 'Planilhas', exact: true }).filter({ visible: true })
    const box = await links.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})
