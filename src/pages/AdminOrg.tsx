import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Page, RowsSkeleton, Stat } from '../components/Page'
import { sectionLabel, yearLabel, yearOfStudy } from '../lib/academics'
import { useAdminOrgs, useStudents } from '../lib/admin'
import { branchCode } from '../lib/eligibility'
import { callApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useJobs } from '../lib/jobs'
import { useApp } from '../lib/store'
import { collegeEconomics, COSTS, inr, PLANS, type PlanKey } from '../lib/pricing'
import { errMsg, supabase, type Organization } from '../lib/supabase'

type RosterRow = { id: number; email: string; full_name: string; roll_number: string; branch: string; batch: string; section: string; program: string; user_id: string | null; invited_at: string | null; created_at: string }
type InviteResult = { email: string; status: 'invited' | 'created' | 'existing' | 'failed' | 'saved'; detail?: string }
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

/** Parses pasted CSV or tab-separated rows: email, full name, roll number, branch, batch (graduation year), section. */
function parseRoster(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((c) => c.trim()))
    .filter((cols) => cols[0] && cols[0].includes('@'))
    .map(([email, full_name = '', roll_number = '', branch = '', batch = '', section = '']) => ({ email: email.toLowerCase(), full_name, roll_number, branch, batch, section: section.toUpperCase() }))
}

function ResultList({ results }: { results: InviteResult[] }) {
  if (!results.length) return null
  const label: Record<InviteResult['status'], string> = { invited: 'Invite sent', created: 'Login created', existing: 'Already registered', failed: 'Failed', saved: 'Saved, no email sent' }
  return (
    <div className="mt-3 max-h-[220px] overflow-y-auto border border-line">
      {results.map((r) => (
        <p key={r.email} className="flex flex-wrap gap-x-3 border-b border-line px-3 py-1.5 text-[12px] last:border-0">
          <span className="font-medium text-ink">{r.email}</span>
          <span className={r.status === 'failed' ? 'text-[#d92d20]' : r.status === 'invited' || r.status === 'created' ? 'text-[#067647]' : 'text-ink-mute'}>{label[r.status]}</span>
          {r.detail && <span className="text-ink-faint">{r.detail}</span>}
        </p>
      ))}
    </div>
  )
}

/**
 * How new logins are delivered: an invite email (limited by the mail provider, 2 per hour on Supabase's built-in mail)
 * or a temporary password set here and shared by the admin, which sends no email.
 */
function LoginMethod({ password, setPassword }: { password: string; setPassword: (v: string) => void }) {
  const [mode, setMode] = useState<'invite' | 'password'>(password ? 'password' : 'invite')
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-white/60 p-3 text-[12.5px] sm:flex-row sm:items-center">
      <span className="font-medium text-ink">New logins:</span>
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={mode === 'invite'} onChange={() => { setMode('invite'); setPassword('') }} /> Email an invite link
      </label>
      <label className="flex items-center gap-1.5">
        <input type="radio" checked={mode === 'password'} onChange={() => setMode('password')} /> Create with a temporary password
      </label>
      {mode === 'password' && (
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="field h-[34px] sm:max-w-[220px]" />
      )}
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
  const [single, setSingle] = useState({ email: '', full_name: '', roll_number: '', branch: '', batch: '', section: '' })
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [password, setPassword] = useState('')
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
  const [cls, setCls] = useState({ year: 'all', branch: 'all', section: 'all' })
  const shown = rows
    .filter((r) => (r.email + r.full_name + r.roll_number).toLowerCase().includes(q.toLowerCase()))
    .filter((r) => cls.year === 'all' || String(yearOfStudy(r.batch, r.program)) === cls.year)
    .filter((r) => cls.branch === 'all' || branchCode(r.branch) === cls.branch)
    .filter((r) => cls.section === 'all' || (r.section || '') === cls.section)
  const rosterBranches = [...new Set(rows.map((r) => branchCode(r.branch)))].sort()
  const rosterSections = [...new Set(rows.map((r) => r.section || ''))].sort()

  const submit = async (people: ReturnType<typeof parseRoster>, send: boolean) => {
    if (!people.length || !orgId) return
    const domains = org?.email_domains ?? []
    const outside = domains.length ? people.filter((p) => !domains.includes(p.email.split('@')[1])) : []
    if (outside.length) return showToast(`Only ${domains.map((d) => '@' + d).join(', ')} emails can be added. Check: ${outside.slice(0, 3).map((p) => p.email).join(', ')}`)
    if (org?.seat_limit != null && rows.length + people.filter((p) => !rows.some((r) => r.email === p.email)).length > org.seat_limit)
      return showToast(`This adds more students than your ${org.seat_limit} seats. Contact the platform admin to raise the limit.`)
    setBusy(true)
    try {
      if (send && password && password.length < 8) throw new Error('Temporary password must be at least 8 characters.')
      const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', org_id: orgId, role: 'student', people, send, password: send ? password || undefined : undefined })
      setResults(results)
      showToast(`${results.length} student record${results.length === 1 ? '' : 's'} processed.`)
      setPaste('')
      setSingle({ email: '', full_name: '', roll_number: '', branch: '', batch: '', section: '' })
      load()
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const updateSection = async (r: RosterRow, value: string) => {
    const section = value.trim().toUpperCase().slice(0, 20)
    if (section === r.section) return
    const { error } = await supabase.from('org_students').update({ section }).eq('id', r.id)
    if (error) return showToast(errMsg(error))
    setRows((all) => all.map((x) => (x.id === r.id ? { ...x, section } : x)))
    showToast(`${r.full_name || r.email} moved to ${section ? `section ${section}` : 'no section'}.`)
  }

  const remove = async (r: RosterRow) => {
    if (!window.confirm(`Remove ${r.email} from the roster? They lose access to PlacementIQ; their account is not deleted.`)) return
    const { error } = await supabase.from('org_students').delete().eq('id', r.id)
    if (error) return showToast(error.message)
    load()
  }

  if (!isAdmin) return <Denied what="Roster" />
  const joined = rows.filter((r) => r.user_id).length

  return (
    <Page title="Student roster" subtitle="Only students on this list can use PlacementIQ. Students register themselves with their college email and roll number, or you create their login with a temporary password." wide actions={picker}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On roster" value={`${rows.length}`} />
        <Stat label="Joined PlacementIQ" value={`${joined}`} />
        <Stat label="Invited, not joined" value={`${rows.filter((r) => r.invited_at && !r.user_id).length}`} />
        <Stat label="Seats" value={`${rows.length} / ${org?.seat_limit ?? '∞'}`} sub={org?.email_domains.length ? `Only ${org.email_domains.map((d) => '@' + d).join(', ')} emails` : 'Any email allowed'} />
      </div>

      <LoginMethod password={password} setPassword={setPassword} />

      <Card title="Add one student">
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_0.9fr_0.9fr_0.7fr_0.6fr_auto]"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            submit([{ ...single, email: single.email.trim().toLowerCase() }], true)
          }}
        >
          <input required type="email" value={single.email} onChange={(e) => setSingle({ ...single, email: e.target.value })} placeholder={`student@${org?.email_domains[0] ?? 'college.edu'}`} className="field" />
          <input value={single.full_name} onChange={(e) => setSingle({ ...single, full_name: e.target.value })} placeholder="Full name" className="field" />
          <input required value={single.roll_number} onChange={(e) => setSingle({ ...single, roll_number: e.target.value })} placeholder="Roll number" className="field" />
          <input value={single.branch} onChange={(e) => setSingle({ ...single, branch: e.target.value })} placeholder="Branch" className="field" />
          <input value={single.batch} onChange={(e) => setSingle({ ...single, batch: e.target.value })} placeholder="Grad. year" inputMode="numeric" className="field" />
          <input value={single.section} onChange={(e) => setSingle({ ...single, section: e.target.value.toUpperCase() })} placeholder="Section" className="field" />
          <button disabled={busy || !orgId} className="btn-primary">{password ? 'Save and create login' : 'Save and invite'}</button>
        </form>
      </Card>

      <Card title="Import many students">
        <p className="text-[12.5px] text-ink-mute">
          Paste rows from a spreadsheet, one student per line: <span className="tabular-nums text-ink">email, full name, roll number, branch, graduation year, section</span>.
          Commas or tabs both work. Year of study (1st to 4th) is worked out from the graduation year. Re-importing a student updates their record.
        </p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="field mt-2 h-auto py-2 font-mono text-[12px]" placeholder={'23eg105a01@anurag.edu.in, Asha Reddy, 23EG105A01, CSE, 2027, A'} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink-mute">{parsed.length} valid row{parsed.length === 1 ? '' : 's'}</span>
          <button disabled={busy || !parsed.length} onClick={() => submit(parsed, true)} className="btn-primary">{password ? 'Save and create logins' : 'Save and send invites'}</button>
          <button disabled={busy || !parsed.length} onClick={() => submit(parsed, false)} className="btn-glass">Save without emailing</button>
        </div>
        <ResultList results={results} />
      </Card>

      <Card
        title={`Roster (${shown.length} of ${rows.length})`}
        action={
          <div className="flex flex-wrap gap-2">
            <select value={cls.year} onChange={(e) => setCls({ ...cls, year: e.target.value })} className="field h-[32px] w-auto text-[12px]" aria-label="Year">
              <option value="all">All years</option>
              {[1, 2, 3, 4].map((y) => <option key={y} value={String(y)}>{yearLabel(y)}</option>)}
              <option value="0">Graduated</option>
            </select>
            <select value={cls.branch} onChange={(e) => setCls({ ...cls, branch: e.target.value })} className="field h-[32px] w-auto text-[12px]" aria-label="Branch">
              <option value="all">All branches</option>
              {rosterBranches.map((b) => <option key={b}>{b}</option>)}
            </select>
            <select value={cls.section} onChange={(e) => setCls({ ...cls, section: e.target.value })} className="field h-[32px] w-auto text-[12px]" aria-label="Section">
              <option value="all">All sections</option>
              {rosterSections.map((x) => <option key={x} value={x}>{sectionLabel(x)}</option>)}
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="field h-[32px] w-[180px]" />
          </div>
        }
      >
        {loading || orgsLoading ? (
          <RowsSkeleton rows={5} />
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No students on the roster yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold text-ink-mute">
                  {['Roll no.', 'Name', 'Email', 'Year', 'Branch', 'Section', 'Status', ''].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-b border-line/70">
                    <td className="tabular-nums px-2 py-2">{r.roll_number || 'n/a'}</td>
                    <td className="px-2 py-2 font-medium text-ink">{r.full_name || 'n/a'}</td>
                    <td className="px-2 py-2 text-ink-soft">{r.email}</td>
                    <td className="px-2 py-2 text-ink-soft">{yearLabel(yearOfStudy(r.batch, r.program), r.program)}<span className="block text-[11px] text-ink-faint">{r.batch ? `Class of ${r.batch}` : ''}</span></td>
                    <td className="px-2 py-2 text-ink-soft">{r.branch || 'n/a'}</td>
                    <td className="px-2 py-2">
                      <input
                        defaultValue={r.section}
                        onBlur={(e) => updateSection(r, e.target.value)}
                        placeholder="Set"
                        aria-label={`Section for ${r.email}`}
                        className="field h-[30px] w-[64px] px-2 text-center text-[12px] uppercase"
                      />
                    </td>
                    <td className={`px-2 py-2 ${r.user_id ? 'text-[#067647]' : 'text-ink-mute'}`}>{r.user_id ? 'Joined' : r.invited_at ? 'Invited' : 'Not invited'}</td>
                    <td className="px-2 py-2 text-right">
                      {!r.user_id && (
                        <button onClick={() => submit([{ email: r.email, full_name: r.full_name, roll_number: r.roll_number, branch: r.branch, batch: r.batch, section: r.section }], true)} className="mr-3 text-[12px] font-semibold text-brand underline" disabled={busy}>
                          {r.invited_at ? 'Resend' : 'Invite'}
                        </button>
                      )}
                      <button onClick={() => remove(r)} className="text-[12px] text-[#d92d20] underline">Remove</button>
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

/* ================================================================ recruiters */
type RecruiterRow = { id: number; email: string; company: string; full_name: string; user_id: string | null; created_at: string }

/** Company recruiters for one college: they post drives for their company and see only their own applicants. */
function RecruitersCard({ orgId }: { orgId: string }) {
  const { showToast } = useApp()
  const [rows, setRows] = useState<RecruiterRow[]>([])
  const [f, setF] = useState({ email: '', company: '', full_name: '' })
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])

  const load = useCallback(async () => {
    if (!orgId) return
    const { data, error } = await supabase.from('org_recruiters').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    if (error) showToast(errMsg(error))
    setRows((data ?? []) as RecruiterRow[])
  }, [orgId, showToast])
  useEffect(() => {
    load()
  }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.email.trim() || !f.company.trim()) return showToast('Enter the recruiter email and their company.')
    if (password && password.length < 8) return showToast('Temporary password must be at least 8 characters.')
    setBusy(true)
    try {
      const { results } = await callApi<{ results: InviteResult[] }>('admin', {
        action: 'invite', org_id: orgId, role: 'recruiter', password: password || undefined,
        people: [{ email: f.email.trim().toLowerCase(), company: f.company.trim(), full_name: f.full_name.trim() }],
      })
      setResults(results)
      setF({ email: '', company: '', full_name: '' })
      load()
    } catch (err) {
      showToast(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (r: RecruiterRow) => {
    if (!window.confirm(`Remove ${r.email} (${r.company})? They lose access to this college; their drives stay with the placement cell.`)) return
    const { error } = await supabase.from('org_recruiters').delete().eq('id', r.id)
    if (error) return showToast(errMsg(error))
    showToast('Recruiter removed.')
    load()
  }

  return (
    <Card title={`Recruiters (${rows.length})`}>
      <p className="text-[12.5px] text-ink-mute">
        Recruiters post drives for their own company at your college and see the full profiles of students who apply to those drives. They never see your roster or other students.
      </p>
      <form onSubmit={add} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
        <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="hr@company.com" className="field" />
        <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company" className="field" />
        <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Name (optional)" className="field" />
        <button disabled={busy || !orgId} className="btn-primary">{password ? 'Add and create login' : 'Add and invite'}</button>
      </form>
      <div className="mt-3"><LoginMethod password={password} setPassword={setPassword} /></div>
      <ResultList results={results} />
      <div className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-ink">{r.company}</span>
              <span className="block truncate text-[12px] text-ink-mute">{[r.full_name, r.email].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`text-[12px] ${r.user_id ? 'text-[#067647]' : 'text-ink-mute'}`}>{r.user_id ? 'Active' : 'Invited, not signed up'}</span>
            <button onClick={() => remove(r)} className="text-[12px] text-[#d92d20] underline">Remove</button>
          </div>
        ))}
        {!rows.length && <p className="py-4 text-center text-[12.5px] text-ink-faint">No recruiters yet.</p>}
      </div>
    </Card>
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
  const [password, setPassword] = useState('')

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
      const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', org_id: orgId, role: 'org_admin', people: [{ email: email.trim() }], password: password || undefined })
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
        <div className="mt-3"><LoginMethod password={password} setPassword={setPassword} /></div>
        <p className="mt-2 text-[12px] text-ink-mute">Existing accounts get access immediately. New addresses get an invite email, or a login with the temporary password you set.</p>
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
                <span className={`text-[12px] ${a.joined ? 'text-[#067647]' : 'text-ink-mute'}`}>{a.joined ? 'Active' : a.user_id ? 'Account exists' : 'Invited, not signed up'}</span>
                {a.email !== me && <button onClick={() => remove(a)} className="text-[12px] text-[#d92d20] underline">Remove</button>}
              </div>
            ))}
          </div>
        )}
      </Card>
      <RecruitersCard orgId={orgId} />
    </Page>
  )
}

/* ================================================================ super admin: organizations */
type Usage = {
  org_id: string; rostered: number; joined: number; onboarded: number; active_7d: number; active_30d: number; last_active: string | null
  storage_bytes: number; resumes: number; resume_analyses: number; jd_matches: number; ai_messages: number; coding_profiles: number
  drives: number; applications: number; admins: number; ai_actions_month: number; ai_actions_total: number
}

const blankOrg = {
  name: '', short_name: '', official_code: '', city: '', admin_emails: '', email_domains: '',
  plan: 'trial', seat_limit: '150', price_per_seat: '0', platform_fee: '0', ai_monthly_limit: '', billing_cycle: 'yearly', renews_on: '', notes: '',
}

const bytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`)
const ago = (iso: string | null) => {
  if (!iso) return 'never'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}
/** Billable seats: the seat limit when set, otherwise the students actually on the roster. */
const seatsOf = (o: Organization, u?: Usage) => o.seat_limit ?? u?.rostered ?? 0
const yearly = (o: Organization, u?: Usage) => seatsOf(o, u) * Number(o.price_per_seat) * (o.billing_cycle === 'monthly' ? 12 : 1) + Number(o.platform_fee ?? 0)
const aiCapOf = (o: Organization) => o.ai_monthly_limit ?? PLANS[o.plan as PlanKey]?.aiPerMonth ?? 15

/** Yearly revenue, estimated cost and margin per college, from the pricing model and real AI usage. */
function ProfitCard({ orgs, usage }: { orgs: Organization[]; usage: Record<string, Usage> }) {
  const [stack, setStack] = useState<'lean' | 'aws'>(() => {
    try {
      return localStorage.getItem('piq-infra') === 'aws' ? 'aws' : 'lean'
    } catch {
      return 'lean'
    }
  })
  const pick = (v: 'lean' | 'aws') => {
    setStack(v)
    try {
      localStorage.setItem('piq-infra', v)
    } catch {
      /* per-viewer preference only */
    }
  }
  const paying = orgs.filter((o) => o.plan !== 'trial').length || 1
  const rows = orgs.map((o) => {
    const u = usage[o.id]
    const seats = seatsOf(o, u)
    const e = collegeEconomics({
      seats,
      pricePerSeat: Number(o.price_per_seat) * (o.billing_cycle === 'monthly' ? 12 : 1),
      platformFee: Number(o.platform_fee ?? 0),
      aiPerMonth: aiCapOf(o),
      // Project this month's real AI actions over a 10-month academic year.
      aiActionsPerYear: u ? u.ai_actions_month * (o.plan === 'trial' ? 1 : 10) : null,
      colleges: o.plan === 'trial' ? orgs.length : paying,
      infraMonthly: COSTS.infraMonthlyInr[stack],
      months: o.plan === 'trial' ? 1 : 12,
    })
    return { o, seats, e }
  })
  const sum = (k: keyof ReturnType<typeof collegeEconomics>) => rows.reduce((a, r) => a + r.e[k], 0)
  const revenue = sum('revenue')
  const profit = sum('profit')
  const tone = (m: number) => (m >= 50 ? 'text-[#067647]' : m >= 30 ? 'text-[#b45309]' : 'text-[#d92d20]')
  return (
    <Card
      title="Profit and costs (yearly estimate)"
      action={
        <select value={stack} onChange={(e) => pick(e.target.value as 'lean' | 'aws')} className="field h-[34px] w-auto text-[12px]" aria-label="Infrastructure">
          <option value="lean">Current stack: Supabase + Vercel ({inr(COSTS.infraMonthlyInr.lean)} / month)</option>
          <option value="aws">AWS production stack ({inr(COSTS.infraMonthlyInr.aws)} / month)</option>
        </select>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue / year" value={inr(revenue)} sub="seats + platform fees" />
        <Stat label="Estimated cost / year" value={inr(sum('cost'))} sub="AI, hosting, support, payments" />
        <Stat label="Profit / year" value={inr(profit)} sub={revenue ? `${((profit / revenue) * 100).toFixed(1)}% margin` : 'no paying colleges yet'} />
        <Stat label="Worst case profit" value={inr(revenue - sum('costWorst'))} sub="every student uses the full AI cap" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-[11px] font-semibold text-ink-mute">
              {['College', 'Seats', 'Revenue', 'AI (projected)', 'AI (full cap)', 'Hosting share', 'Support', 'Payments + sales', 'Profit', 'Margin', 'Worst case'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ o, seats, e }) => (
              <tr key={o.id} className="border-b border-line/70 tabular-nums">
                <td className="px-2 py-2.5 font-semibold text-ink">{o.short_name || o.name}<span className="ml-1.5 text-[11px] font-normal capitalize text-ink-faint">{o.plan}</span></td>
                <td className="px-2 py-2.5">{seats}</td>
                <td className="px-2 py-2.5">{inr(e.revenue)}</td>
                <td className="px-2 py-2.5">{inr(e.ai)}</td>
                <td className="px-2 py-2.5 text-ink-mute">{inr(e.aiWorst)}</td>
                <td className="px-2 py-2.5">{inr(e.infra)}</td>
                <td className="px-2 py-2.5">{inr(e.support)}</td>
                <td className="px-2 py-2.5">{inr(e.variable)}</td>
                <td className="px-2 py-2.5 font-semibold">{inr(e.profit)}</td>
                <td className={`px-2 py-2.5 font-semibold ${tone(e.margin)}`}>{e.revenue ? `${e.margin.toFixed(1)}%` : 'trial'}</td>
                <td className={`px-2 py-2.5 ${tone(e.marginWorst)}`}>{e.revenue ? `${e.marginWorst.toFixed(1)}%` : 'n/a'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
        Assumptions: one AI action costs about {inr(COSTS.aiActionInr * 100)} per 100 (Groq gpt-oss-120b, 5,000 input and 1,500 output tokens, plus 25% for retries);
        hosting is shared across paying colleges; support {inr(COSTS.supportPerCollegeYear)} per college per year; payments 2% and sales 10% of revenue; storage and email
        {' '}{inr(COSTS.storageEmailPerStudentYear)} per student per year. Projected AI uses this month's real usage over a 10-month year. GST is charged on top and not counted.
      </p>
    </Card>
  )
}

export function SuperOrgs() {
  const { isSuperAdmin } = useAuth()
  const { showToast } = useApp()
  const navigate = useNavigate()
  const { orgs, loading, reload } = useAdminOrgs()
  const [usage, setUsage] = useState<Record<string, Usage>>({})
  const [editing, setEditing] = useState<Organization | null>(null)
  const [f, setF] = useState(blankOrg)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [password, setPassword] = useState('')

  const loadUsage = useCallback(async () => {
    const { data, error } = await supabase.rpc('org_usage')
    if (error) return showToast(errMsg(error))
    setUsage(Object.fromEntries(((data ?? []) as Usage[]).map((u) => [u.org_id, u])))
  }, [showToast])
  useEffect(() => {
    if (isSuperAdmin) loadUsage()
  }, [isSuperAdmin, loadUsage, orgs])

  const totals = useMemo(() => {
    const us = Object.values(usage)
    return {
      students: us.reduce((a, u) => a + u.joined, 0),
      rostered: us.reduce((a, u) => a + u.rostered, 0),
      active: us.reduce((a, u) => a + u.active_30d, 0),
      storage: us.reduce((a, u) => a + u.storage_bytes, 0),
      revenue: orgs.reduce((a, o) => a + yearly(o, usage[o.id]), 0),
    }
  }, [usage, orgs])

  const startEdit = (o: Organization | null) => {
    setEditing(o)
    setResults([])
    setF(
      o
        ? {
            name: o.name, short_name: o.short_name, official_code: o.official_code ?? '', city: o.city, admin_emails: o.admin_emails.join(', '),
            email_domains: o.email_domains.join(', '), plan: o.plan, seat_limit: o.seat_limit == null ? '' : String(o.seat_limit),
            price_per_seat: String(o.price_per_seat), platform_fee: String(o.platform_fee ?? 0), ai_monthly_limit: o.ai_monthly_limit == null ? '' : String(o.ai_monthly_limit), billing_cycle: o.billing_cycle, renews_on: o.renews_on ?? '', notes: o.notes,
          }
        : blankOrg,
    )
    if (o) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const list = (v: string) => v.split(/[,\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    const admins = list(f.admin_emails)
    const domains = list(f.email_domains).map((d) => d.replace(/^@/, ''))
    if (f.name.trim().length < 2) return showToast('Enter the college name.')
    if (!admins.length) return showToast('Add the placement cell login email for this college.')
    if (password && password.length < 8) return showToast('Temporary password must be at least 8 characters.')
    if (admins.some((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) return showToast('Admin emails must be valid email addresses.')
    if (domains.some((d) => !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))) return showToast('Email domains must look like college.edu.in')
    const row = {
      name: f.name.trim(), short_name: f.short_name.trim(), official_code: f.official_code.trim() || null, city: f.city.trim(),
      admin_emails: admins, email_domains: domains, plan: f.plan, seat_limit: f.seat_limit === '' ? null : Math.max(0, Number(f.seat_limit)),
      price_per_seat: Math.max(0, Number(f.price_per_seat) || 0), platform_fee: Math.max(0, Number(f.platform_fee) || 0),
      ai_monthly_limit: f.ai_monthly_limit === '' ? null : Math.max(0, Math.round(Number(f.ai_monthly_limit))), billing_cycle: f.billing_cycle, renews_on: f.renews_on || null, notes: f.notes.trim(),
    }
    setBusy(true)
    const res = editing
      ? await supabase.from('organizations').update(row).eq('id', editing.id).select('id').single()
      : await supabase.from('organizations').insert(row).select('id').single()
    if (res.error) {
      setBusy(false)
      return showToast(res.error.message.includes('official_code') ? 'Another college already uses that official code.' : res.error.message)
    }
    // Send login invites to admin emails that are new for this college.
    const fresh = admins.filter((x) => !editing?.admin_emails.includes(x))
    if (fresh.length) {
      try {
        const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', org_id: res.data.id, role: 'org_admin', people: fresh.map((email) => ({ email })), password: password || undefined })
        setResults(results)
      } catch (err) {
        showToast(`College saved, but invites failed: ${errMsg(err)}`)
      }
    }
    setBusy(false)
    showToast(editing ? 'College updated.' : 'College created. Its admins can now sign in and add student emails.')
    setEditing(null)
    setF(blankOrg)
    reload()
  }

  const remove = async (o: Organization) => {
    if (!window.confirm(`Delete ${o.name}? Its roster, drives and admin roles are removed, and its students lose access.`)) return
    const { error } = await supabase.from('organizations').delete().eq('id', o.id)
    if (error) return showToast(error.message)
    reload()
  }

  if (!isSuperAdmin) return <Denied what="Organizations" />

  const input = (k: keyof typeof blankOrg, label: string, ph: string, type = 'text') => (
    <label key={k} className="block">
      <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
      <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} className="field mt-1" />
    </label>
  )

  return (
    <Page title="Organizations" subtitle="Every college on PlacementIQ: their admins, students, usage, storage and billing. Colleges add their own students' emails to give them access." wide>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Colleges" value={String(orgs.length)} sub={`${orgs.filter((o) => o.plan !== 'trial').length} paying`} />
        <Stat label="Students joined" value={String(totals.students)} sub={`${totals.rostered} on rosters`} />
        <Stat label="Active, 30 days" value={String(totals.active)} sub="signed in recently" />
        <Stat label="Storage used" value={bytes(totals.storage)} sub="resumes and photos" />
        <Stat label="Contract value" value={inr(totals.revenue)} sub="per year" />
      </div>

      <Card title={editing ? `Edit ${editing.name}` : 'Add a college'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {input('name', 'College name', 'Anurag University')}
            {input('short_name', 'Short name', 'Anurag')}
            {input('official_code', 'Official college code', 'e.g. AICTE or university code')}
            {input('city', 'City', 'Hyderabad')}
          </div>
          <div className="rounded-[16px] border border-[#d5cbff] bg-brand-tint p-4">
            <p className="text-[13px] font-semibold text-ink">Placement cell login</p>
            <p className="mt-0.5 text-[12px] text-ink-mute">
              The email the college's placement team signs in with. That account sees only this college: every student, their details, filters, rankings and applications.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {input('admin_emails', 'Placement cell email(s)', 'placement@anurag.edu.in, tpo@gmail.com')}
              {input('email_domains', 'Student email domain (optional, checks roster emails)', 'anurag.edu.in')}
            </div>
            <div className="mt-3"><LoginMethod password={password} setPassword={setPassword} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <label className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">Plan</span>
              <select
                value={f.plan}
                onChange={(e) => {
                  // Picking a plan fills in its list price, platform fee and seat default; all stay editable.
                  const p = PLANS[e.target.value as PlanKey]
                  setF({ ...f, plan: p.key, price_per_seat: String(p.pricePerSeat), platform_fee: String(p.platformFee), seat_limit: p.key === 'trial' ? '150' : f.seat_limit === '150' ? '' : f.seat_limit })
                }}
                className="field mt-1"
              >
                {Object.values(PLANS).map((p) => <option key={p.key} value={p.key}>{p.name}{p.pricePerSeat ? ` (${inr(p.pricePerSeat)} / seat)` : ''}</option>)}
              </select>
            </label>
            {input('seat_limit', 'Student seats', 'unlimited', 'number')}
            {input('price_per_seat', 'Price per seat / year (₹)', '0', 'number')}
            {input('platform_fee', 'Platform fee / year (₹)', '0', 'number')}
            {input('ai_monthly_limit', `AI actions / student / month (plan: ${PLANS[f.plan as PlanKey]?.aiPerMonth ?? 15})`, 'plan default', 'number')}
            <label className="block">
              <span className="text-[11.5px] font-medium text-ink-mute">Billing</span>
              <select value={f.billing_cycle} onChange={(e) => setF({ ...f, billing_cycle: e.target.value })} className="field mt-1">
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            {input('renews_on', 'Renews on', '', 'date')}
          </div>
          {input('notes', 'Notes', 'Contact person, payment terms…')}
          <div className="flex gap-2">
            <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : editing ? 'Save changes' : password ? 'Create college and its login' : 'Create college and invite admins'}</button>
            {editing && <button type="button" onClick={() => startEdit(null)} className="btn-glass">Cancel</button>}
          </div>
        </form>
        <p className="mt-3 text-[12px] text-ink-mute">
          Admins sign in with these emails and only see their own college. Students get access only after the college adds their email on its Roster page.
        </p>
        <ResultList results={results} />
      </Card>

      <ProfitCard orgs={orgs} usage={usage} />

      <Card title={`Colleges (${orgs.length})`}>
        {loading ? (
          <RowsSkeleton rows={3} />
        ) : orgs.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-faint">No colleges yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold text-ink-mute">
                  {['College', 'Admins', 'Students', 'Usage', 'Last active', 'Storage', 'Plan and pricing', ''].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => {
                  const u = usage[o.id]
                  const full = o.seat_limit != null && (u?.rostered ?? 0) >= o.seat_limit
                  return (
                    <tr key={o.id} className="border-b border-line/70 align-top">
                      <td className="px-2 py-2.5">
                        <span className="block font-semibold text-ink">{o.name}</span>
                        <span className="block text-[11.5px] text-ink-mute">{[o.official_code, o.city].filter(Boolean).join(' · ') || 'No code set'}</span>
                      </td>
                      <td className="px-2 py-2.5 text-ink-soft">
                        {o.admin_emails.map((x) => <span key={x} className="block">{x}</span>)}
                        <span className="text-[11px] text-ink-faint">{u ? `${u.admins} signed in` : ''}</span>
                      </td>
                      <td className="tabular-nums px-2 py-2.5">
                        <span className="block font-semibold text-ink">{u?.joined ?? '…'} joined</span>
                        <span className={`block text-[11.5px] ${full ? 'text-[#d92d20]' : 'text-ink-mute'}`}>{u?.rostered ?? '…'} / {o.seat_limit ?? '∞'} seats</span>
                        <span className="block text-[11.5px] text-ink-mute">{u?.onboarded ?? '…'} onboarded</span>
                      </td>
                      <td className="tabular-nums px-2 py-2.5 text-[11.5px] text-ink-soft">
                        {u ? (
                          <>
                            <span className="block">{u.active_7d} active this week · {u.active_30d} this month</span>
                            <span className="block">{u.resume_analyses} resume scans · {u.jd_matches} JD matches</span>
                            <span className="block">{u.ai_messages} AI messages · {u.coding_profiles} coding profiles</span>
                            <span className="block">{u.drives} drives · {u.applications} applications</span>
                          </>
                        ) : '…'}
                      </td>
                      <td className="px-2 py-2.5 text-ink-soft">{u ? ago(u.last_active) : '…'}</td>
                      <td className="tabular-nums px-2 py-2.5 text-ink-soft">
                        {u ? bytes(u.storage_bytes) : '…'}
                        {u && <span className="block text-[11px] text-ink-faint">{u.resumes} resumes</span>}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="block font-semibold capitalize text-ink">{o.plan}</span>
                        <span className="block text-[11.5px] text-ink-mute">{inr(Number(o.price_per_seat))} / seat / {o.billing_cycle === 'monthly' ? 'month' : 'year'}{Number(o.platform_fee) ? ` + ${inr(Number(o.platform_fee))} fee` : ''}</span>
                        <span className="block text-[11px] text-ink-faint">{aiCapOf(o)} AI actions / student / month</span>
                        <span className="block text-[11.5px] text-ink-mute">{inr(yearly(o, u))} per year</span>
                        {o.renews_on && <span className="block text-[11px] text-ink-faint">Renews {o.renews_on}</span>}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px]">
                        <button onClick={() => navigate(`/admin/students?org=${o.id}`)} className="mr-3 font-semibold text-brand underline">Students</button>
                        <button onClick={() => startEdit(o)} className="mr-3 text-ink-soft underline">Edit</button>
                        <button onClick={() => remove(o)} className="text-[#d92d20] underline">Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Page>
  )
}

/* ================================================================ super admin: platform admins */
type PlatformAdmin = { email: string; user_id: string | null; full_name: string | null; active: boolean }

export function SuperAdmins() {
  const { isSuperAdmin, session } = useAuth()
  const { showToast } = useApp()
  const [rows, setRows] = useState<PlatformAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('platform_admins')
    if (error) showToast(errMsg(error))
    setRows((data ?? []) as PlatformAdmin[])
    setLoading(false)
  }, [showToast])
  useEffect(() => {
    load()
  }, [load])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      const { results } = await callApi<{ results: InviteResult[] }>('admin', { action: 'invite', role: 'platform_admin', people: [{ email: email.trim() }], password: password || undefined })
      setResults(results)
      setEmail('')
      load()
    } catch (err) {
      showToast(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (a: PlatformAdmin) => {
    if (!window.confirm(`Remove platform admin access for ${a.email}? That account goes back to being a normal account.`)) return
    const { error } = await supabase.rpc('remove_platform_admin', { target_email: a.email })
    if (error) return showToast(errMsg(error))
    showToast('Platform admin access removed.')
    load()
  }

  if (!isSuperAdmin) return <Denied what="Platform admins" />
  const me = session?.user.email?.toLowerCase()

  return (
    <Page title="Platform admins" subtitle="Accounts that run PlacementIQ itself: create colleges, manage their placement cells and see every college's students.">
      <Card title="Add a platform admin">
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="owner@yourcompany.com" className="field" />
          <button disabled={busy} className="btn-primary shrink-0">Add and invite</button>
        </form>
        <div className="mt-3"><LoginMethod password={password} setPassword={setPassword} /></div>
        <p className="mt-2 text-[12px] text-ink-mute">
          A platform admin account is separate from student and placement-cell accounts: it only sees the platform pages. New addresses get an invite and become
          platform admins when they sign up.
        </p>
        <ResultList results={results} />
      </Card>

      <Card title={`Platform admins (${rows.length})`}>
        {loading ? (
          <RowsSkeleton rows={2} />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((a) => (
              <div key={a.email} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{a.full_name || a.email}</span>
                  {a.full_name && <span className="block truncate text-[12px] text-ink-mute">{a.email}</span>}
                </span>
                <span className={`text-[12px] ${a.active ? 'text-[#067647]' : 'text-ink-mute'}`}>{a.active ? 'Active' : 'Invited, not signed up'}</span>
                <button onClick={() => remove(a)} className="text-[12px] text-[#d92d20] underline">{a.email === me ? 'Remove me' : 'Remove'}</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  )
}

/* ================================================================ classes: year -> branch -> section */
type ClassStats = {
  key: string
  year: number | null
  branch: string
  section: string
  rostered: number
  joined: number
  onboarded: number
  cgpa: number | null
  readiness: number | null
  score: number | null
  dsa: number | null
  resume: number | null
  applied: number
  offers: number
  attention: number
  top: string
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const fmt = (n: number | null, d = 0) => (n == null ? 'n/a' : n.toFixed(d))

/** Monitoring for the placement cell by year of study, branch and section. */
export function AdminClasses() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { org, orgId, picker } = useOrgPicker()
  const { rows: students, loading } = useStudents()
  const { applications } = useJobs()
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [year, setYear] = useState<number | 'all'>('all')

  useEffect(() => {
    if (!orgId) return
    supabase.from('org_students').select('*').eq('org_id', orgId).then(({ data }) => setRoster((data ?? []) as RosterRow[]))
  }, [orgId])

  const groups = useMemo(() => {
    const mine = students.filter((r) => r.profile.org_id === orgId)
    const byUser = new Map(mine.map((r) => [r.profile.id, r]))
    const apps = new Map<string, { applied: number; offers: number }>()
    for (const a of applications) {
      const x = apps.get(a.user_id) ?? { applied: 0, offers: 0 }
      x.applied++
      if (a.status === 'offer') x.offers++
      apps.set(a.user_id, x)
    }
    // Everyone on the roster, joined or not; joined students use their live profile for class details.
    const people = roster.map((r) => {
      const s = r.user_id ? byUser.get(r.user_id) : undefined
      const p = s?.profile
      return {
        name: p?.full_name || r.full_name || r.email,
        year: yearOfStudy(p?.batch || r.batch, p?.program || r.program),
        branch: branchCode(p?.branch || r.branch || ''),
        section: (p?.section || r.section || '').toUpperCase(),
        s,
      }
    })
    const map = new Map<string, typeof people>()
    for (const x of people) {
      const k = `${x.year ?? 'na'}|${x.branch}|${x.section}`
      map.set(k, [...(map.get(k) ?? []), x])
    }
    const out: ClassStats[] = [...map.entries()].map(([key, xs]) => {
      const joined = xs.filter((x) => x.s).map((x) => x.s!)
      const best = [...joined].sort((a, b) => b.score - a.score)[0]
      return {
        key,
        year: xs[0].year,
        branch: xs[0].branch,
        section: xs[0].section,
        rostered: xs.length,
        joined: joined.length,
        onboarded: joined.filter((r) => r.profile.onboarded_at).length,
        cgpa: avg(joined.map((r) => r.profile.cgpa).filter((v) => v > 0)),
        readiness: avg(joined.map((r) => r.readiness)),
        score: avg(joined.map((r) => r.score)),
        dsa: avg(joined.map((r) => r.dsa)),
        resume: avg(joined.map((r) => r.resume).filter((v): v is number => v != null)),
        applied: joined.reduce((a, r) => a + (apps.get(r.profile.id)?.applied ?? 0), 0),
        offers: joined.reduce((a, r) => a + (apps.get(r.profile.id)?.offers ?? 0), 0),
        // Not signed up, onboarding unfinished, active backlogs, or readiness below 40.
        attention: xs.filter((x) => !x.s || !x.s.profile.onboarded_at || x.s.profile.backlogs > 0 || x.s.readiness < 40).length,
        top: best ? `${best.profile.full_name || best.profile.email} (${best.score})` : 'n/a',
      }
    })
    return out.sort((a, b) => (a.year ?? 99) - (b.year ?? 99) || a.branch.localeCompare(b.branch) || a.section.localeCompare(b.section))
  }, [students, roster, applications, orgId])

  if (!isAdmin) return <Denied what="Classes" />

  const years = [...new Set(groups.map((g) => g.year))].sort((a, b) => (a ?? 99) - (b ?? 99))
  const shownGroups = groups.filter((g) => year === 'all' || g.year === year)
  const branchesIn = [...new Set(shownGroups.map((g) => `${g.year}|${g.branch}`))]
  const total = (gs: ClassStats[], k: 'rostered' | 'joined' | 'onboarded' | 'applied' | 'offers' | 'attention') => gs.reduce((a, g) => a + g[k], 0)
  const open = (g: { year: number | null; branch: string; section?: string }) => {
    const p = new URLSearchParams({ org: orgId })
    if (g.year != null) p.set('year', String(g.year))
    p.set('branch', g.branch)
    if (g.section !== undefined) p.set('section', g.section)
    navigate(`/admin/students?${p}`)
  }

  return (
    <Page title="Classes" subtitle={`Every year, branch and section of ${org?.name ?? 'your college'}. Open any class to see its students, ranked.`} wide actions={picker}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {years.map((y) => {
          const gs = groups.filter((g) => g.year === y)
          const r = total(gs, 'rostered')
          return (
            <button key={String(y)} onClick={() => setYear(year === y ? 'all' : (y as number))} className={`card p-4 text-left transition ${year === y ? 'ring-2 ring-brand' : ''}`}>
              <p className="text-[12px] font-medium text-ink-mute">{yearLabel(y)}</p>
              <p className="mt-1 text-[24px] font-semibold tracking-[-0.03em] text-ink">{r}</p>
              <p className="text-[11.5px] text-ink-faint">
                {total(gs, 'joined')} joined · {[...new Set(gs.map((g) => g.branch))].length} branches · {gs.length} sections
              </p>
              <p className="mt-1 text-[11.5px] text-ink-mute">{total(gs, 'offers')} offers · {total(gs, 'attention')} need attention</p>
            </button>
          )
        })}
        {!years.length && <p className="col-span-full py-6 text-center text-[13px] text-ink-faint">{loading ? 'Loading classes…' : 'No students on the roster yet. Add them on the Roster page with branch, graduation year and section.'}</p>}
      </div>

      {branchesIn.map((bk) => {
        const gs = shownGroups.filter((g) => `${g.year}|${g.branch}` === bk)
        const head = gs[0]
        return (
          <Card
            key={bk}
            title={`${yearLabel(head.year)} · ${head.branch}`}
            action={<button onClick={() => open({ year: head.year, branch: head.branch })} className="text-[12px] font-semibold text-brand-dark hover:underline">All {head.branch} students</button>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold text-ink-mute">
                    {['Section', 'On roster', 'Joined', 'Onboarded', 'Avg CGPA', 'Avg readiness', 'Avg score', 'Avg DSA', 'Avg resume', 'Applications', 'Offers', 'Need attention', 'Top student'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {gs.map((g) => (
                    <tr key={g.key} onClick={() => open(g)} className="cursor-pointer border-b border-line/70 tabular-nums transition hover:bg-white/70">
                      <td className="px-2 py-2.5 font-semibold text-ink">{sectionLabel(g.section)}</td>
                      <td className="px-2 py-2.5">{g.rostered}</td>
                      <td className="px-2 py-2.5">{g.joined}<span className="ml-1 text-[11px] text-ink-faint">{g.rostered ? `${Math.round((g.joined / g.rostered) * 100)}%` : ''}</span></td>
                      <td className="px-2 py-2.5">{g.onboarded}</td>
                      <td className="px-2 py-2.5">{fmt(g.cgpa, 2)}</td>
                      <td className="px-2 py-2.5">{fmt(g.readiness)}</td>
                      <td className="px-2 py-2.5 font-semibold text-brand-dark">{fmt(g.score)}</td>
                      <td className="px-2 py-2.5">{fmt(g.dsa)}</td>
                      <td className="px-2 py-2.5">{fmt(g.resume)}</td>
                      <td className="px-2 py-2.5">{g.applied}</td>
                      <td className="px-2 py-2.5">{g.offers}</td>
                      <td className={`px-2 py-2.5 ${g.attention ? 'text-[#b45309]' : 'text-ink-faint'}`}>{g.attention}</td>
                      <td className="px-2 py-2.5 text-ink-soft">{g.top}</td>
                    </tr>
                  ))}
                  {gs.length > 1 && (
                    <tr className="tabular-nums text-ink-mute">
                      <td className="px-2 py-2.5 font-semibold">All sections</td>
                      <td className="px-2 py-2.5">{total(gs, 'rostered')}</td>
                      <td className="px-2 py-2.5">{total(gs, 'joined')}</td>
                      <td className="px-2 py-2.5">{total(gs, 'onboarded')}</td>
                      <td className="px-2 py-2.5" colSpan={5} />
                      <td className="px-2 py-2.5">{total(gs, 'applied')}</td>
                      <td className="px-2 py-2.5">{total(gs, 'offers')}</td>
                      <td className="px-2 py-2.5">{total(gs, 'attention')}</td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
      <p className="text-[11.5px] text-ink-faint">
        Need attention: not signed up yet, onboarding unfinished, active backlogs, or readiness below 40. Year of study comes from the graduation year and moves up every July.
      </p>
    </Page>
  )
}
