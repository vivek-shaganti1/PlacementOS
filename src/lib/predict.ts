/**
 * Explainable predictions built on the eligibility engine: expected salary, interview readiness and the what-if
 * simulator. Every number is a transparent function of the student's own data, so the UI can always say why.
 */
import type { Bucket, Company } from '../data/types'
import { evaluateAll, readinessOf, type StudentLike } from './eligibility'

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

export function predictSalary(companies: Company[]): SalaryPrediction {
  const items = companies.filter((c) => c.ctcAvg > 0).map((c) => ({ c, v: c.ctcAvg, w: weightOf(c) }))
  const total = items.reduce((a, x) => a + x.w, 0)
  const expected = total ? items.reduce((a, x) => a + x.v * x.w, 0) / total : 0
  const reachable = items.filter((x) => x.c.bucket === 'eligible' || x.c.bucket === 'nearly')
  return {
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

const skill = (p: StudentLike, name: string) => p.skills.find((s) => s.name === name)?.level ?? 0

/**
 * Interview readiness (0-100): coding rounds (DSA 30%), aptitude round (15%), system design (15%),
 * mock interview performance (20%, average of logged mock scores out of 10), resume quality (10%)
 * and hands-on experience (10%, projects and internships).
 */
export function interviewReadiness(p: InterviewInput): InterviewReadiness {
  const mocks = p.mock_feedback ?? []
  const mockAvg = mocks.length ? (mocks.reduce((a, m) => a + Number(m.score), 0) / mocks.length) * 10 : 0
  const experience = Math.min(100, p.projects.length * 20 + p.internships.length * 25)
  const components = [
    { label: 'Coding (DSA)', value: skill(p, 'Data Structures & Algorithms'), weight: 0.3 },
    { label: 'Aptitude', value: skill(p, 'Aptitude & Reasoning'), weight: 0.15 },
    { label: 'System design', value: skill(p, 'System Design'), weight: 0.15 },
    { label: 'Mock interviews', value: Math.round(mockAvg), weight: 0.2 },
    { label: 'Resume', value: p.resume_analysis?.overall ?? 0, weight: 0.1 },
    { label: 'Projects and internships', value: experience, weight: 0.1 },
  ]
  const score = Math.round(components.reduce((a, c) => a + c.value * c.weight, 0))
  const weakest = [...components].sort((a, b) => a.value - b.value).slice(0, 2).map((c) => c.label)
  return { score, components, weakest, mockCount: mocks.length }
}

/* ---------------------------------------------------------------- what-if simulator */

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
