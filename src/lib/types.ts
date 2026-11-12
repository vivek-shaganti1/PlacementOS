// Shapes of the data PlacementIQ stores. Types only: this file is shared by the web app, the /api functions and the
// mobile app, so it must never import a client, the DOM or build-tool globals.
import type { FileSignal } from './branches'

export type Skill = { name: string; level: number }
export type Internship = { org: string; role: string; period: string }
export type Project = { title: string; tech: string; description: string; url: string | null; source: 'manual' | 'resume' | 'github' }

export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string
  meta: string
  branch: string
  batch: string
  college: string
  cgpa: number
  backlogs: number
  class_x: number
  class_xii: number
  /** Where the academics came from: never entered, self-reported at onboarding (then locked), or the college roster. */
  academics_source?: 'default' | 'student' | 'college'
  /** Career tracks the student prepares for (lib/branches). Empty means the branch default. */
  tracks?: string[]
  /** NPTEL certificates and GATE scorecards (lib/branches evidence). */
  credentials?: Credential[]
  avatar_url: string | null
  skills: Skill[]
  projects: Project[]
  internships: Internship[]
  notification_prefs: Record<string, boolean>
  visibility: 'college' | 'recruiters' | 'private'
  resume_path: string | null
  resume_name: string | null
  resume_uploaded_at: string | null
  github_username: string | null
  leetcode_username: string | null
  codeforces_username: string | null
  codechef_username: string | null
  hackerrank_username: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  integrations: Integrations
  certifications: Certification[]
  achievements: Achievement[]
  mock_feedback: MockFeedback[]
  target_roles: string
  resume_text: string | null
  resume_analysis: ResumeAnalysis | null
  jd_match: JdMatch | null
  onboarded_at: string | null
  org_id: string | null
  roll_number: string | null
  section: string
  program: string
}

/** Whether the student proved this account is theirs (written by /api/connect). Unproven stats never reach a ranking. */
export type Ownership = { proven: boolean; at?: string }

export type GithubStats = {
  ownership?: Ownership
  unread_repos?: number
  username: string
  name: string | null
  avatar_url: string
  public_repos: number
  original_repos: number
  followers: number
  stars: number
  languages: { name: string; repos: number }[]
  topics: string[]
  top_repos: { name: string; description: string | null; language: string | null; stars: number; url: string; topics: string[]; updated_at: string }[]
  /** Design and project files found in the repositories' file trees (Verilog, KiCad, CAD, Simulink, ...). */
  signals?: Partial<Record<FileSignal, { repos: string[]; files: number }>>
  /** Components read from KiCad schematics: the parts actually placed in the student's circuits. */
  kicad?: { repo: string; file: string; parts: number; components: string[] }[]
  synced_at: string
}
export type CredlyStats = { ownership?: Ownership; username: string; badges: { name: string; issuer: string; issued_at: string | null; url: string }[]; synced_at: string }
export type HuggingfaceStats = { ownership?: Ownership; username: string; models: number; datasets: number; spaces: number; downloads: number; likes: number; top: { id: string; kind: string; downloads: number }[]; synced_at: string }
export type CtftimeStats = { ownership?: Ownership; username: string; team: string; rating_points: number; events: number; country_place: number | null; year: number; synced_at: string }
export type Credential = {
  id: string
  kind: 'nptel' | 'gate'
  ref: string
  title: string
  skill: string
  score: number | null
  data: Record<string, unknown>
  status: 'verified' | 'pending' | 'rejected'
  verified_by: 'platform' | 'college' | null
  file_path: string | null
  created_at: string
}
export type LeetcodeStats = { ownership?: Ownership; username: string; solved: number; easy: number; medium: number; hard: number; ranking: number | null; contest_rating: number | null; contests: number; top_percentage: number | null; synced_at: string }
export type CodeforcesStats = { ownership?: Ownership; username: string; rating: number | null; max_rating: number | null; rank: string | null; solved: number; contests: number; synced_at: string }
export type CodechefStats = { ownership?: Ownership; username: string; rating: number | null; max_rating: number | null; stars: number | null; solved: number; synced_at: string }

export type Integrations = {
  github?: GithubStats
  leetcode?: LeetcodeStats
  codeforces?: CodeforcesStats
  codechef?: CodechefStats
  credly?: CredlyStats
  huggingface?: HuggingfaceStats
  ctftime?: CtftimeStats
}

export type Certification = { name: string; issuer: string; date: string; credential_url?: string }
export type Achievement = { title: string; detail: string; date: string }
export type MockFeedback = { type: string; date: string; score: number; note: string }

export type ResumeCheck = { label: string; score: number; tip: string }
export type ResumeAnalysis = {
  overall: number
  summary: string
  checks: ResumeCheck[]
  strengths: string[]
  improvements: string[]
  rewrites: { before: string; after: string }[]
  extracted: {
    skills: string[]
    projects: { name: string; tech: string; description: string }[]
    internships: Internship[]
    certifications: string[]
    links: string[]
  }
  skill_levels: Record<string, number>
  stats: { words: number; bullets: number; quantified: number; action_verbs: number; sections: string[] }
  analyzed_at: string
  file_name: string | null
}
export type JdMatch = {
  score: number
  verdict: string
  matched_skills: string[]
  missing_skills: string[]
  missing_keywords: string[]
  suggestions: string[]
  tailored_bullets: string[]
  jd_title: string
  analyzed_at: string
}

export type ProfilePatch = Partial<Omit<Profile, 'id'>>

export type Organization = {
  id: string
  name: string
  short_name: string
  official_code: string | null
  city: string
  email_domains: string[]
  admin_emails: string[]
  plan: 'trial' | 'basic' | 'pro' | 'enterprise'
  seat_limit: number | null
  price_per_seat: number
  platform_fee: number
  ai_monthly_limit: number | null
  billing_cycle: 'monthly' | 'yearly'
  renews_on: string | null
  notes: string
  created_at: string
}
