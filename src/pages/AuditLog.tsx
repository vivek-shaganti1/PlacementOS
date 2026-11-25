import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, EmptyState, Page, RowsSkeleton } from '../components/Page'
import { useAuth } from '../lib/auth'
import { downloadText, toCsv } from '../lib/csv'
import { istDay } from '../lib/dates'
import { errMsg, supabase } from '../lib/supabase'

// The audit trail the database writes by trigger (roles, roster, academics, drives, applications, certificates),
// shown to the people accountable for it: a placement cell sees its own college, platform admins see every college.
// Read-only: nobody can edit or delete these rows, including through this page.

type Row = { id: number; at: string; actor: string | null; org_id: string | null; action: string; target: string; detail: Record<string, unknown> | null }
const PAGE = 50

const ACTIONS: Record<string, { label: string; group: string }> = {
  'org_students.insert': { label: 'Student added to roster', group: 'Roster' },
  'org_students.update': { label: 'Official academics changed', group: 'Roster' },
  'org_students.delete': { label: 'Student removed from roster', group: 'Roster' },
  'user_roles.insert': { label: 'Access granted', group: 'Access' },
  'user_roles.delete': { label: 'Access removed', group: 'Access' },
  'org_recruiters.insert': { label: 'Recruiter added', group: 'Access' },
  'org_recruiters.update': { label: 'Recruiter changed', group: 'Access' },
  'org_recruiters.delete': { label: 'Recruiter removed', group: 'Access' },
  'job_postings.delete': { label: 'Drive deleted', group: 'Drives' },
  'job_applications.update': { label: 'Application status changed', group: 'Drives' },
  'job_applications.delete': { label: 'Application removed', group: 'Drives' },
  'credentials.update': { label: 'Certificate reviewed', group: 'Certificates' },
  'organizations.insert': { label: 'College created', group: 'College' },
  'organizations.update': { label: 'College plan or admins changed', group: 'College' },
  'organizations.delete': { label: 'College deleted', group: 'College' },
}
const GROUPS = ['Roster', 'Access', 'Drives', 'Certificates', 'College']

/** A short sentence for the detail object the trigger stored. */
function describe(action: string, d: Record<string, unknown> | null): string {
  if (!d) return ''
  const v = (k: string) => (d[k] === null || d[k] === undefined ? 'none' : String(d[k]))
  const parts: string[] = []
  if (action === 'org_students.update' && d.from && d.to) {
    const from = d.from as Record<string, unknown>
    const to = d.to as Record<string, unknown>
    const names: Record<string, string> = { cgpa: 'CGPA', backlogs: 'Backlogs', class_x: 'Class X', class_xii: 'Class XII' }
    for (const k of Object.keys(names)) if (String(from[k]) !== String(to[k])) parts.push(`${names[k]} ${from[k] ?? 'none'} → ${to[k] ?? 'none'}`)
  } else if ('from' in d && 'to' in d) parts.push(`${v('from')} → ${v('to')}`)
  if (d.role) parts.push(`Role: ${String(d.role).replace('_', ' ')}`)
  if (d.company) parts.push(`${d.company}${d.role && action.startsWith('job_postings') ? '' : ''}`)
  if (d.kind) parts.push(`Type: ${v('kind')}`)
  if (d.status && !('to' in d)) parts.push(`Status: ${v('status')}`)
  if ('plan_before' in d && d.plan_before !== d.plan_after) parts.push(`Plan ${v('plan_before')} → ${v('plan_after')}`)
  if ('seats_before' in d && d.seats_before !== d.seats_after) parts.push(`Seats ${v('seats_before')} → ${v('seats_after')}`)
  if ('admins_before' in d && d.admins_before !== d.admins_after) parts.push(`Admins ${v('admins_before')} → ${v('admins_after')}`)
  if (d.reason) parts.push(`Reason: ${v('reason')}`)
  return parts.join(' · ')
}

export default function AuditLog() {
  const { session, isSuperAdmin } = useAuth()
  const me = session?.user.id
  const [rows, setRows] = useState<Row[] | null>(null)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [group, setGroup] = useState('')
  const [q, setQ] = useState('')
  const [names, setNames] = useState<Record<string, string>>({})
  const [orgs, setOrgs] = useState<Record<string, string>>({})
  const [rosterNames, setRosterNames] = useState<Record<string, string>>({})

  const load = useCallback(
    async (before?: number) => {
      setBusy(true)
      setError(null)
      let query = supabase.from('audit_log').select('id,at,actor,org_id,action,target,detail').order('id', { ascending: false }).limit(PAGE + 1)
      if (before) query = query.lt('id', before)
      if (group) query = query.in('action', Object.keys(ACTIONS).filter((a) => ACTIONS[a].group === group))
      const { data, error } = await query
      setBusy(false)
      if (error) return setError(errMsg(error))
      const page = (data ?? []) as Row[]
      setMore(page.length > PAGE)
      const shown = page.slice(0, PAGE)
      setRows((old) => (before && old ? [...old, ...shown] : shown))
      // People are shown by name where this account is allowed to read their profile; otherwise as "another admin".
      const ids = [...new Set(shown.flatMap((r) => [r.actor, /^[0-9a-f-]{36}$/.test(r.target) ? r.target : null]).filter((x): x is string => !!x))]
      if (ids.length) {
        const { data: people } = await supabase.from('profiles').select('id,full_name,email').in('id', ids)
        setNames((n) => ({ ...n, ...Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name || p.email])) }))
      }
      // Roster entries are numbered, not keyed by account; a removed student no longer resolves and shows no name.
      const rosterIds = [...new Set(shown.filter((r) => r.action.startsWith('org_students.') && /^\d+$/.test(r.target)).map((r) => Number(r.target)))]
      if (rosterIds.length) {
        const { data: roster } = await supabase.from('org_students').select('id,full_name,email').in('id', rosterIds)
        setRosterNames((n) => ({ ...n, ...Object.fromEntries((roster ?? []).map((p) => [String(p.id), p.full_name || p.email])) }))
      }
    },
    [group],
  )
  useEffect(() => {
    setRows(null)
    void load()
  }, [load])
  useEffect(() => {
    if (!isSuperAdmin) return
    supabase.from('organizations').select('id,name').then(({ data }) => setOrgs(Object.fromEntries((data ?? []).map((o) => [o.id, o.name]))))
  }, [isSuperAdmin])

  const who = useCallback((id: string | null) => (!id ? 'System' : id === me ? 'You' : names[id] ?? 'Another admin'), [me, names])
  const view = useMemo(
    () =>
      (rows ?? [])
        .map((r) => ({ ...r, label: ACTIONS[r.action]?.label ?? r.action, text: describe(r.action, r.detail), by: who(r.actor), about: (r.action.startsWith('org_students.') ? rosterNames[r.target] : names[r.target]) ?? '' }))
        .filter((r) => !q.trim() || `${r.label} ${r.text} ${r.by} ${r.about}`.toLowerCase().includes(q.trim().toLowerCase())),
    [rows, q, who, names, rosterNames],
  )

  const exportCsv = () =>
    downloadText(
      `placementiq-activity-${istDay()}.csv`,
      toCsv(['When (IST)', 'Action', 'By', 'About', 'Details', ...(isSuperAdmin ? ['College'] : [])], view.map((r) => [new Date(r.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), r.label, r.by, r.about, r.text, ...(isSuperAdmin ? [orgs[r.org_id ?? ''] ?? ''] : [])])),
      'text/csv',
    )

  return (
    <Page title="Activity log" subtitle="Who changed what: roster, access, drives and certificates. Entries cannot be edited or deleted." wide>
      <Card
        title={rows ? `${view.length} ${view.length === 1 ? 'entry' : 'entries'}${more ? '+' : ''}` : 'Loading'}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filter by kind of change" className="h-[34px] rounded-[9px] border border-line bg-white px-2 text-[12.5px] text-ink">
              <option value="">All changes</option>
              {GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search loaded entries" aria-label="Search loaded entries" className="h-[34px] w-[190px] rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff]" />
            <button onClick={exportCsv} disabled={!view.length} className="rounded-[9px] border border-[#d5cbff] px-3 py-1.5 text-[12.5px] font-semibold text-brand-dark hover:bg-[#faf8ff] disabled:opacity-50">Export CSV</button>
          </div>
        }
      >
        {error && <p role="alert" className="text-[12.5px] text-[#b42318]">{error}</p>}
        {!rows && !error && <RowsSkeleton rows={6} />}
        {rows && !view.length && <EmptyState title="Nothing recorded yet" body="Changes to the roster, access, drives and certificates will appear here as they happen." />}
        {rows && view.length > 0 && (
          <div className="scroll-thin -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-medium text-ink-mute">
                  <th scope="col" className="py-2 pr-3 font-medium">When</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Change</th>
                  <th scope="col" className="py-2 pr-3 font-medium">By</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Details</th>
                  {isSuperAdmin && <th scope="col" className="py-2 font-medium">College</th>}
                </tr>
              </thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-ink-mute">
                      <time dateTime={r.at}>{new Date(r.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-ink">{r.label}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{r.by}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{[r.about, r.text].filter(Boolean).join(' · ') || '—'}</td>
                    {isSuperAdmin && <td className="py-2.5 text-ink-mute">{orgs[r.org_id ?? ''] ?? '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {more && rows && (
          <button onClick={() => void load(rows[rows.length - 1].id)} disabled={busy} className="mt-3 rounded-[9px] border border-line px-4 py-2 text-[12.5px] font-semibold text-ink-soft hover:bg-white disabled:opacity-50">
            {busy ? 'Loading…' : 'Load older entries'}
          </button>
        )}
      </Card>
    </Page>
  )
}
