// The landing page's live demo: the app's own eligibility engine on a profile the visitor edits. No numbers of its own.
import { skillShort, skillsForTracks } from '../../lib/branches'
import { evaluateAll, type StudentLike } from '../../lib/eligibility'
import type { Bucket, Company } from '../../data/types'

export const DEMO_BRANCHES = [
  { id: 'cse', label: 'Computer Science', branch: 'CSE', tracks: ['software'], start: 64 },
  { id: 'ece', label: 'Electronics', branch: 'ECE', tracks: ['embedded', 'vlsi', 'comms'], start: 61 },
  { id: 'eee', label: 'Electrical', branch: 'EEE', tracks: ['power', 'automation', 'ev'], start: 57 },
  { id: 'mech', label: 'Mechanical', branch: 'MECH', tracks: ['mech_design', 'manufacturing', 'automotive'], start: 52 },
  { id: 'civil', label: 'Civil', branch: 'CIVIL', tracks: ['structural', 'construction'], start: 53 },
] as const
export type DemoBranch = (typeof DEMO_BRANCHES)[number]

export type DemoProfile = { branch: DemoBranch['id']; cgpa: number; backlogs: number; internships: number; levels: Record<string, number> }

// An uneven student: some subjects ahead of the rest, some behind.
const SHAPE = [6, -6, 4, 4, 2, -16, -8, 10]

export function startProfile(id: DemoBranch['id']): DemoProfile {
  const b = DEMO_BRANCHES.find((x) => x.id === id)!
  return { branch: id, cgpa: 7.6, backlogs: 0, internships: 1, levels: Object.fromEntries(skillsForTracks([...b.tracks]).map((s, i) => [s, s === 'Aptitude & Reasoning' ? 68 : b.start + SHAPE[i % SHAPE.length]])) }
}

export const toStudent = (p: DemoProfile): StudentLike => {
  const b = DEMO_BRANCHES.find((x) => x.id === p.branch)!
  return {
    branch: b.branch, tracks: [...b.tracks], cgpa: p.cgpa, backlogs: p.backlogs, class_x: 84, class_xii: 81,
    skills: Object.entries(p.levels).map(([name, level]) => ({ name, level })), projects: [1, 2, 3], internships: Array.from({ length: p.internships }, (_, i) => i),
  }
}

export const runDemo = (p: DemoProfile): Company[] => evaluateAll(toStudent(p))

/** The four skills whose gaps cost this starting profile the most, across every company it is checked against. */
export function demoSkills(id: DemoBranch['id']): string[] {
  const start = startProfile(id)
  const cost: Record<string, number> = {}
  for (const c of runDemo(start)) for (const g of c.gaps) cost[g.skill] = (cost[g.skill] ?? 0) + g.need - g.have
  const all = Object.keys(start.levels)
  return all.sort((a, b) => (cost[b] ?? 0) - (cost[a] ?? 0)).slice(0, 4).sort((a, b) => all.indexOf(a) - all.indexOf(b))
}

const RANK: Record<Bucket, number> = { notEligible: 0, canBecome: 1, nearly: 2, eligible: 3 }
export type Fix = { label: string; from: string; to: string; moves: number; next: DemoProfile }

/** Tries each single change the engine can measure and returns the one that moves the most companies up a group. */
export function bestFix(p: DemoProfile, now: Company[]): Fix | null {
  const before = new Map(now.map((c) => [c.id, RANK[c.bucket]]))
  const tries: Omit<Fix, 'moves'>[] = []
  for (const [skill, v] of Object.entries(p.levels)) {
    const to = Math.min(100, v + 10)
    if (to > v) tries.push({ label: skillShort(skill), from: String(v), to: String(to), next: { ...p, levels: { ...p.levels, [skill]: to } } })
  }
  if (p.backlogs > 0) tries.push({ label: 'Backlogs', from: String(p.backlogs), to: String(p.backlogs - 1), next: { ...p, backlogs: p.backlogs - 1 } })
  if (p.internships === 0) tries.push({ label: 'Internships', from: '0', to: '1', next: { ...p, internships: 1 } })
  if (p.cgpa < 10) {
    const to = Math.min(10, Math.round((p.cgpa + 0.3) * 10) / 10)
    tries.push({ label: 'CGPA', from: p.cgpa.toFixed(1), to: to.toFixed(1), next: { ...p, cgpa: to } })
  }
  let best: Fix | null = null
  for (const t of tries) {
    const moves = runDemo(t.next).filter((c) => RANK[c.bucket] > (before.get(c.id) ?? 0)).length
    if (moves > 0 && (!best || moves > best.moves)) best = { ...t, moves }
  }
  return best
}
