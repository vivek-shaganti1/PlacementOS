// Resume analysis and job-description matching.
// POST { action: 'analyze', text, file_name }  -> parses the extracted resume text, scores it, saves to profile
// POST { action: 'match', jd }                 -> matches the saved resume against a job description
import { SKILLS } from '../src/lib/eligibility'
import { bearer, consumeAi, deleteRows, groq, handle, HttpError, insertRows, json, loadProfile, parseJson, rest, saveProfile, STYLE_RULES, tidyDeep } from './_lib'

export const config = { runtime: 'edge' }

const TECH = [
  'c', 'c++', 'java', 'python', 'javascript', 'typescript', 'go', 'golang', 'rust', 'kotlin', 'swift', 'c#', 'php', 'ruby', 'scala', 'sql',
  'html', 'css', 'react', 'react.js', 'next.js', 'nextjs', 'angular', 'vue', 'redux', 'tailwind', 'node', 'node.js', 'express', 'django', 'flask',
  'fastapi', 'spring', 'spring boot', 'graphql', 'rest', 'rest api', 'microservices', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis',
  'firebase', 'supabase', 'dynamodb', 'cassandra', 'elasticsearch', 'kafka', 'rabbitmq', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
  'terraform', 'jenkins', 'ci/cd', 'git', 'github actions', 'linux', 'bash', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'machine learning', 'deep learning', 'nlp', 'computer vision', 'llm', 'data structures', 'algorithms', 'dsa', 'oop', 'object oriented',
  'system design', 'distributed systems', 'operating systems', 'dbms', 'computer networks', 'websocket', 'grpc', 'unit testing', 'jest',
  'selenium', 'agile', 'scrum', 'figma', 'android', 'ios', 'flutter', 'react native', 'hadoop', 'spark', 'tableau', 'power bi', 'excel',
]
const VERBS = new Set(
  'built developed designed implemented created led launched shipped optimized optimised reduced improved increased automated architected engineered deployed migrated scaled integrated delivered drove managed mentored analyzed analysed researched streamlined refactored spearheaded established achieved won trained modeled modelled wrote authored coordinated collaborated owned organized organised accelerated cut boosted generated secured debugged tested maintained configured containerized orchestrated'
    .split(' '),
)
const SECTIONS: [string, RegExp][] = [
  ['Education', /^\s*(education|academic|qualifications?)\b/im],
  ['Experience', /^\s*(experience|work experience|internships?|professional experience|employment)\b/im],
  ['Projects', /^\s*(projects?|personal projects|academic projects)\b/im],
  ['Skills', /^\s*(skills|technical skills|tech stack|technologies)\b/im],
  ['Certifications', /^\s*(certifications?|courses|licenses)\b/im],
  ['Achievements', /^\s*(achievements|awards|honou?rs|accomplishments|extra-?curricular|positions? of responsibility)\b/im],
]

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const findTech = (text: string) => {
  const t = text.toLowerCase()
  return TECH.filter((k) => new RegExp(`(^|[^a-z0-9+#])${esc(k)}([^a-z0-9+#]|$)`).test(t))
}
const clampScore = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
const strArr = (v: unknown, max = 12) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => String(x).slice(0, 300)) : [])

// A bullet counts as quantified when it has a %, multiplier, currency or a 2+ digit number that is not a year.
const hasMetric = (line: string) =>
  /\d\s?(%|x\b|\+|k\b|ms\b|lpa\b)|[$₹]\s?\d/i.test(line) ||
  (line.match(/\d+(\.\d+)?/g) ?? []).some((n) => n.length >= 2 && !/^(19|20)\d\d$/.test(n))

function measure(text: string) {
  const words = (text.match(/\S+/g) ?? []).length
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const bulletLines = lines
    .map((l) => l.replace(/^[•●▪◦\-*–·]\s*/, ''))
    .filter((l, i) => /^[•●▪◦\-*–·]/.test(lines[i]) || (l.split(/\s+/).length >= 7 && l.split(/\s+/).length <= 60))
  const bullets = bulletLines.length
  const quantified = bulletLines.filter(hasMetric).length
  const actionVerbs = bulletLines.filter((l) => VERBS.has(l.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '')).length
  const sections = SECTIONS.filter(([, re]) => re.test(text)).map(([n]) => n)
  const contact = {
    email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(text),
    phone: /(\+?\d[\d\s-]{8,}\d)/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text) || /\blinkedin\b/i.test(text),
    github: /github\.com\//i.test(text) || /\bgithub\b/i.test(text),
  }
  const tech = findTech(text)
  const sdeCore = ['data structures', 'algorithms', 'dsa', 'oop', 'sql', 'git', 'rest', 'rest api', 'dbms', 'operating systems', 'system design', 'java', 'python', 'c++', 'javascript', 'react', 'node.js', 'node', 'docker', 'aws']
  const coreHits = sdeCore.filter((k) => tech.includes(k)).length

  const ratio = (a: number, b: number) => (b ? a / b : 0)
  const lengthScore = words < 200 ? 35 : words < 350 ? 70 : words <= 800 ? 100 : words <= 1100 ? 75 : 50
  const order = ['Education', 'Experience', 'Projects', 'Skills']
  const checks = [
    { label: 'Impact quantified with metrics', score: Math.min(100, Math.round((ratio(quantified, bullets) / 0.6) * 100)) },
    { label: 'Keyword match for SDE roles', score: Math.min(100, Math.round((coreHits / 10) * 100)) },
    {
      label: 'Formatting & ATS readability',
      score: Math.round(40 * (Object.values(contact).filter(Boolean).length / 4) + 45 * Math.min(1, sections.length / 4) + 15 * (bullets >= 6 ? 1 : bullets / 6)),
    },
    { label: 'Section coverage', score: Math.round((order.filter((s) => sections.includes(s)).length / order.length) * 100) },
    { label: 'Length & density', score: lengthScore },
    { label: 'Action verbs', score: Math.min(100, Math.round((ratio(actionVerbs, bullets) / 0.7) * 100)) },
  ]
  return { words, bullets, quantified, actionVerbs, sections, contact, tech, checks, bulletLines }
}

type AiAnalysis = {
  content_quality: number
  summary: string
  tips: Record<string, string>
  strengths: string[]
  improvements: string[]
  rewrites: { before: string; after: string }[]
  extracted: {
    skills: string[]
    projects: { name: string; tech: string; description: string }[]
    internships: { org: string; role: string; period: string }[]
    certifications: string[]
    links: string[]
  }
  skill_levels: Record<string, number>
}

async function analyze(text: string, fileName: string | null, targetRole: string) {
  const m = measure(text)
  const prompt = `You are an expert technical recruiter and ATS reviewer for Indian campus placements. Analyze the resume below for a "${targetRole}" role.
Measured facts (computed by code, trust them): ${JSON.stringify({ words: m.words, bullet_lines: m.bullets, quantified_bullets: m.quantified, bullets_starting_with_action_verbs: m.actionVerbs, sections_found: m.sections, contact: m.contact, technologies_found: m.tech })}
Check scores already computed: ${JSON.stringify(m.checks)}

Return ONLY a JSON object with exactly these keys:
{
 "content_quality": 0-100 (depth and relevance of projects/experience for the role),
 "summary": "2-3 sentence honest assessment",
 "tips": { "<check label>": "one specific, actionable tip referencing this resume's actual content" } for each of the 6 check labels,
 "strengths": [up to 4 short strings],
 "improvements": [up to 5 short, specific strings],
 "rewrites": [up to 3 objects {"before": exact weak line copied from the resume, "after": stronger rewrite with an honest placeholder metric like "[X]%" if the number is unknown}],
 "extracted": {
   "skills": [technologies/skills listed],
   "projects": [{"name","tech","description" (one line)}],
   "internships": [{"org","role","period"}],
   "certifications": [strings],
   "links": [urls found]
 },
 "skill_levels": { estimate 0-100 for each of ${JSON.stringify(SKILLS)} based ONLY on evidence in the resume; use 0 when there is no evidence }
}
Never invent facts that are not in the resume. ${STYLE_RULES}

RESUME:
"""
${text.slice(0, 14000)}
"""`
  const ai = tidyDeep(parseJson<AiAnalysis>(await groq([{ role: 'user', content: prompt }], { json: true, maxTokens: 2200, temperature: 0.2 })))

  const checks = m.checks.map((c) => ({ ...c, tip: String(ai.tips?.[c.label] ?? '').slice(0, 300) }))
  const avg = checks.reduce((a, c) => a + c.score, 0) / checks.length
  const levels = Object.fromEntries(SKILLS.map((s) => [s, clampScore(ai.skill_levels?.[s])]))
  const ex = ai.extracted ?? ({} as AiAnalysis['extracted'])

  return {
    overall: Math.round(0.6 * avg + 0.4 * clampScore(ai.content_quality)),
    summary: String(ai.summary ?? '').slice(0, 800),
    checks,
    strengths: strArr(ai.strengths, 4),
    improvements: strArr(ai.improvements, 5),
    rewrites: (Array.isArray(ai.rewrites) ? ai.rewrites : [])
      .filter((r) => r && typeof r.before === 'string' && typeof r.after === 'string')
      .slice(0, 3)
      .map((r) => ({ before: r.before.slice(0, 400), after: r.after.slice(0, 400) })),
    extracted: {
      skills: [...new Set([...strArr(ex.skills, 60), ...m.tech])].slice(0, 60),
      projects: (Array.isArray(ex.projects) ? ex.projects : []).slice(0, 10).map((p) => ({ name: String(p?.name ?? '').slice(0, 120), tech: String(p?.tech ?? '').slice(0, 200), description: String(p?.description ?? '').slice(0, 300) })).filter((p) => p.name),
      internships: (Array.isArray(ex.internships) ? ex.internships : []).slice(0, 8).map((i) => ({ org: String(i?.org ?? '').slice(0, 120), role: String(i?.role ?? '').slice(0, 120), period: String(i?.period ?? '').slice(0, 60) })).filter((i) => i.org),
      certifications: strArr(ex.certifications, 15),
      links: strArr(ex.links, 10),
    },
    skill_levels: levels,
    stats: { words: m.words, bullets: m.bullets, quantified: m.quantified, action_verbs: m.actionVerbs, sections: m.sections },
    analyzed_at: new Date().toISOString(),
    file_name: fileName,
  }
}

async function match(resume: string, jd: string) {
  const resumeTech = findTech(resume)
  const jdTech = findTech(jd)
  const overlap = jdTech.length ? jdTech.filter((k) => resumeTech.includes(k)).length / jdTech.length : 0
  const prompt = `Compare this candidate's resume against the job description for an Indian campus/fresher hiring process.
Technologies found by code — in JD: ${JSON.stringify(jdTech)}; in resume: ${JSON.stringify(resumeTech)}.

Return ONLY a JSON object:
{
 "jd_title": "role title from the JD (short)",
 "fit": 0-100 (overall fit including experience level, domain and responsibilities, not just keywords),
 "verdict": "1-2 sentence honest verdict",
 "matched_skills": [skills/requirements the resume clearly satisfies],
 "missing_skills": [required skills/requirements not evidenced in the resume],
 "missing_keywords": [important JD keywords to add if truthful],
 "suggestions": [up to 5 specific edits to tailor the resume to this JD],
 "tailored_bullets": [up to 3 rewritten resume bullets aligned to the JD, based only on real resume content]
}
${STYLE_RULES}

JOB DESCRIPTION:
"""
${jd.slice(0, 8000)}
"""

RESUME:
"""
${resume.slice(0, 12000)}
"""`
  const ai = tidyDeep(parseJson<Record<string, unknown>>(await groq([{ role: 'user', content: prompt }], { json: true, maxTokens: 1500, temperature: 0.2 })))
  return {
    score: Math.round(jdTech.length ? 0.4 * overlap * 100 + 0.6 * clampScore(ai.fit) : clampScore(ai.fit)),
    verdict: String(ai.verdict ?? '').slice(0, 500),
    matched_skills: strArr(ai.matched_skills, 25),
    missing_skills: strArr(ai.missing_skills, 25),
    missing_keywords: strArr(ai.missing_keywords, 25),
    suggestions: strArr(ai.suggestions, 5),
    tailored_bullets: strArr(ai.tailored_bullets, 3),
    jd_title: String(ai.jd_title ?? 'Job description').slice(0, 120),
    analyzed_at: new Date().toISOString(),
  }
}

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const body = (await req.json().catch(() => ({}))) as { action?: string; text?: string; file_name?: string; jd?: string; job_id?: string }
  const profile = await loadProfile(token)

  if (body.action === 'analyze') {
    const text = String(body.text ?? '').replace(/\u0000/g, '').trim().slice(0, 40000)
    if (text.length < 200) throw new HttpError(422, 'Could not read enough text from this file. If it is a scanned image, export it as a text-based PDF.')
    await consumeAi(token, 'resume')
    const analysis = await analyze(text, body.file_name ?? null, profile.target_roles || 'Software Engineer')
    const { analyzed_at, ...row } = analysis
    void analyzed_at
    await insertRows(token, 'resume_analyses', { ...row, user_id: profile.id })
    await deleteRows(token, 'jd_matches', `user_id=eq.${profile.id}`)
    await saveProfile(token, profile.id, { resume_text: text })
    return json({ analysis })
  }

  if (body.action === 'match') {
    let jd = String(body.jd ?? '').trim()
    let jobId: string | null = null
    if (body.job_id) {
      if (!/^[0-9a-f-]{36}$/i.test(body.job_id)) throw new HttpError(400, 'Invalid job')
      const [job] = (await (await rest(token, `job_postings?id=eq.${body.job_id}&select=id,company,role,description,location`)).json()) as Record<string, string>[]
      if (!job) throw new HttpError(404, 'Job not found')
      jobId = job.id
      jd = `${job.company} — ${job.role} (${job.location})\n\n${job.description}`.trim()
    }
    if (jd.length < 80) throw new HttpError(422, 'Paste the full job description (at least a few lines).')
    await consumeAi(token, 'jd_match')
    if (!profile.resume_text) throw new HttpError(422, 'Upload and analyze your resume first.')
    const result = await match(profile.resume_text, jd)
    const { analyzed_at, ...row } = result
    void analyzed_at
    await insertRows(token, 'jd_matches', { ...row, jd_text: jd.slice(0, 20000), user_id: profile.id, job_id: jobId })
    if (jobId) await rest(token, `job_applications?job_id=eq.${jobId}&user_id=eq.${profile.id}`, { method: 'PATCH', body: JSON.stringify({ ai_fit: result.score }), headers: { prefer: 'return=minimal' } })
    return json({ match: result })
  }

  throw new HttpError(400, 'Unknown action')
})
