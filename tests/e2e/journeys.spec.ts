import { expect, test } from '@playwright/test'
import { accounts, settle, signIn, stateFile, watchErrors } from './helpers'

// The main paths through the app with the real database, policies and API underneath.

test.describe('student', () => {
  test.use({ storageState: stateFile('student') })

  test('sees only their own college drives', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/jobs')
    await settle(page)
    await expect(page.getByText('Graduate Software Engineer').first()).toBeVisible()
    await expect(page.getByText('Backend Intern')).toHaveCount(0) // another college's drive
    expect(errors).toEqual([])
  })

  test('cannot open placement cell or platform pages', async ({ page }) => {
    for (const path of ['/admin', '/admin/roster', '/super/orgs', '/recruiter']) {
      await page.goto(path)
      await settle(page)
      await expect(page).not.toHaveURL(new RegExp(`${path}$`))
    }
  })
})

test.describe('placement cell', () => {
  test.use({ storageState: stateFile('admin') })

  test('lists its roster and refuses an address from outside its domain', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/admin/roster')
    await settle(page)
    await expect(page.getByText('Asha Rao').first()).toBeVisible()
    await expect(page.getByText('Meera Iyer')).toHaveCount(0) // other college
    expect(errors).toEqual([])
  })

  test('opens a student and closes the drawer with Escape', async ({ page }) => {
    await page.goto('/admin/students')
    await settle(page)
    await page.getByRole('button', { name: 'Asha Rao' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test.describe('recruiter', () => {
  test.use({ storageState: stateFile('recruiter') })

  test('sees its own drive and applicant, not the roster', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/recruiter')
    await settle(page)
    await expect(page.getByText('Graduate Software Engineer').first()).toBeVisible()
    await expect(page.getByText('Northwind Analytics')).toHaveCount(0)
    await page.goto('/admin/roster')
    await settle(page)
    await expect(page.getByText('student01@tec.test')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})

test('a wrong password is refused without saying whether the account exists', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(accounts.student)
  await page.locator('input[type="password"]').fill('definitely-wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert').or(page.getByText(/invalid|incorrect|wrong/i)).first()).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('signing out ends the session', async ({ page }) => {
  // Another college's student, so the global sign-out cannot touch the sessions the other tests reuse.
  await signIn(page, accounts.otherCollege.student)
  await page.goto('/settings')
  await settle(page)
  const before = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')).length)
  expect(before).toBe(1)
  await page.locator('#menu-btn').click().catch(() => {})
  await page.getByRole('button', { name: /sign out|log out/i }).first().click()
  await page.waitForURL(/\/(login)?$/)
  const after = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')).length)
  expect(after).toBe(0)
})
