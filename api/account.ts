// A student deletes their own account. POST { action: 'delete', confirm_email }
// Removes the stored files, the roster entry and the login; database rows go with the login (on delete cascade).
// Admin and recruiter accounts are removed by a college or platform admin instead, so nobody can lock a college out.
import { bearer, env, handle, HttpError, json, SUPABASE_KEY, SUPABASE_URL, timeout } from './_lib'

export const config = { runtime: 'edge' }

const BUCKETS = ['resumes', 'avatars']

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const key = env('SUPABASE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'Account deletion is not available right now.')
  const token = bearer(req)
  const body = (await req.json().catch(() => ({}))) as { action?: string; confirm_email?: string }
  if (body.action !== 'delete') throw new HttpError(400, 'Unknown action')

  const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { signal: timeout(10_000), headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` } })
  if (!me.ok) throw new HttpError(401, 'Session expired. Please sign in again.')
  const user = (await me.json()) as { id: string; email?: string }
  if (String(body.confirm_email ?? '').trim().toLowerCase() !== String(user.email ?? '').toLowerCase()) throw new HttpError(422, 'Type your sign-in email to confirm.')

  const admin = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
  const rest = (path: string, init: RequestInit = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { signal: timeout(10_000), ...init, headers: admin })
  const roles = (await (await rest(`user_roles?user_id=eq.${user.id}&select=role`)).json().catch(() => null)) as { role: string }[] | null
  if (!roles) throw new HttpError(502, 'Could not check your account. Try again.')
  if (roles.length) throw new HttpError(403, 'Admin and recruiter accounts are removed by your college or the platform admin.')

  // Files first: once the login is gone nothing points at them. A failure here stops the deletion, so it can be retried.
  for (const bucket of BUCKETS) {
    const list = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      signal: timeout(10_000), method: 'POST', headers: admin, body: JSON.stringify({ prefix: user.id, limit: 1000 }),
    })
    if (!list.ok) throw new HttpError(502, 'Could not remove your files. Try again.')
    const names = ((await list.json()) as { name: string }[]).map((o) => `${user.id}/${o.name}`)
    if (names.length) {
      const del = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, { signal: timeout(10_000), method: 'DELETE', headers: admin, body: JSON.stringify({ prefixes: names }) })
      if (!del.ok) throw new HttpError(502, 'Could not remove your files. Try again.')
    }
  }
  const roster = await rest(`org_students?user_id=eq.${user.id}`, { method: 'DELETE' })
  if (!roster.ok) throw new HttpError(502, 'Could not remove your college record. Try again.')
  const gone = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { signal: timeout(10_000), method: 'DELETE', headers: admin })
  if (!gone.ok) throw new HttpError(502, 'Could not delete your account. Try again.')
  return json({ ok: true })
})
