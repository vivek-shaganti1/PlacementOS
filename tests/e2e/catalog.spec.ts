import { expect, test } from '@playwright/test'
import { settle, stateFile, watchErrors } from './helpers'

// A platform admin verifies a company's details; students then see them labelled as checked, with the source.
// Serial: the student test reads what the admin test saved.
test.describe.configure({ mode: 'serial' })
const COMPANY = 'Deloitte'
const ABOUT = 'Professional services firm; graduate hiring in India runs through campus drives and its careers site.'

test.describe('platform admin', () => {
  test.use({ storageState: stateFile('super') })
  test('verifies a company against a source', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/super/companies')
    await settle(page)
    await page.getByLabel('Search companies').fill(COMPANY)
    await page.getByRole('button', { name: new RegExp(`^${COMPANY}`) }).click()
    await page.getByLabel('About').fill(ABOUT)
    await page.getByLabel('Fresher CTC from (LPA)').fill('7')
    await page.getByLabel('to (LPA)').fill('9.5')
    await page.getByLabel('Source you checked').fill('https://example.test/deloitte-campus-2026')
    await page.getByLabel('I checked these details against the source today').check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(`${COMPANY} saved`)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`^${COMPANY}`) })).toContainText('Checked')
    expect(errors).toEqual([])
  })

  test('a "checked" tick without a source is refused', async ({ page }) => {
    await page.goto('/super/companies')
    await settle(page)
    await page.getByLabel('Search companies').fill('Accenture')
    await page.getByRole('button', { name: /^Accenture/ }).click()
    await page.getByLabel('Source you checked').fill('')
    await page.getByLabel('I checked these details against the source today').check()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Add the source you checked the details against.')).toBeVisible()
  })
})

test.describe('student', () => {
  test.use({ storageState: stateFile('student') })
  test('sees the verified details, the source and the checked CTC', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto('/eligibility?company=deloitte')
    await settle(page)
    const panel = page.getByRole('region', { name: new RegExp(`^${COMPANY},`) })
    await expect(panel).toContainText(ABOUT)
    await expect(panel).toContainText('CTC (verified)')
    await expect(panel).toContainText('Range 7–9.5 LPA')
    await expect(panel.getByRole('link', { name: 'the source' })).toHaveAttribute('href', 'https://example.test/deloitte-campus-2026')
    await panel.getByRole('button', { name: 'Package' }).click()
    await expect(panel).not.toContainText('not verified')
    expect(errors).toEqual([])
  })
})

test.describe('placement cell', () => {
  test.use({ storageState: stateFile('admin') })
  test('cannot open the companies editor', async ({ page }) => {
    await page.goto('/super/companies')
    await settle(page)
    await expect(page).not.toHaveURL(/super\/companies/)
  })
})
