import { expect, test } from '@playwright/test'
import { noSidewaysScroll, roles, settle, stateFile, watchErrors } from './helpers'

// Every page each role can reach from its sidebar: it loads, has a heading and a main landmark, logs no errors and
// does not scroll sideways. Then every button that does not change data is pressed once, to catch broken handlers.
const CHANGES_DATA = /delete|remove|sign out|log ?out|withdraw|reject|shortlist|offer|submit|save|send|post|create|add|invite|disconnect|reset|clear|confirm|upload|apply|import|export|download|approve|close drive|mark|generate|analy[sz]e|ask|sync|connect|prove|refresh|copy|log feedback|book|enrol|enroll/i

for (const role of roles) {
  test.describe(`${role} pages`, () => {
    test.use({ storageState: stateFile(role) })

    test(`every ${role} page loads cleanly`, async ({ page }, info) => {
      const errors = watchErrors(page)
      await page.goto('/')
      await page.goto(role === 'student' ? '/dashboard' : role === 'admin' ? '/admin' : role === 'recruiter' ? '/recruiter' : '/super/orgs')
      await settle(page)

      // On phones the sidebar is a drawer behind the "Toggle sidebar" button.
      const toggle = page.getByRole('button', { name: 'Toggle sidebar' })
      const drawer = info.project.name === 'mobile'
      if (drawer) {
        await toggle.click()
        await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
      }
      const scope = drawer ? page.getByRole('dialog', { name: 'Menu' }) : page.locator('nav').first()
      const links = await scope.locator('a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))])
      if (drawer) await page.keyboard.press('Escape')
      expect(links.length, 'sidebar links').toBeGreaterThan(0)

      for (const href of links) {
        await test.step(href, async () => {
          await page.goto(href)
          await settle(page)
          await expect(page.locator('h1').first(), `${href} has a heading`).toBeVisible()
          await expect(page.getByText('This page could not be found')).toHaveCount(0)
          await noSidewaysScroll(page)
        })
      }
      expect(errors, 'console errors').toEqual([])
    })

    test(`${role} buttons respond`, async ({ page }, info) => {
      test.skip(info.project.name === 'mobile', 'desktop sweep covers the handlers')
      const errors = watchErrors(page)
      await page.goto(role === 'student' ? '/dashboard' : role === 'admin' ? '/admin' : role === 'recruiter' ? '/recruiter' : '/super/orgs')
      await settle(page)
      let pressed = 0
      const links = await page.locator('nav').first().locator('a[href^="/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')!))])
      for (const href of links) {
        await test.step(href, async () => {
          await page.goto(href)
          await settle(page)
          // Names are read once up front; each button is then found again by name, so a re-render cannot shift the list.
          const names = await page.locator('main button:visible:not([disabled])').evaluateAll((bs) =>
            bs.map((b) => (b.getAttribute('aria-label') || (b as HTMLElement).innerText || '').trim()).filter(Boolean),
          )
          for (const name of [...new Set(names)].slice(0, 25)) {
            if (CHANGES_DATA.test(name)) continue
            const b = page.locator('main').getByRole('button', { name, exact: true }).first()
            if (!(await b.isVisible().catch(() => false))) continue
            if (await b.click({ timeout: 3_000 }).then(() => true, () => false)) pressed++
            await page.keyboard.press('Escape')
            if (new URL(page.url()).pathname !== href) {
              await page.goto(href)
              await settle(page)
            }
          }
        })
      }
      expect(pressed, 'buttons pressed').toBeGreaterThan(0)
      expect(errors, 'console errors while pressing buttons').toEqual([])
    })
  })
}
