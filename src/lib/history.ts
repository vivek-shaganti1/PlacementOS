import { useEffect, useState } from 'react'
import { useProfile } from './auth'
import { supabase } from './supabase'

export type Snapshot = {
  day: string
  readiness: number
  eligible: number
  nearly: number
  can_become: number
  not_eligible: number
  avg_skill: number
  problems_solved: number
  resume_score: number | null
}
export type ResumePoint = { overall: number; created_at: string; file_name: string | null }
export type MatchPoint = { score: number; jd_title: string; created_at: string }

/** Time-series data for charts: daily snapshots and the history of resume analyses and JD matches. */
export function useHistory() {
  const profile = useProfile()
  const [data, setData] = useState<{ snapshots: Snapshot[]; resumes: ResumePoint[]; matches: MatchPoint[]; loading: boolean }>({
    snapshots: [],
    resumes: [],
    matches: [],
    loading: true,
  })

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('progress_snapshots').select('day,readiness,eligible,nearly,can_become,not_eligible,avg_skill,problems_solved,resume_score').order('day', { ascending: false }).limit(90),
      supabase.from('resume_analyses').select('overall,created_at,file_name').order('created_at', { ascending: true }).limit(50),
      supabase.from('jd_matches').select('score,jd_title,created_at').order('created_at', { ascending: true }).limit(50),
    ]).then(([s, r, m]) => {
      if (!alive) return
      setData({
        snapshots: ((s.data ?? []) as Snapshot[]).reverse(),
        resumes: (r.data ?? []) as ResumePoint[],
        matches: (m.data ?? []) as MatchPoint[],
        loading: false,
      })
    })
    return () => {
      alive = false
    }
    // Refetch when the profile changes (e.g. a new resume analysis or JD match).
  }, [profile])

  return data
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
