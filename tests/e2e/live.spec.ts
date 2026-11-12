import { expect, test } from '@playwright/test'
import { settle, stateFile } from './helpers'

// The placement cell's console updates by itself: a student applies in one browser and the application appears in
// the other without a reload (Supabase Realtime; src/lib/live.ts).
test('a new application appears in the placement cell console without a reload', async ({ browser }) => {
  const admin = await browser.newContext({ storageState: stateFile('admin') })
  const student = await browser.newContext({ storageState: stateFile('student') })
  const console_ = await admin.newPage()
  const app = await student.newPage()
  try {
    await console_.goto('/admin/jobs')
    await settle(console_)
    await console_.getByText('Northwind Analytics').first().click()
    await expect(console_.getByRole('status').filter({ hasText: 'Live' })).toBeVisible({ timeout: 20_000 })
    await expect(console_.getByRole('button', { name: 'Asha Rao' })).toHaveCount(0)
    let reloaded = false
    console_.on('framenavigated', () => (reloaded = true))

    await app.goto('/jobs')
    await settle(app)
    await app.getByText('Data Analyst').first().click()
    await app.getByRole('button', { name: 'Apply now' }).click()
    await expect(app.getByText('Applied', { exact: true }).first()).toBeVisible()

    // Well inside the 15-second fallback, so this can only pass through the live channel.
    await expect(console_.getByRole('button', { name: 'Asha Rao' })).toBeVisible({ timeout: 8_000 })
    await expect(console_.getByText('New', { exact: true })).toBeVisible()
    await expect(console_.getByText('New application to Northwind Analytics.')).toBeVisible()
    expect(reloaded, 'the console page was not reloaded').toBe(false)
  } finally {
    await admin.close()
    await student.close()
  }
})
