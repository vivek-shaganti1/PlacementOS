// Configuration check: reports which server settings are present (never their values).
// GET /api/health        -> config booleans
// GET /api/health?ping=1 -> also checks that Groq accepts the key
import { env, json, MODELS } from './_lib'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const out: Record<string, unknown> = {
    groq_key: Boolean(env('GROQ_API_KEY')),
    models: MODELS,
    github_token: Boolean(env('GITHUB_TOKEN')),
  }
  if (url.searchParams.get('ping') === '1' && env('GROQ_API_KEY')) {
    const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { authorization: `Bearer ${env('GROQ_API_KEY')}` } })
    out.groq_reachable = res.ok
    out.groq_status = res.status
  }
  return json(out)
}
