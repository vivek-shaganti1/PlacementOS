import { expect, test } from '@playwright/test'
import { settle, stateFile, watchErrors } from './helpers'

// The landing page's main buttons open "Contact us"; enquiries reach the platform admin console.
// A fixed name: a retried test starts a new worker, so anything generated at load time would not match across tests.
const COLLEGE = 'E2E Enquiry College'

test('a visitor sends an enquiry from the landing page', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /get started|start free|create your account/i })).toHaveCount(0)
  await page.getByRole('navigation').getByRole('button', { name: /Contact us/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Contact us' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Your name').fill('Dr. Lakshmi Rao')
  await dialog.getByLabel('College or organisation').fill(COLLEGE)
  await dialog.getByLabel('Work email').fill(`tpo-${Date.now()}@example.test`)
  await dialog.getByLabel('How can we help?').fill('We have about 900 final-year students and placements start in January.')
  await dialog.getByRole('button', { name: 'Send message' }).click()
  // The dialog is retitled once the message is sent.
  await expect(page.getByRole('dialog', { name: /We have your message/ }).getByRole('status')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('the form explains what is wrong and Escape closes it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: /Contact us/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Contact us' })
  await dialog.getByLabel('Your name').fill('Dr. Rao')
  await dialog.getByLabel('College or organisation').fill('Some College')
  await dialog.getByLabel('Work email').fill('rao@example.test')
  await dialog.getByLabel('Phone').fill('call me maybe')
  await dialog.getByLabel('How can we help?').fill('Please tell us about pricing for 500 students.')
  await dialog.getByRole('button', { name: 'Send message' }).click()
  await expect(dialog.getByRole('alert')).toContainText('valid phone number')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test.describe('platform admin', () => {
  test.use({ storageState: stateFile('super') })
  test('reads the enquiry and marks it handled', async ({ page }) => {
    await page.goto('/super/enquiries')
    await settle(page)
    const item = page.getByRole('listitem').filter({ hasText: COLLEGE }).first()
    await expect(item).toBeVisible()
    await expect(item).toContainText('900 final-year students')
    const before = await page.getByRole('listitem').filter({ hasText: COLLEGE }).count()
    await item.getByRole('button', { name: 'Mark as handled' }).click()
    await expect(page.getByRole('listitem').filter({ hasText: COLLEGE })).toHaveCount(before - 1)
    await page.getByLabel('Show handled').check()
    await expect(page.getByRole('listitem').filter({ hasText: COLLEGE }).getByRole('button', { name: 'Mark as new' }).first()).toBeVisible()
  })
})

test.describe('placement cell', () => {
  test.use({ storageState: stateFile('admin') })
  test('cannot open the enquiries page', async ({ page }) => {
    await page.goto('/super/enquiries')
    await settle(page)
    await expect(page).not.toHaveURL(/enquiries/)
  })
})
