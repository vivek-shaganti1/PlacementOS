import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Meter, Page, Ring, Stat } from '../components/Page'
import { bucketMeta } from '../data/companies'
import { callApi } from '../lib/api'
import { useProfile } from '../lib/auth'
import { evaluateJob, type JobPosting } from '../lib/eligibility'
import { ctcText, isOpen, STATUS_META, useJobs } from '../lib/jobs'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

export default function Jobs() {
  const p = useProfile()
  const { showToast } = useApp()
  const { jobs, applications, loading, reload } = useJobs()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<'all' | 'eligible' | 'applied'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const mine = useMemo(() => new Map(applications.filter((a) => a.user_id === p.id).map((a) => [a.job_id, a])), [applications, p.id])
  const scored = useMemo(() => jobs.filter((j) => j.status !== 'draft').map((j) => ({ job: j, ev: evaluateJob(j, p) })), [jobs, p])
  const selectedId = params.get('job')
  const selected = scored.find((s) => s.job.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId && scored.length) setParams({ job: scored[0].job.id }, { replace: true })
  }, [selectedId, scored, setParams])

  const rows = scored.filter(({ job, ev }) => (filter === 'eligible' ? ev.eligibleToApply && isOpen(job) : filter === 'applied' ? mine.has(job.id) : true))

  const apply = async (job: JobPosting, match: number) => {
    setBusy(`apply-${job.id}`)
    const { error } = await supabase.from('job_applications').insert({ job_id: job.id, user_id: p.id, match, status: 'applied' })
    setBusy(null)
    if (error) return showToast(`Could not apply: ${error.message}`)
    showToast(`Applied to ${job.company}. The placement cell can now see your profile.`)
    reload()
  }

  const withdraw = async (job: JobPosting) => {
    if (!window.confirm(`Withdraw your application to ${job.company}?`)) return
    const { error } = await supabase.from('job_applications').delete().eq('job_id', job.id).eq('user_id', p.id)
    if (error) return showToast(`Could not withdraw: ${error.message}`)
    reload()
  }

  const aiFit = async (job: JobPosting) => {
    if (!p.resume_text) return showToast('Upload your resume first (Resume Analyzer).')
    setBusy(`fit-${job.id}`)
    try {
      await callApi('resume', { action: 'match', job_id: job.id })
      const { data } = await supabase.from('jd_matches').select('score,verdict,missing_skills,matched_skills,suggestions').eq('job_id', job.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setFits((f) => ({ ...f, [job.id]: data }))
      reload()
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  // Latest AI fit per job, loaded on demand.
  const [fits, setFits] = useState<Record<string, { score: number; verdict: string; missing_skills: string[]; matched_skills: string[]; suggestions: string[] } | null>>({})
  useEffect(() => {
    if (!selectedId || selectedId in fits) return
    supabase
      .from('jd_matches')
      .select('score,verdict,missing_skills,matched_skills,suggestions')
      .eq('job_id', selectedId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setFits((f) => ({ ...f, [selectedId]: data })))
  }, [selectedId, fits])

  const eligibleCount = scored.filter(({ job, ev }) => ev.eligibleToApply && isOpen(job)).length
  const offers = [...mine.values()].filter((a) => a.status === 'offer').length
  const fit = selectedId ? fits[selectedId] : null

  return (
    <Page title="Campus Jobs" subtitle="Drives posted by your placement cell, scored against your profile. Apply in one click — the cell sees your verified profile." wide>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Open drives" value={`${scored.filter(({ job }) => isOpen(job)).length}`} />
        <Stat label="You can apply to" value={`${eligibleCount}`} tone="text-[#0d9a5b]" />
        <Stat label="Applications" value={`${mine.size}`} tone="text-brand-dark" />
        <Stat label="Offers" value={`${offers}`} tone="text-[#0d9a5b]" />
      </div>

      {!loading && scored.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-[13px] text-ink-mute">No drives posted yet. You'll get a notification the moment your placement cell posts one.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-[380px_1fr] gap-4">
          <Card className="self-start">
            <div className="mb-3 flex gap-1.5">
              {(['all', 'eligible', 'applied'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-[11.5px] font-semibold capitalize transition ${filter === f ? 'bg-brand text-white' : 'bg-white/70 text-ink-soft hover:bg-white'}`}>
                  {f === 'eligible' ? 'Can apply' : f}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {rows.map(({ job, ev }) => {
                const app = mine.get(job.id)
                const active = job.id === selectedId
                return (
                  <button
                    key={job.id}
                    onClick={() => setParams({ job: job.id }, { replace: true })}
                    className={`relative w-full rounded-[16px] border p-3.5 text-left transition ${active ? 'border-brand bg-white shadow-[var(--shadow-2)]' : 'border-white/80 bg-white/60 hover:bg-white'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{job.company}</p>
                        <p className="truncate text-[11.5px] text-ink-mute">{job.role} · {job.location || 'Location TBA'}</p>
                      </div>
                      <span className={`text-[14px] font-semibold tabular-nums ${bucketMeta[ev.bucket].text}`}>{ev.match}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-ink-soft">{ctcText(job)}</span>
                      {job.deadline && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-ink-soft">Apply by {new Date(job.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                      {!isOpen(job) && <span className="rounded-md bg-[#fef3f2] px-1.5 py-0.5 text-[#d92d20]">Closed</span>}
                      {app && <span className={`rounded-md border px-1.5 py-0.5 font-semibold ${STATUS_META[app.status].cls}`}>{STATUS_META[app.status].label}</span>}
                    </div>
                  </button>
                )
              })}
              {rows.length === 0 && <p className="py-6 text-center text-[12px] text-ink-faint">Nothing in this view.</p>}
            </div>
          </Card>

          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.job.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
                <div className="card p-6">
                  <div className="flex items-start gap-5">
                    <Ring value={selected.ev.match} size={104} stroke={9} label="Profile match" color={selected.ev.eligibleToApply ? '#6d4aff' : '#f04438'} />
                    <div className="flex-1">
                      <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink">{selected.job.company}</p>
                      <p className="text-[13px] text-ink-mute">{selected.job.role} · {selected.job.job_type} · {selected.job.location || 'Location TBA'}</p>
                      <p className="mt-1 text-[13px] font-semibold text-ink">{ctcText(selected.job)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(() => {
                          const app = mine.get(selected.job.id)
                          if (app)
                            return (
                              <>
                                <span className={`rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold ${STATUS_META[app.status].cls}`}>{STATUS_META[app.status].label}</span>
                                {app.status === 'applied' && <button onClick={() => withdraw(selected.job)} className="btn-glass py-1.5 text-[12px] text-[#d92d20]">Withdraw</button>}
                              </>
                            )
                          if (!isOpen(selected.job)) return <span className="text-[12px] text-ink-faint">Applications are closed.</span>
                          return (
                            <button
                              onClick={() => apply(selected.job, selected.ev.match)}
                              disabled={!selected.ev.eligibleToApply || busy === `apply-${selected.job.id}`}
                              className="btn-primary"
                              title={selected.ev.eligibleToApply ? '' : 'You do not meet the mandatory criteria'}
                            >
                              {selected.ev.eligibleToApply ? 'Apply now' : 'Not eligible to apply'}
                            </button>
                          )
                        })()}
                        <button onClick={() => aiFit(selected.job)} disabled={busy === `fit-${selected.job.id}`} className="btn-glass py-1.5 text-[12px]">
                          {busy === `fit-${selected.job.id}` ? 'Matching resume…' : fit ? 'Re-run AI resume match' : 'AI resume match'}
                        </button>
                      </div>
                    </div>
                    {fit && (
                      <div className="text-center">
                        <Ring value={fit.score} size={86} stroke={8} label="AI resume fit" color="#1baf7a" />
                      </div>
                    )}
                  </div>
                  {fit && (
                    <div className="mt-4 rounded-[14px] border border-white/80 bg-white/70 p-3.5 text-[12px]">
                      <p className="text-ink-soft">{fit.verdict}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {fit.matched_skills.slice(0, 8).map((s) => <span key={s} className="rounded-full border border-[#c9f0d9] bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-semibold text-[#0d9a5b]">✓ {s}</span>)}
                        {fit.missing_skills.slice(0, 8).map((s) => <span key={s} className="rounded-full border border-[#fbd5d1] bg-[#fef3f2] px-2 py-0.5 text-[11px] font-semibold text-[#d92d20]">+ {s}</span>)}
                      </div>
                      {fit.suggestions.length > 0 && <ul className="mt-2 space-y-1 text-ink-mute">{fit.suggestions.slice(0, 3).map((s) => <li key={s}>→ {s}</li>)}</ul>}
                    </div>
                  )}
                </div>

                <Card title="Eligibility criteria">
                  <div className="grid grid-cols-2 gap-2">
                    {selected.ev.criteria.map((c) => (
                      <div key={c.label} className={`rounded-[12px] border px-3 py-2.5 ${c.met ? 'border-[#c9f0d9] bg-[#f6fef9]/80' : 'border-[#fbd5d1] bg-[#fef8f7]/80'}`}>
                        <p className="text-[11px] text-ink-mute">{c.label}</p>
                        <p className="text-[12.5px] font-semibold text-ink">{c.yours} <span className="font-normal text-ink-faint">/ needs {c.required}</span></p>
                      </div>
                    ))}
                  </div>
                  {selected.ev.gaps.length > 0 && (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-[12px] font-semibold text-ink">Skill gaps for this role</p>
                      {selected.ev.gaps.map((g) => <Meter key={g.skill} label={`${g.skill} — needs ${g.need}%`} value={g.have} tone="#f79009" />)}
                    </div>
                  )}
                </Card>

                <Card title="Job description">
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.7] text-ink-soft">{selected.job.description || 'No description provided.'}</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Page>
  )
}
