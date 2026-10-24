// Derives skill levels from verifiable evidence: coding-platform stats, GitHub repos and the parsed resume.
import type { Credential, Integrations, ResumeAnalysis } from './supabase'
import { FILE_SIGNALS, SKILL_BY_NAME } from './branches'

export type Evidence = { level: number; sources: string[] }

const clamp = (v: number) => Math.max(0, Math.min(98, Math.round(v)))

export function dsaEvidence(i: Integrations): Evidence | null {
  const { leetcode: lc, codeforces: cf, codechef: cc } = i
  if (!lc && !cf && !cc) return null
  const sources: string[] = []
  // Volume: weighted problems solved across platforms, with diminishing returns.
  let weighted = 0
  if (lc) {
    weighted += lc.easy + 1.6 * lc.medium + 2.6 * lc.hard
    sources.push(`LeetCode ${lc.solved} solved`)
  }
  if (cf) {
    weighted += 1.8 * cf.solved
    sources.push(`Codeforces ${cf.solved} solved${cf.rating ? `, rated ${cf.rating}` : ''}`)
  }
  if (cc) {
    weighted += 1.2 * cc.solved
    sources.push(`CodeChef ${cc.solved} solved${cc.rating ? `, rated ${cc.rating}` : ''}`)
  }
  // About 100 weighted problems reads as 39, 200 as 63, 400 as 86: campus tests ask for steady practice, not thousands.
  const volume = 100 * (1 - Math.exp(-weighted / 200))

  // Contest strength: best normalized rating across platforms. Anchors: LeetCode 1500 or Codeforces 1200 or CodeChef
  // 1600 is about 50; LeetCode 2100, Codeforces 1800 and CodeChef 2200 approach 90.
  const ratings = [
    lc?.contest_rating ? (lc.contest_rating - 800) / 14 : null,
    cf?.max_rating ? (cf.max_rating - 400) / 16 : null,
    cc?.max_rating ? (cc.max_rating - 900) / 14 : null,
  ].filter((v): v is number => v !== null)
  const contest = ratings.length ? Math.max(...ratings) : null
  if (lc?.contest_rating) sources.push(`LeetCode contest rating ${lc.contest_rating}`)

  return { level: clamp(contest === null ? volume : 0.6 * volume + 0.4 * Math.max(0, contest)), sources }
}

const techRules: { skill: string; langs: string[]; keywords: string[] }[] = [
  { skill: 'React / Frontend', langs: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Vue', 'Svelte', 'Dart'], keywords: ['react', 'nextjs', 'next.js', 'vue', 'angular', 'tailwind', 'frontend', 'svelte', 'redux', 'flutter'] },
  { skill: 'Node.js / Backend', langs: ['Go', 'Java', 'Kotlin', 'Rust', 'PHP', 'Ruby', 'C#'], keywords: ['node', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring', 'backend', 'api', 'rest', 'graphql', 'nestjs', 'microservices'] },
  { skill: 'Databases (SQL + NoSQL)', langs: ['PLpgSQL', 'TSQL', 'SQL'], keywords: ['sql', 'postgres', 'postgresql', 'mysql', 'mongodb', 'redis', 'database', 'supabase', 'firebase', 'prisma', 'sqlite', 'dynamodb'] },
  { skill: 'Machine Learning', langs: ['Jupyter Notebook', 'R'], keywords: ['machine-learning', 'machine learning', 'deep-learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'sklearn', 'nlp', 'llm', 'computer-vision', 'ml', 'ai', 'pandas', 'keras'] },
  { skill: 'Cloud & DevOps', langs: ['Dockerfile', 'HCL', 'Shell'], keywords: ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'terraform', 'ci', 'github-actions', 'devops', 'jenkins', 'vercel', 'serverless', 'linux'] },
  { skill: 'System Design', langs: [], keywords: ['distributed', 'system-design', 'system design', 'kafka', 'microservices', 'scalable', 'load-balancer', 'cache', 'websocket', 'grpc', 'rabbitmq'] },
]

export function techEvidence(i: Integrations, resume: ResumeAnalysis | null): Record<string, Evidence> {
  const out: Record<string, Evidence> = {}
  const gh = i.github
  const text = [
    ...(gh?.topics ?? []),
    ...(gh?.top_repos ?? []).flatMap((r) => [r.name, r.description ?? '', ...r.topics]),
    ...(resume?.extracted.skills ?? []),
    ...(resume?.extracted.projects ?? []).flatMap((p) => [p.tech, p.description]),
  ]
    .join(' ')
    .toLowerCase()

  for (const rule of techRules) {
    const repoHits = gh ? gh.languages.filter((l) => rule.langs.includes(l.name)).reduce((a, l) => a + l.repos, 0) : 0
    const kwHits = rule.keywords.filter((k) => new RegExp(`(^|[^a-z])${k.replace(/[.+]/g, '\\$&')}([^a-z]|$)`).test(text)).length
    const resumeLevel = resume?.skill_levels?.[rule.skill]
    if (!repoHits && !kwHits && !resumeLevel) continue
    const fromEvidence = 25 + 9 * Math.min(5, repoHits) + 7 * Math.min(6, kwHits)
    const level = resumeLevel ? Math.max(fromEvidence * 0.6 + resumeLevel * 0.4, Math.min(fromEvidence, 90)) : fromEvidence
    const sources = [
      repoHits ? `${repoHits} GitHub repo${repoHits === 1 ? '' : 's'}` : '',
      kwHits ? `${kwHits} matching technologies` : '',
      resumeLevel ? `resume (${resumeLevel}%)` : '',
    ].filter(Boolean)
    out[rule.skill] = { level: clamp(level), sources }
  }
  return out
}

/**
 * Levels for every track skill from objective sources, each rule a fixed formula:
 * - design files in GitHub repositories (Verilog, KiCad, CAD, Simulink, ...): 35 + 12 per repository, up to 4
 * - GitHub languages: 30 + 9 per repository using one, up to 5
 * - verified Credly badges matching the skill: 55, +10 per additional badge, up to 85
 * - NPTEL certificates verified on nptel.ac.in for this skill: 60, or 40 + half the course score when it is known
 * - GATE score confirmed by the placement cell, for its paper's subjects: 25 + 73 × score / 1000
 * - Hugging Face (ML, deep learning): 40 + 8 per model, dataset or space (up to 5) + up to 15 for downloads
 * - CTFtime (security): 45 + rating points / 4, up to 90
 * - resume or repository keywords only support other evidence (+3 each, up to 9); alone they read as at most 45
 * The best source sets the level; each further independent source adds 4. Capped at 92 (an interview still decides).
 */
export function trackEvidence(
  skills: string[],
  i: Integrations,
  resume: ResumeAnalysis | null,
  credentials: Credential[] = [],
): Record<string, Evidence> {
  const out: Record<string, Evidence> = {}
  const gh = i.github
  const badges = i.credly?.badges ?? []
  const text = [
    ...(gh?.topics ?? []),
    ...(gh?.top_repos ?? []).flatMap((r) => [r.name, r.description ?? '', ...r.topics]),
    ...(resume?.extracted.skills ?? []),
    ...(resume?.extracted.projects ?? []).flatMap((p) => [p.tech, p.description]),
  ].join(' ').toLowerCase()
  const has = (k: string) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.+*?()[\]\\/&]/g, '\\$&')}([^a-z0-9]|$)`).test(text)

  for (const name of skills) {
    const rule = SKILL_BY_NAME.get(name)
    if (!rule) continue
    const found: { level: number; source: string }[] = []

    const repos = new Set<string>()
    for (const f of rule.files ?? []) for (const r of gh?.signals?.[f]?.repos ?? []) repos.add(r)
    if (repos.size) {
      const kinds = (rule.files ?? []).filter((f) => gh?.signals?.[f]?.repos.length).map((f) => FILE_SIGNALS[f].label)
      found.push({ level: 35 + 12 * Math.min(4, repos.size), source: `${repos.size} GitHub repo${repos.size === 1 ? '' : 's'} with ${kinds.slice(0, 2).join(' and ')}` })
    }
    const parts = (gh?.kicad ?? []).reduce((a, k) => a + k.parts, 0)
    if (rule.files?.includes('pcb') && parts) found.push({ level: Math.min(80, 45 + Math.round(parts / 3)), source: `${parts} components in KiCad schematics` })

    const langRepos = gh ? gh.languages.filter((l) => rule.langs?.includes(l.name)).reduce((a, l) => a + l.repos, 0) : 0
    if (langRepos) found.push({ level: 30 + 9 * Math.min(5, langRepos), source: `${langRepos} repo${langRepos === 1 ? '' : 's'} in ${rule.langs!.filter((l) => gh!.languages.some((x) => x.name === l)).slice(0, 2).join(', ')}` })

    const matched = badges.filter((b) => (rule.badges ?? []).some((k) => `${b.name} ${b.issuer}`.toLowerCase().includes(k)))
    if (matched.length) found.push({ level: Math.min(85, 55 + 10 * (matched.length - 1)), source: `Credly: ${matched.slice(0, 2).map((b) => b.name).join(', ')}` })

    const nptel = credentials.filter((c) => c.kind === 'nptel' && c.status === 'verified' && c.skill === name)
    for (const c of nptel) found.push({ level: c.score != null ? Math.round(40 + Number(c.score) / 2) : 60, source: `NPTEL: ${c.title || c.ref}` })

    const gate = credentials.find((c) => c.kind === 'gate' && c.status === 'verified' && rule.gate?.includes(String(c.data.paper ?? '')))
    if (gate?.score != null) found.push({ level: Math.round(25 + (73 * Number(gate.score)) / 1000), source: `GATE ${gate.data.paper} score ${gate.score}` })

    const hf = i.huggingface
    if (rule.huggingface && hf && hf.models + hf.datasets + hf.spaces > 0)
      found.push({ level: Math.min(95, 40 + 8 * Math.min(5, hf.models + hf.datasets + hf.spaces) + Math.min(15, Math.round(5 * Math.log10(hf.downloads + 1)))), source: `Hugging Face: ${hf.models} models, ${hf.datasets} datasets` })

    const ctf = i.ctftime
    if (rule.ctf && ctf) found.push({ level: Math.min(90, Math.round(45 + ctf.rating_points / 4)), source: `CTFtime: ${ctf.team}, ${Math.round(ctf.rating_points)} rating points` })

    const kw = (rule.keywords ?? []).filter(has).length
    if (!found.length && !kw) continue
    const best = found.length ? Math.max(...found.map((f) => f.level)) : Math.min(45, 25 + 6 * kw)
    const level = best + 4 * Math.max(0, found.length - 1) + (found.length ? 3 * Math.min(3, kw) : 0)
    out[name] = { level: Math.min(92, clamp(level)), sources: [...found.map((f) => f.source), ...(kw ? [`${kw} matching keyword${kw === 1 ? '' : 's'} in resume or repos`] : [])] }
  }
  return out
}

export function allEvidence(i: Integrations, resume: ResumeAnalysis | null, ctx?: { skills?: string[]; credentials?: Credential[] }): Record<string, Evidence> {
  // Track evidence first, then the original software rules on top, so existing software levels are unchanged.
  const track = ctx?.skills ? trackEvidence(ctx.skills, i, resume, ctx.credentials ?? []) : {}
  const out = { ...track, ...techEvidence(i, resume) }
  for (const [k, v] of Object.entries(track)) if (out[k] && v.level > out[k].level) out[k] = v
  const dsa = dsaEvidence(i)
  if (dsa) out['Data Structures & Algorithms'] = dsa
  else if (resume?.skill_levels?.['Data Structures & Algorithms'])
    out['Data Structures & Algorithms'] = { level: clamp(resume.skill_levels['Data Structures & Algorithms']), sources: ['resume'] }
  const apt = resume?.skill_levels?.['Aptitude & Reasoning']
  if (apt) out['Aptitude & Reasoning'] = { level: clamp(apt), sources: ['resume'] }
  return out
}
