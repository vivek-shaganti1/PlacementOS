import { expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
// @ts-expect-error plain ESM helper shared with the seed script
import { totp } from '../../scripts/totp.mjs'

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
  // Admins with an authenticator app are asked for a code next, on the same address (secrets from scripts/e2e-seed.mjs).
  const secret = secrets()[email]
  if (secret) {
    await page.getByRole('heading', { name: 'Enter your sign-in code' }).waitFor({ timeout: 20_000 })
    await enterCode(page, secret)
  }
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 }).catch(() => {})
  await page.getByRole('heading', { name: /^(Welcome back|Enter your sign-in code)$/ }).waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
}

export const secrets = (): Record<string, string> =>
  existsSync('tests/e2e/.state/totp.json') ? JSON.parse(readFileSync('tests/e2e/.state/totp.json', 'utf8')) : {}

/** Types the current code, waiting out the last seconds of a 30-second window so the code cannot expire mid-check. */
export async function enterCode(page: Page, secret: string) {
  if (Date.now() % 30_000 > 26_000) await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 500)
  await page.getByLabel('Code from your authenticator app').fill(totp(secret))
  await page.getByRole('button', { name: /continue|turn on two-factor/i }).click()
  await page.getByRole('heading', { name: /sign-in code|two-factor/i }).waitFor({ state: 'detached', timeout: 20_000 })
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
