// Runs the real /api handlers and scoring rules with every outbound call faked. Nothing leaves this process.
// npm run test:unit
import assert from 'node:assert/strict'

const env = process.env
env.SUPABASE_SECRET_KEY = 'test-secret'
env.SUPABASE_URL = 'https://db.test'
env.GROQ_API_KEY = 'test-groq'

type Call = { url: string; method: string; body: any; headers: Record<string, string> }
let calls: Call[] = []
let reply: (c: Call) => Response | undefined = () => undefined
const ok = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
globalThis.fetch = (async (input: any, init: any = {}) => {
  const c: Call = { url: String(input), method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : null, headers: init.headers ?? {} }
  calls.push(c)
  return reply(c) ?? ok({})
}) as typeof fetch

const jwt = (claims: Record<string, unknown>) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`
const uid = 'a1000000-0000-4000-8000-0000000000a1'
const post = (body: unknown, token?: string) =>
  new Request('https://app.test/api/x', { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
const quiet = console.error

const tests: [string, () => Promise<void> | void][] = []
const test = (n: string, f: () => Promise<void> | void) => tests.push([n, f])

const { default: signup } = await import('../api/signup')
const { default: admin } = await import('../api/admin')
const { default: password } = await import('../api/password')
const { default: account } = await import('../api/account')
const { default: resume } = await import('../api/resume')
const { default: connect, sameName, sameFullName } = await import('../api/connect')
const { trustedProfile, provenIntegrations } = await import('../src/lib/trust')
const { evaluateAll } = await import('../src/lib/eligibility')

// ------------------------------------------------------------------ SEC-01
test('SEC-01 signup never creates an account directly; it only sends the emailed link', async () => {
  reply = (c) => (c.url.includes('signup_attempt') ? ok(true) : c.url.includes('signup_check') ? ok('ok') : undefined)
  const res = await signup(post({ email: 's@x.test', full_name: 'S', roll_number: 'R1', password: 'chosen-by-attacker' }))
  assert.equal(res.status, 200)
  assert.equal(((await res.json()) as any).verify, true)
  assert.ok(calls.some((c) => c.url.includes('/auth/v1/invite')))
  assert.ok(!calls.some((c) => c.url.includes('/auth/v1/admin/users')))
  assert.ok(!JSON.stringify(calls.map((c) => c.body)).includes('chosen-by-attacker'))
})
test('SEC-01 a wrong roll number sends nothing and reveals nothing', async () => {
  reply = (c) => (c.url.includes('signup_attempt') ? ok(true) : c.url.includes('signup_check') ? ok('roll_mismatch') : undefined)
  const res = await signup(post({ email: 's@x.test', roll_number: 'BAD' }))
  assert.equal(res.status, 403)
  assert.ok(!calls.some((c) => c.url.includes('/auth/')))
})

// ------------------------------------------------------------------ SEC-03
const adminReply = (c: Call) => {
  if (c.url.includes('user_roles')) return ok([{ role: 'org_admin', org_id: org }])
  if (c.url.includes('can_provision')) return ok(true)
  if (c.url.includes('organizations?')) return ok([{ id: org, email_domains: ['x.test'] }])
  if (c.url.includes('/auth/v1/admin/users')) return ok({ id: 'new' })
  return undefined
}
const org = '0a000000-0000-4000-8000-00000000000a'
test('SEC-03 each person gets a different password, flagged in server-only metadata', async () => {
  reply = adminReply
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', logins: true, people: [{ email: 'a@x.test' }, { email: 'b@x.test' }] }, jwt({ sub: uid })))
  const { results } = (await res.json()) as { results: { password?: string }[] }
  const made = calls.filter((c) => c.url.endsWith('/auth/v1/admin/users'))
  assert.equal(made.length, 2)
  assert.notEqual(made[0].body.password, made[1].body.password)
  assert.ok(made[0].body.password.length >= 18)
  assert.equal(results[0].password, made[0].body.password)
  for (const m of made) {
    assert.equal(m.body.app_metadata.must_change_password, true)
    assert.equal(m.body.app_metadata.provisioned_org, org)
    assert.ok(Date.parse(m.body.app_metadata.temp_password_expires_at) > Date.now())
    assert.equal(m.body.user_metadata.must_change_password, undefined)
  }
})
test('SEC-03 a caller cannot choose the password', async () => {
  reply = adminReply
  await admin(post({ action: 'invite', org_id: org, role: 'student', logins: true, password: 'shared-password-1', people: [{ email: 'a@x.test' }] }, jwt({ sub: uid })))
  assert.notEqual(calls.find((c) => c.url.endsWith('/auth/v1/admin/users'))?.body.password, 'shared-password-1')
})
test('NV-06 invite emails carry the authorization header', async () => {
  reply = adminReply
  await admin(post({ action: 'invite', org_id: org, role: 'student', people: [{ email: 'a@x.test' }] }, jwt({ sub: uid })))
  assert.ok(calls.find((c) => c.url.includes('/auth/v1/invite'))?.headers.authorization)
})
test('DEF-02 more than 50 people is refused, never cut short', async () => {
  reply = adminReply
  const people = Array.from({ length: 51 }, (_, i) => ({ email: `s${i}@x.test` }))
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', people }, jwt({ sub: uid })))
  assert.equal(res.status, 422)
})
const userReply = (app: Record<string, unknown>) => (c: Call) => (c.url.endsWith('/auth/v1/user') ? ok({ id: uid, app_metadata: app, user_metadata: {} }) : undefined)
test('SEC-03 the flag is cleared only together with a new password', async () => {
  reply = userReply({ must_change_password: true })
  const res = await password(post({ password: 'a-new-password' }, jwt({ sub: uid })))
  assert.equal(res.status, 200)
  const put = calls.find((c) => c.method === 'PUT')!
  assert.equal(put.body.password, 'a-new-password')
  assert.equal(put.body.app_metadata.must_change_password, false)
  assert.ok(calls.some((c) => c.url.includes('logout?scope=others')))
})
test('SEC-03 an expired temporary password cannot be swapped, but a reset email can', async () => {
  reply = userReply({ must_change_password: true, temp_password_expires_at: new Date(Date.now() - 1000).toISOString() })
  assert.equal((await password(post({ password: 'a-new-password' }, jwt({ sub: uid, amr: [{ method: 'password' }] })))).status, 403)
  assert.equal((await password(post({ password: 'a-new-password' }, jwt({ sub: uid, amr: [{ method: 'recovery' }] })))).status, 200)
})
test('SEC-03 the endpoint does not change passwords on ordinary accounts', async () => {
  reply = userReply({})
  assert.equal((await password(post({ password: 'a-new-password' }, jwt({ sub: uid })))).status, 409)
  assert.ok(!calls.some((c) => c.method === 'PUT'))
})
test('SEC-03 other functions refuse a token with the flag', async () => {
  reply = () => undefined
  assert.equal((await connect(post({ platform: 'github', username: 'x' }, jwt({ sub: uid, app_metadata: { must_change_password: true } })))).status, 403)
})

// ------------------------------------------------------------------ SEC-04, SEC-09, SEC-20
const student = { id: uid, org_id: org, full_name: 'Edited Name' }
const ghReply = (bio: string, row: unknown[] = []) => (c: Call) => {
  if (c.url.includes('rest/v1/profiles?')) return ok([student])
  if (c.url.includes('connect_attempt')) return ok(true)
  if (c.url.includes('rest/v1/coding_profiles?user_id')) return ok(row)
  if (c.url.startsWith('https://api.github.com/users/') && c.url.includes('/repos')) return ok([])
  if (c.url.startsWith('https://api.github.com/users/')) return ok({ login: 'octo', bio, public_repos: 0 })
  return undefined
}
const stored = () => calls.find((c) => c.url.includes('coding_profiles') && c.method === 'POST')?.body
test('SEC-04 an account without the code is stored as unproven and the code is returned', async () => {
  reply = ghReply('just a bio')
  const body = (await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).json()) as any
  assert.equal(body.proven, false)
  assert.match(body.code, /^piq-[0-9a-f]{12}$/)
  assert.equal(stored().stats.ownership.proven, false)
})
test('SEC-04 the code on the public profile proves it, and the code differs per student', async () => {
  reply = ghReply('')
  const a = (await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).json()) as any
  const other = 'b1000000-0000-4000-8000-0000000000b1'
  reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([{ ...student, id: other }]) : ghReply('')(c))
  const b = (await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: other })))).json()) as any
  assert.notEqual(a.code, b.code)
  calls = []
  reply = ghReply(`hello ${a.code}`)
  const proven = (await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).json()) as any
  assert.equal(proven.proven, true)
  assert.equal(stored().stats.ownership.proven, true)
  assert.equal(stored().stats.proof, undefined)
})
test('SEC-04 proof survives a later sync without the code, for the same handle only', async () => {
  reply = ghReply('', [{ synced_at: new Date(0).toISOString(), username: 'octo', stats: { ownership: { proven: true, at: 'then' } } }])
  assert.equal(((await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).json()) as any).proven, true)
  calls = []
  reply = ghReply('', [{ synced_at: new Date(0).toISOString(), username: 'someone-else', stats: { ownership: { proven: true } } }])
  assert.equal(((await (await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).json()) as any).proven, false)
})
test('SEC-20 a student removed from the roster cannot connect anything', async () => {
  reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([{ ...student, org_id: null }]) : undefined)
  assert.equal((await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).status, 403)
})
test('SEC-17 the attempt is counted before anything is fetched', async () => {
  reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([student]) : c.url.includes('connect_attempt') ? ok(false) : undefined)
  assert.equal((await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))).status, 429)
  assert.ok(!calls.some((c) => c.url.includes('github.com')))
})
const badges = (issued_to: string) => ({ data: [{ state: 'accepted', issued_to, badge_template: { name: 'B' }, issuer: {} }] })
const credlyReply = (roster: string | null, holder: string) => (c: Call) => {
  if (c.url.includes('rest/v1/profiles?')) return ok([student])
  if (c.url.includes('connect_attempt')) return ok(true)
  if (c.url.includes('rest/v1/coding_profiles?user_id')) return ok([])
  if (c.url.includes('org_students')) return ok(roster === null ? [] : [{ full_name: roster }])
  if (c.url.includes('credly.com')) return ok(badges(holder))
  return undefined
}
test('SEC-09 Credly compares the roster name, not the editable profile name', async () => {
  reply = credlyReply('Real Student', 'Edited Name')
  assert.equal((await connect(post({ platform: 'credly', username: 'c' }, jwt({ sub: uid })))).status, 422)
  calls = []
  reply = credlyReply('Real Student', 'Real Student')
  assert.equal(((await (await connect(post({ platform: 'credly', username: 'c' }, jwt({ sub: uid })))).json()) as any).proven, true)
})
test('W3-1 a partial or initial-based name does not prove a Credly account', async () => {
  for (const [holder, roster] of [['Rahul', 'Rahul Kumar'], ['Rahul Kumar Sharma', 'Rahul Kumar'], ['Rahul Kumar', 'R Kumar'], ['A Kumar', 'Arjun Kumar']]) {
    calls = []
    reply = credlyReply(roster, holder)
    const res = await connect(post({ platform: 'credly', username: 'c' }, jwt({ sub: uid })))
    assert.equal(res.status, 422, `${holder} vs ${roster}`)
  }
  assert.ok(sameFullName('Kumar Rahul', 'rahul kumar'))
  assert.ok(!sameFullName('R Kumar', 'R Kumar'))
})
test('SEC-09 a missing roster name fails closed', async () => {
  reply = credlyReply(null, 'Anyone')
  assert.equal((await connect(post({ platform: 'credly', username: 'c' }, jwt({ sub: uid })))).status, 422)
})
test('SEC-08 an NPTEL lookup is never self-verifying', async () => {
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?')) return ok([student])
    if (c.url.includes('connect_attempt')) return ok(true)
    if (c.url.includes('nptel.ac.in')) return new Response('<title>Cert</title>', { status: 200, headers: { 'content-type': 'text/html' } })
    return undefined
  }
  await connect(post({ credential: 'nptel', ref: 'NPTEL24CS42S12345678', skill: 'Data Structures & Algorithms' }, jwt({ sub: uid })))
  const row = calls.find((c) => c.url.includes('credentials') && c.method === 'POST')?.body
  assert.equal(row?.status, 'pending')
  assert.equal(row?.verified_by, null)
})
test('sameName matches initials and rejects other people', () => {
  assert.ok(sameName('Bobbala A Reddy', 'Bobbala Asha Reddy'))
  assert.ok(!sameName('Someone Else', 'Bobbala Asha Reddy'))
})

// ------------------------------------------------------------------ W5-4, W2-8
const rosterCalls = () => calls.filter((c) => c.url.includes('org_students?on_conflict')).map((c) => c.body as Record<string, unknown>[])
test('W5-4 a re-import sends only the cells that were filled in', async () => {
  reply = adminReply
  await admin(post({ action: 'invite', org_id: org, role: 'student', send: false, people: [
    { email: 'a@x.test' },
    { email: 'b@x.test', full_name: 'B', section: 'c', cgpa: 8.2 },
  ] }, jwt({ sub: uid })))
  const rows = rosterCalls().flat()
  const a = rows.find((r) => r.email === 'a@x.test')!
  const b = rows.find((r) => r.email === 'b@x.test')!
  assert.deepEqual(Object.keys(a).sort(), ['email', 'org_id'], 'nothing blank, no forced programme, no null academics')
  assert.equal(b.full_name, 'B')
  assert.equal(b.section, 'C')
  assert.equal(b.cgpa, 8.2)
  assert.ok(!('program' in b) && !('backlogs' in b))
  for (const batch of rosterCalls()) assert.equal(new Set(batch.map((r) => Object.keys(r).sort().join())).size, 1, 'each request has one column set')
})
test('F7 a group the database refuses is reported row by row; other groups are saved', async () => {
  reply = (c) => (c.url.includes('org_students?on_conflict') && (c.body as any[]).some((r) => 'cgpa' in r) ? ok({ message: 'ROSTER_DOMAIN: This email cannot be added here.' }, 400) : adminReply(c))
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', send: false, people: [{ email: 'a@x.test' }, { email: 'b@x.test', cgpa: 'NA' }, { email: 'c@x.test', cgpa: 7 }] }, jwt({ sub: uid })))
  assert.equal(res.status, 200)
  const { results } = (await res.json()) as { results: { email: string; status: string; detail?: string }[] }
  assert.equal(results.find((r) => r.email === 'c@x.test')?.status, 'failed')
  assert.match(results.find((r) => r.email === 'c@x.test')?.detail ?? '', /cannot be added/)
  assert.equal(results.find((r) => r.email === 'a@x.test')?.status, 'saved')
  assert.equal(results.find((r) => r.email === 'b@x.test')?.status, 'saved', '"NA" counts as blank')
})
test('W5-4 an impossible academic value is reported and that row is not saved', async () => {
  reply = adminReply
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', send: false, people: [{ email: 'a@x.test', cgpa: 42 }, { email: 'b@x.test' }] }, jwt({ sub: uid })))
  const { results } = (await res.json()) as { results: { email: string; status: string; detail?: string }[] }
  assert.equal(results.find((r) => r.email === 'a@x.test')?.status, 'failed')
  assert.match(results.find((r) => r.email === 'a@x.test')?.detail ?? '', /CGPA/)
  assert.ok(!rosterCalls().flat().some((r) => r.email === 'a@x.test'))
  assert.ok(rosterCalls().flat().some((r) => r.email === 'b@x.test'))
})

// ------------------------------------------------------------------ REL-08
test('REL-08 deletion needs the typed email and removes files, roster row and login', async () => {
  reply = (c) => {
    if (c.url.endsWith('/auth/v1/user')) return ok({ id: uid, email: 'me@x.test' })
    if (c.url.includes('user_roles')) return ok([])
    if (c.url.includes('object/list/')) return ok([{ name: 'r.pdf' }])
    if (c.url.includes('org_students?user_id')) return ok([{ id: 3 }])
    return undefined
  }
  assert.equal((await account(post({ action: 'delete', confirm_email: 'other@x.test' }, jwt({ sub: uid })))).status, 422)
  assert.ok(!calls.some((c) => c.method === 'DELETE'))
  calls = []
  assert.equal((await account(post({ action: 'delete', confirm_email: 'ME@x.test' }, jwt({ sub: uid })))).status, 200)
  const deletes = calls.filter((c) => c.method === 'DELETE').map((c) => c.url)
  assert.ok(deletes.some((u) => u.includes('storage/v1/object/resumes')))
  assert.ok(deletes.some((u) => u.includes('org_students')))
})
test('W5-8 the login is deleted before the roster row, so a failure leaves the student able to retry', async () => {
  reply = (c) => {
    if (c.url.endsWith('/auth/v1/user')) return ok({ id: uid, email: 'me@x.test' })
    if (c.url.includes('user_roles')) return ok([])
    if (c.url.includes('object/list/')) return ok([])
    if (c.url.includes('org_students?user_id')) return ok([{ id: 7 }])
    if (c.url.includes('/auth/v1/admin/users/')) return ok({ msg: 'upstream timeout' }, 504)
    return undefined
  }
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 502)
  const kind = (c: Call) => (c.url.includes('/auth/') ? 'login' : c.url.includes('org_students') ? 'roster' : 'file')
  assert.deepEqual(calls.filter((c) => c.method === 'DELETE').map(kind), ['login'], 'an outage leaves the roster alone, so the student can retry')
  calls = []
  let first = true
  reply = (c) => {
    if (c.url.endsWith('/auth/v1/user')) return ok({ id: uid, email: 'me@x.test' })
    if (c.url.includes('user_roles')) return ok([])
    if (c.url.includes('object/list/')) return ok([])
    if (c.url.includes('org_students?user_id')) return ok([{ id: 7 }])
    if (c.url.includes('/auth/v1/admin/users/') && first) { first = false; return ok({ msg: 'Database error deleting user' }, 500) }
    return undefined
  }
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 200)
  assert.deepEqual(calls.filter((c) => c.method === 'DELETE').map(kind), ['login', 'roster', 'login'], 'an older database refusing the delete falls back to the old order: ' + JSON.stringify(calls.filter((c) => c.method === 'DELETE').map(kind)))
  calls = []
  reply = (c) => {
    if (c.url.endsWith('/auth/v1/user')) return ok({ id: uid, email: 'me@x.test' })
    if (c.url.includes('user_roles')) return ok([])
    if (c.url.includes('object/list/')) return ok([])
    if (c.url.includes('org_students?user_id')) return ok([{ id: 7 }])
    return undefined
  }
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 200)
  const happy = calls.filter((c) => c.method === 'DELETE').map((c) => (c.url.includes('/auth/') ? 'login' : 'roster'))
  assert.deepEqual(happy, ['login', 'roster'])
})
test('REL-08 a temporary password cannot delete the account', async () => {
  reply = (c) => (c.url.endsWith('/auth/v1/user') ? ok({ id: uid, email: 'me@x.test', app_metadata: { must_change_password: true } }) : undefined)
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 403)
  assert.ok(!calls.some((c) => c.method === 'DELETE'))
})
test('REL-08 a failed role check stops the deletion', async () => {
  reply = (c) => (c.url.endsWith('/auth/v1/user') ? ok({ id: uid, email: 'me@x.test' }) : c.url.includes('user_roles') ? ok({ message: 'error' }, 500) : undefined)
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 502)
  assert.ok(!calls.some((c) => c.method === 'DELETE'))
})
test('REL-08 admin accounts cannot delete themselves', async () => {
  reply = (c) => (c.url.endsWith('/auth/v1/user') ? ok({ id: uid, email: 'me@x.test' }) : c.url.includes('user_roles') ? ok([{ role: 'org_admin' }]) : undefined)
  assert.equal((await account(post({ action: 'delete', confirm_email: 'me@x.test' }, jwt({ sub: uid })))).status, 403)
})

// ------------------------------------------------------------------ W5-9, W5-18
test('W5-9 the server records the new resume file together with its text and analysis', async () => {
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?') && c.method === 'GET') return ok([student])
    if (c.url.includes('consume_ai')) return ok(5)
    if (c.url.includes('storage/v1/object/resumes')) return new Response('%PDF-1.7')
    if (c.url.includes('api.groq.com')) return ok({ choices: [{ message: { content: JSON.stringify({ content_quality: 60, summary: 's', tips: {}, extracted: {}, skill_levels: {} }) } }] })
    return undefined
  }
  const text = 'Built a service. '.repeat(30)
  assert.equal((await resume(post({ action: 'analyze', text, file_name: 'cv.pdf', path: `${uid}/1-cv.pdf` }, jwt({ sub: uid })))).status, 200)
  const patch = calls.find((c) => c.url.includes(`profiles?id=eq.${uid}`) && c.method === 'PATCH')!.body
  assert.equal(patch.resume_path, `${uid}/1-cv.pdf`)
  assert.equal(patch.resume_text, text.trim())
  const order = calls.filter((c) => c.method !== 'GET').map((c) => (c.url.includes('resume_analyses') ? 'analysis' : c.url.includes('profiles?') ? 'profile' : c.url.includes('jd_matches') ? 'jd' : 'other')).filter((x) => x !== 'other')
  assert.deepEqual(order, ['analysis', 'profile', 'jd'])
})
test('W5-9 a path outside the student\'s folder is refused', async () => {
  for (const path of [`${uid}/../x/cv.pdf`, 'someone-else/cv.pdf', `${uid}/..`]) {
    calls = []
    reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([student]) : c.url.includes('consume_ai') ? ok(5) : c.url.includes('api.groq.com') ? ok({ choices: [{ message: { content: '{}' } }] }) : undefined)
    assert.equal((await resume(post({ action: 'analyze', text: 'x'.repeat(300), file_name: 'cv.pdf', path }, jwt({ sub: uid })))).status, 422, path)
  }
})
test('W5-18 a GitHub sync never deletes all repositories before saving the new ones', async () => {
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?')) return ok([student])
    if (c.url.includes('connect_attempt')) return ok(true)
    if (c.url.includes('rest/v1/coding_profiles?user_id')) return ok([])
    if (c.url.startsWith('https://api.github.com/users/') && c.url.includes('/repos')) return ok([{ name: 'alpha', fork: false, archived: false, stargazers_count: 1, html_url: 'https://github.com/o/alpha', pushed_at: '2026-01-01', owner: { login: 'octo' } }])
    if (c.url.startsWith('https://api.github.com/users/')) return ok({ login: 'octo', bio: '' })
    return undefined
  }
  await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))
  const repoCalls = calls.filter((c) => c.url.includes('github_repos'))
  assert.equal(repoCalls[0].method, 'POST', 'save first')
  assert.match(repoCalls[0].url, /on_conflict=user_id,name/)
  assert.equal(repoCalls[1].method, 'DELETE')
  assert.match(decodeURIComponent(repoCalls[1].url), /name=not\.in\.\("alpha"\)/)
})

// ------------------------------------------------------------------ 2026-11-12 review (A, C)
test('A1 a GATE scorecard path cannot reach another student\'s folder', async () => {
  for (const file_path of [`${uid}/../b2000000-0000-4000-8000-0000000000b2/gate.pdf`, `${uid}/sub/gate.pdf`, `${uid}/gate.pdf.exe`]) {
    calls = []
    reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([student]) : c.url.includes('connect_attempt') ? ok(true) : c.url.includes('org_students') ? ok([{ full_name: 'Edited Name' }]) : c.url.includes('storage/v1') ? new Response('%PDF-1.7') : undefined)
    const res = await connect(post({ credential: 'gate', ref: 'CS12345678', paper: 'CS', score: 700, year: 2025, name: 'Edited Name', file_path }, jwt({ sub: uid })))
    assert.equal(res.status, 422, file_path)
    assert.ok(!calls.some((c) => c.url.includes('storage/v1')), 'no storage read for a refused path')
  }
})
test('A1 the scorecard is read with the student\'s own session, never the secret key', async () => {
  const before = env.SUPABASE_SECRET_KEY
  env.SUPABASE_SECRET_KEY = 'sb_secret_test'
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?')) return ok([student])
    if (c.url.includes('connect_attempt')) return ok(true)
    if (c.url.includes('org_students')) return ok([{ full_name: 'Edited Name' }])
    if (c.url.includes('storage/v1/object/resumes')) return new Response('not a pdf')
    return undefined
  }
  const token = jwt({ sub: uid })
  const res = await connect(post({ credential: 'gate', ref: 'CS12345678', paper: 'CS', score: 700, year: 2025, name: 'Edited Name', file_path: `${uid}/gate.pdf` }, token))
  const read = calls.find((c) => c.url.includes('storage/v1/object/resumes'))!
  assert.equal(read.headers.authorization, `Bearer ${token}`)
  assert.equal(res.status, 422, 'a file that is not a PDF is refused')
  env.SUPABASE_SECRET_KEY = before
})
test('A4 a resume whose bytes are not PDF or Word is refused before any AI is charged', async () => {
  reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([student]) : c.url.includes('storage/v1/object/resumes') ? new Response('<html>') : undefined)
  const res = await resume(post({ action: 'analyze', text: 'Built a service. '.repeat(30), file_name: 'cv.pdf', path: `${uid}/1-cv.pdf` }, jwt({ sub: uid })))
  assert.equal(res.status, 422)
  assert.ok(!calls.some((c) => c.url.includes('consume_ai')))
})
test('C7 a bad resume path is refused before any AI is charged', async () => {
  reply = (c) => (c.url.includes('rest/v1/profiles?') ? ok([student]) : undefined)
  const res = await resume(post({ action: 'analyze', text: 'x'.repeat(300), path: 'someone-else/cv.pdf' }, jwt({ sub: uid })))
  assert.equal(res.status, 422)
  assert.ok(!calls.some((c) => c.url.includes('consume_ai') || c.url.includes('api.groq.com')))
})
test('C1 a failed GitHub repository list changes nothing', async () => {
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?')) return ok([student])
    if (c.url.includes('connect_attempt')) return ok(true)
    if (c.url.startsWith('https://api.github.com/users/') && c.url.includes('/repos')) return ok({ message: 'Server Error' }, 502)
    if (c.url.startsWith('https://api.github.com/users/')) return ok({ login: 'octo', bio: '' })
    return undefined
  }
  const res = await connect(post({ platform: 'github', username: 'octo' }, jwt({ sub: uid })))
  assert.equal(res.status, 502)
  assert.ok(!calls.some((c) => c.url.includes('github_repos') || c.url.includes('coding_profiles?on_conflict')), 'no write, no delete')
})
test('C1 a partial Codeforces answer changes nothing', async () => {
  reply = (c) => {
    if (c.url.includes('rest/v1/profiles?')) return ok([student])
    if (c.url.includes('connect_attempt')) return ok(true)
    if (c.url.includes('user.info')) return ok({ status: 'OK', result: [{ handle: 'tourist', rating: 3000 }] })
    if (c.url.includes('user.status')) return ok({ status: 'FAILED', comment: 'Call limit exceeded' }, 503)
    if (c.url.includes('user.rating')) return ok({ status: 'OK', result: [] })
    return undefined
  }
  const res = await connect(post({ platform: 'codeforces', username: 'tourist' }, jwt({ sub: uid })))
  assert.equal(res.status, 502)
  assert.ok(!calls.some((c) => c.url.includes('coding_profiles') && c.method !== 'GET'))
})
test('C2 an upstream timeout is a 504, not an unexplained 500', async () => {
  const real = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new DOMException('The operation timed out.', 'TimeoutError')
  }) as typeof fetch
  try {
    assert.equal((await resume(post({ action: 'clear' }, jwt({ sub: uid })))).status, 504)
  } finally {
    globalThis.fetch = real
  }
})
test('C3 one person failing never loses the passwords already created in the batch', async () => {
  let n = 0
  reply = (c) => {
    if (c.url.includes('/auth/v1/admin/users')) return ++n === 2 ? (() => { throw new TypeError('fetch failed') })() : ok({ id: `u${n}` })
    return adminReply(c)
  }
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', logins: true, people: [{ email: 'a@x.test' }, { email: 'b@x.test' }, { email: 'c@x.test' }] }, jwt({ sub: uid })))
  assert.equal(res.status, 200)
  const { results } = (await res.json()) as { results: { email: string; status: string; password?: string }[] }
  assert.deepEqual(results.map((r) => r.status), ['created', 'failed', 'created'])
  assert.ok(results[0].password && results[2].password)
  assert.equal(calls.filter((c) => c.url.includes('organizations?')).length, 1, 'college domains read once per request')
})
test('A3 raw Auth error text is not passed back to the admin', async () => {
  reply = (c) => (c.url.includes('/auth/v1/invite') ? ok({ msg: 'internal: relation "auth.flow_state" lock timeout' }, 500) : adminReply(c))
  const res = await admin(post({ action: 'invite', org_id: org, role: 'student', people: [{ email: 'a@x.test' }] }, jwt({ sub: uid })))
  assert.ok(!JSON.stringify(await res.json()).includes('flow_state'))
})

// ------------------------------------------------------------------ SEC-05
const base = {
  branch: 'CSE', tracks: [], cgpa: 8, backlogs: 0, class_x: 80, class_xii: 80,
  skills: [] as { name: string; level: number }[], projects: [] as any[], internships: [] as any[], integrations: {} as any, credentials: [] as any[],
}
const honest = (over = {}) => ({ ...base, ...over }) as any
test('SEC-05 typed skills, projects and internships do not move a ranking', () => {
  const plain = evaluateAll(trustedProfile(honest()))
  const typed = evaluateAll(
    trustedProfile(honest({
      skills: [{ name: 'Data Structures & Algorithms', level: 100 }, { name: 'System Design', level: 100 }],
      projects: Array.from({ length: 6 }, (_, i) => ({ title: `p${i}`, source: i % 2 ? 'github' : 'manual' })),
      internships: [{ org: 'Google', role: 'SDE', period: '2026' }],
    })),
  )
  assert.deepEqual(typed.map((c) => [c.id, c.match, c.bucket]), plain.map((c) => [c.id, c.match, c.bucket]))
})
test('SEC-04 stats from an unproven account do not move a ranking', () => {
  const lc = { username: 'x', solved: 900, easy: 300, medium: 300, hard: 300, contest_rating: 2400, contests: 50 }
  const plain = trustedProfile(honest()).skills
  assert.deepEqual(trustedProfile(honest({ integrations: { leetcode: { ...lc, ownership: { proven: false } } } })).skills, plain)
  assert.deepEqual(trustedProfile(honest({ integrations: { leetcode: lc } })).skills, plain)
  assert.notDeepEqual(trustedProfile(honest({ integrations: { leetcode: { ...lc, ownership: { proven: true } } } })).skills, plain)
})
test('SEC-05 a project claiming to come from GitHub counts for nothing', () => {
  assert.equal(trustedProfile(honest({ projects: [{ title: 'x', source: 'github' }] })).projects.length, 0)
})
test('SEC-04 unproven accounts are dropped from what recruiters see', () => {
  assert.deepEqual(provenIntegrations({ github: { ownership: { proven: false } } as any }), {})
})
test('SEC-08 an unconfirmed credential does not count', () => {
  const cert = { kind: 'nptel', status: 'pending', skill: 'Data Structures & Algorithms', ref: 'X', score: 90, data: {} } as any
  assert.deepEqual(trustedProfile(honest(), [cert]).skills, trustedProfile(honest(), []).skills)
})

let failed = 0
for (const [name, fn] of tests) {
  calls = []
  console.error = () => undefined
  try {
    await fn()
    console.log(`ok   ${name}`)
  } catch (e) {
    failed++
    console.log(`FAIL ${name}\n     ${e instanceof Error ? e.message.split('\n').slice(0, 3).join(' ') : e}`)
  }
  console.error = quiet
}
console.log(`${tests.length - failed} of ${tests.length} passed`)
process.exit(failed ? 1 : 0)
