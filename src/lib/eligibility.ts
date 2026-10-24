// Eligibility engine: turns a student profile + a company's requirements into a match %,
// a stack (bucket), per-criterion results and skill gaps. Pure functions, shared by the
// browser and the /api functions.
import { companyCatalog } from '../data/companies'
import { coreCatalog } from '../data/coreCompanies'
import type { Bucket, Category, Company, CompanyBase, Criterion, Requirements } from '../data/types'
import { branchCodesOf, skillShort, TRACK_BY_ID, tracksFor } from './branches'

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

/** Short labels for every skill in every track (charts and compact chips). */
export const SKILL_SHORT: Record<string, string> = new Proxy({} as Record<string, string>, { get: (_, k) => skillShort(String(k)) })

export type StudentLike = {
  cgpa: number
  backlogs: number
  class_x: number
  class_xii: number
  skills: { name: string; level: number }[]
  projects: unknown[]
  internships: unknown[]
  integrations?: { github?: { original_repos?: number } } | null
  branch?: string | null
  tracks?: string[] | null
}

type Template = Omit<Requirements, 'skills'> & { skills: number[] }
type CoreTemplate = Omit<Requirements, 'skills'> & { skills: Record<string, number> }

// Skill order matches SKILLS: DSA, System Design, Frontend, Backend, Databases, ML, Cloud, Aptitude
const templates: Record<string, Template> = {
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

/**
 * Core recruiters: typical campus cut-offs (CGPA 6–7, no active backlogs, 60% in Class X/XII) and the core subjects
 * their written test and technical interview cover, as levels out of 100.
 */
const acad = (minCgpa: number, maxBacklogs = 0, minProjects = 1) => ({ minCgpa, maxBacklogs, minClassX: 60, minClassXII: 60, minInternships: 0, minProjects })
const coreTemplates: Partial<Record<Category, CoreTemplate>> = {
  semiconductor: { ...acad(7, 0, 2), minClassX: 70, minClassXII: 70, skills: { 'Digital Design': 78, 'Verilog / SystemVerilog': 75, 'Verification & Timing (UVM/STA)': 55, 'Analog & CMOS Circuits': 65, 'Aptitude & Reasoning': 70 } },
  embedded: { ...acad(6.5, 0, 2), skills: { 'Embedded C': 72, 'Microcontrollers & Protocols': 68, 'PCB Design': 40, 'RTOS & Embedded Linux': 50, 'Digital Design': 55, 'Aptitude & Reasoning': 65 } },
  telecom: { ...acad(6.5), skills: { 'Signals & Systems': 65, 'Communication Systems': 70, Networking: 60, 'MATLAB / Simulink': 50, 'Aptitude & Reasoning': 65 } },
  electrical: { ...acad(6.5), skills: { 'Electrical Machines': 65, 'Power Systems': 65, 'Power Electronics': 60, 'Control Systems': 55, 'MATLAB / Simulink': 40, 'Aptitude & Reasoning': 65 } },
  energy: { ...acad(6.5), skills: { 'Power Systems': 68, 'Electrical Machines': 55, 'Power Electronics': 50, 'Aptitude & Reasoning': 65 } },
  automation: { ...acad(6.5), skills: { 'PLC & Industrial Automation': 65, 'Control Systems': 60, 'Instrumentation & Sensors': 60, 'Electrical Machines': 45, 'Aptitude & Reasoning': 65 } },
  automotive: { ...acad(6.5), skills: { 'Automobile & Vehicle Systems': 62, 'CAD Modelling': 60, 'Thermodynamics & Fluids': 60, 'FEA / CFD Simulation': 45, 'Aptitude & Reasoning': 65 } },
  manufacturing: { ...acad(6, 1), skills: { 'Manufacturing & Industrial Engineering': 62, 'CAD Modelling': 45, 'Thermodynamics & Fluids': 50, 'Strength of Materials & Design': 55, 'Aptitude & Reasoning': 65 } },
  engineering_services: { ...acad(6, 1), skills: { 'CAD Modelling': 65, 'Engineering Drawing & GD&T': 60, 'Strength of Materials & Design': 50, 'FEA / CFD Simulation': 40, 'Aptitude & Reasoning': 60 } },
  construction: { ...acad(6, 1), skills: { 'Structural Analysis & Design (IS codes)': 60, 'Structural Software (STAAD / ETABS)': 45, 'AutoCAD & BIM (Revit)': 50, 'Construction Planning & Estimation': 50, 'Geotechnical & Transportation': 50, 'Aptitude & Reasoning': 65 } },
  process: { ...acad(6.5), skills: { 'Chemical Thermodynamics & Transport': 65, 'Reaction Engineering': 60, 'Process Simulation (Aspen / DWSIM)': 45, 'Process Control & Safety': 55, 'Aptitude & Reasoning': 65 } },
  biotech: { ...acad(6, 1), skills: { 'Molecular Biology & Lab Techniques': 65, 'Bioprocess Engineering': 55, Bioinformatics: 40, 'Aptitude & Reasoning': 60 } },
  security: { ...acad(7, 0, 2), minClassX: 65, minClassXII: 65, skills: { Networking: 70, 'Security Fundamentals': 72, 'Linux & Scripting': 60, 'Data Structures & Algorithms': 55, 'Aptitude & Reasoning': 65 } },
}
const CORE_CATEGORIES = Object.keys(coreTemplates) as Category[]
const coreCategoryOf = new Map(coreCatalog.map((c) => [c.name, c.category]))

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
  semiconductor: 'Semiconductors & VLSI', embedded: 'Embedded & IoT', telecom: 'Telecom & RF', electrical: 'Electrical equipment',
  energy: 'Power & energy', automation: 'Industrial automation', automotive: 'Automotive', manufacturing: 'Manufacturing & metals',
  engineering_services: 'Engineering services', construction: 'Construction & infrastructure', process: 'Process & chemicals',
  biotech: 'Biotech & pharma', security: 'Cyber security',
}

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

export function requirementsFor(c: Pick<CompanyBase, 'name'>): { category: Category; requirements: Requirements } {
  const core = coreCategoryOf.get(c.name)
  const h = hash(c.name)
  // Small deterministic per-company variation so companies in a tier are not identical.
  const vary = (v: number, i: number) => clamp(v + (((h >>> (i * 3)) % 7) - 3), 20, 98)
  if (core && coreTemplates[core]) {
    const t = coreTemplates[core]!
    return { category: core, requirements: { ...t, skills: Object.fromEntries(Object.entries(t.skills).map(([name, v], i) => [name, vary(v, i)])) } }
  }
  const category = categories[c.name] ?? 'service'
  const t = templates[category as keyof typeof templates] ?? templates.service
  const skills = Object.fromEntries(SKILLS.map((name, i) => [name, vary(t.skills[i], i)]))
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
  // Every skill this company tests (software, VLSI, civil, ...), not a fixed list.
  const required = Object.keys(r.skills)
  for (const name of required) {
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
    ...required.filter((n) => r.skills[n] >= 55).map((n) => ({
      label: n,
      required: `${r.skills[n]}%`,
      yours: `${levelOf(p, n)}%`,
      met: levelOf(p, n) >= r.skills[n],
    })),
  ]

  return { ...base, category, requirements: r, match, bucket, breakdown: { academic, skills, experience, projects: projectScore }, criteria, gaps }
}

/** The recruiters relevant to a student: every company whose category hires for one of the student's tracks. */
export function catalogFor(p: Pick<StudentLike, 'branch' | 'tracks'>): CompanyBase[] {
  const cats = new Set(tracksFor(p).flatMap((t) => TRACK_BY_ID.get(t)?.categories ?? []))
  return [...companyCatalog.filter((c) => cats.has(categories[c.name] ?? 'service')), ...coreCatalog.filter((c) => cats.has(c.category))]
}

export const evaluateAll = (p: StudentLike): Company[] => catalogFor(p).map((c) => evaluate(c, p)).sort((a, b) => b.match - a.match)

/** Product-track companies most software students are aiming for; readiness is measured against these and core recruiters. */
export const TARGET_CATEGORIES: Category[] = ['top', 'product', 'startup', 'fintech', ...CORE_CATEGORIES]

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
  org_id?: string | null
}

// Every BTech branch spelling (see lib/branches), so "CSE" on a job matches "Computer Science & Engineering" on a profile.
const branchCodes = branchCodesOf
/** One short code for grouping students by branch (CSE, ECE, EEE, ...); unknown branches keep their own name. */
export const branchCode = (s: string) => (s.trim() ? branchCodes(s)[0] : 'Unassigned')
export const branchMatches = (jobBranches: string[], branch: string) =>
  !jobBranches.length || (!!branch && jobBranches.some((b) => branchCodes(b).some((c) => branchCodes(branch).includes(c))))

/** Scores a student against one posted job. Branch and batch are hard requirements. */
export function evaluateJob(job: JobPosting, p: StudentLike & { branch?: string; batch?: string }) {
  const base: CompanyBase = {
    id: job.id, name: job.company, role: job.role, brand: '#6d4aff', ctcAvg: Number(job.ctc_max ?? job.ctc_min ?? 0),
    ctcMin: Number(job.ctc_min ?? 0), ctcMax: Number(job.ctc_max ?? 0), location: job.location, jobType: job.job_type,
    tenure: '', batches: job.batches.join(', '), about: '', careers: '', process: [], stats: [], alumni: [],
  }
  const requirements: Requirements = {
    minCgpa: Number(job.min_cgpa), maxBacklogs: job.max_backlogs, minClassX: Number(job.min_class_x), minClassXII: Number(job.min_class_xii),
    minInternships: job.min_internships, minProjects: job.min_projects,
    // The skills the drive asked for (any track); unset skills are not requirements.
    skills: Object.fromEntries(Object.entries(job.skill_requirements ?? {}).map(([s, v]) => [s, Number(v) || 0]).filter(([, v]) => (v as number) > 0)),
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
