import { useCallback, useEffect, useState } from 'react'
import { completeness } from '../components/ProfileExtras'
import { useAuth } from './auth'
import { evaluateAll, readinessOf } from './eligibility'
import { assembleProfile, RELATED, type RelatedRows } from './profileShape'
import { supabase, type Organization, type Profile } from './supabase'

export type StudentRow = {
  profile: Profile
  isAdmin: boolean
  readiness: number
  eligible: number
  resume: number | null
  dsa: number
  solved: number
  strength: number
  score: number
  rank: number
}

/** Composite placement score used for rankings (0-100). */
export const scoreOf = (r: Omit<StudentRow, 'score' | 'rank'>) =>
  Math.round(0.35 * r.readiness + 0.2 * (r.resume ?? 0) + 0.2 * r.dsa + 0.15 * r.strength + 0.1 * Math.min(100, r.profile.cgpa * 10))

/** Loads every student with all related tables (admin RLS) and ranks them. */
export function useStudents() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const tables = Object.entries(RELATED)
    const [profiles, roles, ...related] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('user_roles').select('user_id,role'),
      ...tables.map(([t, q]) => {
        const [col, dir] = q.order.split('.')
        return supabase.from(t).select(q.select === '*' ? '*' : `user_id,${q.select}`).order(col, { ascending: dir !== 'desc' }).limit(5000)
      }),
    ])
    const err = profiles.error ?? roles.error ?? related.find((r) => r.error)?.error
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    const admins = new Set((roles.data ?? []).map((r) => r.user_id))
    const byUser = (i: number, uid: string) => ((related[i].data ?? []) as unknown as Record<string, any>[]).filter((r) => r.user_id === uid)
    // Only students who belong to a college are ranked; admin accounts are never students.
    const built = (profiles.data ?? []).filter((base) => base.org_id && !admins.has(base.id)).map((base) => {
      const rel = Object.fromEntries(tables.map(([t], i) => [t, byUser(i, base.id)])) as RelatedRows
      const profile = assembleProfile(base, rel)
      const companies = evaluateAll(profile)
      const i = profile.integrations ?? {}
      const row = {
        profile,
        isAdmin: admins.has(base.id),
        readiness: readinessOf(companies),
        eligible: companies.filter((c) => c.bucket === 'eligible').length,
        resume: profile.resume_analysis?.overall ?? null,
        dsa: profile.skills.find((s) => s.name === 'Data Structures & Algorithms')?.level ?? 0,
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
