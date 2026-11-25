import { expect, test } from '@playwright/test'
import { accounts, settle, signIn, stateFile, watchErrors } from './helpers'

// The other college's student was set up before the notice existed (scripts/e2e-seed.mjs gives them no consent row).
test('a student from before the notice is asked once, and cannot skip the age question', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, accounts.otherCollege.student)
  await page.goto('/dashboard')
  await settle(page)
  const card = page.getByRole('region', { name: 'Privacy policy update' })
  // A retry finds the agreement already recorded.
  if (await card.isVisible()) {
    await card.getByRole('button', { name: 'Agree and continue' }).click()
    await expect(card.getByRole('alert')).toContainText('choose one of the two age options')
    await card.getByRole('checkbox').check()
    await card.getByLabel('I am 18 or older').check()
    await card.getByRole('button', { name: 'Agree and continue' }).click()
    await expect(card).toHaveCount(0)
  }
  await page.reload()
  await settle(page)
  await expect(card).toHaveCount(0)
  expect(errors).toEqual([])
})

test.describe('someone who already agreed', () => {
  test.use({ storageState: stateFile('student') })
  test('is not asked again', async ({ page }) => {
    await page.goto('/dashboard')
    await settle(page)
    await expect(page.getByRole('region', { name: 'Privacy policy update' })).toHaveCount(0)
  })
})

test.describe('platform admin', () => {
  test.use({ storageState: stateFile('super') })
  test('cannot delete an active college by mistake', async ({ page }) => {
    await page.goto('/super/orgs')
    await settle(page)
    // The same request the Delete button makes, through the admin's own session.
    const body = await page.evaluate(async () => {
      const token = JSON.parse(Object.entries(localStorage).find(([k]) => k.endsWith('-auth-token'))![1]).access_token
      const entry = [...document.scripts].map((x) => x.src).find((x) => /\/index-/.test(x))!
      const code = await (await fetch(entry)).text()
      const chunks = [code, ...(await Promise.all([...code.matchAll(/"\.\/(index-[\w-]+\.js)"/g)].map(async (m) => (await fetch(new URL(m[1], entry))).text())))]
      const apikey = chunks.join('').match(/sb_publishable_[\w-]+/)?.[0] ?? ''
      const r = await fetch('/supabase/rest/v1/organizations?short_name=eq.OIT', { method: 'DELETE', headers: { apikey, authorization: `Bearer ${token}` } })
      return r.text()
    })
    expect(body).toContain('Suspend this college first')
  })
})
