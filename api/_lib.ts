// Shared helpers for the /api edge functions. Files starting with "_" are not deployed as routes.
declare const process: { env: Record<string, string | undefined> }

export const env = (k: string) => process.env[k]

export const SUPABASE_URL = env('VITE_SUPABASE_URL') || env('SUPABASE_URL') || 'https://oewjimwozaksyigfyrkz.supabase.co'
export const SUPABASE_KEY =
  env('VITE_SUPABASE_PUBLISHABLE_KEY') || env('SUPABASE_PUBLISHABLE_KEY') || 'sb_publishable_l4oFZfheVfvTBAfU3t9sRg_AwdkNqse'
export const GROQ_MODEL = env('GROQ_MODEL') || 'openai/gpt-oss-120b'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** Run a handler, turning thrown HttpErrors into JSON responses. */
export const handle = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
  try {
    return await fn(req)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Unexpected server error' }, 500)
  }
}

export const bearer = (req: Request) => {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Not signed in')
  return token
}

/** Calls Supabase REST as the signed-in user, so RLS applies. */
export async function rest(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (res.status === 401) throw new HttpError(401, 'Session expired. Please sign in again.')
  if (!res.ok) throw new HttpError(502, `Database error: ${(await res.text()).slice(0, 200)}`)
  return res
}

/** Loads the caller's own profile; doubles as token validation. */
export async function loadProfile(token: string): Promise<Record<string, any>> {
  const [profile] = (await (await rest(token, 'profiles?select=*&limit=1')).json()) as Record<string, any>[]
  if (!profile) throw new HttpError(401, 'Not signed in')
  return profile
}

export async function saveProfile(token: string, id: string, patch: Record<string, unknown>) {
  await rest(token, `profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { prefer: 'return=minimal' } })
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function groq(messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number } = {}) {
  const key = env('GROQ_API_KEY')
  if (!key) throw new HttpError(503, 'The AI is not configured (GROQ_API_KEY missing).')
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1200,
      ...(GROQ_MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  })
  if (!res.ok) {
    console.error('Groq error', res.status, (await res.text()).slice(0, 500))
    throw new HttpError(502, res.status === 429 ? 'The AI is busy right now. Try again in a moment.' : 'The AI service returned an error.')
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new HttpError(502, 'The AI returned an empty answer.')
  return content
}

export function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T
  } catch {
    const m = text.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0]) as T
    throw new HttpError(502, 'The AI returned malformed data. Please retry.')
  }
}
