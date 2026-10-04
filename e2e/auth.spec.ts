import { test, expect, signIn, STORAGE } from './support/fixtures'
import { TEST_PASSWORD, uniqueEmail } from './support/api'

test.describe('1.1 Autenticação', () => {
  test('cadastro com e-mail e senha cria a conta e entra no app', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('Nome').fill('Bia Cadastro')
    await page.getByLabel('Email').fill(uniqueEmail('register'))
    await page.getByLabel('Senha', { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel('Confirmar senha').fill(TEST_PASSWORD)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()

    // A fresh browser hasn't seen onboarding yet, so the gate sends it there first.
    await expect(page).toHaveURL(/\/onboarding$/)
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE.refresh)).toBeTruthy()
  })

  test('cadastro valida senha fraca, confirmação e termos no cliente', async ({ page }) => {
    await page.goto('/register')
    // Passes the browser's native type=email check (no TLD) but not the zod schema.
    await page.getByLabel('Email').fill('ana@exemplo')
    await page.getByLabel('Senha', { exact: true }).fill('fraca')
    await page.getByLabel('Confirmar senha').fill('outra')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    // The strength meter repeats "Mínimo de 8 caracteres" as a hint, so match the field error paragraph only.
    const fieldError = (text: string) => page.locator('p.text-danger-500').filter({ hasText: text })
    await expect(fieldError('Email inválido')).toBeVisible()
    await expect(fieldError('Mínimo de 8 caracteres')).toBeVisible()
    await expect(fieldError('As senhas não coincidem')).toBeVisible()
    await expect(page.getByText('Aceite os termos para continuar')).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('cadastro com e-mail já usado mostra o erro do backend', async ({ page, user }) => {
    await page.goto('/register')
    await page.getByLabel('Nome').fill('Duplicada')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Senha', { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel('Confirmar senha').fill(TEST_PASSWORD)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.locator('form').getByText(/cadastrado/i)).toBeVisible()
  })

  test('login com e-mail e senha entra no app', async ({ page, user }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'true'), STORAGE.onboarding)
    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Senha').fill(user.password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible()
  })

  test('login com senha errada mostra erro e continua na tela', async ({ page, user }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Senha').fill('SenhaErrada1')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.locator('form p.text-danger-500')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('rota protegida sem sessão redireciona para login e volta após entrar', async ({ page, user }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'true'), STORAGE.onboarding)
    await page.goto('/app/exercises')
    await expect(page).toHaveURL(/\/login$/)

    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Senha').fill(user.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/app\/exercises$/)
  })

  test('sessão é hidratada no boot via /auth/me', async ({ authedPage: page }) => {
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible()
  })

  test('access token expirado é renovado pelo refresh automaticamente', async ({ page, user }) => {
    await signIn(page, { ...user, accessToken: 'token-invalido' })
    await page.goto('/app')
    await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible()
    const access = await page.evaluate((key) => localStorage.getItem(key), STORAGE.access)
    expect(access).not.toBe('token-invalido')
  })

  test('refresh token inválido limpa a sessão e manda para o login', async ({ page, user }) => {
    await signIn(page, { ...user, accessToken: 'x', refreshToken: 'y' })
    await page.goto('/app')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('logout encerra a sessão', async ({ authedPage: page, isMobile }) => {
    test.skip(isMobile, 'o botão Sair fica só na sidebar desktop')
    await page.goto('/app')
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE.refresh)).toBeNull()

    await page.goto('/app')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('botão do Google é exibido no login e no cadastro', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('ou com e-mail')).toBeVisible()
    await page.goto('/register')
    await expect(page.getByText('ou continue com')).toBeVisible()
  })
})

test.describe('1.1 Onboarding', () => {
  test('primeiro acesso passa pelo onboarding e depois não volta mais', async ({ page, user }) => {
    await signIn(page, user, { onboarded: false })
    await page.goto('/app')
    await expect(page).toHaveURL(/\/onboarding$/)

    await expect(page.getByRole('heading', { name: 'Monte suas planilhas' })).toBeVisible()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByRole('heading', { name: 'Explore a biblioteca' })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page.getByRole('heading', { name: 'Monte suas planilhas' })).toBeVisible()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await page.getByRole('button', { name: 'Próximo' }).click()
    await expect(page.getByRole('heading', { name: 'Acompanhe sua evolução' })).toBeVisible()
    await page.getByRole('button', { name: 'Começar' }).click()

    await expect(page).toHaveURL(/\/app$/)
    await page.goto('/app/sheets')
    await expect(page).toHaveURL(/\/app\/sheets$/)
  })
})
