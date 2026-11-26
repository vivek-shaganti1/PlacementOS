import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, EmptyState, Page, RowsSkeleton } from '../components/Page'
import { companyCatalog } from '../data/companies'
import { coreCatalog } from '../data/coreCompanies'
import type { CatalogOverride } from '../data/types'
import { getApi } from '../lib/api'
import { loadCatalog } from '../lib/catalog'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

// Platform admins verify the companies students are scored against: description, careers page, fresher CTC range,
// the public job board that lists open roles, and the source the facts were checked against. The database allows
// changes only with two-factor sign-in and records each one in the activity log.

const BUILT_IN = [...companyCatalog, ...coreCatalog].sort((a, b) => a.name.localeCompare(b.name))
const today = () => new Date().toISOString().slice(0, 10)
type Draft = { about: string; careers_url: string; ctc_min: string; ctc_max: string; ats: '' | 'greenhouse' | 'lever' | 'ashby'; ats_board: string; source_url: string; checked: boolean }

const draftOf = (id: string, row?: CatalogOverride): Draft => {
  const base = BUILT_IN.find((c) => c.id === id)!
  return {
    about: row?.about ?? base.about,
    careers_url: row?.careers_url ?? base.careers,
    ctc_min: row?.ctc_min != null ? String(row.ctc_min) : '',
    ctc_max: row?.ctc_max != null ? String(row.ctc_max) : '',
    ats: row?.ats ?? '',
    ats_board: row?.ats_board ?? '',
    source_url: row?.source_url ?? '',
    checked: false,
  }
}

export default function SuperCompanies() {
  const { showToast } = useApp()
  const [rows, setRows] = useState<Map<string, CatalogOverride> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [only, setOnly] = useState<'all' | 'verified' | 'unverified'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [probe, setProbe] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('company_catalog').select('id,name,about,careers_url,ctc_min,ctc_max,ats,ats_board,source_url,last_checked,updated_at')
    if (error) setError(errMsg(error))
    else setRows(new Map(((data ?? []) as CatalogOverride[]).map((r) => [r.id, r])))
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return BUILT_IN.filter((c) => {
      const verified = !!rows?.get(c.id)?.last_checked
      if (only === 'verified' && !verified) return false
      if (only === 'unverified' && verified) return false
      return !needle || c.name.toLowerCase().includes(needle)
    })
  }, [q, only, rows])
  const verifiedCount = rows ? [...rows.values()].filter((r) => r.last_checked).length : 0

  const open = (id: string) => {
    setOpenId(id === openId ? null : id)
    setDraft(id === openId ? null : draftOf(id, rows?.get(id)))
    setProbe(null)
  }

  const save = async () => {
    if (!openId || !draft) return
    const base = BUILT_IN.find((c) => c.id === openId)!
    const min = draft.ctc_min.trim() === '' ? null : Number(draft.ctc_min)
    const max = draft.ctc_max.trim() === '' ? null : Number(draft.ctc_max)
    if ((min === null) !== (max === null) || (min !== null && (!(min >= 0) || !(max! >= min)))) return showToast('Enter both CTC figures, with the lower one first, or leave both empty.')
    if (draft.ats && !/^[A-Za-z0-9._-]{1,80}$/.test(draft.ats_board.trim())) return showToast('Enter the job board name exactly as it appears in the board address.')
    if (draft.checked && !draft.source_url.trim()) return showToast('Add the source you checked the details against.')
    const existing = rows?.get(openId)
    const row = {
      id: openId,
      name: base.name,
      about: draft.about.trim(),
      careers_url: draft.careers_url.trim(),
      ctc_min: min,
      ctc_max: max,
      ats: draft.ats || null,
      ats_board: draft.ats ? draft.ats_board.trim() : null,
      source_url: draft.source_url.trim(),
      // Ticking "checked today" stamps today; otherwise an earlier check date is kept.
      last_checked: draft.checked ? today() : existing?.last_checked ?? null,
    }
    setBusy(true)
    const { error } = await supabase.from('company_catalog').upsert(row)
    setBusy(false)
    if (error) return showToast(`Could not save: ${errMsg(error)}`)
    showToast(`${base.name} saved`)
    await load()
    // Students' scores pick the change up on their next sign-in; this session sees it at once.
    void loadCatalog(true)
    setDraft({ ...draft, checked: false })
  }

  const reset = async () => {
    if (!openId || !rows?.get(openId)) return
    setBusy(true)
    const { error } = await supabase.from('company_catalog').delete().eq('id', openId)
    setBusy(false)
    if (error) return showToast(`Could not remove: ${errMsg(error)}`)
    showToast('Back to the built-in typical details')
    await load()
    void loadCatalog(true)
    setDraft(draftOf(openId))
  }

  const testBoard = async () => {
    if (!openId) return
    setProbe('Checking…')
    try {
      const r = await getApi<{ total?: number; jobs: unknown[]; source: string | null }>('openings', { company: openId })
      setProbe(r.source ? `${r.total ?? r.jobs.length} open roles found.` : 'Save a job board first.')
    } catch (e) {
      setProbe((e as Error).message)
    }
  }

  const field = 'field h-[34px] w-full text-[12.5px]'
  return (
    <Page title="Companies" subtitle="Verify the details students see and are scored against. Unverified companies show typical figures with a warning.">
      <Card
        title={rows ? `${verifiedCount} of ${BUILT_IN.length} verified` : 'Loading'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" aria-label="Search companies" className="field h-[32px] w-[180px] text-[12px]" />
            <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} aria-label="Show" className="field h-[32px] text-[12px]">
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Not verified</option>
            </select>
          </div>
        }
      >
        {error && <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>}
        {!rows && !error && <RowsSkeleton rows={6} />}
        {rows && list.length === 0 && <EmptyState title="No companies match" body="Try another name or filter." />}
        {rows && (
          <ul className="divide-y divide-line">
            {list.map((c) => {
              const row = rows.get(c.id)
              const isOpen = openId === c.id
              return (
                <li key={c.id}>
                  <button onClick={() => open(c.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 py-2.5 text-left text-[12.5px] hover:bg-white/50">
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{c.name}</span>
                    {row?.ats && <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10.5px] text-ink-soft ring-1 ring-line">Job board</span>}
                    {row?.last_checked ? (
                      <span className="rounded-md bg-[#ecfdf3] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#067647]">Checked {row.last_checked}</span>
                    ) : (
                      <span className="rounded-md bg-[#fffaeb] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#93370d]">Typical</span>
                    )}
                  </button>
                  {isOpen && draft && (
                    <div className="mb-3 grid grid-cols-1 gap-3 rounded-[14px] border border-line bg-white/70 p-4 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="text-[11.5px] font-medium text-ink-soft">About</span>
                        <textarea value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} maxLength={1200} rows={3} className="field mt-1 w-full text-[12.5px]" />
                      </label>
                      <label>
                        <span className="text-[11.5px] font-medium text-ink-soft">Careers page</span>
                        <input value={draft.careers_url} onChange={(e) => setDraft({ ...draft, careers_url: e.target.value })} placeholder="https://…" className={`${field} mt-1`} />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label>
                          <span className="text-[11.5px] font-medium text-ink-soft">Fresher CTC from (LPA)</span>
                          <input inputMode="decimal" value={draft.ctc_min} onChange={(e) => setDraft({ ...draft, ctc_min: e.target.value })} className={`${field} mt-1`} />
                        </label>
                        <label>
                          <span className="text-[11.5px] font-medium text-ink-soft">to (LPA)</span>
                          <input inputMode="decimal" value={draft.ctc_max} onChange={(e) => setDraft({ ...draft, ctc_max: e.target.value })} className={`${field} mt-1`} />
                        </label>
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-2">
                        <label>
                          <span className="text-[11.5px] font-medium text-ink-soft">Job board</span>
                          <select value={draft.ats} onChange={(e) => setDraft({ ...draft, ats: e.target.value as Draft['ats'] })} className={`${field} mt-1`}>
                            <option value="">None</option>
                            <option value="greenhouse">Greenhouse</option>
                            <option value="lever">Lever</option>
                            <option value="ashby">Ashby</option>
                          </select>
                        </label>
                        <label>
                          <span className="text-[11.5px] font-medium text-ink-soft">Board name</span>
                          <input value={draft.ats_board} disabled={!draft.ats} onChange={(e) => setDraft({ ...draft, ats_board: e.target.value })} placeholder="e.g. acme (from jobs.lever.co/acme)" className={`${field} mt-1 disabled:opacity-50`} />
                        </label>
                      </div>
                      <label>
                        <span className="text-[11.5px] font-medium text-ink-soft">Source you checked</span>
                        <input value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} placeholder="https://… (official page or report)" className={`${field} mt-1`} />
                      </label>
                      <label className="flex items-center gap-2 text-[12px] text-ink-soft sm:col-span-2">
                        <input type="checkbox" checked={draft.checked} onChange={(e) => setDraft({ ...draft, checked: e.target.checked })} className="h-4 w-4 accent-[#6d4aff]" />
                        I checked these details against the source today
                        {rows.get(c.id)?.last_checked && <span className="text-ink-faint">(last checked {rows.get(c.id)!.last_checked})</span>}
                      </label>
                      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                        <button onClick={save} disabled={busy} className="btn-primary">Save</button>
                        {row?.ats && <button onClick={testBoard} disabled={busy} className="btn-glass">Test job board</button>}
                        {row && <button onClick={reset} disabled={busy} className="btn-glass text-[#b42318]">Use typical details</button>}
                        {probe && <span role="status" className="text-[12px] text-ink-mute">{probe}</span>}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </Page>
  )
}
