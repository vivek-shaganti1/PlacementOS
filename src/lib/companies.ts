import { useMemo } from 'react'
import type { Bucket } from '../data/types'
import { useProfile } from './auth'
import { evaluateAll } from './eligibility'

/** Every tracked company scored against the signed-in student's current profile. */
export function useCompanies() {
  const profile = useProfile()
  return useMemo(() => {
    const companies = evaluateAll(profile)
    return {
      companies,
      byBucket: (b: Bucket) => companies.filter((c) => c.bucket === b),
      byId: (id: string | null | undefined) => companies.find((c) => c.id === id),
    }
  }, [profile])
}
