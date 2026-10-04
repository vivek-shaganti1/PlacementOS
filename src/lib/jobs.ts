import { useCallback, useEffect, useState } from 'react'
import type { JobPosting } from './eligibility'
import { supabase } from './supabase'

export type JobStatus = 'applied' | 'shortlisted' | 'interview' | 'offer' | 'rejected'
export type JobApplication = {
  job_id: string
  user_id: string
  status: JobStatus
  match: number | null
  ai_fit: number | null
  admin_note: string
  created_at: string
  updated_at: string
}

export const STATUS_META: Record<JobStatus, { label: string; cls: string }> = {
  applied: { label: 'Applied', cls: 'border-[#d5cbff] bg-brand-tint text-brand-dark' },
  shortlisted: { label: 'Shortlisted', cls: 'border-[#cfe4fb] bg-[#eef6ff] text-[#1570cd]' },
  interview: { label: 'Interview', cls: 'border-[#fbe3bd] bg-[#fff8ec] text-[#b45309]' },
  offer: { label: 'Offer', cls: 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]' },
  rejected: { label: 'Not selected', cls: 'border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]' },
}

export const normalizeJob = (j: Record<string, any>): JobPosting => ({
  ...(j as JobPosting),
  ctc_min: j.ctc_min === null ? null : Number(j.ctc_min),
  ctc_max: j.ctc_max === null ? null : Number(j.ctc_max),
  min_cgpa: Number(j.min_cgpa),
  min_class_x: Number(j.min_class_x),
  min_class_xii: Number(j.min_class_xii),
  branches: j.branches ?? [],
  batches: j.batches ?? [],
  skill_requirements: j.skill_requirements ?? {},
})

export const ctcText = (j: Pick<JobPosting, 'ctc_min' | 'ctc_max'>) =>
  j.ctc_min && j.ctc_max ? `₹${j.ctc_min}–${j.ctc_max} LPA` : j.ctc_max || j.ctc_min ? `₹${j.ctc_max ?? j.ctc_min} LPA` : 'CTC not disclosed'

export const isOpen = (j: JobPosting) => j.status === 'open' && (!j.deadline || j.deadline >= new Date().toISOString().slice(0, 10))

/** College job postings visible to the current user, plus their own applications (admins get every application). */
export function useJobs() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [j, a] = await Promise.all([
      supabase.from('job_postings').select('*').order('created_at', { ascending: false }),
      supabase.from('job_applications').select('*').order('created_at', { ascending: false }),
    ])
    setError(j.error?.message ?? a.error?.message ?? null)
    setJobs((j.data ?? []).map(normalizeJob))
    setApplications((a.data ?? []) as JobApplication[])
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { jobs, applications, loading, error, reload }
}
