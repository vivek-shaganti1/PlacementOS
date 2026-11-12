import type { Company } from '../data/types'
import { familyOf, skillsFor, tracksFor, TRACK_BY_ID, type Family } from './branches'
import type { StudentLike } from './eligibility'

// Preparation content that follows the student's branch and track: the roadmap, the practice topics and the kinds of
// mock interview. Software students keep the plan they had; every other track gets one built from its own skills.

type Who = Pick<StudentLike, 'branch' | 'tracks'>
/** Software-style preparation (DSA, system design) applies when one of the student's tracks is a software one. */
export const isSoftwareTrack = (p: Who) => tracksFor(p).some((t) => t === 'software' || t === 'ai_data')

export type Phase = { title: string; weeks: string; items: string[] }

const SOFTWARE_PHASES: Phase[] = [
  { title: 'Phase 1 · Advanced DSA', weeks: 'Weeks 1-4', items: ['Graphs: BFS, DFS, Dijkstra, union-find', 'Dynamic programming patterns', 'Tries and segment trees', '150 curated problems'] },
  { title: 'Phase 2 · System Design', weeks: 'Weeks 5-7', items: ['Scaling fundamentals & CAP', 'Caching, queues, sharding', 'Design: URL shortener, feed, chat', 'Write 3 design docs'] },
  { title: 'Phase 3 · Projects & Impact', weeks: 'Weeks 8-10', items: ['Ship one distributed-systems project', 'Add metrics and load tests', 'Quantify impact on the resume'] },
  { title: 'Phase 4 · Interview Loop', weeks: 'Weeks 11-12', items: ['2 mock interviews per week', 'Behavioural story bank', 'Company-specific question sets'] },
]

/**
 * A 12-week plan. For software tracks it is the fixed DSA and system-design plan. For every other track the first two
 * phases are the two skills of the student's own track that hold back the most companies (largest total shortfall
 * across the companies they are scored against; the track's first two skills when nothing is short), followed by a
 * project phase and an interview phase. Every line is a function of the student's track and gaps.
 */
export function roadmapFor(p: Who & Pick<StudentLike, 'skills'>, companies: Company[]): Phase[] {
  if (isSoftwareTrack(p)) return SOFTWARE_PHASES
  const own = skillsFor(p).filter((s) => s !== 'Aptitude & Reasoning')
  const shortfall = new Map<string, { total: number; need: number }>()
  for (const c of companies)
    for (const g of c.gaps) {
      if (!own.includes(g.skill)) continue
      const e = shortfall.get(g.skill) ?? { total: 0, need: 0 }
      shortfall.set(g.skill, { total: e.total + (g.need - g.have), need: Math.max(e.need, g.need) })
    }
  const ranked = [...shortfall.entries()].sort((a, b) => b[1].total - a[1].total).map(([s]) => s)
  const [first, second] = [...ranked, ...own.filter((s) => !ranked.includes(s))]
  const level = (s: string) => p.skills.find((x) => x.name === s)?.level ?? 0
  const study = (s: string) => {
    const target = shortfall.get(s)?.need
    return [
      `${s}: revise the core theory from your course notes`,
      `${s}: solve previous campus written-test questions`,
      `${s}: explain three concepts aloud, as in a technical interview`,
      target ? `${s}: raise your level from ${level(s)}% to ${target}%` : `${s}: keep your level at ${level(s)}% or above`,
    ]
  }
  const track = TRACK_BY_ID.get(tracksFor(p)[0])?.label ?? 'your track'
  return [
    ...(first ? [{ title: `Phase 1 · ${first}`, weeks: 'Weeks 1-4', items: study(first) }] : []),
    ...(second ? [{ title: `Phase 2 · ${second}`, weeks: 'Weeks 5-7', items: study(second) }] : []),
    { title: 'Phase 3 · Projects & Evidence', weeks: 'Weeks 8-10', items: [`Finish one project in ${track.toLowerCase()} and write a two-page report`, 'Add drawings, simulations or measured results to the project', 'Quantify the outcome of each project on the resume', 'Upload certificates (NPTEL, GATE) that prove your core subjects'] },
    { title: 'Phase 4 · Tests & Interviews', weeks: 'Weeks 11-12', items: ['Three timed aptitude sets every week', 'Two mock technical interviews per week', 'Behavioural story bank', 'Company-specific question sets'] },
  ]
}

/** Mock interview formats: software loops have DSA and system-design rounds; core recruiters run a written test and a core technical round. */
export const mockTypesFor = (p: Who) =>
  isSoftwareTrack(p)
    ? ['DSA Round', 'System Design', 'HR & Behavioural', 'Full Loop Simulation', 'Company OA']
    : ['Core Technical Round', 'Aptitude & Written Test', 'HR & Behavioural', 'Full Loop Simulation', 'Company Test']

/** Practice topics by branch family (see Practice.tsx for the questions). Aptitude is for everyone. */
export const CORE_TOPIC: Record<Exclude<Family, 'computing'>, string[]> = {
  electronics: ['Digital & Analog Electronics'],
  electrical: ['Machines & Power Systems'],
  mechanical: ['Thermodynamics, Mechanics & Design'],
  mechatronics: ['Thermodynamics, Mechanics & Design', 'Digital & Analog Electronics'],
  civil: ['Structures & Construction'],
  chemical: ['Process Engineering'],
  lifesci: ['Biotechnology'],
  materials: ['Materials & Metallurgy'],
}
const PROGRAMMING = ['Arrays & Strings', 'Linked Lists', 'Trees & Graphs', 'Dynamic Programming', 'SQL Queries']
export function practiceTopicsFor(p: Who): string[] {
  const family = familyOf(p.branch)
  const core = family === 'computing' ? [] : CORE_TOPIC[family]
  return [...core, ...(isSoftwareTrack(p) ? PROGRAMMING : []), 'Aptitude & Logical']
}
