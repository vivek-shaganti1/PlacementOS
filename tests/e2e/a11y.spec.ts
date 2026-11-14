import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { roles, settle, stateFile } from './helpers'

// Automated accessibility audit (axe-core, WCAG 2.2 A and AA) of every page each role can reach, plus the public pages.
// Serious and critical violations fail the test. With AUDIT_SHOTS=1 it also saves a full-page screenshot of each page for
// visual review (test-results/audit/).
const SHOTS = !!process.env.AUDIT_SHOTS
const home = { student: '/dashboard', admin: '/admin', recruiter: '/recruiter', super: '/super/orgs' } as const

async function audit(page: import('@playwright/test').Page, name: string) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const bad = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  if (SHOTS) {
    mkdirSync('test-results/audit', { recursive: true })
    await page.screenshot({ path: `test-results/audit/${name.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true })
  }
  return bad.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(' ')}`)
}

test('public pages have no serious accessibility violations', async ({ page }) => {
  const found: string[] = []
  for (const path of ['/', '/login', '/signup', '/privacy', '/terms', '/security']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    for (const v of await audit(page, `public${path === '/' ? '_home' : path}`)) found.push(`${path} ${v}`)
  }
  expect(found).toEqual([])
})

for (const role of roles) {
  test.describe(role, () => {
    test.use({ storageState: stateFile(role) })
    test(`${role} pages have no serious accessibility violations`, async ({ page }, info) => {
      await page.goto(home[role])
      await settle(page)
      const links = await page.locator('nav').first().locator('a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))])
      const found: string[] = []
      for (const href of links) {
        await page.goto(href)
        await settle(page)
        await page.waitForTimeout(400)
        for (const v of await audit(page, `${info.project.name}_${role}${href}`)) found.push(`${href} ${v}`)
      }
      expect(found).toEqual([])
    })
  })
}
