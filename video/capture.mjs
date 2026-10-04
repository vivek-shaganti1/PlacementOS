// Captures real PlacementIQ screens (local dev server + dev-only sample-data backend) for the film.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const OUT = new URL('./public/shots/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/Users/vivekshaganti/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function ctx(role, viewport = { width: 1600, height: 900 }, scale = 2) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'no-preference' })
  if (role)
    await c.addInitScript((r) => {
      if (!sessionStorage.getItem('piq-init')) {
        sessionStorage.clear()
        sessionStorage.setItem('piq-init', '1')
      }
      localStorage.setItem('piq-mock', '1')
      localStorage.setItem('piq-mock-role', r)
    }, role)
  return c
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: `${OUT}${name}.png`, ...opts })
  console.log('shot', name)
}

async function settle(page, ms = 2600) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await wait(ms)
}

async function scrollTo(page, y) {
  await page.evaluate((y) => {
    const el = [...document.querySelectorAll('main *')].find((e) => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible')
    ;(el ?? document.scrollingElement).scrollTo({ top: y, behavior: 'instant' })
  }, y)
  await wait(1400)
}

// ---------------------------------------------------------------- public
{
  const c = await ctx(null)
  const p = await c.newPage()
  await p.goto(BASE + '/')
  await settle(p, 3200)
  await shot(p, 'landing-hero')
  for (const [i, y] of [900, 1800, 2700, 3600].entries()) {
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y)
    await wait(1600)
    await shot(p, `landing-${i + 1}`)
  }
  await p.goto(BASE + '/login')
  await settle(p, 2000)
  await shot(p, 'login')
  await p.locator('input[type=email]').first().fill('23eg105f59@anurag.edu.in')
  await p.locator('input[type=password]').first().fill('placementiq-demo')
  await wait(400)
  await shot(p, 'login-filled')
  await c.close()
}

// ---------------------------------------------------------------- student
{
  const c = await ctx('student')
  const p = await c.newPage()
  await p.goto(BASE + '/dashboard')
  await settle(p, 3500)
  await shot(p, 'dash')
  await scrollTo(p, 700)
  await shot(p, 'dash-2')
  await scrollTo(p, 1400)
  await shot(p, 'dash-3')

  for (const [route, name] of [
    ['/eligibility', 'eligibility'],
    ['/resume', 'resume'],
    ['/skill-gap', 'skillgap'],
    ['/analytics', 'analytics'],
    ['/jobs', 'jobs'],
    ['/profile', 'profile'],
    ['/roadmap', 'roadmap'],
    ['/practice', 'practice'],
  ]) {
    await p.goto(BASE + route)
    await settle(p, 3000)
    await shot(p, name)
    await scrollTo(p, 650)
    await shot(p, name + '-2')
  }

  // Company detail panel from Eligibility Stacks
  await p.goto(BASE + '/eligibility?company=google')
  await settle(p, 3000)
  await shot(p, 'company-panel')

  // AI assistant: ask a question, capture typing, thinking and the answer
  await p.goto(BASE + '/dashboard')
  await settle(p, 3000)
  await p.getByText('Ask anything').first().click()
  await wait(1200)
  await shot(p, 'assistant-open')
  const box = p.locator('textarea, input[placeholder*="Ask" i]').last()
  await box.fill('Which skill should I improve first for product companies?')
  await wait(300)
  await shot(p, 'assistant-typed')
  await box.press('Enter')
  await wait(350)
  await shot(p, 'assistant-thinking')
  await wait(2200)
  await shot(p, 'assistant-answer')
  await c.close()

  // Tablet and phone
  for (const [name, vp] of [['tablet', { width: 834, height: 1112 }], ['phone', { width: 390, height: 844 }]]) {
    const cc = await ctx('student', vp, 3)
    const pp = await cc.newPage()
    await pp.goto(BASE + '/dashboard')
    await settle(pp, 3500)
    await shot(pp, `${name}-dash`)
    await pp.goto(BASE + '/eligibility')
    await settle(pp, 3000)
    await shot(pp, `${name}-eligibility`)
    await cc.close()
  }
}

// ---------------------------------------------------------------- placement cell
{
  const c = await ctx('org')
  const p = await c.newPage()
  await p.goto(BASE + '/admin')
  await settle(p, 3500)
  await shot(p, 'admin-overview')
  await p.goto(BASE + '/admin/students')
  await settle(p, 3500)
  await shot(p, 'admin-students')
  await p.locator('tbody tr').nth(1).click()
  await wait(1500)
  await shot(p, 'admin-drawer')
  await p.goto(BASE + '/admin/roster')
  await settle(p, 3000)
  await shot(p, 'admin-roster')
  await p.locator('textarea').fill('23eg105e14@anurag.edu.in, Nikhil Reddy, 23EG105E14, CSE, 2027\n23eg105e15@anurag.edu.in, Pooja Rao, 23EG105E15, CSE, 2027')
  await wait(400)
  await shot(p, 'admin-roster-paste')
  await p.goto(BASE + '/admin/jobs')
  await settle(p, 3000)
  await shot(p, 'admin-jobs')
  await c.close()
}

// ---------------------------------------------------------------- platform admin
{
  const c = await ctx('super')
  const p = await c.newPage()
  await p.goto(BASE + '/super/orgs')
  await settle(p, 3500)
  await shot(p, 'super-orgs')
  await scrollTo(p, 760)
  await shot(p, 'super-orgs-table')
  await c.close()
}

await browser.close()
