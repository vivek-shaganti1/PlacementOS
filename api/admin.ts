// Organization administration that needs the Supabase secret key: sending account invites.
// POST { action: 'invite', org_id, role: 'student' | 'org_admin' | 'platform_admin', people: [{ email, full_name?, roll_number?, branch?, batch? }] }
// The caller must be the super admin or an admin of org_id. Roster rows are written as the caller (RLS applies);
// only the invite email itself uses the secret key, which never leaves the server.
import { bearer, env, handle, HttpError, json, rest, SUPABASE_URL } from './_lib'

export const config = { runtime: 'edge' }

type Person = { email: string; full_name?: string; roll_number?: string; branch?: string; batch?: string }
type Result = { email: string; status: 'invited' | 'existing' | 'failed' | 'saved'; detail?: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

async function callerRoles(token: string) {
  return (await (await rest(token, 'user_roles?select=role,org_id')).json()) as { role: string; org_id: string | null }[]
}

async function sendInvite(email: string, fullName: string, redirectTo: string): Promise<Result> {
  const key = env('SUPABASE_SECRET_KEY')
  if (!key) return { email, status: 'saved', detail: 'Invite emails are not configured (SUPABASE_SECRET_KEY missing on the server).' }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: { apikey: key, 'content-type': 'application/json' },
    body: JSON.stringify({ email, data: fullName ? { full_name: fullName } : {} }),
  })
  if (res.ok) return { email, status: 'invited' }
  const body = (await res.json().catch(() => ({}))) as { msg?: string; error_code?: string; message?: string }
  const msg = body.msg ?? body.message ?? `HTTP ${res.status}`
  if (/already been registered|already registered|email_exists/i.test(msg + (body.error_code ?? ''))) return { email, status: 'existing', detail: 'Already has an account; linked automatically.' }
  if (res.status === 429) return { email, status: 'failed', detail: 'Email rate limit reached. Configure custom SMTP in Supabase to send more invites.' }
  return { email, status: 'failed', detail: msg }
}

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const body = (await req.json().catch(() => ({}))) as { action?: string; org_id?: string; role?: string; people?: Person[]; send?: boolean }
  if (body.action !== 'invite') throw new HttpError(400, 'Unknown action')
  const role = body.role === 'platform_admin' ? 'platform_admin' : body.role === 'org_admin' ? 'org_admin' : 'student'
  const roles = await callerRoles(token)
  const isSuper = roles.some((r) => r.role === 'super_admin')
  const orgId = clip(body.org_id, 40)
  if (role === 'platform_admin') {
    if (!isSuper) throw new HttpError(403, 'Only platform admins can add platform admins.')
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(orgId)) throw new HttpError(400, 'Invalid organization')
    if (!isSuper && !roles.some((r) => r.role === 'org_admin' && r.org_id === orgId)) throw new HttpError(403, 'You do not administer this organization.')
  }
  const people = (Array.isArray(body.people) ? body.people : []).slice(0, 200).map((p) => ({
    email: clip(p.email, 200).toLowerCase(),
    full_name: clip(p.full_name, 160),
    roll_number: clip(p.roll_number, 40),
    branch: clip(p.branch, 120),
    batch: clip(p.batch, 10),
  }))
  if (!people.length) throw new HttpError(400, 'Add at least one person.')
  const bad = people.filter((p) => !EMAIL.test(p.email)).map((p) => p.email || '(blank)')
  if (bad.length) throw new HttpError(422, `Invalid email: ${bad.slice(0, 5).join(', ')}`)

  const redirectTo = `${new URL(req.url).origin}/reset-password`
  const results: Result[] = []

  if (role === 'student') {
    // Upsert roster rows as the caller; RLS confirms they administer this organization.
    await rest(token, 'org_students?on_conflict=org_id,email', {
      method: 'POST',
      body: JSON.stringify(people.map((p) => ({ ...p, org_id: orgId }))),
      headers: { prefer: 'return=minimal,resolution=merge-duplicates' },
    })
    for (const p of people) {
      const r = body.send === false ? { email: p.email, status: 'saved' as const } : await sendInvite(p.email, p.full_name, redirectTo)
      results.push(r)
      if (r.status === 'invited')
        await rest(token, `org_students?org_id=eq.${orgId}&email=eq.${encodeURIComponent(p.email)}`, {
          method: 'PATCH',
          body: JSON.stringify({ invited_at: new Date().toISOString() }),
          headers: { prefer: 'return=minimal' },
        })
    }
  } else if (role === 'platform_admin') {
    for (const p of people) {
      const granted = (await (await rest(token, 'rpc/add_platform_admin', { method: 'POST', body: JSON.stringify({ target_email: p.email }) })).json()) as string
      results.push(granted === 'granted' ? { email: p.email, status: 'existing', detail: 'Platform admin access granted to the existing account.' } : await sendInvite(p.email, p.full_name, redirectTo))
    }
  } else {
    for (const p of people) {
      const granted = (await (await rest(token, 'rpc/add_org_admin', { method: 'POST', body: JSON.stringify({ target_org: orgId, target_email: p.email }) })).json()) as string
      results.push(granted === 'granted' ? { email: p.email, status: 'existing', detail: 'Admin access granted to the existing account.' } : await sendInvite(p.email, p.full_name, redirectTo))
    }
  }

  return json({ results })
})
