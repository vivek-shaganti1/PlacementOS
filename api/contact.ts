// "Contact us" on the landing page. POST { name, college, email, phone?, topic?, message, website? }
// Visitors are signed out, so the enquiry is stored through public.contact_submit with the server's key; that function
// rate-limits per email and per network address. Nothing is emailed from here: platform admins read enquiries in the
// console. `website` is a field people never see; a filled one marks an automated submission.
import { env, handle, HttpError, json, SUPABASE_URL, timeout } from './_lib'

export const config = { runtime: 'edge' }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max)

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  // Browsers only: a page on another site cannot post a form here on a visitor's behalf.
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) throw new HttpError(403, 'Send this from the PlacementIQ website.')
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  // Pretend success, so a bot learns nothing.
  if (clean(body.website, 200)) return json({ ok: true })

  const name = clean(body.name, 120)
  const college = clean(body.college, 160)
  const email = clean(body.email, 200).toLowerCase()
  const phone = clean(body.phone, 30)
  const topic = clean(body.topic, 60)
  const message = clean(body.message, 2000)
  if (name.length < 2) throw new HttpError(422, 'Enter your name.')
  if (college.length < 2) throw new HttpError(422, 'Enter your college or organisation.')
  if (!EMAIL.test(email)) throw new HttpError(422, 'Enter a valid email address.')
  if (phone && !/^[+\d][\d\s\-()]{6,28}$/.test(phone)) throw new HttpError(422, 'Enter a valid phone number, or leave it blank.')
  if (message.length < 10) throw new HttpError(422, 'Tell us a little more (at least 10 characters).')

  const key = env('SUPABASE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'The contact form is not available right now. Please try again later.')
  const ip = (req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0] ?? '').trim().slice(0, 64)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/contact_submit`, {
    signal: timeout(10_000),
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_name: name, p_college: college, p_email: email, p_phone: phone, p_topic: topic, p_message: message, client_ip: ip }),
  })
  if (!res.ok) {
    console.error('contact', res.status)
    throw new HttpError(503, 'The contact form is not available right now. Please try again later.')
  }
  if ((await res.json()) !== 'ok') throw new HttpError(429, 'We already have a few messages from you. We will reply to those first.')
  return json({ ok: true })
})
