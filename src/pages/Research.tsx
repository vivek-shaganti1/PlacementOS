import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Page } from '../components/Page'
import { callApi, getApi } from '../lib/api'
import { useProfile } from '../lib/auth'
import { motionConfig } from '../lib/motion'
import { supabase } from '../lib/supabase'

type Req = { id: string; query: string; status: 'queued' | 'working' | 'done' | 'failed'; stage: string; progress: number; message: string; created_at: string; finished_at: string | null }
type Co = { id: string; name: string; website: string; found_via: string; state: string; note: string }
type Finding = { id: string; company: string; kind: string; field: string; value: string; quote: string; source_url: string; source_kind: string; fetched_at: string; review: 'pending' | 'approved' | 'rejected'; reviewed_at: string | null }

const STAGES = [['understanding', 'Understanding the request'], ['finding', 'Finding companies'], ['reading', 'Reading official pages'], ['done', 'Done']] as const
const KIND: Record<string, string> = { eligibility: 'Eligibility', role: 'Roles', process: 'Selection process', salary: 'Pay', about: 'About', careers: 'How to apply', location: 'Locations' }
const ORDER = ['eligibility', 'role', 'process', 'salary', 'careers', 'about', 'location']
const VIA: Record<string, string> = { catalog: 'checked company list', named: 'named in your request', wikidata: 'Wikidata', adzuna: 'hiring on Adzuna', search: 'web search' }
const SOURCE: Record<string, string> = { official: 'Company website', job_board: 'Company job board', adzuna: 'Adzuna listing', wikidata: 'Wikidata' }
const examples = ['Semiconductor companies hiring ECE freshers in Bengaluru', 'Zoho and Freshworks campus eligibility', 'Data analyst roles for freshers in Hyderabad', 'Structural engineering companies for civil graduates']
const when = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Label({ f }: { f: Finding }) {
  if (f.review === 'approved')
    return <span className="rounded-full bg-[#ecfdf3] px-2 py-0.5 text-[11px] font-semibold text-[#067647]">Verified by PlacementIQ{f.reviewed_at ? ` on ${new Date(f.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</span>
  if (f.review === 'rejected') return <span className="rounded-full bg-[#fef3f2] px-2 py-0.5 text-[11px] font-semibold text-[#b42318]">Rejected on review</span>
  return <span className="rounded-full bg-[#fff8ec] px-2 py-0.5 text-[11px] font-semibold text-[#93370d]">Not verified yet: matched word for word on the source</span>
}

export default function Research() {
  const me = useProfile()
  const reduce = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [requests, setRequests] = useState<Req[]>([])
  const [companies, setCompanies] = useState<Co[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [sources, setSources] = useState<{ search: boolean; adzuna: boolean } | null>(null)
  const selectedId = params.get('id') ?? requests[0]?.id ?? null
  const selected = requests.find((r) => r.id === selectedId) ?? null
  const working = selected && (selected.status === 'queued' || selected.status === 'working')

  const loadList = useCallback(async () => {
    const { data } = await supabase.from('research_requests').select('id,query,status,stage,progress,message,created_at,finished_at').eq('user_id', me.id).order('created_at', { ascending: false }).limit(20)
    setRequests((data ?? []) as Req[])
  }, [me.id])
  const loadResult = useCallback(async (id: string) => {
    const [c, f] = await Promise.all([
      supabase.from('research_companies').select('id,name,website,found_via,state,note').eq('request_id', id).order('created_at'),
      supabase.from('research_findings').select('id,company,kind,field,value,quote,source_url,source_kind,fetched_at,review,reviewed_at').eq('request_id', id).neq('review', 'rejected').order('created_at'),
    ])
    setCompanies((c.data ?? []) as Co[])
    setFindings((f.data ?? []) as Finding[])
  }, [])

  useEffect(() => {
    void loadList()
    getApi<{ search: boolean; adzuna: boolean }>('research', { status: '1' }).then(setSources).catch(() => setSources(null))
  }, [loadList])
  useEffect(() => {
    if (selectedId) void loadResult(selectedId)
  }, [selectedId, selected?.stage, selected?.progress, loadResult])

  // Live progress: the request row changes as the worker goes; a 6-second refresh covers networks that block the live connection.
  useEffect(() => {
    const ch = supabase
      .channel(`research-${me.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'research_requests', filter: `user_id=eq.${me.id}` }, (p) =>
        setRequests((rs) => rs.map((r) => (r.id === (p.new as Req).id ? { ...r, ...(p.new as Req) } : r))),
      )
      .subscribe()
    return () => void supabase.removeChannel(ch)
  }, [me.id])
  useEffect(() => {
    if (!working) return
    const t = window.setInterval(() => void loadList(), 6000)
    return () => window.clearInterval(t)
  }, [working, loadList])

  const ask = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await callApi<{ id: string; message: string }>('research', { query })
      setNotice(r.message)
      setQuery('')
      await loadList()
      setParams({ id: r.id })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const grouped = useMemo(() => {
    const by = new Map<string, Finding[]>()
    for (const f of findings) by.set(f.company, [...(by.get(f.company) ?? []), f])
    return [...by.entries()].map(([company, list]) => ({ company, list: [...list].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)) }))
  }, [findings])
  const stageIndex = selected ? Math.max(0, STAGES.findIndex(([k]) => k === (selected.stage === 'queued' ? 'understanding' : selected.stage))) : 0

  return (
    <Page title="Company" accent="research" subtitle="Ask about companies, a sector or a role. We read the companies' own pages and job boards, and keep only facts we can quote word for word.">
      <Card title="What should we look into?">
        <form onSubmit={ask}>
          <label htmlFor="research-q" className="sr-only">Your request</label>
          <textarea
            id="research-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            maxLength={300}
            required
            minLength={3}
            placeholder="For example: semiconductor companies hiring ECE freshers in Bengaluru"
            className="field !h-auto resize-none py-2.5 !text-[14px] leading-[1.5]"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {examples.map((x) => (
              <button key={x} type="button" onClick={() => setQuery(x)} className="rounded-full bg-white/80 px-3 py-1.5 text-[12px] text-ink-soft ring-1 ring-line hover:text-ink">{x}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || query.trim().length < 3} className="btn-primary !px-5 !py-2.5 !text-[13px]">{busy ? 'Sending…' : 'Start research'}</button>
            <p className="text-[12px] text-ink-mute">Uses one AI action. Up to 3 an hour and 10 a day.</p>
          </div>
          {error && <p role="alert" className="mt-2 text-[12.5px] text-[#b42318]">{error}</p>}
        </form>
        <AnimatePresence>
          {notice && (
            <motion.p role="status" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: motionConfig.duration.fast, ease: motionConfig.easing.dramatic }} className="mt-3 rounded-[12px] bg-brand-tint px-3 py-2.5 text-[13px] leading-[1.5] text-ink">
              {notice} You can leave this page.
            </motion.p>
          )}
        </AnimatePresence>
        {sources && (
          <p className="mt-3 text-[11.5px] leading-[1.5] text-ink-mute">
            Sources used: companies' own websites and public job boards, Wikidata{sources.adzuna ? ', Adzuna job listings' : ''}{sources.search ? ', and a web search to find official pages' : ''}. Never LinkedIn, Naukri, Glassdoor or other sites that forbid it.
          </p>
        )}
      </Card>

      {requests.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Card title="Your research">
            <ul className="-mx-1 space-y-1">
              {requests.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setParams({ id: r.id })} aria-current={r.id === selectedId} className={`w-full rounded-[12px] px-2.5 py-2 text-left transition-colors ${r.id === selectedId ? 'bg-brand-tint' : 'hover:bg-white/70'}`}>
                    <span className="line-clamp-2 text-[12.5px] font-medium text-ink">{r.query}</span>
                    <span className="mt-0.5 block text-[11px] text-ink-mute">{r.status === 'done' ? 'Ready' : r.status === 'failed' ? 'Could not finish' : 'Working on it'} · {when(r.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {selected && (
            <div className="min-w-0 space-y-4">
              <Card title={selected.query}>
                {working ? (
                  <div role="status" aria-live="polite">
                    <p className="text-[14px] font-semibold text-ink">We're working on it. We'll let you know soon.</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-mute">This usually takes 2 to 10 minutes, depending on how many companies and pages there are. You'll get a notification.</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[#6d4aff] to-[#38a9f0]" animate={{ width: `${Math.max(4, selected.progress)}%` }} transition={reduce ? { duration: 0 } : { duration: motionConfig.duration.normal, ease: motionConfig.easing.smooth }} />
                    </div>
                    <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                      {STAGES.map(([k, label], i) => (
                        <li key={k} className={i < stageIndex ? 'text-[#067647]' : i === stageIndex ? 'font-semibold text-ink' : 'text-ink-mute'}>{i < stageIndex ? '✓ ' : ''}{label}</li>
                      ))}
                    </ol>
                    {selected.message && <p className="mt-2 text-[12.5px] text-ink-soft">{selected.message}</p>}
                  </div>
                ) : (
                  <p role="status" className={`text-[13px] leading-[1.55] ${selected.status === 'failed' ? 'text-[#b42318]' : 'text-ink-soft'}`}>{selected.message}</p>
                )}
                {companies.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {companies.map((c) => (
                      <li key={c.id} title={c.note} className="rounded-full bg-white/80 px-2.5 py-1 text-[11.5px] text-ink-soft ring-1 ring-line">
                        <b className="font-semibold text-ink">{c.name}</b> · {VIA[c.found_via] ?? c.found_via}{c.state === 'skipped' ? ' · nothing quotable' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {grouped.map(({ company, list }) => (
                <Card key={company} title={company} action={<span className="text-[11.5px] text-ink-mute">{list.length} fact{list.length === 1 ? '' : 's'}</span>}>
                  <ul className="space-y-3.5">
                    {list.map((f) => (
                      <li key={f.id} className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{KIND[f.kind] ?? f.kind}</span>
                          <span className="text-[13.5px] font-semibold text-ink">{f.value}</span>
                        </div>
                        <blockquote className="mt-1 border-l-2 border-line pl-3 text-[12.5px] italic leading-[1.5] text-ink-soft">"{f.quote}"</blockquote>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-mute">
                          <Label f={f} />
                          <a href={f.source_url} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-dark underline underline-offset-2">{SOURCE[f.source_kind] ?? 'Source'}</a>
                          <span>read {when(f.fetched_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
              {!working && selected.status === 'done' && grouped.length === 0 && <p className="text-[12.5px] text-ink-mute">No facts to show for this request.</p>}
              {grouped.length > 0 && (
                <p className="text-[11.5px] leading-[1.5] text-ink-mute">
                  Facts are short quotes from each company's own pages, linked to the source. Requirements change: always confirm on the company's site or with your placement cell before applying. Your campus drives use the criteria your college posts.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Page>
  )
}
