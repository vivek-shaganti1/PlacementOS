// Derives skill levels from verifiable evidence: coding-platform stats, GitHub repos and the parsed resume.
import type { Integrations, ResumeAnalysis } from './supabase'

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

export function allEvidence(i: Integrations, resume: ResumeAnalysis | null): Record<string, Evidence> {
  const out = techEvidence(i, resume)
  const dsa = dsaEvidence(i)
  if (dsa) out['Data Structures & Algorithms'] = dsa
  else if (resume?.skill_levels?.['Data Structures & Algorithms'])
    out['Data Structures & Algorithms'] = { level: clamp(resume.skill_levels['Data Structures & Algorithms']), sources: ['resume'] }
  const apt = resume?.skill_levels?.['Aptitude & Reasoning']
  if (apt) out['Aptitude & Reasoning'] = { level: clamp(apt), sources: ['resume'] }
  return out
}
