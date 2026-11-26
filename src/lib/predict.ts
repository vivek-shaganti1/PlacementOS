/**
 * Explainable predictions built on the eligibility engine: expected salary, interview readiness and the what-if
 * simulator. Every number is a transparent function of the student's own data, so the UI can always say why.
 */
import type { Bucket, Company } from '../data/types'
import { skillsFor, skillShort, TRACK_BY_ID, tracksFor } from './branches'
import { catalogFor, evaluate, evaluateAll, readinessOf, requirementsForStudent, type StudentLike } from './eligibility'

/* ---------------------------------------------------------------- salary prediction */

/** Chance of converting an offer, by eligibility bucket, before scaling by the match score. */
export const OFFER_WEIGHT: Record<Bucket, number> = { eligible: 0.55, nearly: 0.3, canBecome: 0.1, notEligible: 0.01 }

export type SalaryPrediction = {
  /** Likelihood-weighted expected CTC across all companies, in LPA. */
  expected: number
  /** Weighted 25th to 75th percentile band, in LPA. */
  low: number
  high: number
  /** Highest CTC among companies the student is Eligible or Nearly Eligible for. */
  bestRealistic: number
  /** Companies that contribute most to the estimate. */
  drivers: { name: string; ctc: number; weight: number; bucket: Bucket }[]
  /**
   * How many companies the student is at least "Can become" for. When it is 0 the only weights left are the 1% given to
   * companies out of reach, and `expected` is just the catalogue's average package: a number about the companies, not
   * about the student. Screens show "not yet" instead.
   */
  reachable: number
}

const weightOf = (c: Company) => OFFER_WEIGHT[c.bucket] * (c.match / 100)

function weightedQuantile(items: { v: number; w: number }[], q: number) {
  const sorted = [...items].sort((a, b) => a.v - b.v)
  const total = sorted.reduce((a, x) => a + x.w, 0)
  if (!total) return 0
  let acc = 0
  for (const x of sorted) {
    acc += x.w
    if (acc / total >= q) return x.v
  }
  return sorted[sorted.length - 1].v
}

/**
 * `expected` is a weighted mean of company packages, not a sum. Improving a skill raises the weight of every company that
 * tests it, and if those companies pay less than the current mean, the mean falls even though no offer got less likely.
 * So raising aptitude (tested hardest by IT services) can lower expected CTC while eligibility improves. This is kept on
 * purpose, because it reflects where the student's likely offers are, and the What-If page says so next to the number.
 */
export function predictSalary(companies: Company[]): SalaryPrediction {
  const items = companies.filter((c) => c.ctcAvg > 0).map((c) => ({ c, v: c.ctcAvg, w: weightOf(c) }))
  const total = items.reduce((a, x) => a + x.w, 0)
  const expected = total ? items.reduce((a, x) => a + x.v * x.w, 0) / total : 0
  const reachable = items.filter((x) => x.c.bucket === 'eligible' || x.c.bucket === 'nearly')
  return {
    reachable: items.filter((x) => x.c.bucket !== 'notEligible').length,
    expected: Math.round(expected * 10) / 10,
    low: weightedQuantile(items, 0.25),
    high: weightedQuantile(items, 0.75),
    bestRealistic: reachable.reduce((m, x) => Math.max(m, x.v), 0),
    drivers: [...items]
      .sort((a, b) => b.w * b.v - a.w * a.v)
      .slice(0, 5)
      .map((x) => ({ name: x.c.name, ctc: x.v, weight: Math.round((x.w / Math.max(total, 1e-9)) * 100), bucket: x.c.bucket })),
  }
}

/* ---------------------------------------------------------------- interview readiness */

export type InterviewReadiness = {
  score: number
  components: { label: string; value: number; weight: number }[]
  weakest: string[]
  mockCount: number
}

type InterviewInput = StudentLike & { mock_feedback?: { score: number }[]; resume_analysis?: { overall: number } | null }

const APTITUDE = 'Aptitude & Reasoning'
const skill = (p: Pick<StudentLike, 'skills'>, name: string) => p.skills.find((s) => s.name === name)?.level ?? 0

type SkillLevel = { name: string; level: number }
export type CoreSkills = { track: string; lead: SkillLevel; second: SkillLevel }

/**
 * The two skills a student's technical rounds are measured on: the first two non-aptitude skills of their strongest track
 * (lead counted double, matching the 30% and 15% weights below). For the software track these are Data Structures &
 * Algorithms and System Design, so a software student's numbers are unchanged, while a civil student is measured on
 * structural analysis and a VLSI student on digital design. Taking the strongest track means adding a track never lowers
 * a score. `levelOf` lets a caller supply its own levels, for example evidence-only levels for rankings.
 */
export function coreSkills(p: Pick<StudentLike, 'skills' | 'tracks' | 'branch'>, levelOf: (name: string) => number = (name) => skill(p, name)): CoreSkills {
  return tracksFor(p)
    .map((track) => {
      const [lead, second] = (TRACK_BY_ID.get(track)?.skills ?? []).filter((s) => s !== APTITUDE)
      return { track, lead: { name: lead, level: levelOf(lead) }, second: { name: second, level: levelOf(second) } }
    })
    .reduce((best, t) => (2 * t.lead.level + t.second.level > 2 * best.lead.level + best.second.level ? t : best))
}

/**
 * Interview readiness (0-100): the lead skill of the student's strongest track (30%), the aptitude round (15%), that
 * track's second skill (15%), mock interview performance (20%, average of logged mock scores out of 10), resume quality
 * (10%) and hands-on experience (10%, projects and internships). The maximum is 100 on every branch.
 */
export function interviewReadiness(p: InterviewInput): InterviewReadiness {
  const mocks = p.mock_feedback ?? []
  const mockAvg = mocks.length ? (mocks.reduce((a, m) => a + Number(m.score), 0) / mocks.length) * 10 : 0
  const experience = Math.min(100, p.projects.length * 20 + p.internships.length * 25)
  const core = coreSkills(p)
  const components = [
    { label: skillShort(core.lead.name), value: core.lead.level, weight: 0.3 },
    { label: 'Aptitude', value: skill(p, APTITUDE), weight: 0.15 },
    { label: skillShort(core.second.name), value: core.second.level, weight: 0.15 },
    { label: 'Mock interviews', value: Math.round(mockAvg), weight: 0.2 },
    { label: 'Resume', value: p.resume_analysis?.overall ?? 0, weight: 0.1 },
    { label: 'Projects and internships', value: experience, weight: 0.1 },
  ]
  const score = Math.round(components.reduce((a, c) => a + c.value * c.weight, 0))
  const weakest = [...components].sort((a, b) => a.value - b.value).slice(0, 2).map((c) => c.label)
  return { score, components, weakest, mockCount: mocks.length }
}

/**
 * Placement readiness for rankings: the same average as readinessOf, but each company is scored only on skills inside the
 * student's own tracks. Whole categories hire for a track, so a company can test skills the track does not measure (a
 * structural student meets construction planning, a robotics student meets PCB design). Those gaps stay on the student's
 * own pages as advice, but a ranking must not hold them against the student: left in, readiness stops between 40 and 80
 * on 12 of the 18 tracks however strong the student is. For the software track this equals readinessOf.
 */
export function trackReadiness(p: StudentLike): number {
  const own = new Set(skillsFor(p))
  return readinessOf(
    catalogFor(p).map((c) => {
      // The role the student is scored for (their own track's, where the company hires for it).
      const { category, requirements } = requirementsForStudent(c, p)
      const skills = Object.fromEntries(Object.entries(requirements.skills).filter(([name]) => own.has(name)))
      return evaluate(c, p, { category, requirements: { ...requirements, skills } })
    }),
  )
}

/* ---------------------------------------------------------------- what-if simulator */

/** The student's skills with some levels replaced. Skills not named keep their level, so a simulation with no change changes nothing. */
export function withSkillLevels(skills: SkillLevel[], levels: Record<string, number>): SkillLevel[] {
  const known = new Set(skills.map((s) => s.name))
  return [
    ...skills.map((s) => (s.name in levels ? { ...s, level: levels[s.name] } : s)),
    ...Object.entries(levels).filter(([name]) => !known.has(name)).map(([name, level]) => ({ name, level })),
  ]
}

export type Snapshot = {
  companies: Company[]
  readiness: number
  counts: Record<Bucket, number>
  salary: SalaryPrediction
  interview: InterviewReadiness
}

export function snapshot(p: InterviewInput): Snapshot {
  const companies = evaluateAll(p)
  const counts = { eligible: 0, nearly: 0, canBecome: 0, notEligible: 0 } as Record<Bucket, number>
  for (const c of companies) counts[c.bucket]++
  return { companies, readiness: readinessOf(companies), counts, salary: predictSalary(companies), interview: interviewReadiness(p) }
}

const RANK: Record<Bucket, number> = { notEligible: 0, canBecome: 1, nearly: 2, eligible: 3 }

/** Companies whose bucket changes between two snapshots, biggest improvements first. */
export function bucketChanges(before: Snapshot, after: Snapshot) {
  const prev = new Map(before.companies.map((c) => [c.id, c]))
  return after.companies
    .map((c) => ({ company: c, from: prev.get(c.id)!.bucket, to: c.bucket, matchDelta: c.match - (prev.get(c.id)?.match ?? c.match) }))
    .filter((x) => x.from !== x.to)
    .sort((a, b) => RANK[b.to] - RANK[b.from] - (RANK[a.to] - RANK[a.from]) || b.matchDelta - a.matchDelta)
}

/* ---------------------------------------------------------------- placement score */

export type ScorePart = {
  key: 'academics' | 'skills' | 'proof' | 'projects' | 'internships' | 'resume' | 'certifications' | 'aptitude' | 'mocks' | 'achievements'
  label: string
  /** Points this part is worth; the parts add up to 100. */
  points: number
  /** How much of the part the student has, 0 to 100. */
  value: number
  /** Points earned: points × value / 100. */
  earned: number
  /** Where the number comes from, so a reader knows how much to trust it. */
  source: 'college' | 'evidence' | 'self' | 'resume' | 'mixed'
  /** What the number is made of, in words. */
  basis: string
  /** The next thing that would raise this part, or null when it is full. */
  next: string | null
}

export type PlacementScore = { score: number; parts: ScorePart[] }

type ScoreInput = StudentLike & {
  certifications?: { name: string }[]
  achievements?: { title: string }[]
  mock_feedback?: { score: number }[]
  resume_analysis?: { overall: number } | null
  credentials?: { kind: string; status: string }[]
  integrations?: StudentLike['integrations'] & { credly?: { badges: unknown[]; ownership?: { proven?: boolean } }; github?: { original_repos?: number; ownership?: { proven?: boolean } } }
}

const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/**
 * The Placement score: one number out of 100 that covers everything a campus process looks at, each part a fixed formula
 * of the student's own data (CLAUDE.md: predictions stay explainable). It sits next to readiness, which compares the student
 * with companies; this one measures the student alone. `evidenceLevels` are skill levels from proven evidence only
 * (lib/trust evidenceSkills); without them the proof part is 0.
 *
 *  15  Academics: CGPA from 5.0 (0) to 8.5 (full; the highest cut-off in the requirement templates) 60%, no active
 *      backlogs 25% (one backlog half), Class X and XII averaged against 85% 15%.
 *  20  Track skills: the student's levels in the strongest track's skills (aptitude counted separately), averaged.
 *  15  Proven skills: the same skills, levels from proven accounts and confirmed credentials only.
 *  10  Projects: three projects for full marks (the most any requirement template asks); a proven GitHub account's
 *      original repositories count as projects.
 *  10  Internships: one is 70, two or more 100.
 *  10  Resume: the resume analysis score.
 *   5  Certifications: a confirmed NPTEL or GATE credential 50 each, a Credly badge on a proven account 30, a listed
 *      certificate 15, up to 100.
 *   5  Aptitude: the aptitude level.
 *   5  Interview practice: the average mock interview score, scaled by how many of three mocks are logged.
 *   5  Achievements: two listed achievements (hackathons, awards) for full marks.
 */
export function placementScore(p: ScoreInput, evidenceLevels: { name: string; level: number }[] = []): PlacementScore {
  const core = coreSkills(p)
  const trackSkills = (TRACK_BY_ID.get(core.track)?.skills ?? []).filter((s) => s !== APTITUDE)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  const proven = new Map(evidenceLevels.map((e) => [e.name, e.level]))
  const githubRepos = p.integrations?.github?.ownership?.proven ? p.integrations.github.original_repos ?? 0 : 0
  const projects = Math.max(p.projects.length, Math.min(6, githubRepos))
  const confirmed = (p.credentials ?? []).filter((c) => c.status === 'verified').length
  const credly = p.integrations?.credly?.ownership?.proven ? p.integrations.credly.badges.length : 0
  const listed = p.certifications?.length ?? 0
  const mocks = p.mock_feedback ?? []
  const mockAvg = mocks.length ? avg(mocks.map((m) => Number(m.score) * 10)) : 0
  const achievements = p.achievements?.length ?? 0
  const school = p.class_x && p.class_xii ? (p.class_x + p.class_xii) / 2 : p.class_x || p.class_xii || 0
  const weakSkill = [...trackSkills].sort((a, b) => skill(p, a) - skill(p, b))[0]
  const weakProof = [...trackSkills].sort((a, b) => (proven.get(a) ?? 0) - (proven.get(b) ?? 0))[0]

  const parts: Omit<ScorePart, 'earned'>[] = [
    {
      key: 'academics', label: 'Academics', points: 15, source: 'college',
      value: pct(60 * Math.max(0, Math.min(1, (p.cgpa - 5) / 3.5)) + 25 * (p.backlogs === 0 ? 1 : p.backlogs === 1 ? 0.5 : 0) + 15 * Math.min(1, school / 85)),
      basis: `CGPA ${p.cgpa || 'not set'}, ${p.backlogs ? `${p.backlogs} active backlog${p.backlogs === 1 ? '' : 's'}` : 'no active backlogs'}, Class X and XII ${school ? `${Math.round(school)}%` : 'not set'}`,
      next: p.backlogs > 0 ? 'Clear your active backlogs: most drives allow none.' : p.cgpa < 8.5 ? 'Every 0.1 of CGPA up to 8.5 adds to this part.' : null,
    },
    {
      key: 'skills', label: 'Track skills', points: 20, source: 'self',
      value: pct(avg(trackSkills.map((s) => skill(p, s)))),
      basis: `Your levels in ${TRACK_BY_ID.get(core.track)?.label ?? core.track}: ${trackSkills.map(skillShort).join(', ')}`,
      next: weakSkill && skill(p, weakSkill) < 85 ? `Raise ${skillShort(weakSkill)} (now ${skill(p, weakSkill)}).` : null,
    },
    {
      key: 'proof', label: 'Proven skills', points: 15, source: 'evidence',
      value: pct(avg(trackSkills.map((s) => proven.get(s) ?? 0))),
      basis: 'The same skills, counted only from accounts you proved are yours and confirmed credentials',
      next: weakProof && (proven.get(weakProof) ?? 0) < 70 ? `Add proof for ${skillShort(weakProof)}: a repository, a verified badge or a certificate.` : null,
    },
    {
      key: 'projects', label: 'Projects', points: 10, source: githubRepos ? 'mixed' : 'self',
      value: pct((Math.min(3, projects) / 3) * 100),
      basis: `${projects} project${projects === 1 ? '' : 's'}${githubRepos ? ` (${githubRepos} original repositories on your proven GitHub)` : ''}`,
      next: projects < 3 ? `Add ${3 - projects} more project${3 - projects === 1 ? '' : 's'} in your track.` : null,
    },
    {
      key: 'internships', label: 'Internships', points: 10, source: 'self',
      value: p.internships.length >= 2 ? 100 : p.internships.length === 1 ? 70 : 0,
      basis: `${p.internships.length} internship${p.internships.length === 1 ? '' : 's'}`,
      next: p.internships.length >= 2 ? null : p.internships.length === 1 ? 'A second internship completes this part.' : 'One internship is worth 7 points here.',
    },
    {
      key: 'resume', label: 'Resume', points: 10, source: 'resume',
      value: pct(p.resume_analysis?.overall ?? 0),
      basis: p.resume_analysis ? `Resume analysis score ${p.resume_analysis.overall}` : 'No resume analysed yet',
      next: !p.resume_analysis ? 'Upload your resume for an analysis.' : p.resume_analysis.overall < 85 ? 'Apply the resume analysis fixes and analyse again.' : null,
    },
    {
      key: 'certifications', label: 'Certifications', points: 5, source: confirmed || credly ? 'evidence' : 'self',
      value: pct(50 * confirmed + 30 * credly + 15 * listed),
      basis: `${confirmed} confirmed credential${confirmed === 1 ? '' : 's'}, ${credly} Credly badge${credly === 1 ? '' : 's'}, ${listed} listed certificate${listed === 1 ? '' : 's'}`,
      next: 50 * confirmed + 30 * credly + 15 * listed >= 100 ? null : 'A confirmed NPTEL certificate in your track is worth the most here.',
    },
    {
      key: 'aptitude', label: 'Aptitude', points: 5, source: 'self',
      value: pct(skill(p, APTITUDE)),
      basis: `Aptitude level ${skill(p, APTITUDE)}`,
      next: skill(p, APTITUDE) < 85 ? 'Aptitude is the first round at most drives: practise it weekly.' : null,
    },
    {
      key: 'mocks', label: 'Interview practice', points: 5, source: 'self',
      value: pct(mockAvg * Math.min(1, mocks.length / 3)),
      basis: mocks.length ? `${mocks.length} mock interview${mocks.length === 1 ? '' : 's'}, average ${(mockAvg / 10).toFixed(1)} of 10` : 'No mock interviews logged',
      next: mocks.length < 3 ? `Log ${3 - mocks.length} more mock interview${3 - mocks.length === 1 ? '' : 's'}.` : mockAvg < 85 ? 'Work on the weakest area your mocks found.' : null,
    },
    {
      key: 'achievements', label: 'Achievements', points: 5, source: 'self',
      value: pct((Math.min(2, achievements) / 2) * 100),
      basis: `${achievements} listed achievement${achievements === 1 ? '' : 's'} (hackathons, awards)`,
      next: achievements < 2 ? 'A hackathon or competition result in your track counts here.' : null,
    },
  ]
  const full = parts.map((x) => ({ ...x, earned: Math.round((x.points * x.value) / 10) / 10 }))
  return { score: Math.round(full.reduce((a, x) => a + (x.points * x.value) / 100, 0)), parts: full }
}
