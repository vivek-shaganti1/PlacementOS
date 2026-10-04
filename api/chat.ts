// AI Career Assistant backed by Groq. The key never reaches the browser; callers must be signed in,
// and the student's own profile (read under RLS) grounds every answer.
import { evaluateAll, type StudentLike } from '../src/lib/eligibility'
import { bearer, groq, handle, HttpError, json, loadProfile } from './_lib'

export const config = { runtime: 'edge' }

type Msg = { role: 'user' | 'bot'; text: string }

const bucketName: Record<string, string> = { eligible: 'Eligible', nearly: 'Nearly Eligible', canBecome: 'Can Become Eligible', notEligible: 'Not Eligible' }

function systemPrompt(p: Record<string, any>) {
  const companies = evaluateAll(p as StudentLike)
  const catalog = companies
    .map((c) => `${c.name} | ${bucketName[c.bucket]} ${c.match}% | CTC ₹${c.ctcAvg} LPA | gaps: ${c.gaps.slice(0, 3).map((g) => `${g.skill} ${g.have}->${g.need}`).join(', ') || 'none'}`)
    .join('\n')
  const i = p.integrations ?? {}
  const coding = [
    i.leetcode && `LeetCode: ${i.leetcode.solved} solved (E${i.leetcode.easy}/M${i.leetcode.medium}/H${i.leetcode.hard}), contest rating ${i.leetcode.contest_rating ?? 'n/a'}`,
    i.codeforces && `Codeforces: rating ${i.codeforces.rating ?? 'unrated'} (max ${i.codeforces.max_rating ?? '-'}), ${i.codeforces.solved} solved`,
    i.codechef && `CodeChef: rating ${i.codechef.rating ?? 'unrated'}, ${i.codechef.stars ?? 0}★, ${i.codechef.solved} solved`,
    i.github && `GitHub: ${i.github.original_repos} original repos, languages ${i.github.languages.slice(0, 6).map((l: any) => l.name).join(', ')}, top repos ${i.github.top_repos.slice(0, 4).map((r: any) => r.name).join(', ')}`,
  ].filter(Boolean)
  const ra = p.resume_analysis

  return `You are the AI Career Assistant inside PlacementIQ, a campus placement app for Indian engineering students.
Be specific, practical and encouraging. Keep answers under 180 words unless asked for detail. Use short paragraphs or simple "-" bullet lists. Plain text only: no markdown headings, bold or tables.
When relevant, point to app pages: Eligibility Stacks, Company Drives, Skill Gap Analyzer, Learning Roadmap, Practice Arena, Mock Interviews, Alumni Network, Resume Analyzer, Certifications, My Profile.
Use only the data below for this student's numbers. If something is missing (e.g. no resume, no coding accounts), say so and suggest adding it.

STUDENT PROFILE
Name: ${p.full_name} | Target role: ${p.target_roles}
Program: ${p.meta}, ${p.branch}, batch ${p.batch}, ${p.college}
CGPA: ${p.cgpa}/10 | Active backlogs: ${p.backlogs} | Class X: ${p.class_x}% | Class XII: ${p.class_xii}%
Skills (0-100): ${JSON.stringify(p.skills)}
Projects: ${JSON.stringify(p.projects)}
Internships: ${JSON.stringify(p.internships)}
Certifications: ${JSON.stringify((p.certifications ?? []).map((c: any) => c.name))}
Achievements: ${JSON.stringify((p.achievements ?? []).map((a: any) => a.title))}
Coding profiles: ${coding.length ? coding.join(' | ') : 'none connected'}
Resume: ${ra ? `score ${ra.overall}/100. ${ra.summary} Improvements: ${(ra.improvements ?? []).join('; ')}` : 'not analyzed yet'}

COMPANIES (computed from this profile: name | stack and match | CTC | top gaps)
${catalog}`
}

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)

  const body = (await req.json().catch(() => ({}))) as { messages?: Msg[] }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'bot') && typeof m.text === 'string' && m.text.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') throw new HttpError(400, 'No question provided')

  const profile = await loadProfile(token)
  const content = await groq(
    [
      { role: 'system', content: systemPrompt(profile) },
      ...messages.map((m) => ({ role: m.role === 'bot' ? ('assistant' as const) : ('user' as const), content: m.text })),
    ],
    { maxTokens: 1200, temperature: 0.5 },
  )
  // The chat UI shows plain text, so strip markdown emphasis and headings.
  const reply = content.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').trim()
  return json({ reply })
})
