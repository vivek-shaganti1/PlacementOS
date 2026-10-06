/**
 * Reproducible evaluation of the PlacementIQ eligibility engine and predictions (used in the project paper).
 * Run: node node_modules/vite/node_modules/esbuild/bin/esbuild docs/evaluation/evaluate.ts --bundle --platform=node --outfile=$TMPDIR/eval.cjs && node $TMPDIR/eval.cjs
 * Synthetic cohort generated from a fixed seed, so results are identical on every run.
 */
import { companyCatalog } from '../../src/data/companies'
import type { Bucket } from '../../src/data/types'
import { evaluate, evaluateAll, readinessOf, requirementsFor, SKILLS } from '../../src/lib/eligibility'
import { interviewReadiness, predictSalary } from '../../src/lib/predict'

// Deterministic PRNG (mulberry32)
let seed = 20261006
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (a: number, b: number) => a + rnd() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]

function student() {
  const ability = between(0.25, 1)
  return {
    cgpa: Math.round(between(5.5, 9.8) * 10) / 10,
    backlogs: rnd() < 0.82 ? 0 : pick([1, 1, 2, 3]),
    class_x: Math.round(between(60, 98)),
    class_xii: Math.round(between(55, 97)),
    skills: SKILLS.map((name) => ({ name, level: Math.round(Math.max(5, Math.min(98, ability * 100 + between(-25, 15)))) })),
    projects: Array.from({ length: Math.floor(between(0, 6)) }, () => ({})),
    internships: Array.from({ length: rnd() < 0.55 ? 0 : pick([1, 1, 2]) }, () => ({})),
    mock_feedback: Array.from({ length: Math.floor(between(0, 4)) }, () => ({ score: Math.round(between(3, 9.5) * 10) / 10 })),
    resume_analysis: rnd() < 0.8 ? { overall: Math.round(between(40, 92)) } : null,
  }
}

const N = 10000
const cohort = Array.from({ length: N }, student)
const C = companyCatalog.length

// E1: latency (66 companies per student, full classification + readiness + salary + interview readiness)
const times: number[] = []
const results = cohort.map((s) => {
  const t0 = performance.now()
  const cs = evaluateAll(s)
  readinessOf(cs)
  predictSalary(cs)
  interviewReadiness(s)
  times.push(performance.now() - t0)
  return cs
})
times.sort((a, b) => a - b)
const mean = times.reduce((a, b) => a + b, 0) / N
const p95 = times[Math.floor(N * 0.95)]

// E2: explanation coverage: every non-Eligible decision names at least one unmet criterion or skill gap
let nonEligible = 0, explained = 0
const dist: Record<Bucket, number> = { eligible: 0, nearly: 0, canBecome: 0, notEligible: 0 }
for (const cs of results) for (const c of cs) {
  dist[c.bucket]++
  if (c.bucket !== 'eligible') {
    nonEligible++
    if (c.gaps.length > 0 || c.criteria.some((x) => !x.met)) explained++
  }
}

// E3: monotonicity: raising one skill by +10 (or CGPA by +0.5) never lowers any company's match or category
const rank: Record<Bucket, number> = { notEligible: 0, canBecome: 1, nearly: 2, eligible: 3 }
let checks = 0, violations = 0
for (const s of cohort.slice(0, 1000)) {
  const base = evaluateAll(s)
  const variants = [
    ...SKILLS.map((name) => ({ ...s, skills: s.skills.map((k) => (k.name === name ? { ...k, level: Math.min(100, k.level + 10) } : k)) })),
    { ...s, cgpa: Math.min(10, s.cgpa + 0.5) },
  ]
  for (const v of variants) {
    const after = new Map(evaluateAll(v).map((c) => [c.id, c]))
    for (const c of base) {
      checks++
      const a = after.get(c.id)!
      if (a.match < c.match || rank[a.bucket] < rank[c.bucket]) violations++
    }
  }
}

// E4: baseline comparison: CGPA/backlog cut-off screening (common practice) vs multi-criteria classification
let baseEligible = 0, baseEligibleWithMajorGap = 0, baseRejected = 0, baseRejectedButClose = 0
for (const s of cohort) for (const comp of companyCatalog) {
  const { requirements: r } = requirementsFor(comp)
  const passesCutoff = s.cgpa >= r.minCgpa && s.backlogs <= r.maxBacklogs
  const c = evaluate(comp, s)
  const maxGap = c.gaps.reduce((m, g) => Math.max(m, g.need - g.have), 0)
  if (passesCutoff) {
    baseEligible++
    if (maxGap > 15 || c.bucket === 'notEligible' || c.bucket === 'canBecome') baseEligibleWithMajorGap++
  } else {
    baseRejected++
    if (c.bucket === 'canBecome') baseRejectedButClose++
  }
}

// E5: what-if sensitivity: share of students for whom one +10 skill step moves at least one company up a category
let movable = 0
for (const s of cohort.slice(0, 1000)) {
  const base = evaluateAll(s)
  const ok = SKILLS.some((name) => {
    const v = evaluateAll({ ...s, skills: s.skills.map((k) => (k.name === name ? { ...k, level: Math.min(100, k.level + 10) } : k)) })
    const m = new Map(v.map((c) => [c.id, c.bucket]))
    return base.some((c) => rank[m.get(c.id)!] > rank[c.bucket])
  })
  if (ok) movable++
}

const pct = (a: number, b: number) => ((a / b) * 100).toFixed(2)
console.log(JSON.stringify({
  cohort: N, companies: C, decisions: N * C,
  latency_ms: { mean: +mean.toFixed(3), p95: +p95.toFixed(3) },
  bucket_distribution_pct: Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, +pct(v, N * C)])),
  non_eligible_decisions: nonEligible,
  explained_decisions: explained,
  explanation_coverage_pct: +pct(explained, nonEligible),
  monotonicity: { checks, violations, pass_pct: +pct(checks - violations, checks) },
  baseline_cutoff: {
    pairs_passing_cutoff: baseEligible,
    of_which_major_skill_gap_pct: +pct(baseEligibleWithMajorGap, baseEligible),
    pairs_rejected_by_cutoff: baseRejected,
    of_which_can_become_eligible_pct: +pct(baseRejectedButClose, baseRejected),
  },
  whatif_one_step_moves_a_company_pct: +pct(movable, 1000),
}, null, 2))
