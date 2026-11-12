import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { accounts, settle, signIn, stateFile, watchErrors } from './helpers'

// Download my data, calendar files, search across pages, the activity log and the idle sign-out.

test.describe('student', () => {
  test.use({ storageState: stateFile('student') })

  test('downloads their own data, and only their own', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/settings')
    await settle(page)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()])
    expect(download.suggestedFilename()).toMatch(/^placementiq-my-data-\d{4}-\d{2}-\d{2}\.json$/)
    const data = JSON.parse(readFileSync(await download.path(), 'utf8'))
    expect(data.account.email).toBe(accounts.student)
    expect(data.profile.email).toBe(accounts.student)
    expect(data.skills.map((s: { skill: string }) => s.skill).sort()).toEqual(['Data Structures', 'Python', 'React', 'SQL'])
    expect(data.drive_applications).toHaveLength(1)
    expect(data.not_included).toEqual([])
    expect(JSON.stringify(data)).not.toContain(accounts.otherCollege.student)
    expect(data.profile).not.toHaveProperty('resume_analysis')
    expect(errors).toEqual([])
  })

  test('adds a drive deadline to their calendar', async ({ page }) => {
    await page.goto('/jobs')
    await settle(page)
    await page.getByText('Graduate Software Engineer').first().click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add deadline to calendar' }).click()])
    expect(download.suggestedFilename()).toBe('acme-systems-deadline.ics')
    const ics = readFileSync(await download.path(), 'utf8')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('Acme Systems')
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/)
  })

  test('search jumps to a page as well as to companies', async ({ page }) => {
    await page.goto('/dashboard')
    await settle(page)
    await page.keyboard.press('ControlOrMeta+k')
    const box = page.getByRole('combobox', { name: 'Search companies and pages' })
    await expect(box).toBeFocused()
    await box.fill('what-if')
    await expect(page.getByRole('option', { name: /What-If Simulator/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/what-if$/)
  })

  test('is warned before an idle session ends, and can stay', async ({ page }) => {
    await page.goto('/dashboard?idle=1.05') // 63 seconds: the one-minute warning appears after 3
    const dialog = page.getByRole('alertdialog', { name: 'Still there?' })
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await dialog.getByRole('button', { name: 'Stay signed in' }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test('an idle session is signed out', async ({ page }) => {
  await signIn(page, accounts.otherCollege.student)
  await page.goto('/dashboard?idle=0.05') // 3 seconds
  await page.waitForURL(/\/(login)?$/, { timeout: 20_000 })
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')).length)).toBe(0)
})

test.describe('placement cell', () => {
  test.use({ storageState: stateFile('admin') })

  test('reads its activity log, filters it and exports it', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/admin/activity')
    await settle(page)
    await expect(page.getByRole('heading', { name: 'Activity log' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Student added to roster' }).first()).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Asha Rao' }).first()).toBeVisible() // the roster entry is named
    // Nothing from the other college.
    await expect(page.getByText('Meera Iyer')).toHaveCount(0)
    await page.getByLabel('Filter by kind of change').selectOption('Access')
    await expect(page.getByRole('cell', { name: 'Student added to roster' })).toHaveCount(0)
    await expect(page.getByRole('cell', { name: /Access granted|Recruiter added/ }).first()).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()])
    const csv = readFileSync(await download.path(), 'utf8')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('"When (IST)","Action","By","About","Details"')
    expect(errors).toEqual([])
  })

  test('search goes to the roster', async ({ page }) => {
    await page.goto('/admin')
    await settle(page)
    const box = page.getByRole('combobox', { name: 'Search pages' })
    await box.fill('roster')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/admin\/roster$/)
  })
})
