import { useCallback, useEffect, useState } from 'react'
import { SEED_COURSES, SEED_PROVIDERS, type CertCourse, type CertProvider } from '../data/certCatalog'
import { supabase } from './supabase'

/**
 * The certification catalog the platform admin manages (cert_providers, cert_courses). Students only receive enabled
 * providers and courses (RLS). Until the tables exist, the built-in seed is used so recommendations keep working.
 */
export function useCertCatalog() {
  const [state, setState] = useState<{ providers: CertProvider[]; courses: CertCourse[]; live: boolean; loading: boolean }>({
    providers: SEED_PROVIDERS,
    courses: SEED_COURSES,
    live: false,
    loading: true,
  })
  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('cert_providers').select('id,slug,name,website,enabled,partnered,sort').order('sort').order('name'),
      supabase.from('cert_courses').select('id,provider_id,title,skills,url,weeks,level,enabled').order('title'),
    ])
    if (p.error || c.error || !p.data?.length) return setState({ providers: SEED_PROVIDERS, courses: SEED_COURSES, live: false, loading: false })
    setState({ providers: p.data as CertProvider[], courses: (c.data ?? []) as CertCourse[], live: true, loading: false })
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load }
}
