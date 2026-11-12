// Liveness check. Public callers get { ok: true } only; configuration details (which keys are set, models, a Groq
// ping) are shown to platform admins, so the endpoint does not advertise the setup or spend the AI key for strangers.
// GET /api/health                        -> { ok: true }
// GET /api/health?details=1 (+ bearer)   -> config booleans, models; &ping=1 also checks Groq
import { env, handle, HttpError, json, MODELS, rest, SUPABASE_KEY, SUPABASE_URL, timeout, tokenClaims, tokenSubject } from './_lib'

export const config = { runtime: 'edge' }

export default handle(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed')
  const url = new URL(req.url)
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  // Reaches the database through the API, so an outage shows here before students find it. Says nothing about the data.
  const probe = await fetch(`${SUPABASE_URL}/rest/v1/rpc/health_probe`, {
    signal: timeout(4000),
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: '{}',
  }).catch(() => null)
  // 404 means the database answered but predates the migration that adds the probe.
  const db = !!probe && (probe.ok || probe.status === 404)
  if (!db) return json({ ok: false }, 503)
  if (!url.searchParams.has('details') || !token) return json({ ok: true })
  const roles = (await (await rest(token, 'user_roles?select=role&role=eq.super_admin&user_id=eq.' + tokenSubject(token))).json()) as { role: string }[]
  if (!roles.some((r) => r.role === 'super_admin') || tokenClaims(token).aal !== 'aal2') return json({ ok: true })

  const out: Record<string, unknown> = { ok: true, groq_key: Boolean(env('GROQ_API_KEY')), models: MODELS, github_token: Boolean(env('GITHUB_TOKEN')) }
  if (url.searchParams.get('ping') === '1' && env('GROQ_API_KEY')) {
    const res = await fetch('https://api.groq.com/openai/v1/models', { signal: timeout(8000), headers: { authorization: `Bearer ${env('GROQ_API_KEY')}` } }).catch(() => null)
    out.groq_reachable = !!res?.ok
    out.groq_status = res?.status ?? null
  }
  return json(out)
})
