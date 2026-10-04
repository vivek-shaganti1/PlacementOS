import { createClient } from '@supabase/supabase-js'

// Defaults point at the production project. The publishable key is safe to ship to browsers
// (RLS protects the data); env vars override these for other environments.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://oewjimwozaksyigfyrkz.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_l4oFZfheVfvTBAfU3t9sRg_AwdkNqse'

export const supabaseConfigured = Boolean(url && key)

// Placeholder values keep the module importable when env vars are missing;
// the app renders a configuration screen instead of calling the API in that case.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

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
}

export type GithubStats = {
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
  synced_at: string
}
export type LeetcodeStats = { username: string; solved: number; easy: number; medium: number; hard: number; ranking: number | null; contest_rating: number | null; contests: number; top_percentage: number | null; synced_at: string }
export type CodeforcesStats = { username: string; rating: number | null; max_rating: number | null; rank: string | null; solved: number; contests: number; synced_at: string }
export type CodechefStats = { username: string; rating: number | null; max_rating: number | null; stars: number | null; solved: number; synced_at: string }

export type Integrations = {
  github?: GithubStats
  leetcode?: LeetcodeStats
  codeforces?: CodeforcesStats
  codechef?: CodechefStats
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

export const errMsg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong.'

export type Organization = {
  id: string
  name: string
  short_name: string
  official_code: string | null
  city: string
  email_domains: string[]
  admin_emails: string[]
  created_at: string
}
