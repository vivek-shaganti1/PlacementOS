// What placement cells and recruiters rank on. A student can type anything into their own profile, and that stays useful for
// their own planning, but only evidence the server fetched from accounts they proved are theirs, confirmed credentials and
// college academics reach a ranking (docs/EVIDENCE.md).
import { skillsFor } from './branches'
import type { Credential, Integrations, Profile } from './supabase'
import { allEvidence } from './verify'

/** The connected accounts whose owner proved them. Stats from any other account are the student's claim, not evidence. */
export function provenIntegrations(i: Integrations | null | undefined): Integrations {
  return Object.fromEntries(Object.entries(i ?? {}).filter(([, v]) => (v as { ownership?: { proven?: boolean } } | undefined)?.ownership?.proven === true)) as Integrations
}

/** Skill levels from proven evidence only. The resume is left out: it is text the student supplies. */
export function evidenceSkills(p: Pick<Profile, 'integrations' | 'branch' | 'tracks'>, credentials: Credential[]) {
  const names = skillsFor(p)
  const levels = allEvidence(provenIntegrations(p.integrations), null, { skills: names, credentials: credentials.filter((c) => c.status === 'verified') })
  return names.map((name) => ({ name, level: levels[name]?.level ?? 0 }))
}

/** The profile as rankings see it: self-entered skills, projects and internships do not count. */
export function trustedProfile<T extends Profile>(p: T, credentials: Credential[] = p.credentials ?? []): T {
  return {
    ...p,
    integrations: provenIntegrations(p.integrations),
    skills: evidenceSkills(p, credentials),
    projects: p.projects.filter((x) => x.source === 'github'),
    internships: [],
  }
}
