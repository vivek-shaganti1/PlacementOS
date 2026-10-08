// Shared helpers for the /api edge functions. Files starting with "_" are not deployed as routes.
import { assembleProfile, RELATED, type RelatedRows } from '../src/lib/profileShape'
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
  if (!res.ok) {
    const text = await res.text()
    // Turn the common database refusals into messages an admin can act on.
    if (/org_students_roll_key/.test(text)) throw new HttpError(409, 'That roll number is already used by another student in this college. Check the roll number or update that student instead.')
    if (/"code":"23505"/.test(text)) throw new HttpError(409, 'This record already exists.')
    if (/"code":"42501"|row-level security/.test(text)) throw new HttpError(403, 'You do not have permission to change this.')
    throw new HttpError(502, `Database error: ${text.slice(0, 200)}`)
  }
  return res
}

/**
 * Records one AI action against the student's monthly plan quota, before the model is called.
 * Throws 429 with a readable message once the quota is used up.
 */
export async function consumeAi(token: string, kind: 'chat' | 'resume' | 'jd_match') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_ai`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ action: kind }),
  })
  if (res.ok) return (await res.json()) as number
  const err = (await res.json().catch(() => ({}))) as { message?: string }
  const msg = err.message ?? ''
  if (msg.startsWith('AI_QUOTA: ')) throw new HttpError(429, msg.slice('AI_QUOTA: '.length))
  if (res.status === 401) throw new HttpError(401, 'Session expired. Please sign in again.')
  throw new HttpError(403, msg || 'AI is not available for this account.')
}

/** Loads the caller's own profile; doubles as token validation. */
export async function loadProfile(token: string): Promise<Record<string, any>> {
  const [profile] = (await (await rest(token, 'profiles?select=*&limit=1')).json()) as Record<string, any>[]
  if (!profile) throw new HttpError(401, 'Not signed in')
  return profile
}

/** Loads the caller's profile together with every related table, assembled like the browser does. */
export async function loadStudent(token: string) {
  const base = await loadProfile(token)
  const entries = Object.entries(RELATED)
  const rows = await Promise.all(
    entries.map(async ([table, q]) => {
      const [col, dir = 'asc'] = q.order.split('.')
      const limit = 'limit' in q ? `&limit=${q.limit}` : ''
      return (await rest(token, `${table}?select=${q.select}&order=${col}.${dir}${limit}`)).json()
    }),
  )
  return assembleProfile(base, Object.fromEntries(entries.map(([t], i) => [t, rows[i]])) as RelatedRows) as Record<string, any> & { id: string }
}

/** Inserts or upserts rows (array or single object) as the caller. */
export async function insertRows(token: string, table: string, rows: unknown, upsertOn?: string) {
  await rest(token, `${table}${upsertOn ? `?on_conflict=${upsertOn}` : ''}`, {
    method: 'POST',
    body: JSON.stringify(rows),
    headers: { prefer: `return=minimal${upsertOn ? ',resolution=merge-duplicates' : ''}` },
  })
}

export async function deleteRows(token: string, table: string, filter: string) {
  await rest(token, `${table}?${filter}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
}

export async function saveProfile(token: string, id: string, patch: Record<string, unknown>) {
  await rest(token, `profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { prefer: 'return=minimal' } })
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Models tried in order. Each Groq model has its own per-minute token budget, so falling back on 429 multiplies capacity. */
export const MODELS = [GROQ_MODEL, ...(env('GROQ_FALLBACK_MODELS') ?? 'openai/gpt-oss-20b,qwen/qwen3.8-27b').split(',').map((m) => m.trim())].filter(
  (m, i, all) => m && all.indexOf(m) === i,
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function groq(messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; temperature?: number } = {}) {
  const key = env('GROQ_API_KEY')
  if (!key) throw new HttpError(503, 'The AI is not configured (GROQ_API_KEY missing).')
  let lastStatus = 0
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 1000,
          ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          messages,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
        // Some models wrap reasoning in <think> tags; never show that to users.
        const content = data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        if (content) return content
        lastStatus = 502
        break
      }
      lastStatus = res.status
      const detail = (await res.text()).slice(0, 300)
      console.error('Groq error', model, res.status, detail)
      // Rate limited: wait briefly if the reset is imminent, otherwise move to the next model.
      const wait = Number(res.headers.get('retry-after') ?? '0')
      if (res.status === 429 && attempt === 0 && wait > 0 && wait <= 3) {
        await sleep(wait * 1000)
        continue
      }
      break
    }
  }
  throw new HttpError(502, lastStatus === 429 ? 'The AI is at its usage limit right now. Try again in a minute.' : 'The AI service returned an error.')
}

/** House style for AI text: no emojis, em dashes, arrows or checkmark bullets. */
export const STYLE_RULES =
  'Write in plain, professional English. Do not use emojis, em dashes, arrows or checkmark symbols. Do not use the construction "it is not X, it is Y". Use commas, colons or full stops instead of dashes.'

export function tidy(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*–\s*(?=\D)/g, ', ')
    .replace(/\s*(→|->|⇒)\s*/g, ' to ')
    .replace(/^[ \t]*[✓✔✅☑]\s*/gm, '- ')
    .replace(/[✓✔✅☑★]/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Applies tidy() to every string inside a JSON-like value. */
export function tidyDeep<T>(value: T): T {
  if (typeof value === 'string') return tidy(value) as T
  if (Array.isArray(value)) return value.map(tidyDeep) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidyDeep(v)])) as T
  return value
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
