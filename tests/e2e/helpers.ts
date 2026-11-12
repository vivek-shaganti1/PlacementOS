import { expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

export const accounts = JSON.parse(readFileSync('tests/e2e/accounts.json', 'utf8'))
export const roles = ['student', 'admin', 'recruiter', 'super'] as const
export type Role = (typeof roles)[number]
export const stateFile = (role: Role) => `test-results/.auth/${role}.json`

/** Collects console errors and uncaught exceptions for the life of the page. */
export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // The browser's own report of a refused request is noise when the test itself expects the refusal.
    if (/Failed to load resource: the server responded with a status of (401|403|404|409|422)/.test(text)) return
    // WebKit on Linux reports a viewport key it does not support (interactive-widget, used by Chrome on Android) and
    // ignores it; that is the browser describing itself, not an error in the page.
    if (/Viewport argument key "interactive-widget" not recognized/.test(text)) return
    errors.push(`console: ${text}`)
  })
  return errors
}

export async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(accounts.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 })
}

/** The page has settled: the shell is drawn and nothing is still loading. */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await expect(page.locator('main').first()).toBeVisible()
}

export async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1)
}
