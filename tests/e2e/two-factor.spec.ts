import { expect, test } from '@playwright/test'
import { accounts, enterCode, secrets, settle, signIn, watchErrors } from './helpers'

// Admin accounts need a code from an authenticator app (20261113000000_admin_two_factor.sql and src/pages/TwoFactor.tsx).

test('an admin without an authenticator is walked through adding one, then gets in', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, accounts.otherCollege.admin)
  await expect(page.getByRole('heading', { name: 'Set up two-factor sign-in' })).toBeVisible()
  // The console is closed until the code is checked.
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Set up two-factor sign-in' })).toBeVisible()
  const secret = (await page.getByTestId('totp-secret').innerText()).trim()
  expect(secret).toMatch(/^[A-Z2-7]{16,}$/)
  await enterCode(page, secret)
  await settle(page)
  await expect(page).toHaveURL(/\/admin/)
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Two-factor sign-in' })).toBeVisible()
  await expect(page.getByText(/added \d/)).toHaveCount(1)
  expect(errors).toEqual([])
})

test('a wrong code is refused and the console stays closed', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(accounts.admin)
  await page.locator('input[type="password"]').fill(accounts.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Enter your sign-in code' })).toBeVisible()
  await page.getByLabel('Code from your authenticator app').fill('000000')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('alert')).toContainText('did not match')
  await page.goto('/admin/roster')
  await expect(page.getByRole('heading', { name: 'Enter your sign-in code' })).toBeVisible()
  await expect(page.getByText('Asha Rao')).toHaveCount(0)
})

test('the right code opens the console', async ({ page }) => {
  expect(secrets()[accounts.admin], 'seeded secret').toBeTruthy()
  await signIn(page, accounts.admin)
  await page.goto('/admin/roster')
  await settle(page)
  await expect(page.getByText('Asha Rao').first()).toBeVisible()
})

test('students are not asked for a code', async ({ page }) => {
  await signIn(page, accounts.student)
  await expect(page.getByRole('heading', { name: /sign-in code|two-factor/i })).toHaveCount(0)
  await expect(page).toHaveURL(/\/dashboard|\/onboarding/)
})
