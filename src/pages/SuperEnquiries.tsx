import { useCallback, useEffect, useState } from 'react'
import { Card, EmptyState, Page, RowsSkeleton } from '../components/Page'
import { useAuth } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

// Messages sent through "Contact us" on the landing page. Platform admins only (the database enforces it).

type Enquiry = { id: number; created_at: string; name: string; college: string; email: string; phone: string; topic: string; message: string; status: 'new' | 'handled'; handled_at: string | null }

export default function SuperEnquiries() {
  const { session } = useAuth()
  const { showToast } = useApp()
  const [rows, setRows] = useState<Enquiry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHandled, setShowHandled] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('contact_enquiries').select('id,created_at,name,college,email,phone,topic,message,status,handled_at').order('created_at', { ascending: false }).limit(200)
    if (error) setError(errMsg(error))
    else setRows((data ?? []) as Enquiry[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const mark = async (e: Enquiry, handled: boolean) => {
    const { error } = await supabase.from('contact_enquiries').update(handled ? { status: 'handled', handled_by: session?.user.id, handled_at: new Date().toISOString() } : { status: 'new', handled_by: null, handled_at: null }).eq('id', e.id)
    if (error) return showToast(`Could not update: ${errMsg(error)}`)
    setRows((old) => (old ?? []).map((r) => (r.id === e.id ? { ...r, status: handled ? 'handled' : 'new' } : r)))
  }

  const fresh = (rows ?? []).filter((r) => r.status === 'new')
  const shown = showHandled ? rows ?? [] : fresh
  return (
    <Page title="Enquiries" subtitle="Messages from the Contact us form on the public site.">
      <Card
        title={rows ? `${fresh.length} new${rows.length > fresh.length ? ` · ${rows.length - fresh.length} handled` : ''}` : 'Loading'}
        action={
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
            <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} className="h-4 w-4 accent-[#6d4aff]" /> Show handled
          </label>
        }
      >
        {error && <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>}
        {!rows && !error && <RowsSkeleton rows={4} />}
        {rows && !shown.length && <EmptyState title={rows.length ? 'All caught up' : 'No enquiries yet'} body="New messages from the landing page will appear here." />}
        <ul className="space-y-3">
          {shown.map((e) => (
            <li key={e.id} className={`rounded-[14px] border p-4 ${e.status === 'new' ? 'border-[#d5cbff] bg-white/80' : 'border-line bg-white/50'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{e.name} <span className="font-normal text-ink-mute">· {e.college}</span></p>
                  <p className="mt-0.5 text-[12px] text-ink-mute">
                    <a href={`mailto:${e.email}?subject=${encodeURIComponent('PlacementIQ: your enquiry')}`} className="font-medium text-brand-dark underline">{e.email}</a>
                    {e.phone && <> · {e.phone}</>}
                    {e.topic && <> · <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-dark">{e.topic}</span></>}
                  </p>
                </div>
                <time dateTime={e.created_at} className="shrink-0 text-[11.5px] tabular-nums text-ink-faint">{new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink-soft">{e.message}</p>
              <button onClick={() => void mark(e, e.status === 'new')} className="mt-3 rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-soft hover:bg-white">
                {e.status === 'new' ? 'Mark as handled' : 'Mark as new'}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  )
}
