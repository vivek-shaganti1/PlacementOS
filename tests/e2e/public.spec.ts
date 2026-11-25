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
