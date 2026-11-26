import { useEffect, useState, type FormEvent } from 'react'
import { getApi } from '../lib/api'
import { Card } from './Page'
import { IconArrowRight } from './Icons'

type Opening = { title: string; company: string; location: string; url: string; posted: string | null; salary: string | null }

/** Off-campus openings in India from Adzuna. Shown only once the server has Adzuna keys (/api/openings?status). */
export function OffCampus({ defaultRole }: { defaultRole: string }) {
  const [ready, setReady] = useState(false)
  const [q, setQ] = useState(defaultRole)
  const [where, setWhere] = useState('')
  const [state, setState] = useState<{ total: number; jobs: Opening[] } | 'idle' | 'loading' | { error: string }>('idle')

  useEffect(() => {
    getApi<{ adzuna: boolean }>('openings', { status: '1' }).then((r) => setReady(r.adzuna)).catch(() => setReady(false))
  }, [])
  if (!ready) return null

  const search = async (e: FormEvent) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    setState('loading')
    try {
      setState(await getApi<{ total: number; jobs: Opening[] }>('openings', { q: q.trim(), ...(where.trim() ? { where: where.trim() } : {}) }))
    } catch (err) {
      setState({ error: (err as Error).message })
    }
  }

  return (
    <Card title="Off-campus openings" action={<span className="text-[10.5px] text-ink-faint">Jobs by Adzuna</span>}>
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Role, e.g. data analyst" aria-label="Role to search for" maxLength={80} className="field h-[34px] min-w-0 flex-1 text-[12.5px]" />
        <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="City (optional)" aria-label="City" maxLength={60} className="field h-[34px] w-[150px] text-[12.5px]" />
        <button type="submit" disabled={state === 'loading'} className="btn-primary">Search</button>
      </form>
      <div aria-live="polite" className="mt-3">
        {state === 'loading' && <p className="text-[12px] text-ink-mute">Searching…</p>}
        {typeof state === 'object' && 'error' in state && <p className="text-[12px] text-[#b42318]">{state.error}</p>}
        {typeof state === 'object' && 'jobs' in state && (
          state.jobs.length === 0 ? (
            <p className="text-[12px] text-ink-mute">Nothing found. Try a broader role or another city.</p>
          ) : (
            <>
              <p className="text-[11px] text-ink-faint">{state.total.toLocaleString()} openings in India · showing {state.jobs.length}. Not checked by your placement cell: apply on the employer's site.</p>
              <ul className="mt-2 divide-y divide-line">
                {state.jobs.map((j) => (
                  <li key={j.url}>
                    <a href={j.url} target="_blank" rel="noreferrer noopener" className="group flex items-center gap-3 py-2 text-[12px]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink group-hover:text-brand-dark">{j.title}</span>
                        <span className="block truncate text-[11px] text-ink-mute">{[j.company, j.location, j.salary].filter(Boolean).join(' · ')}</span>
                      </span>
                      <IconArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      <span className="sr-only">(opens Adzuna)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )
        )}
      </div>
    </Card>
  )
}
