import { expect, test } from '@playwright/test'
import { accounts, settle, signIn, watchErrors } from './helpers'

// A civil engineering student is scored and prepared for civil roles, not software ones.
test('a core-branch student sees their own companies, plan and practice sets', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, accounts.coreStudent)

  await page.goto('/eligibility')
  await settle(page)
  await expect(page.getByText('L&T Construction').first()).toBeVisible()
  await expect(page.getByText('Google')).toHaveCount(0)

  await page.goto('/roadmap')
  await settle(page)
  // The weakest subject of the track leads the plan.
  await expect(page.getByRole('heading', { name: /Phase 1 · Structural Software/ })).toBeVisible()
  await expect(page.getByText(/Advanced DSA|System Design/)).toHaveCount(0)

  await page.goto('/practice')
  await settle(page)
  await expect(page.getByText('Structures & Construction').first()).toBeVisible()
  await expect(page.getByText('Linked Lists')).toHaveCount(0)

  await page.goto('/mock-interviews')
  await settle(page)
  await expect(page.getByText('Core Technical Round').first()).toBeVisible()
  await expect(page.getByText('DSA Round')).toHaveCount(0)
  expect(errors).toEqual([])
})
