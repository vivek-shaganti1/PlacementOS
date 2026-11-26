import { useEffect, useState } from 'react'
import { getApi } from '../lib/api'
import { useDriveStat } from '../lib/catalog'
import type { Company } from '../data/types'
import { IconArrowRight } from './Icons'

type Opening = { title: string; company: string; location: string; url: string; team: string; posted: string | null; salary: string | null }
const BOARD: Record<string, string> = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby' }
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** What this college's own drives with the company produced. Counts are withheld (null) below three applicants. */
export function DriveRecord({ company }: { company: Company }) {
  const s = useDriveStat(company.name)
  if (!s) return null
  const cells = [
    { k: 'Drives here', v: String(s.drives) },
    { k: 'Applied', v: s.applicants ?? 'Under 3' },
    { k: 'Shortlisted', v: s.shortlisted ?? '—' },
    { k: 'Offers', v: s.offers ?? '—' },
  ]
  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold text-ink">At your college</p>
      <p className="mt-0.5 text-[11.5px] text-ink-mute">
        From your placement cell's own drives{s.last_drive ? `, latest ${day(s.last_drive)}` : ''}
        {s.ctc_min !== null && s.ctc_max !== null ? ` · posted CTC ₹${Number(s.ctc_min)}–${Number(s.ctc_max)} LPA` : ''}.
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.k} className="rounded-[10px] bg-white/70 px-2.5 py-2 ring-1 ring-line">
            <p className="text-[10.5px] text-ink-mute">{c.k}</p>
            <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{c.v}</p>
          </div>
        ))}
      </div>
      {s.applicants === null && <p className="mt-2 text-[10.5px] text-ink-faint">Counts appear once three or more students have applied, so no one's result can be worked out.</p>}
    </div>
  )
}

/** Open roles listed right now on the company's own public job board. */
export function OpenRoles({ company }: { company: Company }) {
  const [state, setState] = useState<{ jobs: Opening[]; total: number; source: string | null } | 'loading' | { error: string }>('loading')
  useEffect(() => {
    if (!company.jobBoard) return
    let live = true
    setState('loading')
    getApi<{ jobs: Opening[]; total?: number; source: string | null }>('openings', { company: company.id })
      .then((r) => live && setState({ jobs: r.jobs, total: r.total ?? r.jobs.length, source: r.source }))
      .catch((e: Error) => live && setState({ error: e.message }))
    return () => {
      live = false
    }
  }, [company.id, company.jobBoard])
  if (!company.jobBoard) return null

  return (
    <div className="card p-4" aria-busy={state === 'loading'}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink">Open roles now</p>
        {typeof state === 'object' && 'source' in state && state.source && (
          <p className="text-[10.5px] text-ink-faint">Live from {company.name}'s {BOARD[state.source] ?? ''} job board</p>
        )}
      </div>
      {state === 'loading' && (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-[10px] bg-white/70 motion-reduce:animate-none" />)}
        </div>
      )}
      {typeof state === 'object' && 'error' in state && <p className="mt-2 text-[12px] text-ink-mute">{state.error}</p>}
      {typeof state === 'object' && 'jobs' in state && (
        state.jobs.length === 0 ? (
          <p className="mt-2 text-[12px] text-ink-mute">No open roles listed right now.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {state.jobs.slice(0, 8).map((j) => (
              <li key={j.url}>
                <a href={j.url} target="_blank" rel="noreferrer noopener" className="group flex items-center gap-3 py-2 text-[12px]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink group-hover:text-brand-dark">{j.title}</span>
                    <span className="block truncate text-[11px] text-ink-mute">{[j.location, j.team].filter(Boolean).join(' · ') || 'Location not listed'}</span>
                  </span>
                  <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  <span className="sr-only">(opens the job board)</span>
                </a>
              </li>
            ))}
          </ul>
        )
      )}
      {typeof state === 'object' && 'jobs' in state && state.total > 8 && <p className="mt-1 text-[11px] text-ink-faint">Showing 8 of {state.total}, India and remote first.</p>}
    </div>
  )
}
