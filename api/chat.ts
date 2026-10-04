// Vercel Edge Function: AI Career Assistant backed by Groq.
// The Groq key never reaches the browser. Callers must send a valid Supabase access token;
// the student's profile is read with that token, so RLS guarantees it is their own.
import { companies } from '../src/data/companies'

declare const process: { env: Record<string, string | undefined> }

export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://oewjimwozaksyigfyrkz.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_l4oFZfheVfvTBAfU3t9sRg_AwdkNqse'
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

type Msg = { role: 'user' | 'bot'; text: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const bucketName: Record<string, string> = {
  eligible: 'Eligible',
  nearly: 'Nearly Eligible',
  canBecome: 'Can Become Eligible',
  notEligible: 'Not Eligible',
}

const catalog = companies
  .map((c) => `${c.name} | ${c.role} | ${bucketName[c.bucket]} ${c.match}% | CTC ₹${c.ctcAvg} LPA (${c.ctcMin}-${c.ctcMax}) | ${c.location}`)
  .join('\n')

function systemPrompt(p: Record<string, unknown>) {
  return `You are the AI Career Assistant inside PlacementIQ, a campus placement app for Indian engineering students.
Be specific, practical and encouraging. Keep answers under 180 words unless asked for detail. Use short paragraphs or bullet lists. Plain text only, no markdown headings.
When relevant, point to app pages: Eligibility Stacks, Company Drives, Skill Gap Analyzer, Learning Roadmap, Practice Arena, Mock Interviews, Alumni Network, Resume Analyzer, Certifications.
Only use the company data below for match percentages and CTC; never invent other numbers about this student. If you don't know, say so.

STUDENT PROFILE
Name: ${p.full_name}
Program: ${p.meta}, ${p.branch}, batch ${p.batch}, ${p.college}
CGPA: ${p.cgpa}/10 | Active backlogs: ${p.backlogs} | Class X: ${p.class_x}% | Class XII: ${p.class_xii}%
Skills (0-100): ${JSON.stringify(p.skills)}
Projects: ${JSON.stringify(p.projects)}
Internships: ${JSON.stringify(p.internships)}
Resume uploaded: ${p.resume_name ? 'yes (' + p.resume_name + ')' : 'no'}

COMPANIES TRACKED (name | role | stack and match | CTC | location)
${catalog}`
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return json({ error: 'The AI assistant is not configured (GROQ_API_KEY missing).' }, 503)

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in' }, 401)

  let messages: Msg[]
  try {
    const body = (await req.json()) as { messages?: Msg[] }
    messages = (body.messages ?? [])
      .filter((m) => (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string' && m.text.trim())
      .slice(-20)
      .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }))
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'No question provided' }, 400)

  // Validates the token and loads the caller's own profile in one RLS-protected request.
  const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1`, {
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}` },
  })
  if (profRes.status === 401) return json({ error: 'Session expired. Please sign in again.' }, 401)
  if (!profRes.ok) return json({ error: 'Could not load your profile' }, 502)
  const [profile] = (await profRes.json()) as Record<string, unknown>[]
  if (!profile) return json({ error: 'Not signed in' }, 401)

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${groqKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 1200,
      ...(MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
      messages: [
        { role: 'system', content: systemPrompt(profile) },
        ...messages.map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text })),
      ],
    }),
  })

  if (!groqRes.ok) {
    const detail = await groqRes.text()
    console.error('Groq error', groqRes.status, detail.slice(0, 500))
    const msg = groqRes.status === 429 ? 'The assistant is busy right now. Try again in a moment.' : 'The AI service returned an error.'
    return json({ error: msg }, 502)
  }

  const data = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] }
  // The chat UI shows plain text, so strip markdown emphasis and headings.
  const reply = data.choices?.[0]?.message?.content
    ?.replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()
  if (!reply) return json({ error: 'The AI returned an empty answer.' }, 502)
  return json({ reply })
}
