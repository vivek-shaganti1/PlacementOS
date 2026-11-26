/**
 * Every BTech branch, grouped into families recruiters evaluate the same way, and the career tracks inside each family.
 * A track lists the skills a recruiter tests and, for each skill, the objective evidence that can prove it:
 * file types found in the student's GitHub repositories, GitHub languages, verified Credly badges, NPTEL certificates
 * (by discipline code), Hugging Face, CTFtime and a placement-cell-confirmed GATE score. Self-rating is never evidence.
 *
 * The data lives as a tree of files in src/data/engineering (Engineering > family > branch, tracks with their job roles,
 * skills); its README draws the tree. This file keeps the lookups the rest of the app uses.
 * Shared by the browser (onboarding, skill gap, what-if) and the server (/api/resume, /api/connect).
 */
import { BRANCHES, DEFAULT_TRACK_FOR, DEFAULT_TRACKS, SKILL_RULES, TRACKS, type Family } from '../data/engineering'

export {
  BRANCHES, DEFAULT_TRACK_FOR, DEFAULT_TRACKS, FAMILIES, FAMILY_LABEL, FILE_SIGNALS, GATE_PAPERS, IGNORED_PATH, ROLES, SKILL_RULES, TRACKS,
  type Branch, type Family, type FamilyNode, type FileSignal, type Role, type SkillRule, type Track, type TrackNode,
} from '../data/engineering'

export const SKILL_BY_NAME = new Map(SKILL_RULES.map((s) => [s.name, s]))
export const skillShort = (name: string) => SKILL_BY_NAME.get(name)?.short ?? name

export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]))

/** Every code a branch name matches (most specific first). Unknown names keep their own text. */
export const branchCodesOf = (s: string) => {
  const codes = BRANCHES.filter((b) => b.re.test(s)).map((b) => b.code)
  return codes.length ? codes : [s.trim().toUpperCase()]
}

/** The branch a free-text name refers to, or null when it is not recognised. */
export const branchOf = (s: string | null | undefined) => {
  const t = String(s ?? '').trim()
  return t ? BRANCHES.find((b) => b.re.test(t)) ?? null : null
}
export const familyOf = (branch: string | null | undefined): Family => branchOf(branch)?.family ?? 'computing'

/** A branch's tracks before the student chooses: its own, else its family's (existing computing students stay on software). */
export const tracksFor = (p: { tracks?: string[] | null; branch?: string | null }) => {
  const own = (p.tracks ?? []).filter((t) => TRACK_BY_ID.has(t))
  if (own.length) return own
  const b = branchOf(p.branch)
  return b ? DEFAULT_TRACK_FOR[b.code] ?? DEFAULT_TRACKS[b.family] : ['software']
}

/** Skills a student is measured on: the union of their tracks' skills, in track order. */
export const skillsForTracks = (tracks: string[]) => [...new Set(tracks.flatMap((t) => TRACK_BY_ID.get(t)?.skills ?? []))]
export const skillsFor = (p: { tracks?: string[] | null; branch?: string | null }) => skillsForTracks(tracksFor(p))

/** Tracks offered to a branch (its family's tracks; software is open to everyone). */
export const tracksForBranch = (branch: string | null | undefined) => {
  const f = familyOf(branch)
  return TRACKS.filter((t) => t.families.includes(f))
}
