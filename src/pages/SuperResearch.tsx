import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Page } from '../components/Page'
import { supabase } from '../lib/supabase'

type Finding = { id: string; request_id: string; company: string; kind: string; field: string; value: string; quote: string; source_url: string; source_kind: string; fetched_at: string; review: 'pending' | 'approved' | 'rejected' }
const KIND: Record<string, string> = { eligibility: 'Eligibility', role: 'Role', process: 'Selection process', salary: 'Pay', about: 'About', careers: 'How to apply', location: 'Location' }

/**
 * Platform admins review what the research worker found. Approving makes a fact "Verified by PlacementIQ" and visible to
 * every signed-in user; the database records who and when, keeps the fact itself unchangeable and writes the audit log.
 */
export default function SuperResearch() {
  const [show, setShow] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rows, setRows] = useState<Finding[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('research_findings').select('id,request_id,company,kind,field,value,quote,source_url,source_kind,fetched_at,review').eq('review', show).order('created_at', { ascending: false }).limit(200)
    if (e) setError(e.message)
    setRows((data ?? []) as Finding[])
  }, [show])
  useEffect(() => void load(), [load])

  const review = async (ids: string[], to: Finding['review']) => {
    setError(null)
    const { error: e } = await supabase.from('research_findings').update({ review: to }).in('id', ids)
    if (e) setError(e.message)
    else setRows((rs) => (rs ?? []).filter((r) => !ids.includes(r.id)))
  }
  const grouped = useMemo(() => {
    const by = new Map<string, Finding[]>()
    for (const f of rows ?? []) by.set(f.company, [...(by.get(f.company) ?? []), f])
    return [...by.entries()]
  }, [rows])

  return (
    <Page title="Research" accent="review" subtitle="Facts the research worker quoted from companies' own pages. Open the source, check the quote says what the fact says, then approve or reject.">
      <div role="tablist" aria-label="Review state" className="mb-4 flex gap-1">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={show === s} onClick={() => setShow(s)} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize ${show === s ? 'bg-ink text-white' : 'bg-white/80 text-ink-soft ring-1 ring-line'}`}>{s}</button>
        ))}
      </div>
      {error && <p role="alert" className="mb-3 text-[12.5px] text-[#b42318]">{error}</p>}
      {rows && rows.length === 0 && <p className="text-[13px] text-ink-mute">Nothing here.</p>}
      <div className="space-y-4">
        {grouped.map(([company, list]) => (
          <Card key={company} title={company} action={show === 'pending' ? <button onClick={() => review(list.map((f) => f.id), 'approved')} className="btn-glass">Approve all {list.length}</button> : undefined}>
            <ul className="divide-y divide-line">
              {list.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px]"><span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{KIND[f.kind] ?? f.kind}{f.field ? ` · ${f.field}` : ''}</span> <b className="text-ink">{f.value}</b></p>
                    <blockquote className="mt-1 border-l-2 border-line pl-3 text-[12.5px] italic text-ink-soft">"{f.quote}"</blockquote>
                    <a href={f.source_url} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block max-w-full truncate text-[11.5px] font-medium text-brand-dark underline underline-offset-2">{f.source_url}</a>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {show !== 'approved' && <button onClick={() => review([f.id], 'approved')} className="btn-primary">Approve</button>}
                    {show !== 'rejected' && <button onClick={() => review([f.id], 'rejected')} className="btn-glass">Reject</button>}
                    {show !== 'pending' && <button onClick={() => review([f.id], 'pending')} className="btn-glass">Back to pending</button>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Page>
  )
}
