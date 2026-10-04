import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Page, RowsSkeleton, Stat } from '../components/Page'
import { useAdminOrgs } from '../lib/admin'
import { callApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useApp } from '../lib/store'
import { errMsg, supabase, type Organization } from '../lib/supabase'

type RosterRow = { id: number; email: string; full_name: string; roll_number: string; branch: string; batch: string; user_id: string | null; invited_at: string | null; created_at: string }
type InviteResult = { email: string; status: 'invited' | 'existing' | 'failed' | 'saved'; detail?: string }
type AdminRow = { email: string; user_id: string | null; full_name: string; joined: boolean }

function Denied({ what }: { what: string }) {
  return (
    <Page title={what}>
      <Card>
        <p className="py-8 text-center text-[13px] text-ink-mute">This page is only available to placement-cell administrators.</p>
      </Card>
    </Page>
  )
}

/** College picker shared by the admin pages; hidden when only one college is available. */
function useOrgPicker() {
  const { orgs, loading, reload } = useAdminOrgs()
  const [orgId, setOrgId] = useState('')
  useEffect(() => {
    if ((!orgId || !orgs.some((o) => o.id === orgId)) && orgs.length) setOrgId(orgs[0].id)
  }, [orgs, orgId])
  const org = orgs.find((o) => o.id === orgId) ?? null
  const picker =
    orgs.length > 1 ? (
      <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="field w-full sm:w-auto" aria-label="College">
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    ) : null
  return { orgs, org, orgId, picker, loading, reload }
}

/** Parses pasted CSV or tab-separated rows: email, full name, roll number, branch, batch. */
function parseRoster(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((c) => c.trim()))
    .filter((cols) => cols[0] && cols[0].includes('@'))
    .map(([email, full_name = '', roll_number = '', branch = '', batch = '']) => ({ email: email.toLowerCase(), full_name, roll_number, branch, batch }))
}

function ResultList({ results }: { results: InviteResult[] }) {
  if (!results.length) return null
  const label: Record<InviteResult['status'], string> = { invited: 'Invite sent', existing: 'Already registered', failed: 'Failed', saved: 'Saved, no email sent' }
  return (
    <div className="mt-3 max-h-[220px] overflow-y-auto border border-rule">
      {results.map((r) => (
        <p key={r.email} className="flex flex-wrap gap-x-3 border-b border-rule px-3 py-1.5 text-[12px] last:border-0">
          <span className="font-medium text-ink">{r.email}</span>
          <span className={r.status === 'failed' ? 'text-[#9C3526]' : r.status === 'invited' ? 'text-[#0A6B50]' : 'text-ink-mute'}>{label[r.status]}</span>
          {r.detail && <span className="text-ink-faint">{r.detail}</span>}
        </p>
      ))}
    </div>
  )
}

/* ================================================================ roster */
export function AdminRoster() {
  const { isAdmin } = useAuth()
  const { showToast } = useApp()
  const { org, orgId, picker, loading: orgsLoading } = useOrgPicker()
  const [rows, setRows] = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [paste, setPaste] = useState('')
  const [single, setSingle] = useState({ email: '', full_name: '', roll_number: '', branch: '', batch: '' })
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data, error } = await supabase.from('org_students').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    if (error) showToast(error.message)
    setRows((data ?? []) as RosterRow[])
    setLoading(false)
  }, [orgId, showToast])
  useEffect(() => {
    load()
  }, [load])

  const parsed = useMemo(() => parseRoster(paste), [paste])
  const shown = rows.filter((r) => (r.email + r.full_name + r.roll_number).toLowerCase().includes(q.toLowerCase()))

  const submit = async (people: ReturnType<typeof parseRoster>, send: boolean) => {
    if (!people.length || !orgId) return
    setBusy(true)
    try {
      const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', org_id: orgId, role: 'student', people, send })
      setResults(results)
      showToast(`${results.length} student record${results.length === 1 ? '' : 's'} processed.`)
      setPaste('')
      setSingle({ email: '', full_name: '', roll_number: '', branch: '', batch: '' })
      load()
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (r: RosterRow) => {
    if (!window.confirm(`Remove ${r.email} from the roster? Their account, if any, is not deleted.`)) return
    const { error } = await supabase.from('org_students').delete().eq('id', r.id)
    if (error) return showToast(error.message)
    load()
  }

  if (!isAdmin) return <Denied what="Roster" />
  const joined = rows.filter((r) => r.user_id).length

  return (
    <Page title="Student roster" subtitle="Official student records for your college. Students who sign up with a listed email are linked to their record automatically." wide actions={picker}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On roster" value={`${rows.length}`} />
        <Stat label="Joined PlacementIQ" value={`${joined}`} />
        <Stat label="Invited, not joined" value={`${rows.filter((r) => r.invited_at && !r.user_id).length}`} />
        <Stat label="Email domains" value={`${org?.email_domains.length ?? 0}`} sub={org?.email_domains.join(', ') || 'None set'} />
      </div>

      <Card title="Add one student">
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_0.9fr_1fr_0.6fr_auto]"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            submit([{ ...single, email: single.email.trim().toLowerCase() }], true)
          }}
        >
          <input required type="email" value={single.email} onChange={(e) => setSingle({ ...single, email: e.target.value })} placeholder={`student@${org?.email_domains[0] ?? 'college.edu'}`} className="field" />
          <input value={single.full_name} onChange={(e) => setSingle({ ...single, full_name: e.target.value })} placeholder="Full name" className="field" />
          <input value={single.roll_number} onChange={(e) => setSingle({ ...single, roll_number: e.target.value })} placeholder="Roll number" className="field" />
          <input value={single.branch} onChange={(e) => setSingle({ ...single, branch: e.target.value })} placeholder="Branch" className="field" />
          <input value={single.batch} onChange={(e) => setSingle({ ...single, batch: e.target.value })} placeholder="Batch" className="field" />
          <button disabled={busy || !orgId} className="btn-primary">Save and invite</button>
        </form>
      </Card>

      <Card title="Import many students">
        <p className="text-[12.5px] text-ink-mute">
          Paste rows from a spreadsheet, one student per line: <span className="figure text-ink">email, full name, roll number, branch, batch</span>. Commas or tabs both work.
        </p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="field mt-2 h-auto py-2 font-mono text-[12px]" placeholder={'23eg105a01@anurag.edu.in, Asha Reddy, 23EG105A01, CSE, 2027'} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink-mute">{parsed.length} valid row{parsed.length === 1 ? '' : 's'}</span>
          <button disabled={busy || !parsed.length} onClick={() => submit(parsed, true)} className="btn-primary">Save and send invites</button>
          <button disabled={busy || !parsed.length} onClick={() => submit(parsed, false)} className="btn-glass">Save without emailing</button>
        </div>
        <ResultList results={results} />
      </Card>

      <Card title={`Roster (${rows.length})`} action={<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="field h-[32px] w-[200px]" />}>
        {loading || orgsLoading ? (
          <RowsSkeleton rows={5} />
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No students on the roster yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-rule text-[11px] font-semibold text-ink-mute">
                  {['Roll no.', 'Name', 'Email', 'Branch', 'Batch', 'Status', ''].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-rule/70">
                    <td className="figure px-2 py-2">{r.roll_number || 'n/a'}</td>
                    <td className="px-2 py-2 font-medium text-ink">{r.full_name || 'n/a'}</td>
                    <td className="px-2 py-2 text-ink-soft">{r.email}</td>
                    <td className="px-2 py-2 text-ink-soft">{r.branch || 'n/a'}</td>
                    <td className="px-2 py-2 text-ink-soft">{r.batch || 'n/a'}</td>
                    <td className={`px-2 py-2 ${r.user_id ? 'text-[#0A6B50]' : 'text-ink-mute'}`}>{r.user_id ? 'Joined' : r.invited_at ? 'Invited' : 'Not invited'}</td>
                    <td className="px-2 py-2 text-right">
                      {!r.user_id && (
                        <button onClick={() => submit([{ email: r.email, full_name: r.full_name, roll_number: r.roll_number, branch: r.branch, batch: r.batch }], true)} className="mr-3 text-[12px] font-semibold text-brand underline" disabled={busy}>
                          {r.invited_at ? 'Resend' : 'Invite'}
                        </button>
                      )}
                      <button onClick={() => remove(r)} className="text-[12px] text-[#9C3526] underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  )
}

/* ================================================================ org admins */
export function AdminTeam() {
  const { isAdmin, session } = useAuth()
  const { showToast } = useApp()
  const { org, orgId, picker } = useOrgPicker()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data, error } = await supabase.rpc('org_admins', { target_org: orgId })
    if (error) showToast(error.message)
    setAdmins((data ?? []) as AdminRow[])
    setLoading(false)
  }, [orgId, showToast])
  useEffect(() => {
    load()
  }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', org_id: orgId, role: 'org_admin', people: [{ email: email.trim() }] })
      setResults(results)
      setEmail('')
      load()
    } catch (err) {
      showToast(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (a: AdminRow) => {
    if (!window.confirm(`Remove admin access for ${a.email}?`)) return
    const { error } = await supabase.rpc('remove_org_admin', { target_org: orgId, target_email: a.email })
    if (error) return showToast(errMsg(error))
    showToast('Admin access removed.')
    load()
  }

  if (!isAdmin) return <Denied what="Admins" />
  const me = session?.user.email?.toLowerCase()

  return (
    <Page title="Placement cell admins" subtitle={`People who can see every ${org?.name ?? 'college'} student, post drives and manage the roster.`} actions={picker}>
      <Card title="Add an admin">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={`placement@${org?.email_domains[0] ?? 'college.edu'}`} className="field" />
          <button disabled={busy || !orgId} className="btn-primary shrink-0">Add and invite</button>
        </form>
        <p className="mt-2 text-[12px] text-ink-mute">Existing accounts get access immediately. New addresses receive an invite and become admins when they sign up.</p>
        <ResultList results={results} />
      </Card>

      <Card title={`Admins of ${org?.name ?? 'this college'}`}>
        {loading ? (
          <RowsSkeleton rows={3} />
        ) : admins.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-ink-faint">No admins yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {admins.map((a) => (
              <div key={a.email} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{a.full_name || a.email}</span>
                  {a.full_name && <span className="block truncate text-[12px] text-ink-mute">{a.email}</span>}
                </span>
                <span className={`text-[12px] ${a.joined ? 'text-[#0A6B50]' : 'text-ink-mute'}`}>{a.joined ? 'Active' : a.user_id ? 'Account exists' : 'Invited, not signed up'}</span>
                {a.email !== me && <button onClick={() => remove(a)} className="text-[12px] text-[#9C3526] underline">Remove</button>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  )
}

/* ================================================================ super admin: organizations */
const blankOrg = { name: '', short_name: '', official_code: '', city: '', email_domains: '', admin_emails: '' }

export function SuperOrgs() {
  const { isSuperAdmin } = useAuth()
  const { showToast } = useApp()
  const navigate = useNavigate()
  const { orgs, loading, reload } = useAdminOrgs()
  const [counts, setCounts] = useState<Record<string, { students: number; roster: number; jobs: number }>>({})
  const [editing, setEditing] = useState<Organization | null>(null)
  const [f, setF] = useState(blankOrg)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!orgs.length) return
    Promise.all([
      supabase.from('profiles').select('org_id'),
      supabase.from('org_students').select('org_id'),
      supabase.from('job_postings').select('org_id'),
    ]).then(([p, r, j]) => {
      const c: Record<string, { students: number; roster: number; jobs: number }> = {}
      for (const o of orgs) c[o.id] = { students: 0, roster: 0, jobs: 0 }
      for (const x of p.data ?? []) if (x.org_id && c[x.org_id]) c[x.org_id].students++
      for (const x of r.data ?? []) if (c[x.org_id]) c[x.org_id].roster++
      for (const x of j.data ?? []) if (x.org_id && c[x.org_id]) c[x.org_id].jobs++
      setCounts(c)
    })
  }, [orgs])

  const startEdit = (o: Organization | null) => {
    setEditing(o)
    setF(o ? { name: o.name, short_name: o.short_name, official_code: o.official_code ?? '', city: o.city, email_domains: o.email_domains.join(', '), admin_emails: o.admin_emails.join(', ') } : blankOrg)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const list = (v: string) => v.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean)
    const domains = list(f.email_domains).map((d) => d.replace(/^@/, '').toLowerCase())
    if (f.name.trim().length < 2) return showToast('Enter the organization name.')
    if (!domains.length) return showToast('Add at least one official email domain, for example anurag.edu.in.')
    if (domains.some((d) => !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))) return showToast('Email domains must look like college.edu.in')
    const row = { name: f.name.trim(), short_name: f.short_name.trim(), official_code: f.official_code.trim() || null, city: f.city.trim(), email_domains: domains, admin_emails: list(f.admin_emails).map((x) => x.toLowerCase()) }
    setBusy(true)
    const { error } = editing ? await supabase.from('organizations').update(row).eq('id', editing.id) : await supabase.from('organizations').insert(row)
    setBusy(false)
    if (error) return showToast(error.message.includes('official_code') ? 'Another organization already uses that official code.' : error.message)
    showToast(editing ? 'Organization updated.' : 'Organization created. Matching accounts were attached automatically.')
    startEdit(null)
    reload()
  }

  const remove = async (o: Organization) => {
    if (!window.confirm(`Delete ${o.name}? Its roster, drives and admin roles are removed. Student accounts stay but are detached.`)) return
    const { error } = await supabase.from('organizations').delete().eq('id', o.id)
    if (error) return showToast(error.message)
    reload()
  }

  if (!isSuperAdmin) return <Denied what="Organizations" />

  return (
    <Page title="Organizations" subtitle="Colleges on PlacementIQ. Students are attached by their official email domain; each college's admins see only their own students." wide>
      <Card title={editing ? `Edit ${editing.name}` : 'Add an organization'}>
        <form onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ['name', 'Name', 'Anurag University'],
            ['short_name', 'Short name', 'Anurag'],
            ['official_code', 'Official college code', 'e.g. AICTE or university code'],
            ['city', 'City', 'Hyderabad'],
            ['email_domains', 'Official email domains', 'anurag.edu.in'],
            ['admin_emails', 'Admin emails', 'admin@anurag.edu.in'],
          ] as const).map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
              <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} className="field mt-1" />
            </label>
          ))}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
            <button disabled={busy} className="btn-primary">{editing ? 'Save changes' : 'Create organization'}</button>
            {editing && <button type="button" onClick={() => startEdit(null)} className="btn-glass">Cancel</button>}
          </div>
        </form>
        <p className="mt-3 text-[12px] text-ink-mute">Separate multiple domains or emails with commas. Admin emails become placement-cell admins when they sign up; send invites from the Admins page.</p>
      </Card>

      <Card title={`All organizations (${orgs.length})`}>
        {loading ? (
          <RowsSkeleton rows={3} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-rule text-[11px] font-semibold text-ink-mute">
                  {['Organization', 'Code', 'Domains', 'Students', 'Roster', 'Drives', 'Admins', ''].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-b border-rule/70 align-top">
                    <td className="px-2 py-2.5">
                      <span className="block font-semibold text-ink">{o.name}</span>
                      <span className="text-[11.5px] text-ink-mute">{o.city || 'n/a'}</span>
                    </td>
                    <td className="figure px-2 py-2.5">{o.official_code || 'n/a'}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{o.email_domains.join(', ') || 'n/a'}</td>
                    <td className="figure px-2 py-2.5">{counts[o.id]?.students ?? '...'}</td>
                    <td className="figure px-2 py-2.5">{counts[o.id]?.roster ?? '...'}</td>
                    <td className="figure px-2 py-2.5">{counts[o.id]?.jobs ?? '...'}</td>
                    <td className="px-2 py-2.5 text-ink-soft">{o.admin_emails.join(', ') || 'none'}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px]">
                      <button onClick={() => navigate(`/admin/students?org=${o.id}`)} className="mr-3 font-semibold text-brand underline">Students</button>
                      <button onClick={() => startEdit(o)} className="mr-3 text-ink-soft underline">Edit</button>
                      <button onClick={() => remove(o)} className="text-[#9C3526] underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  )
}
