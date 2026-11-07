import { useCallback, useEffect, useState } from 'react'
import { completeness } from '../components/ProfileExtras'
import { useAuth } from './auth'
import { evaluateAll } from './eligibility'
import { coreSkills, trackReadiness } from './predict'
import { assembleProfile, RELATED, type RelatedRows } from './profileShape'
import { allRows, supabase, type Credential, type Organization, type Profile, errMsg } from './supabase'
import { trustedProfile } from './trust'

export type StudentRow = {
  profile: Profile
  /** The profile as rankings see it: proven evidence only (lib/trust). */
  trusted: Profile
  isAdmin: boolean
  readiness: number
  eligible: number
  resume: number | null
  /** Level of the lead skill of the student's strongest track (Data Structures & Algorithms for software). */
  dsa: number
  solved: number
  strength: number
  score: number
  rank: number
}

/**
 * Composite placement score used for rankings (0-100): 50% readiness against the student's own tracks, 30% the lead skill of
 * their strongest track, 20% CGPA. Only proven evidence and academics count. The resume score and profile strength are
 * shown beside it but stay out, because a student writes both.
 */
export const scoreOf = (r: Omit<StudentRow, 'score' | 'rank'>) =>
  Math.round(0.5 * r.readiness + 0.3 * r.dsa + 0.2 * Math.min(100, r.profile.cgpa * 10))

/**
 * What the student list reads. Not `*`: a profile row also holds the full resume text and old JSON copies of data that now
 * lives in its own tables, and job-description matches hold the whole JD. For 1,000 students that is several megabytes
 * the list never shows.
 */
const PROFILE_COLUMNS =
  'id,full_name,email,phone,meta,branch,batch,college,cgpa,backlogs,class_x,class_xii,avatar_url,visibility,resume_path,resume_name,resume_uploaded_at,created_at,' +
  'github_username,leetcode_username,codeforces_username,codechef_username,hackerrank_username,linkedin_url,portfolio_url,target_roles,onboarded_at,org_id,roll_number,section,program,academics_source,tracks,notification_prefs'
const LIST_SELECT: Record<string, string> = {
  jd_matches: 'id,user_id,jd_title,score,verdict,matched_skills,missing_skills,created_at,job_id',
  resume_analyses: 'id,user_id,file_name,overall,summary,checks,stats,strengths,improvements,extracted,skill_levels,created_at',
}

/** Loads every student with all related tables (admin RLS) and ranks them. */
export function useStudents() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const tables = Object.entries(RELATED)
    const [profiles, roles, credentials, ...related] = await Promise.all([
      allRows<Record<string, any>>((a, b) => supabase.from('profiles').select(PROFILE_COLUMNS).order('full_name').order('id').range(a, b)),
      allRows<{ user_id: string; role: string }>((a, b) => supabase.from('user_roles').select('user_id,role').range(a, b)),
      allRows<Credential & { user_id: string }>((a, b) => supabase.from('credentials').select('*').eq('status', 'verified').order('id').range(a, b)),
      ...tables.map(([t, q]) => {
        const [col, dir] = q.order.split('.')
        return allRows<Record<string, any>>((a, b) => supabase.from(t).select(LIST_SELECT[t] ?? (q.select === '*' ? '*' : `user_id,${q.select}`)).order(col, { ascending: dir !== 'desc' }).order('user_id').range(a, b))
      }),
    ])
    const err = profiles.error ?? roles.error ?? related.find((r) => r.error)?.error
    if (err) {
      setError(errMsg(err))
      setLoading(false)
      return
    }
    const admins = new Set((roles.data ?? []).map((r) => r.user_id))
    const byUser = (i: number, uid: string) => ((related[i].data ?? []) as unknown as Record<string, any>[]).filter((r) => r.user_id === uid)
    // Only students who belong to a college are ranked; admin accounts are never students.
    const built = (profiles.data ?? []).filter((base) => base.org_id && !admins.has(base.id)).map((base) => {
      const rel = Object.fromEntries(tables.map(([t], i) => [t, byUser(i, base.id)])) as RelatedRows
      const profile = assembleProfile(base, rel)
      const trusted = trustedProfile(profile, (credentials.data ?? []).filter((c) => c.user_id === base.id))
      const companies = evaluateAll(trusted)
      const i = trusted.integrations ?? {}
      const row = {
        profile,
        trusted,
        isAdmin: admins.has(base.id),
        readiness: trackReadiness(trusted),
        eligible: companies.filter((c) => c.bucket === 'eligible').length,
        resume: profile.resume_analysis?.overall ?? null,
        dsa: coreSkills(trusted).lead.level,
        solved: (i.leetcode?.solved ?? 0) + (i.codeforces?.solved ?? 0) + (i.codechef?.solved ?? 0),
        strength: completeness(profile).pct,
      }
      return { ...row, score: scoreOf(row), rank: 0 }
    })
    built.sort((a, b) => b.score - a.score).forEach((r, idx) => (r.rank = idx + 1))
    setRows(built)
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { rows, loading, error, reload }
}

/** Organizations the caller can see: all for the super admin, their own for org admins and students. */
export function useOrgs() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    const { data } = await supabase.from('organizations').select('*').order('name')
    setOrgs((data ?? []) as Organization[])
    setLoading(false)
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { orgs, loading, reload }
}

/** Organizations the caller may administer: every organization for the super admin, otherwise their own. */
export function useAdminOrgs() {
  const { isSuperAdmin, adminOrgIds } = useAuth()
  const { orgs, loading, reload } = useOrgs()
  return { orgs: isSuperAdmin ? orgs : orgs.filter((o) => adminOrgIds.includes(o.id)), loading, reload }
}

/** The signed-in recruiter's record: which college they recruit at and for which company. */
export function useRecruiter() {
  const { role, session } = useAuth()
  const [rec, setRec] = useState<{ org_id: string; company: string; full_name: string } | null>(null)
  useEffect(() => {
    if (role !== 'recruiter' || !session) return
    supabase
      .from('org_recruiters')
      .select('org_id, company, full_name')
      .eq('user_id', session.user.id)
      .limit(1)
      .then(({ data }) => setRec((data?.[0] as typeof rec) ?? null))
  }, [role, session])
  return rec
}
