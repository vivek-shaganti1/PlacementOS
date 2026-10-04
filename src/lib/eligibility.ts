// Eligibility engine: turns a student profile + a company's requirements into a match %,
// a stack (bucket), per-criterion results and skill gaps. Pure functions, shared by the
// browser and the /api functions.
import { companyCatalog } from '../data/companies'
import type { Bucket, Category, Company, CompanyBase, Criterion, Requirements } from '../data/types'

export const SKILLS = [
  'Data Structures & Algorithms',
  'System Design',
  'React / Frontend',
  'Node.js / Backend',
  'Databases (SQL + NoSQL)',
  'Machine Learning',
  'Cloud & DevOps',
  'Aptitude & Reasoning',
] as const

export const SKILL_SHORT: Record<string, string> = {
  'Data Structures & Algorithms': 'DSA',
  'System Design': 'System Design',
  'React / Frontend': 'Frontend',
  'Node.js / Backend': 'Backend',
  'Databases (SQL + NoSQL)': 'Databases',
  'Machine Learning': 'ML',
  'Cloud & DevOps': 'Cloud',
  'Aptitude & Reasoning': 'Aptitude',
}

export type StudentLike = {
  cgpa: number
  backlogs: number
  class_x: number
  class_xii: number
  skills: { name: string; level: number }[]
  projects: unknown[]
  internships: unknown[]
  integrations?: { github?: { original_repos?: number } } | null
}

type Template = Omit<Requirements, 'skills'> & { skills: number[] }

// Skill order matches SKILLS: DSA, System Design, Frontend, Backend, Databases, ML, Cloud, Aptitude
const templates: Record<Category, Template> = {
  top:        { minCgpa: 7.5, maxBacklogs: 0, minClassX: 70, minClassXII: 70, minInternships: 1, minProjects: 3, skills: [88, 72, 60, 70, 70, 45, 60, 70] },
  quant:      { minCgpa: 8.5, maxBacklogs: 0, minClassX: 85, minClassXII: 85, minInternships: 1, minProjects: 2, skills: [95, 55, 35, 60, 60, 60, 40, 92] },
  ai:         { minCgpa: 8.0, maxBacklogs: 0, minClassX: 75, minClassXII: 75, minInternships: 1, minProjects: 3, skills: [85, 68, 40, 65, 65, 85, 70, 72] },
  product:    { minCgpa: 7.0, maxBacklogs: 0, minClassX: 65, minClassXII: 65, minInternships: 1, minProjects: 2, skills: [78, 62, 65, 72, 70, 40, 60, 70] },
  fintech:    { minCgpa: 7.5, maxBacklogs: 0, minClassX: 70, minClassXII: 70, minInternships: 0, minProjects: 2, skills: [80, 60, 50, 70, 75, 40, 55, 82] },
  startup:    { minCgpa: 6.5, maxBacklogs: 0, minClassX: 60, minClassXII: 60, minInternships: 1, minProjects: 3, skills: [75, 60, 72, 75, 68, 35, 60, 65] },
  infra:      { minCgpa: 7.5, maxBacklogs: 0, minClassX: 70, minClassXII: 70, minInternships: 1, minProjects: 2, skills: [80, 72, 40, 72, 75, 40, 75, 70] },
  hardware:   { minCgpa: 7.5, maxBacklogs: 0, minClassX: 70, minClassXII: 70, minInternships: 0, minProjects: 2, skills: [78, 55, 30, 60, 55, 55, 55, 75] },
  service:    { minCgpa: 6.0, maxBacklogs: 1, minClassX: 60, minClassXII: 60, minInternships: 0, minProjects: 1, skills: [55, 30, 50, 55, 55, 25, 40, 70] },
  consulting: { minCgpa: 6.5, maxBacklogs: 0, minClassX: 60, minClassXII: 60, minInternships: 0, minProjects: 1, skills: [55, 40, 50, 55, 60, 35, 50, 75] },
}

const categories: Record<string, Category> = {
  Google: 'top', Microsoft: 'top', Amazon: 'top', Apple: 'top', Meta: 'top', Netflix: 'top', Uber: 'top', Stripe: 'top', SpaceX: 'top',
  'Two Sigma': 'quant', 'Jane Street': 'quant', Citadel: 'quant', 'Hudson River Trading': 'quant', 'DE Shaw': 'quant',
  NVIDIA: 'ai', OpenAI: 'ai', Anthropic: 'ai', Databricks: 'ai', 'Adobe Research': 'ai', Tesla: 'ai', 'Samsung R&D': 'ai',
  Adobe: 'product', 'SAP Labs': 'product', Salesforce: 'product', Atlassian: 'product', 'Walmart Global Tech': 'product', Flipkart: 'product', ServiceNow: 'product',
  'Goldman Sachs': 'fintech', 'J.P. Morgan': 'fintech', 'Morgan Stanley': 'fintech', Visa: 'fintech',
  Freshworks: 'startup', Zoho: 'startup', Swiggy: 'startup', Zomato: 'startup', PhonePe: 'startup', Razorpay: 'startup', Cred: 'startup', Zerodha: 'startup', Sprinklr: 'startup',
  Cisco: 'infra', 'Arista Networks': 'infra', 'Juniper Networks': 'infra', Nutanix: 'infra', VMware: 'infra', Rubrik: 'infra', Snowflake: 'infra', MongoDB: 'infra', Confluent: 'infra', 'Palo Alto Networks': 'infra', Oracle: 'infra',
  Intel: 'hardware', Qualcomm: 'hardware', 'Dell Technologies': 'hardware',
  Deloitte: 'consulting', Accenture: 'consulting',
}

export const categoryLabel: Record<Category, string> = {
  top: 'Top product (FAANG-tier)', quant: 'Quant / HFT', ai: 'AI & deep tech', product: 'Product company',
  fintech: 'Banking & fintech', startup: 'High-growth startup', infra: 'Infra, cloud & data', hardware: 'Hardware & semiconductors',
  service: 'IT services', consulting: 'Consulting',
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

export function requirementsFor(c: Pick<CompanyBase, 'name'>): { category: Category; requirements: Requirements } {
  const category = categories[c.name] ?? 'service'
  const t = templates[category]
  const h = hash(c.name)
  // Small deterministic per-company variation so companies in a tier are not identical.
  const skills = Object.fromEntries(SKILLS.map((name, i) => [name, clamp(t.skills[i] + (((h >>> (i * 3)) % 7) - 3), 20, 98)]))
  return { category, requirements: { ...t, skills } }
}

const levelOf = (p: StudentLike, name: string) => p.skills.find((s) => s.name === name)?.level ?? 0

export function evaluate(base: CompanyBase, p: StudentLike, override?: { category: Category; requirements: Requirements }): Company {
  const { category, requirements: r } = override ?? requirementsFor(base)
  const projects = Math.max(p.projects.length, Math.min(6, p.integrations?.github?.original_repos ?? 0))
  const internships = p.internships.length

  // Academic: ratio to each minimum, capped at 1. Backlogs beyond the limit are a hard penalty.
  const acadParts = [
    p.cgpa ? Math.min(1, p.cgpa / r.minCgpa) : 0,
    p.class_x ? Math.min(1, p.class_x / r.minClassX) : 0,
    p.class_xii ? Math.min(1, p.class_xii / r.minClassXII) : 0,
    p.backlogs <= r.maxBacklogs ? 1 : 0.4,
  ]
  const academic = Math.round((acadParts.reduce((a, b) => a + b, 0) / acadParts.length) * 100)

  // Skills: every percentage point below a required level costs 1.2 points, so several small
  // gaps add up the way they do in a real interview loop.
  const gaps: Company['gaps'] = []
  for (const name of SKILLS) {
    const need = r.skills[name]
    const have = levelOf(p, name)
    if (have < need) gaps.push({ skill: name, have, need })
  }
  gaps.sort((a, b) => b.need - b.have - (a.need - a.have))
  const totalGap = gaps.reduce((a, g) => a + g.need - g.have, 0)
  const skills = Math.round(clamp(100 - 1.2 * totalGap))

  const experience = r.minInternships === 0 ? (internships > 0 ? 100 : 80) : Math.round(Math.min(1, internships / r.minInternships) * 100)
  const projectScore = r.minProjects === 0 ? 100 : Math.round(Math.min(1, projects / r.minProjects) * 100)

  const match = Math.round(0.15 * academic + 0.6 * skills + 0.1 * experience + 0.15 * projectScore)

  const academicFail = p.cgpa < r.minCgpa || p.backlogs > r.maxBacklogs || p.class_x < r.minClassX || p.class_xii < r.minClassXII
  const nearAcademic = p.cgpa >= r.minCgpa - 0.5 && p.backlogs <= r.maxBacklogs + 1 && p.class_x >= r.minClassX - 5 && p.class_xii >= r.minClassXII - 5
  const maxGap = gaps.reduce((m, g) => Math.max(m, g.need - g.have), 0)

  let bucket: Bucket
  if (academicFail) bucket = nearAcademic && match >= 55 ? 'canBecome' : 'notEligible'
  else if (match >= 88 && maxGap <= 5 && internships >= r.minInternships) bucket = 'eligible'
  else if (match >= 75 && maxGap <= 15 && totalGap <= 25) bucket = 'nearly'
  else if (match >= 55) bucket = 'canBecome'
  else bucket = 'notEligible'

  const criteria: Criterion[] = [
    { label: 'Minimum CGPA', required: `${r.minCgpa} / 10`, yours: p.cgpa ? `${p.cgpa} / 10` : 'Not set', met: p.cgpa >= r.minCgpa },
    { label: 'Active Backlogs', required: r.maxBacklogs === 0 ? 'None' : `≤ ${r.maxBacklogs}`, yours: p.backlogs === 0 ? 'None' : String(p.backlogs), met: p.backlogs <= r.maxBacklogs },
    { label: 'Class X Percentage', required: `${r.minClassX}%`, yours: p.class_x ? `${p.class_x}%` : 'Not set', met: p.class_x >= r.minClassX },
    { label: 'Class XII Percentage', required: `${r.minClassXII}%`, yours: p.class_xii ? `${p.class_xii}%` : 'Not set', met: p.class_xii >= r.minClassXII },
    { label: 'Internship Experience', required: r.minInternships ? `${r.minInternships} internship` : 'Preferred', yours: `${internships} internship${internships === 1 ? '' : 's'}`, met: internships >= r.minInternships },
    { label: 'Projects', required: `${r.minProjects}+ projects`, yours: `${projects} project${projects === 1 ? '' : 's'}`, met: projects >= r.minProjects },
    ...SKILLS.filter((n) => r.skills[n] >= 55).map((n) => ({
      label: n,
      required: `${r.skills[n]}%`,
      yours: `${levelOf(p, n)}%`,
      met: levelOf(p, n) >= r.skills[n],
    })),
  ]

  return { ...base, category, requirements: r, match, bucket, breakdown: { academic, skills, experience, projects: projectScore }, criteria, gaps }
}

export const evaluateAll = (p: StudentLike): Company[] => companyCatalog.map((c) => evaluate(c, p)).sort((a, b) => b.match - a.match)

/** Product-track companies most students are aiming for; readiness is measured against these. */
export const TARGET_CATEGORIES: Category[] = ['top', 'product', 'startup', 'fintech']

export function readinessOf(companies: Company[]) {
  const target = companies.filter((c) => TARGET_CATEGORIES.includes(c.category))
  return Math.round(target.reduce((a, c) => a + c.match, 0) / Math.max(1, target.length))
}

/* ---------------------------------------------------------------- college job postings */

export type JobPosting = {
  id: string
  company: string
  role: string
  location: string
  job_type: string
  ctc_min: number | null
  ctc_max: number | null
  description: string
  min_cgpa: number
  max_backlogs: number
  min_class_x: number
  min_class_xii: number
  min_internships: number
  min_projects: number
  branches: string[]
  batches: string[]
  skill_requirements: Record<string, number>
  deadline: string | null
  status: 'draft' | 'open' | 'closed'
  created_at: string
}

// Common branch spellings, so "CSE" on a job matches "Computer Science & Engineering" on a profile.
const BRANCH_ALIASES: [string, RegExp][] = [
  ['CSE', /\b(cse|computer science|cs)\b/i],
  ['IT', /\b(it|information technology)\b/i],
  ['AIML', /\b(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence|machine learning)\b/i],
  ['DS', /\b(ds|data science)\b/i],
  ['ECE', /\b(ece|electronics( and| &)? communication)\b/i],
  ['EEE', /\b(eee|electrical)\b/i],
  ['MECH', /\b(mech|mechanical)\b/i],
  ['CIVIL', /\b(civil)\b/i],
]
const branchCodes = (s: string) => {
  const codes = BRANCH_ALIASES.filter(([, re]) => re.test(s)).map(([c]) => c)
  return codes.length ? codes : [s.trim().toUpperCase()]
}
export const branchMatches = (jobBranches: string[], branch: string) =>
  !jobBranches.length || (!!branch && jobBranches.some((b) => branchCodes(b).some((c) => branchCodes(branch).includes(c))))

/** Scores a student against one posted job. Branch and batch are hard requirements. */
export function evaluateJob(job: JobPosting, p: StudentLike & { branch?: string; batch?: string }) {
  const base: CompanyBase = {
    id: job.id, name: job.company, role: job.role, brand: '#0F5A45', ctcAvg: Number(job.ctc_max ?? job.ctc_min ?? 0),
    ctcMin: Number(job.ctc_min ?? 0), ctcMax: Number(job.ctc_max ?? 0), location: job.location, jobType: job.job_type,
    tenure: '', batches: job.batches.join(', '), about: '', careers: '', process: [], stats: [], alumni: [],
  }
  const requirements: Requirements = {
    minCgpa: Number(job.min_cgpa), maxBacklogs: job.max_backlogs, minClassX: Number(job.min_class_x), minClassXII: Number(job.min_class_xii),
    minInternships: job.min_internships, minProjects: job.min_projects,
    skills: Object.fromEntries(SKILLS.map((s) => [s, Number(job.skill_requirements?.[s] ?? 0)])),
  }
  const result = evaluate(base, p, { category: requirementsFor(base).category, requirements })
  const branchOk = branchMatches(job.branches, p.branch ?? '')
  const batchOk = !job.batches.length || job.batches.includes(String(p.batch ?? ''))
  const criteria = [
    ...(job.branches.length ? [{ label: 'Eligible branches', required: job.branches.join(', '), yours: p.branch || 'Not set', met: branchOk }] : []),
    ...(job.batches.length ? [{ label: 'Batch', required: job.batches.join(', '), yours: p.batch || 'Not set', met: batchOk }] : []),
    ...result.criteria.filter((c) => !(c.required === '0%' || c.required === '0 / 10' || (c.label === 'Projects' && job.min_projects === 0))),
  ]
  const academicCutoffs = ['Minimum CGPA', 'Active Backlogs', 'Class X Percentage', 'Class XII Percentage']
  const hardFail = !branchOk || !batchOk || criteria.some((c) => academicCutoffs.includes(c.label) && !c.met)
  return { ...result, criteria, bucket: hardFail ? ('notEligible' as const) : result.bucket, eligibleToApply: !hardFail }
}
