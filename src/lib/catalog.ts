import { useEffect, useState } from 'react'
import type { CatalogOverride } from '../data/types'
import { setCatalogOverrides } from './eligibility'
import { supabase } from './supabase'

const COLUMNS = 'id,name,about,careers_url,ctc_min,ctc_max,ats,ats_board,source_url,last_checked,updated_at'
let loading: Promise<void> | null = null

/**
 * Loads the verified company details (public.company_catalog) into the scoring code, once per session. The profile
 * load waits for it, so the first scores a student sees already use them. A failure (offline, or the table not created
 * yet) leaves the built-in typical figures in place; it is not an error for the user.
 */
export function loadCatalog(force = false): Promise<void> {
  if (!loading || force) {
    loading = Promise.resolve(supabase.from('company_catalog').select(COLUMNS)).then(({ data, error }) => {
      if (error) console.warn('company catalogue not loaded:', error.message)
      else setCatalogOverrides((data ?? []) as CatalogOverride[])
    })
  }
  return loading
}

export type DriveStat = {
  company: string
  drives: number
  /** null when fewer than three students applied, so no one's outcome can be worked out. */
  applicants: number | null
  shortlisted: number | null
  offers: number | null
  ctc_min: number | null
  ctc_max: number | null
  last_drive: string | null
}

let stats: Promise<Map<string, DriveStat>> | null = null
const key = (name: string) => name.trim().toLowerCase()

/** What really happened in this college's drives for one company (by name), or null if it has held none. */
export function useDriveStat(company: string): DriveStat | null | undefined {
  const [value, setValue] = useState<DriveStat | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    stats ??= Promise.resolve(supabase.rpc('company_drive_stats')).then(({ data, error }) => {
      if (error) stats = null
      return new Map(((data ?? []) as DriveStat[]).map((s) => [key(s.company), s]))
    })
    stats.then((m) => live && setValue(m.get(key(company)) ?? null))
    return () => {
      live = false
    }
  }, [company])
  return value
}

/** Forget cached drive statistics (after the placement cell posts or closes a drive). */
export const resetDriveStats = () => {
  stats = null
}
