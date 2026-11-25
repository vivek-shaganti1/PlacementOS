// Read-only checks of a deployed site, run after every production deployment (.github/workflows/post-deploy.yml).
//   node scripts/smoke-live.mjs https://placementiq-os.vercel.app
// It only loads pages and makes requests a signed-out visitor could make. It never signs in or writes anything.
const base = (process.argv[2] || 'https://placementiq-os.vercel.app').replace(/\/$/, '')
const results = []
const check = async (name, fn) => {
  try {
    const detail = await fn()
    results.push([true, name, detail ?? ''])
  } catch (e) {
    results.push([false, name, e instanceof Error ? e.message : String(e)])
  }
}
const get = (path, init) => fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(15_000), ...init })
const must = (ok, msg) => {
  if (!ok) throw new Error(msg)
}

for (const path of ['/', '/login', '/signup', '/reset-password', '/privacy', '/terms', '/security']) {
  await check(`page ${path}`, async () => {
    const r = await get(path)
    must(r.status === 200, `status ${r.status}`)
  })
}
await check('unknown address is a 404', async () => must((await get('/no-such-page-smoke')).status === 404, 'not 404'))

let html = ''
await check('security headers', async () => {
  const r = await get('/')
  html = await r.text()
  const csp = r.headers.get('content-security-policy') ?? ''
  must(csp.includes("frame-ancestors 'none'") && csp.includes("script-src 'self'"), 'CSP missing or weakened')
  must(!/googleapis|gstatic/.test(csp), 'CSP still allows Google font hosts')
  must(r.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options')
  must(r.headers.get('x-content-type-options') === 'nosniff', 'nosniff')
  must(/max-age=\d{7,}/.test(r.headers.get('strict-transport-security') ?? ''), 'HSTS')
})
await check('fonts are served by the site itself', async () => must(!/fonts\.(googleapis|gstatic)\.com/.test(html), 'page links to Google Fonts'))

await check('API health reaches the database', async () => {
  const r = await get('/api/health')
  must(r.status === 200 && (await r.json()).ok === true, `health ${r.status}`)
})

// The publishable key is public by design (it ships in the page); RLS is what protects the data.
const entry = html.match(/\/assets\/index-[\w-]+\.js/)?.[0]
const js = entry ? await (await get(entry)).text() : ''
const key = js.match(/sb_publishable_[\w-]+/)?.[0]
await check('publishable key found, no secret key in the bundle', async () => {
  must(!!key, 'no publishable key in the entry bundle')
  must(!/sb_secret_[\w-]{20}|gsk_[\w]{20}/.test(js), 'a secret-looking key is in the bundle')
})
if (key) {
  const h = { apikey: key }
  await check('database probe', async () => {
    const r = await get('/supabase/rest/v1/rpc/health_probe', { method: 'POST', headers: { ...h, 'content-type': 'application/json' }, body: '{}' })
    must(r.status === 200, `probe ${r.status}`)
  })
  await check('public sign-up is off', async () => must((await (await get('/supabase/auth/v1/settings', { headers: h })).json()).disable_signup === true, 'sign-up is on'))
  for (const t of ['profiles', 'org_students', 'user_roles', 'audit_log', 'credentials']) {
    await check(`signed-out read of ${t} is refused`, async () => {
      const r = await get(`/supabase/rest/v1/${t}?select=*&limit=1`, { headers: h })
      const body = await r.text()
      must(r.status === 401 || r.status === 403 || body === '[]', `status ${r.status}: ${body.slice(0, 80)}`)
    })
  }
}
for (const route of ['admin', 'resume', 'account', 'password', 'connect', 'chat']) {
  await check(`/api/${route} needs a session`, async () => {
    const r = await get(`/api/${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    must(r.status === 401, `status ${r.status}`)
  })
}

await check('/api/contact validates before storing', async () => {
  const r = await get('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  must(r.status === 422, `status ${r.status}`)
})

for (const [ok, name, detail] of results) console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
const failed = results.filter(([ok]) => !ok).length
console.log(`\n${results.length - failed} of ${results.length} checks passed on ${base}`)
process.exit(failed ? 1 : 0)
