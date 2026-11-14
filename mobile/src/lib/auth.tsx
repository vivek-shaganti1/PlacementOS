import type { Session } from '@supabase/supabase-js'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { assembleProfile, RELATED, trustedProfile, type Credential, type Profile, type RelatedRows } from './shared'
import { supabase } from './supabase'

type Role = 'student' | 'recruiter' | 'org' | 'super'
type Ctx = {
  session: Session | null
  loading: boolean
  /** The profile with only proven evidence counted, exactly as the website ranks it. */
  profile: Profile | null
  role: Role
  /** Accounts on a temporary password choose their own on the website first. */
  mustChangePassword: boolean
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}
const AuthContext = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Role>('student')
  const [error, setError] = useState<string | null>(null)
  const userId = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) return setProfile(null)
    setError(null)
    // The same queries as the website (src/lib/auth.tsx): always this account's own rows.
    const [base, roles, creds, ...rel] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
      supabase.from('credentials').select('*').eq('user_id', userId),
      ...Object.entries(RELATED).map(([table, q]) => {
        const [col, dir] = q.order.split('.')
        let query = supabase.from(table).select(q.select).eq('user_id', userId).order(col, { ascending: dir !== 'desc' })
        if ('limit' in q) query = query.limit(q.limit)
        return query
      }),
    ])
    const failed = base.error ?? roles.error ?? rel.find((r) => r.error)?.error
    if (failed || !base.data) return setError('We could not load your account. Check your connection and try again.')
    const names = (roles.data ?? []).map((r) => r.role as string)
    setRole(names.includes('super_admin') ? 'super' : names.includes('org_admin') ? 'org' : names.includes('recruiter') ? 'recruiter' : 'student')
    const related = Object.fromEntries(Object.keys(RELATED).map((t, i) => [t, rel[i].data ?? []])) as RelatedRows
    const credentials = (creds.data ?? []) as Credential[]
    setProfile(trustedProfile({ ...assembleProfile(base.data, related), credentials }, credentials))
  }, [userId])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<Ctx>(
    () => ({
      session,
      loading,
      profile,
      role,
      mustChangePassword: session?.user.app_metadata?.must_change_password === true,
      error,
      refresh,
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        if (error) await supabase.auth.signOut({ scope: 'local' })
        setProfile(null)
      },
    }),
    [session, loading, profile, role, error, refresh],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
