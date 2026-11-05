// Ends a temporary password. POST { password }, signed in with the temporary one (or from a reset email).
// The "must change" flag lives in app_metadata, which only this server can clear, so a client cannot skip the step.
import { bearer, env, handle, HttpError, json, SUPABASE_KEY, SUPABASE_URL, timeout, tokenClaims } from './_lib'

export const config = { runtime: 'edge' }

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const key = env('SUPABASE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'Password changes are not available right now.')
  const token = bearer(req)
  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = String(body.password ?? '')
  if (password.length < 10 || password.length > 72) throw new HttpError(422, 'Use 10 to 72 characters for your password.')

  // Supabase verifies the token here; the claims below are read only after it has accepted it.
  const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, { signal: timeout(10_000), headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` } })
  if (!me.ok) throw new HttpError(401, 'Session expired. Please sign in again.')
  const user = (await me.json()) as { id: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
  const pending = user.app_metadata?.must_change_password === true || user.user_metadata?.must_change_password === true
  if (!pending) throw new HttpError(409, 'Your password is already your own. Change it in Settings.')

  // An expired temporary password cannot be swapped; a reset email proves the mailbox and still can.
  const amr = (tokenClaims(token).amr ?? []) as { method?: string }[]
  const viaEmail = amr.some((a) => a.method === 'recovery' || a.method === 'otp' || a.method === 'invite' || a.method === 'email/signup')
  const expires = Date.parse(String(user.app_metadata?.temp_password_expires_at ?? ''))
  if (!viaEmail && Number.isFinite(expires) && Date.now() > expires) throw new HttpError(403, 'This temporary password has expired. Use "Forgot password?" on the sign-in page.')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    signal: timeout(10_000),
    method: 'PUT',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      password,
      app_metadata: { must_change_password: false, temp_password_expires_at: null },
      user_metadata: { must_change_password: false },
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { msg?: string; message?: string; error_code?: string }
    const msg = err.msg ?? err.message ?? ''
    if (/weak|pwned|should be/i.test(msg + (err.error_code ?? ''))) throw new HttpError(422, 'That password is too easy to guess. Choose a longer one.')
    if (/same/i.test(msg + (err.error_code ?? ''))) throw new HttpError(422, 'Choose a password different from the temporary one.')
    console.error('password', res.status, msg.slice(0, 200))
    throw new HttpError(502, 'Could not change your password. Try again.')
  }
  // Anyone else still signed in with the temporary password is signed out.
  await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=others`, { signal: timeout(5_000), method: 'POST', headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` } }).catch(() => undefined)
  return json({ ok: true })
})
