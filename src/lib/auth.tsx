import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { assembleProfile, COLLECTIONS, RELATED, type RelatedRows } from './profileShape'
import { supabase, type Profile, type ProfilePatch, type Credential } from './supabase'

type AuthCtx = {
  session: Session | null
  loading: boolean
  recovering: boolean
  /** Set when a password-reset link was expired or already used. */
  linkError: string | null
  /** The account was created with a temporary password and must choose its own before using the app. */
  mustChangePassword: boolean
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
  const [linkError, setLinkError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [roles, setRoles] = useState<{ role: string; org_id: string | null }[]>([])

  useEffect(() => {
    // Recovery links in the form /reset-password?token_hash=…&type=recovery are verified through the app's own domain,
    // so the reset works on networks that block *.supabase.co (the default email link points there).
    const q = new URLSearchParams(window.location.search)
    const tokenHash = q.get('token_hash')
    if (tokenHash && q.get('type') === 'recovery') {
      window.history.replaceState(null, '', window.location.pathname)
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).then(({ error }) => {
        if (!error) setRecovering(true)
        else setLinkError('This reset link has expired or was already used. Request a new one below.')
      })
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  // A different account (or none) must never see the previous account's roles, profile or error.
  useEffect(() => {
    setProfile(null)
    setRoles([])
    setProfileError(null)
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }
    const [base, role, creds, ...rel] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role,org_id').eq('user_id', userId),
      // NPTEL certificates and GATE scorecards. Optional: an error (e.g. before the migration) just means none yet.
      supabase.from('credentials').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ...Object.entries(RELATED).map(([table, q]) => {
        const [col, dir] = q.order.split('.')
        // Always this user's own rows: admins and recruiters can read other people's rows too.
        let query = supabase.from(table).select(q.select).eq('user_id', userId).order(col, { ascending: dir !== 'desc' })
        if ('limit' in q) query = query.limit(q.limit)
        return query
      }),
    ])
    // The session may have changed while these requests were in flight; drop a stale answer.
    if ((await supabase.auth.getSession()).data.session?.user.id !== userId) return
    const err = base.error ?? role.error ?? rel.find((x) => x.error)?.error
    // A stored session the server no longer accepts (expired, or signed with rotated keys): sign out cleanly
    // so the visitor lands on the public pages instead of a dead end.
    if (err && /jwt|token|401|PGRST30/i.test(`${err.message} ${(err as { code?: string }).code ?? ''}`)) {
      await supabase.auth.signOut({ scope: 'local' })
      return
    }
    if (err) {
      console.error(err)
      setProfileError('We could not load your account. Check your connection and try again.')
      return
    }
    if (!base.data) {
      setProfileError('Your profile could not be found. Try signing out and in again.')
      return
    }
    setProfileError(null)
    setRoles((role.data ?? []) as { role: string; org_id: string | null }[])
    const rows = Object.fromEntries(Object.keys(RELATED).map((t, i) => [t, rel[i].data ?? []])) as RelatedRows
    setProfile({ ...assembleProfile(base.data, rows), credentials: (creds.data ?? []) as Credential[] })
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
      linkError,
      mustChangePassword: session?.user.user_metadata?.must_change_password === true,
      profile,
      isAdmin,
      isSuperAdmin,
      adminOrgIds,
      role,
      profileError,
      refreshProfile,
      updateProfile,
      signOut: async () => {
        // If the server cannot be reached, still forget the session on this device (shared campus computers).
        const { error } = await supabase.auth.signOut()
        if (error) await supabase.auth.signOut({ scope: 'local' })
        setProfile(null)
        setRoles([])
        setProfileError(null)
      },
      clearRecovery: () => setRecovering(false),
    }),
    [session, loading, recovering, linkError, profile, isAdmin, isSuperAdmin, adminOrgIds, role, profileError, refreshProfile, updateProfile],
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
