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
  projects: string[]
  internships: Internship[]
  notification_prefs: Record<string, boolean>
  visibility: 'college' | 'recruiters' | 'private'
  resume_path: string | null
  resume_name: string | null
  resume_uploaded_at: string | null
}

export type ProfilePatch = Partial<Omit<Profile, 'id'>>

export const errMsg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong.'
