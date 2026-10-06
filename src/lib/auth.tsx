import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { assembleProfile, COLLECTIONS, RELATED, type RelatedRows } from './profileShape'
import { supabase, type Profile, type ProfilePatch } from './supabase'

type AuthCtx = {
  session: Session | null
  loading: boolean
  recovering: boolean
  profile: Profile | null
  isAdmin: boolean
  isSuperAdmin: boolean
  adminOrgIds: string[]
  /** Which kind of account this is: platform owner, a college's placement cell, or a student. */
  role: AccountRole
  profileError: string | null
  refreshProfile: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  signOut: () => Promise<void>
  clearRecovery: () => void
}

export type AccountRole = 'super' | 'org' | 'recruiter' | 'student'

/** Landing page for each kind of account. */
export const HOME: Record<AccountRole, string> = { super: '/super/orgs', org: '/admin', recruiter: '/recruiter', student: '/dashboard' }

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [roles, setRoles] = useState<{ role: string; org_id: string | null }[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    const [base, role, ...rel] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role,org_id').eq('user_id', userId),
      ...Object.entries(RELATED).map(([table, q]) => {
        const [col, dir] = q.order.split('.')
        let query = supabase.from(table).select(q.select).order(col, { ascending: dir !== 'desc' })
        if ('limit' in q) query = query.limit(q.limit)
        return query
      }),
    ])
    const err = base.error ?? rel.find((x) => x.error)?.error
    if (err) {
      setProfileError(err.message)
      return
    }
    if (!base.data) {
      setProfileError('Your profile could not be found. Try signing out and in again.')
      return
    }
    setProfileError(null)
    setRoles((role.data ?? []) as { role: string; org_id: string | null }[])
    const rows = Object.fromEntries(Object.keys(RELATED).map((t, i) => [t, rel[i].data ?? []])) as RelatedRows
    setProfile(assembleProfile(base.data, rows))
  }, [userId])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) throw new Error('Not signed in')
      const scalar: Record<string, unknown> = {}
      const jobs: PromiseLike<{ error: { message: string } | null }>[] = []
      for (const [key, value] of Object.entries(patch)) {
        if ((COLLECTIONS as readonly string[]).includes(key)) jobs.push(supabase.rpc('replace_rows', { target: key, items: value ?? [] }))
        else if (key === 'resume_analysis' && value === null) jobs.push(supabase.from('resume_analyses').delete().eq('user_id', userId))
        else if (key === 'jd_match' && value === null) jobs.push(supabase.from('jd_matches').delete().eq('user_id', userId))
        else if (key !== 'integrations' && key !== 'resume_analysis' && key !== 'jd_match') scalar[key] = value
      }
      if (Object.keys(scalar).length) jobs.push(supabase.from('profiles').update(scalar).eq('id', userId))
      const results = await Promise.all(jobs)
      const failed = results.find((r) => r.error)
      if (failed?.error) throw new Error(failed.error.message)
      await refreshProfile()
    },
    [userId, refreshProfile],
  )

  const isSuperAdmin = roles.some((r) => r.role === 'super_admin')
  const adminOrgIds = useMemo(() => roles.filter((r) => r.role === 'org_admin' && r.org_id).map((r) => r.org_id as string), [roles])
  const isAdmin = isSuperAdmin || adminOrgIds.length > 0
  const isRecruiter = roles.some((r) => r.role === 'recruiter')
  const role: AccountRole = isSuperAdmin ? 'super' : adminOrgIds.length ? 'org' : isRecruiter ? 'recruiter' : 'student'

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      recovering,
      profile,
      isAdmin,
      isSuperAdmin,
      adminOrgIds,
      role,
      profileError,
      refreshProfile,
      updateProfile,
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
      },
      clearRecovery: () => setRecovering(false),
    }),
    [session, loading, recovering, profile, isAdmin, isSuperAdmin, adminOrgIds, role, profileError, refreshProfile, updateProfile],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** The signed-in student's profile. Only call below the auth gate, where a profile is guaranteed. */
export function useProfile() {
  const { profile } = useAuth()
  if (!profile) throw new Error('useProfile called before the profile loaded')
  return profile
}
