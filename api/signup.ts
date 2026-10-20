// Student self-registration without confirmation emails.
// POST { email, password, full_name, roll_number }
// Only students already on a college roster can register, and their roll number must match the roster.
// Admin accounts are never self-registered: the platform admin creates them.
import { env, handle, HttpError, json, SUPABASE_URL, timeout } from './_lib'

export const config = { runtime: 'edge' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// One answer for every "not on a roster with this roll number" case: separate messages would tell a stranger which
// emails are rostered, which are admin emails, and when a guessed roll number is right.
const NO_MATCH = 'These details do not match a student record at any college. Check your college email and roll number, or ask your placement cell to add you.'

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
  // Attempt limit (per email and per client IP), recorded in the database because edge instances share no memory.
  const ip = (req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim().slice(0, 64)
  const gate = await fetch(`${SUPABASE_URL}/rest/v1/rpc/signup_attempt`, { signal: timeout(10_000), method: 'POST', headers, body: JSON.stringify({ target_email: email, client_ip: ip }) })
  if (gate.ok && (await gate.json()) === false) throw new HttpError(429, 'Too many sign-up attempts. Wait an hour and try again, or ask your placement cell for help.')

  const check = await fetch(`${SUPABASE_URL}/rest/v1/rpc/signup_check`, { signal: timeout(10_000), method: 'POST', headers, body: JSON.stringify({ target_email: email, target_roll: roll }) })
  if (!check.ok) throw new HttpError(502, 'Could not verify your college record. Try again.')
  const verdict = (await check.json()) as string
  if (verdict !== 'ok') throw new HttpError(403, NO_MATCH)

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    signal: timeout(10_000),
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: fullName ? { full_name: fullName } : {} }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { msg?: string; message?: string; error_code?: string }
    const msg = err.msg ?? err.message ?? ''
    if (/already|exists/i.test(msg + (err.error_code ?? ''))) throw new HttpError(409, 'An account already exists for this email. Sign in instead.')
    console.error('signup', res.status, msg.slice(0, 300))
    throw new HttpError(400, 'Could not create your account. Try again, or ask your placement cell to create your login.')
  }
  return json({ ok: true })
})
