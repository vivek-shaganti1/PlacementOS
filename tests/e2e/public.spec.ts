import { expect, test } from '@playwright/test'
import { noSidewaysScroll, watchErrors } from './helpers'

// Signed-out pages in Chromium, Firefox and WebKit, at 320 px and desktop width.
const pages = ['/', '/login', '/signup', '/reset-password', '/privacy', '/terms', '/security']

for (const path of pages) {
  test(`${path} renders without errors`, async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(path)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('main').first()).toBeVisible()
    await noSidewaysScroll(page)
    await page.setViewportSize({ width: 320, height: 640 })
    await noSidewaysScroll(page)
    expect(errors).toEqual([])
  })
}

test('unknown address shows the not-found page with a 404', async ({ page }) => {
  const res = await page.goto('/no-such-page')
  expect(res?.status()).toBe(404)
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
})

test('internal links on the public pages are not broken', async ({ page, request }) => {
  const seen = new Set<string>()
  for (const path of ['/', '/privacy', '/terms', '/security', '/login']) {
    await page.goto(path)
    for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
      const clean = href.split('#')[0]
      if (!clean || seen.has(clean)) continue
      seen.add(clean)
      const res = await request.get(clean)
      expect(res.status(), `${path} links to ${clean}`).toBeLessThan(400)
    }
  }
  expect(seen.size).toBeGreaterThan(3)
})

test('security headers are set on every kind of response', async ({ request }) => {
  for (const path of ['/', '/dashboard', '/api/health', '/no-such-page']) {
    const res = await request.get(path)
    const h = res.headers()
    expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'")
    expect(h['content-security-policy'], path).not.toContain('googleapis')
    expect(h['x-frame-options'], path).toBe('DENY')
    expect(h['x-content-type-options'], path).toBe('nosniff')
  }
})

test('fonts are served by the site itself', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url())
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "Geist Variable"'))).toBe(true)
  expect(external).toEqual([])
})

// Blocked GPUs, old drivers and locked-down campus computers have no WebGL; the 3D there is decoration.
test('the landing page works where WebGL is not available', async ({ page }) => {
  const errors = watchErrors(page)
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      return /webgl/i.test(kind) ? null : (real as (...a: unknown[]) => unknown).call(this, kind, ...rest)
    } as typeof real
    // The fullest device tier, so the page would choose the 3D scene if it did not check.
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 12 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
  })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible()
  // Long enough for the idle-time scene to have been tried.
  await page.waitForTimeout(6_000)
  await expect(page.getByText('Something went wrong on this screen')).toHaveCount(0)
  await expect(page.locator('h1').first()).toBeVisible()
  expect(errors).toEqual([])
})

// The landing page explains the product by running its real engine: moving a control must change the answer.
test('the landing demo answers as the visitor changes the profile', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/')
  const demo = page.locator('#try')
  const answer = demo.getByRole('status')
  const open = async () => Number((await answer.textContent())!.match(/(\d+) of/)![1])
  const start = await open()
  // The prerendered page is replaced once the app has loaded, and only the app's controls answer: try until one does.
  await expect(async () => {
    await demo.getByLabel('CGPA').fill('5.5', { timeout: 2_000 })
    expect(await open()).toBeLessThan(start)
  }).toPass()
  await demo.getByLabel('CGPA').fill('9')
  await expect.poll(open).toBeGreaterThanOrEqual(start)

  // Any company on the board explains itself.
  const company = demo.getByRole('region', { name: /^Can become/ }).getByRole('button').first()
  const name = (await company.textContent())!
  await company.click()
  await expect(company).toHaveAttribute('aria-pressed', 'true')
  await expect(demo.getByText(`${name}: can become`)).toBeVisible()

  // The suggested change can be made, and changes the board.
  const before = await demo.getByRole('region').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join())
  await demo.getByRole('button', { name: 'Make that change' }).click()
  await expect.poll(() => demo.getByRole('region').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join())).not.toBe(before)

  // Every branch works, and the controls work from the keyboard.
  for (const b of ['Electronics', 'Electrical', 'Mechanical', 'Civil', 'Computer Science']) {
    await demo.getByLabel('Branch').selectOption({ label: b })
    await expect(answer).toContainText(/\d+ of \d+ companies/)
  }
  await demo.getByLabel('CGPA').focus()
  const cgpa = await demo.getByLabel('CGPA').inputValue()
  await page.keyboard.press('ArrowRight')
  expect(Number(await demo.getByLabel('CGPA').inputValue())).toBeGreaterThan(Number(cgpa))
  expect(errors).toEqual([])
})

test('the landing page stands still for visitors who ask for less motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForTimeout(3_500)
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.locator('[data-stage]')).toHaveAttribute('data-stage', 'still')
  await expect(page.locator('#season h3').last()).toBeAttached()
})
