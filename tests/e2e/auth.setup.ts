import { test as setup } from '@playwright/test'
import { accounts, roles, signIn, stateFile } from './helpers'

// Signs each role in once through the real login form and keeps the session for the other tests.
for (const role of roles) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await signIn(page, accounts[role])
    await page.context().storageState({ path: stateFile(role) })
  })
}
