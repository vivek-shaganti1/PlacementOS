// Assembles the app's Profile object from the normalized tables. Shared by the browser and /api.
import { SKILLS } from './eligibility'
import type { Integrations, JdMatch, Profile, ResumeAnalysis } from './supabase'

/** The tables (and select lists) that make up a profile, in a fixed order. */
export const RELATED = {
  user_skills: { select: 'skill,level', order: 'skill' },
  projects: { select: 'title,tech,description,url,source', order: 'position' },
  internships: { select: 'org,role,period', order: 'position' },
  certifications: { select: 'name,issuer,issued_on,credential_url', order: 'position' },
  achievements: { select: 'title,detail,date_text', order: 'position' },
  mock_feedback: { select: 'interview_type,score,note,taken_at', order: 'taken_at.desc' },
  coding_profiles: { select: 'platform,username,solved,rating,max_rating,stats,synced_at', order: 'platform' },
  github_repos: { select: 'name,description,language,stars,url,topics,pushed_at', order: 'stars.desc' },
  resume_analyses: { select: '*', order: 'created_at.desc', limit: 1 },
  jd_matches: { select: '*', order: 'created_at.desc', limit: 1 },
} as const

export type RelatedRows = { [K in keyof typeof RELATED]: any[] }

export function assembleProfile(base: Record<string, any>, r: RelatedRows): Profile {
  const levels = new Map(r.user_skills.map((s) => [s.skill as string, Number(s.level)]))
  const extra = r.user_skills.map((s) => s.skill as string).filter((s) => !(SKILLS as readonly string[]).includes(s))

  const integrations: Integrations = {}
  for (const c of r.coding_profiles) {
    const stats = { ...(c.stats ?? {}), username: c.username, synced_at: c.synced_at }
    if (c.platform === 'github')
      integrations.github = {
        ...stats,
        top_repos: r.github_repos.map((g) => ({
          name: g.name,
          description: g.description,
          language: g.language,
          stars: g.stars,
          url: g.url,
          topics: g.topics ?? [],
          updated_at: g.pushed_at,
        })),
      }
    else (integrations as any)[c.platform] = stats
  }

  const ra = r.resume_analyses[0]
  const resume_analysis: ResumeAnalysis | null = ra
    ? {
        overall: ra.overall,
        summary: ra.summary,
        checks: ra.checks ?? [],
        strengths: ra.strengths ?? [],
        improvements: ra.improvements ?? [],
        rewrites: ra.rewrites ?? [],
        extracted: { skills: [], projects: [], internships: [], certifications: [], links: [], ...(ra.extracted ?? {}) },
        skill_levels: ra.skill_levels ?? {},
        stats: { words: 0, bullets: 0, quantified: 0, action_verbs: 0, sections: [], ...(ra.stats ?? {}) },
        analyzed_at: ra.created_at,
        file_name: ra.file_name,
      }
    : null

  const jm = r.jd_matches[0]
  const jd_match: JdMatch | null = jm
    ? {
        score: jm.score,
        verdict: jm.verdict,
        matched_skills: jm.matched_skills ?? [],
        missing_skills: jm.missing_skills ?? [],
        missing_keywords: jm.missing_keywords ?? [],
        suggestions: jm.suggestions ?? [],
        tailored_bullets: jm.tailored_bullets ?? [],
        jd_title: jm.jd_title,
        analyzed_at: jm.created_at,
      }
    : null

  return {
    ...(base as Profile),
    cgpa: Number(base.cgpa),
    class_x: Number(base.class_x),
    class_xii: Number(base.class_xii),
    skills: [...SKILLS, ...extra].map((name) => ({ name, level: levels.get(name) ?? 0 })),
    projects: r.projects.map((p) => ({ title: p.title, tech: p.tech, description: p.description, url: p.url, source: p.source })),
    internships: r.internships.map((i) => ({ org: i.org, role: i.role, period: i.period })),
    certifications: r.certifications.map((c) => ({ name: c.name, issuer: c.issuer, date: c.issued_on, ...(c.credential_url ? { credential_url: c.credential_url } : {}) })),
    achievements: r.achievements.map((a) => ({ title: a.title, detail: a.detail, date: a.date_text })),
    mock_feedback: r.mock_feedback.map((m) => ({ type: m.interview_type, score: Number(m.score), note: m.note, date: m.taken_at })),
    integrations,
    resume_analysis,
    jd_match,
  }
}

/** Profile keys that live in their own tables and are saved through the replace_rows RPC. */
export const COLLECTIONS = ['skills', 'projects', 'internships', 'certifications', 'achievements', 'mock_feedback'] as const
