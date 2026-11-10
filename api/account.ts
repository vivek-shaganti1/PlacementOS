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
  const user = (await me.json()) as { id: string; email?: string; app_metadata?: Record<string, unknown> }
  // A temporary password proves nothing about who is holding it.
  if (user.app_metadata?.must_change_password === true) throw new HttpError(403, 'Choose your own password first.')
  if (String(body.confirm_email ?? '').trim().toLowerCase() !== String(user.email ?? '').toLowerCase()) throw new HttpError(422, 'Type your sign-in email to confirm.')

  const admin = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
  const rest = (path: string, init: RequestInit = {}) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, { signal: timeout(10_000), ...init, headers: admin })
  const check = await rest(`user_roles?user_id=eq.${user.id}&select=role`)
  const roles = check.ok ? ((await check.json().catch(() => null)) as { role: string }[] | null) : null
  if (!Array.isArray(roles)) throw new HttpError(502, 'Could not check your account. Try again.')
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
  // The login goes before the roster row: if this step fails the student is still on the roster, still signed in and can
  // try again from Settings. Removing the roster row first would strand them on the "waiting for your college" screen.
  const linked = await rest(`org_students?user_id=eq.${user.id}&select=id`)
  const rows = linked.ok ? ((await linked.json().catch(() => null)) as { id: number }[] | null) : null
  if (!Array.isArray(rows)) throw new HttpError(502, 'Could not read your college record. Try again.')
  const removeRoster = () => rest(`org_students?id=in.(${rows.map((r) => r.id).join(',')})`, { method: 'DELETE' })
  const deleteLogin = () => fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { signal: timeout(10_000), method: 'DELETE', headers: admin })
  let gone = await deleteLogin()
  // A database without migration 20261110 refuses to delete a login while a roster row links to it, and Auth reports it
  // as a database error: only then fall back to the old order. An outage or timeout leaves the roster alone, so the
  // student can retry from Settings.
  const refusedByDatabase = !gone.ok && /database error/i.test(await gone.clone().text().catch(() => ''))
  let rosterRemoved = false
  if (refusedByDatabase && rows.length && (await removeRoster()).ok) {
    rosterRemoved = true
    gone = await deleteLogin()
  }
  if (!gone.ok) throw new HttpError(502, 'Could not delete your account. Try again.')
  // The login is gone, so the student cannot retry; a leftover roster row is the college's to remove and holds no account.
  if (rows.length && !rosterRemoved) {
    const roster = await removeRoster()
    if (!roster.ok) console.error('account: roster rows left after deletion', roster.status)
  }
  return json({ ok: true })
})
