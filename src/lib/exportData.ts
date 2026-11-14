import { supabase } from './supabase'

// "Download my data": everything the database holds about the signed-in person, read with their own session (so row
// level security decides what comes back) and filtered to their own id (admins can see other people's rows; those are
// not theirs). Uploaded files are listed by name; the resume itself can be downloaded from the Resume page.

/** Tables keyed by the account, with a plain-language name for the file. */
export const MY_TABLES: [table: string, label: string][] = [
  ['user_roles', 'roles'],
  ['user_skills', 'skills'],
  ['projects', 'projects'],
  ['internships', 'internships'],
  ['certifications', 'certifications'],
  ['achievements', 'achievements'],
  ['credentials', 'verified_credentials'],
  ['coding_profiles', 'connected_accounts'],
  ['github_repos', 'github_repositories'],
  ['resume_analyses', 'resume_analyses'],
  ['jd_matches', 'job_description_matches'],
  ['job_applications', 'drive_applications'],
  ['applications', 'tracked_applications'],
  ['saved_companies', 'saved_companies'],
  ['practice_attempts', 'practice_attempts'],
  ['mock_feedback', 'mock_interview_feedback'],
  ['mock_bookings', 'mock_interview_bookings'],
  ['roadmap_progress', 'roadmap_progress'],
  ['cert_enrollments', 'certification_enrollments'],
  ['progress_snapshots', 'daily_progress'],
  ['recommendation_feedback', 'recommendation_feedback'],
  ['chat_messages', 'assistant_conversations'],
  ['notifications', 'notifications'],
  ['ai_usage', 'ai_usage'],
]

// Deprecated copies of data that now lives in its own tables, and nothing a person would recognise as theirs.
const SKIP_PROFILE = new Set(['skills', 'projects', 'internships', 'certifications', 'achievements', 'mock_feedback', 'integrations', 'resume_analysis', 'jd_match'])

export type MyData = {
  exported_at: string
  account: { id: string; email: string | undefined; created_at: string | undefined }
  note: string
  profile: Record<string, unknown> | null
  files: { bucket: string; name: string; size: number | null; uploaded_at: string | null }[]
  not_included: string[]
} & Record<string, unknown>

export async function collectMyData(): Promise<MyData> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) throw new Error('Sign in again to download your data.')
  const out: MyData = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    note: 'Everything PlacementIQ stores about this account. The college roster entry and the audit log are kept by your college; ask your placement cell for those.',
    profile: null,
    files: [],
    not_included: [],
  }

  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) out.not_included.push('profile')
  else if (profile) out.profile = Object.fromEntries(Object.entries(profile).filter(([k]) => !SKIP_PROFILE.has(k)))

  await Promise.all(
    MY_TABLES.map(async ([table, label]) => {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id).limit(5000)
      if (error) out.not_included.push(label)
      else out[label] = data ?? []
    }),
  )

  for (const bucket of ['resumes', 'avatars']) {
    const { data } = await supabase.storage.from(bucket).list(user.id, { limit: 200 })
    for (const f of data ?? []) out.files.push({ bucket, name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? null, uploaded_at: f.created_at ?? null })
  }
  return out
}
