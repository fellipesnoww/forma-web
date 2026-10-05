import { test, expect } from './support/fixtures'

const theme = (page: import('@playwright/test').Page) => page.locator('html').getAttribute('data-theme')

test.describe('Configurações · tema', () => {
  test('troca o tema e mantém a escolha após recarregar', async ({ authedPage: page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/app/settings')
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()

    const appearance = page.getByRole('radiogroup', { name: 'Aparência' })
    await expect(appearance.getByRole('radio', { name: 'Sistema' })).toBeChecked()
    expect(await theme(page)).toBe('light')

    await appearance.getByRole('radio', { name: 'Escuro' }).click()
    await expect(appearance.getByRole('radio', { name: 'Escuro' })).toBeChecked()
    expect(await theme(page)).toBe('dark')

    await page.reload()
    await expect(page.getByRole('radiogroup', { name: 'Aparência' }).getByRole('radio', { name: 'Escuro' })).toBeChecked()
    expect(await theme(page)).toBe('dark')

    await page.getByRole('radiogroup', { name: 'Aparência' }).getByRole('radio', { name: 'Claro' }).click()
    expect(await theme(page)).toBe('light')
  })

  test('Sistema segue a preferência do sistema operacional', async ({ authedPage: page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/app/settings')
    await expect(page.getByRole('radio', { name: 'Sistema' })).toBeChecked()
    expect(await theme(page)).toBe('dark')

    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(() => theme(page)).toBe('light')
  })
})
