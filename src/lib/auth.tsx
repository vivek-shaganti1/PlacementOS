import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, type Profile, type ProfilePatch } from './supabase'

type AuthCtx = {
  session: Session | null
  loading: boolean
  recovering: boolean
  profile: Profile | null
  profileError: string | null
  refreshProfile: () => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<void>
  signOut: () => Promise<void>
  clearRecovery: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

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
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      setProfileError(error.message)
      return
    }
    if (!data) {
      setProfileError('Your profile could not be found. Try signing out and in again.')
      return
    }
    setProfileError(null)
    setProfile({ ...data, cgpa: Number(data.cgpa), class_x: Number(data.class_x), class_xii: Number(data.class_xii) } as Profile)
  }, [userId])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      if (!userId) throw new Error('Not signed in')
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single()
      if (error) throw error
      setProfile({ ...data, cgpa: Number(data.cgpa), class_x: Number(data.class_x), class_xii: Number(data.class_xii) } as Profile)
    },
    [userId],
  )

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      loading,
      recovering,
      profile,
      profileError,
      refreshProfile,
      updateProfile,
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
      },
      clearRecovery: () => setRecovering(false),
    }),
    [session, loading, recovering, profile, profileError, refreshProfile, updateProfile],
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
