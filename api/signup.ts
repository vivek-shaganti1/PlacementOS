// Student self-registration without confirmation emails.
// POST { email, password, full_name, roll_number }
// Only students already on a college roster can register, and their roll number must match the roster.
// Admin accounts are never self-registered: the platform admin creates them.
import { env, handle, HttpError, json, SUPABASE_URL } from './_lib'

export const config = { runtime: 'edge' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const MESSAGES: Record<string, [number, string]> = {
  unregistered: [403, 'This email has not been added by any college. Ask your placement cell to add it to their roster.'],
  admin: [403, 'Admin accounts are created by the platform admin. Use the temporary password you were given to sign in.'],
  no_roll: [403, 'Your college has not added your roll number yet. Ask your placement cell to add it, or to create your login.'],
  roll_mismatch: [403, 'That roll number does not match your college record.'],
}

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const key = env('SUPABASE_SECRET_KEY')
  if (!key) throw new HttpError(500, 'Sign-up is not configured on the server (SUPABASE_SECRET_KEY missing).')
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; full_name?: string; roll_number?: string }
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
  const password = String(body.password ?? '')
  const fullName = String(body.full_name ?? '').trim().slice(0, 160)
  const roll = String(body.roll_number ?? '').trim().slice(0, 40)
  if (!EMAIL.test(email)) throw new HttpError(422, 'Enter a valid email address.')
  if (password.length < 8 || password.length > 72) throw new HttpError(422, 'Use 8 to 72 characters for your password.')

  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }
  const check = await fetch(`${SUPABASE_URL}/rest/v1/rpc/signup_check`, { method: 'POST', headers, body: JSON.stringify({ target_email: email, target_roll: roll }) })
  if (!check.ok) throw new HttpError(502, 'Could not verify your college record. Try again.')
  const verdict = (await check.json()) as string
  if (verdict !== 'ok') {
    const [status, message] = MESSAGES[verdict] ?? [403, 'This email cannot register.']
    throw new HttpError(status, message)
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: fullName ? { full_name: fullName } : {} }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { msg?: string; message?: string; error_code?: string }
    const msg = err.msg ?? err.message ?? ''
    if (/already|exists/i.test(msg + (err.error_code ?? ''))) throw new HttpError(409, 'An account already exists for this email. Sign in instead.')
    throw new HttpError(400, msg || 'Could not create your account.')
  }
  return json({ ok: true })
})
