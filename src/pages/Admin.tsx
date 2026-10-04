import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { BarList, Columns, EmptyChart, SERIES } from '../components/charts'
import { Card, Meter, Page, Ring, RowsSkeleton, Skeleton, Stat } from '../components/Page'
import { useAdminOrgs, useStudents, type StudentRow } from '../lib/admin'
import { useAuth } from '../lib/auth'
import { evaluateJob, SKILL_SHORT, SKILLS, type JobPosting } from '../lib/eligibility'
import { ctcText, isOpen, STATUS_META, useJobs, type JobApplication, type JobStatus } from '../lib/jobs'
import { useApp } from '../lib/store'
import { supabase } from '../lib/supabase'

const tone = (v: number) => (v >= 75 ? '#0A7A5C' : v >= 55 ? '#B47B12' : '#A63A2A')

function Denied() {
  return (
    <Page title="Admin" subtitle="This area is for the placement cell.">
      <Card><p className="py-8 text-center text-[13px] text-ink-mute">You don't have admin access. Ask an existing admin to add you on the Admins page.</p></Card>
    </Page>
  )
}

/* ================================================================ overview */
export function AdminOverview() {
  const { isAdmin } = useAuth()
  const { rows, loading } = useStudents()
  const { jobs, applications } = useJobs()
  const navigate = useNavigate()
  if (!isAdmin) return <Denied />
  const students = rows.filter((r) => !r.isAdmin || r.profile.onboarded_at)
  const onboarded = students.filter((r) => r.profile.onboarded_at).length
  const avg = (f: (r: StudentRow) => number) => (students.length ? Math.round(students.reduce((a, r) => a + f(r), 0) / students.length) : 0)
  const bands = [
    { band: '0-39', n: students.filter((r) => r.readiness < 40).length },
    { band: '40-59', n: students.filter((r) => r.readiness >= 40 && r.readiness < 60).length },
    { band: '60-74', n: students.filter((r) => r.readiness >= 60 && r.readiness < 75).length },
    { band: '75-89', n: students.filter((r) => r.readiness >= 75 && r.readiness < 90).length },
    { band: '90+', n: students.filter((r) => r.readiness >= 90).length },
  ]
  const branches = Object.entries(students.reduce<Record<string, number>>((a, r) => ({ ...a, [r.profile.branch || 'Not set']: (a[r.profile.branch || 'Not set'] ?? 0) + 1 }), {}))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  const funnel = (Object.keys(STATUS_META) as JobStatus[]).map((s) => ({ name: STATUS_META[s].label, value: applications.filter((a) => a.status === s).length }))

  return (
    <Page title="Placement cell" subtitle="Live view of every student, drive and application." wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="Students" value={`${students.length}`} sub={`${onboarded} completed onboarding`} />
        <Stat label="Avg. readiness" value={`${avg((r) => r.readiness)}`} sub="Product-track companies" tone="text-brand-dark" />
        <Stat label="Avg. resume score" value={`${avg((r) => r.resume ?? 0)}`} sub="Across analyzed resumes" />
        <Stat label="Open drives" value={`${jobs.filter(isOpen).length}`} sub={`${jobs.length} posted in total`} />
        <Stat label="Offers" value={`${applications.filter((a) => a.status === 'offer').length}`} sub={`${applications.length} applications`} tone="text-[#0A6B50]" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Readiness distribution">
          {students.length ? <Columns data={bands} x="band" y="n" name="Students" height={220} /> : loading ? <Skeleton className="h-[220px] w-full" /> : <EmptyChart>No students yet.</EmptyChart>}
        </Card>
        <Card title="Students by branch">
          {branches.length ? <BarList data={branches.slice(0, 6)} color={SERIES[0]} /> : <EmptyChart>No students yet.</EmptyChart>}
        </Card>
        <Card title="Application pipeline">
          <BarList data={funnel} color={SERIES[2]} />
        </Card>
      </div>

      <Card title="Top students" action={<button onClick={() => navigate('/admin/students')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">All students</button>}>
        <div className="divide-y divide-line">
          {students.slice(0, 8).map((r) => (
            <div key={r.profile.id} className="flex items-center gap-3 py-2.5">
              <span className="w-8 text-[13px] font-semibold text-ink-faint">#{r.rank}</span>
              <Avatar src={r.profile.avatar_url ?? undefined} name={r.profile.full_name || r.profile.email} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{r.profile.full_name || r.profile.email}</span>
                <span className="block truncate text-[11px] text-ink-mute">{r.profile.branch || 'n/a'} · {r.profile.batch || 'n/a'} · CGPA {r.profile.cgpa || 'n/a'}</span>
              </span>
              <span className="hidden text-[12px] text-ink-mute sm:inline">Readiness {r.readiness}</span>
              <span className="w-[48px] text-right text-[14px] font-semibold text-brand-dark sm:w-[70px]">{r.score}</span>
            </div>
          ))}
          {!students.length && (loading ? <RowsSkeleton rows={5} /> : <p className="py-6 text-center text-[12px] text-ink-faint">No students have signed up yet.</p>)}
        </div>
      </Card>
    </Page>
  )
}

/* ================================================================ students */
function StudentDrawer({ row, applications, jobs, orgName, onClose }: { row: StudentRow; applications: JobApplication[]; jobs: JobPosting[]; orgName?: string; onClose: () => void }) {
  const p = row.profile
  const { showToast } = useApp()
  const i = p.integrations ?? {}
  const openResume = async () => {
    if (!p.resume_path) return
    const win = window.open('', '_blank')
    const { data, error } = await supabase.storage.from('resumes').createSignedUrl(p.resume_path, 300)
    if (error || !data) {
      win?.close()
      return showToast(`Could not open resume: ${error?.message ?? 'unknown'}`)
    }
    if (win) win.location.href = data.signedUrl
  }
  const apps = applications.filter((a) => a.user_id === p.id)
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-[#1E1D1A]/25 p-2 sm:p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.aside
        className="glass-strong scroll-thin h-full w-full max-w-[560px] overflow-y-auto rounded-[3px] p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={p.avatar_url ?? undefined} name={p.full_name || p.email} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{p.full_name || 'n/a'}</p>
            <p className="text-[12px] text-ink-mute">{p.branch} · Batch {p.batch} · {orgName ?? p.college}</p>
            <p className="text-[12px] text-ink-mute">Roll number: <span className="figure text-ink">{p.roll_number || 'not set'}</span></p>
            <p className="text-[12px] text-ink-mute">{[p.email, p.phone].filter(Boolean).join(' · ')}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold">
              {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">LinkedIn</a>}
              {p.github_username && <a href={`https://github.com/${p.github_username}`} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">GitHub</a>}
              {p.portfolio_url && <a href={p.portfolio_url} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">Portfolio</a>}
              {p.resume_path && <button onClick={openResume} className="text-brand-dark hover:underline">Resume</button>}
            </div>
          </div>
          <Ring value={row.score} size={84} stroke={8} label={`Rank #${row.rank}`} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[['CGPA', p.cgpa || 'n/a'], ['Backlogs', p.backlogs], ['Class X', `${p.class_x || 'n/a'}%`], ['Class XII', `${p.class_xii || 'n/a'}%`]].map(([k, v]) => (
            <div key={k as string} className="rounded-[3px] border border-rule bg-surface-2 px-2 py-2.5">
              <p className="text-[10.5px] text-ink-mute">{k}</p>
              <p className="text-[15px] font-semibold text-ink">{v}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[12px] font-semibold text-ink">Skills</p>
        <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {p.skills.slice(0, 8).map((s) => <Meter key={s.name} label={SKILL_SHORT[s.name] ?? s.name} value={s.level} tone={tone(s.level)} />)}
        </div>

        <p className="mt-5 text-[12px] font-semibold text-ink">Coding profiles</p>
        <table className="mt-2 w-full text-left text-[12px]">
          <tbody>
            {[
              ['GitHub', p.github_username, p.github_username && `https://github.com/${p.github_username}`, i.github ? `${i.github.original_repos} original repos · ${i.github.stars} stars · ${i.github.followers} followers` : 'Not connected'],
              ['LeetCode', p.leetcode_username, p.leetcode_username && `https://leetcode.com/u/${p.leetcode_username}`, i.leetcode ? `${i.leetcode.solved} solved (Easy ${i.leetcode.easy} · Medium ${i.leetcode.medium} · Hard ${i.leetcode.hard})${i.leetcode.contest_rating ? ` · contest ${i.leetcode.contest_rating} over ${i.leetcode.contests}` : ''}` : 'Not connected'],
              ['Codeforces', p.codeforces_username, p.codeforces_username && `https://codeforces.com/profile/${p.codeforces_username}`, i.codeforces ? `${i.codeforces.rating ?? 'unrated'}${i.codeforces.rank ? ` (${i.codeforces.rank})` : ''} · peak ${i.codeforces.max_rating ?? 'n/a'}${i.codeforces.solved != null ? ` · ${i.codeforces.solved} solved` : ''}` : 'Not connected'],
              ['CodeChef', p.codechef_username, p.codechef_username && `https://www.codechef.com/users/${p.codechef_username}`, i.codechef ? `${i.codechef.rating ?? 'unrated'}${i.codechef.stars ? ` · ${i.codechef.stars} star` : ''}${i.codechef.solved != null ? ` · ${i.codechef.solved} solved` : ''}` : 'Not connected'],
              ['HackerRank', p.hackerrank_username, p.hackerrank_username && `https://www.hackerrank.com/profile/${p.hackerrank_username}`, p.hackerrank_username ? 'Profile link only' : 'Not added'],
            ].map(([k, user, url, detail]) => (
              <tr key={k as string} className="border-b border-rule align-top">
                <td className="w-[92px] py-2 font-semibold text-ink">{k}</td>
                <td className="py-2 text-ink-soft">
                  {user ? <a href={url as string} target="_blank" rel="noreferrer" className="text-brand underline">@{user}</a> : null}
                  <span className="block text-ink-mute">{detail}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {i.github?.top_repos.length ? (
          <>
            <p className="mt-5 text-[12px] font-semibold text-ink">GitHub repositories ({i.github.top_repos.length})</p>
            <div className="mt-1.5 divide-y divide-line">
              {i.github.top_repos.map((r) => (
                <div key={r.name} className="py-2 text-[12px]">
                  <div className="flex items-baseline gap-2">
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">{r.name}</a>
                    <span className="text-ink-faint">{[r.language, r.stars ? `${r.stars} stars` : ''].filter(Boolean).join(' · ')}</span>
                  </div>
                  {r.description && <p className="text-ink-mute">{r.description}</p>}
                  {r.topics.length > 0 && <p className="text-[11px] text-ink-faint">{r.topics.slice(0, 6).join(', ')}</p>}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <p className="mt-5 text-[12px] font-semibold text-ink">Resume</p>
        {p.resume_analysis ? (
          <div className="mt-1.5 text-[12px] text-ink-soft">
            <p>Score <span className="figure text-ink">{p.resume_analysis.overall}</span> · {p.resume_analysis.stats.words} words · {p.resume_analysis.stats.quantified} of {p.resume_analysis.stats.bullets} bullets quantified</p>
            <p className="mt-1 text-ink-mute">{p.resume_analysis.summary}</p>
          </div>
        ) : (
          <p className="mt-1.5 text-[12px] text-ink-faint">{p.resume_path ? 'Uploaded, not analyzed yet.' : 'No resume uploaded.'}</p>
        )}
        <p className="mt-2 text-[12px] text-ink-mute">Profile strength {row.strength}% · readiness {row.readiness} · {row.eligible} companies eligible</p>

        <p className="mt-5 text-[12px] font-semibold text-ink">Projects ({p.projects.length})</p>
        <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
          {p.projects.map((x) => <li key={x.title}>• <b className="text-ink">{x.title}</b>{x.tech && <span className="text-ink-faint"> · {x.tech}</span>}</li>)}
        </ul>
        <p className="mt-4 text-[12px] font-semibold text-ink">Experience</p>
        <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
          {p.internships.map((x) => <li key={x.org + x.role}>• {x.role} · {x.org} <span className="text-ink-faint">{x.period}</span></li>)}
          {!p.internships.length && <li className="text-ink-faint">None listed.</li>}
        </ul>
        <p className="mt-4 text-[12px] font-semibold text-ink">Certifications ({p.certifications.length})</p>
        <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
          {p.certifications.map((c) => <li key={c.name}>{c.credential_url ? <a href={c.credential_url} target="_blank" rel="noreferrer" className="underline">{c.name}</a> : c.name}<span className="text-ink-faint"> {[c.issuer, c.date].filter(Boolean).join(' · ')}</span></li>)}
          {!p.certifications.length && <li className="text-ink-faint">None listed.</li>}
        </ul>
        <p className="mt-4 text-[12px] font-semibold text-ink">Achievements ({p.achievements.length})</p>
        <ul className="mt-1.5 space-y-1 text-[12px] text-ink-soft">
          {p.achievements.map((a) => <li key={a.title}>{a.title}<span className="text-ink-faint"> {[a.detail, a.date].filter(Boolean).join(' · ')}</span></li>)}
          {!p.achievements.length && <li className="text-ink-faint">None listed.</li>}
        </ul>

        <p className="mt-4 text-[12px] font-semibold text-ink">Applications ({apps.length})</p>
        <div className="mt-1.5 space-y-1.5">
          {apps.map((a) => {
            const j = jobs.find((x) => x.id === a.job_id)
            return (
              <p key={a.job_id} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="flex-1">{j?.company} · {j?.role}</span>
                <span className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_META[a.status].cls}`}>{STATUS_META[a.status].label}</span>
              </p>
            )
          })}
        </div>
      </motion.aside>
    </motion.div>
  )
}

export function AdminStudents() {
  const { isAdmin, isSuperAdmin } = useAuth()
  const { rows, loading, error } = useStudents()
  const { orgs } = useAdminOrgs()
  const [params] = useSearchParams()
  const [org, setOrg] = useState(params.get('org') ?? 'all')
  const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.short_name || orgs.find((o) => o.id === id)?.name || 'No college'
  const { jobs, applications } = useJobs()
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('all')
  const [batch, setBatch] = useState('all')
  const [sort, setSort] = useState<'score' | 'readiness' | 'cgpa' | 'resume' | 'dsa' | 'solved'>('score')
  const [open, setOpen] = useState<StudentRow | null>(null)
  const branches = [...new Set(rows.map((r) => r.profile.branch).filter(Boolean))]
  const batches = [...new Set(rows.map((r) => r.profile.batch).filter(Boolean))]
  const shown = useMemo(() => {
    const val = (r: StudentRow) => (sort === 'cgpa' ? r.profile.cgpa : sort === 'resume' ? r.resume ?? -1 : r[sort])
    return rows
      .filter((r) => (r.profile.full_name + r.profile.email + r.profile.college + (r.profile.roll_number ?? '')).toLowerCase().includes(q.toLowerCase()))
      .filter((r) => (branch === 'all' || r.profile.branch === branch) && (batch === 'all' || r.profile.batch === batch))
      .filter((r) => org === 'all' || (org === 'none' ? !r.profile.org_id : r.profile.org_id === org))
      .sort((a, b) => val(b) - val(a))
  }, [rows, q, branch, batch, sort, org])
  if (!isAdmin) return <Denied />

  const exportCsv = () => {
    const head = ['Rank', 'Name', 'Roll number', 'College', 'Email', 'Phone', 'Branch', 'Batch', 'CGPA', 'Backlogs', 'Readiness', 'Resume', 'DSA', 'Problems solved', 'Profile strength', 'Score']
    const lines = shown.map((r) => [r.rank, r.profile.full_name, r.profile.roll_number ?? '', orgName(r.profile.org_id), r.profile.email, r.profile.phone, r.profile.branch, r.profile.batch, r.profile.cgpa, r.profile.backlogs, r.readiness, r.resume ?? '', r.dsa, r.solved, r.strength, r.score])
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `placementiq-students-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <Page title="Students" subtitle="Ranked by a composite placement score: 35% readiness, 20% resume, 20% DSA, 15% profile strength, 10% CGPA." wide actions={<button onClick={exportCsv} className="btn-glass">Export CSV</button>}>
      <Card>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, roll number" className="field w-full sm:w-[260px]" />
          {orgs.length > 1 && (
            <select value={org} onChange={(e) => setOrg(e.target.value)} className="field w-full sm:w-auto" aria-label="College">
              <option value="all">All colleges</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              {isSuperAdmin && <option value="none">No college</option>}
            </select>
          )}
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="field w-full sm:w-auto" aria-label="Branch">
            <option value="all">All branches</option>
            {branches.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={batch} onChange={(e) => setBatch(e.target.value)} className="field min-w-0 flex-1 sm:w-auto sm:flex-none" aria-label="Batch">
            <option value="all">All batches</option>
            {batches.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field min-w-0 flex-1 sm:ml-auto sm:w-auto sm:flex-none" aria-label="Sort">
            <option value="score">Sort: Overall score</option>
            <option value="readiness">Sort: Readiness</option>
            <option value="cgpa">Sort: CGPA</option>
            <option value="resume">Sort: Resume</option>
            <option value="dsa">Sort: DSA</option>
            <option value="solved">Sort: Problems solved</option>
          </select>
        </div>
        {error && <p className="mt-3 text-[12px] text-[#9C3526]">{error}</p>}
        <div className="mt-3 space-y-2 md:hidden">
          {loading && !shown.length && <RowsSkeleton rows={6} />}
          {shown.map((r) => (
            <button key={r.profile.id} onClick={() => setOpen(r)} className="flex w-full items-center gap-3 rounded-[3px] border border-rule bg-surface-2 p-3 text-left">
              <span className="w-6 text-[12px] font-semibold text-ink-faint">#{r.rank}</span>
              <Avatar src={r.profile.avatar_url ?? undefined} name={r.profile.full_name || r.profile.email} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{r.profile.full_name || 'n/a'}</span>
                <span className="block truncate text-[11px] text-ink-mute">{r.profile.branch || 'n/a'} · {r.profile.batch || 'n/a'} · CGPA {r.profile.cgpa || 'n/a'}</span>
                <span className="block text-[11px] text-ink-faint">Readiness {r.readiness} · Resume {r.resume ?? 'n/a'} · DSA {r.dsa}</span>
              </span>
              <span className="text-[16px] font-semibold tabular-nums text-brand-dark">{r.score}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold text-ink-mute">
                {['#', 'Student', 'Roll no.', ...(isSuperAdmin ? ['College'] : []), 'Branch', 'Batch', 'CGPA', 'Readiness', 'Resume', 'DSA', 'Solved', 'Profile', 'Score'].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.profile.id} onClick={() => setOpen(r)} className="cursor-pointer border-b border-line/70 hover:bg-surface-2">
                  <td className="px-2 py-2.5 font-semibold text-ink-faint">{r.rank}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar src={r.profile.avatar_url ?? undefined} name={r.profile.full_name || r.profile.email} size={26} />
                      <span>
                        <span className="block font-semibold text-ink">{r.profile.full_name || 'n/a'}</span>
                        <span className="block text-[11px] text-ink-faint">{r.profile.onboarded_at ? r.profile.email : 'Onboarding incomplete'}</span>
                      </span>
                    </span>
                  </td>
                  <td className="figure px-2 py-2.5 text-ink-soft">{r.profile.roll_number || 'n/a'}</td>
                  {isSuperAdmin && <td className="px-2 py-2.5 text-ink-soft">{orgName(r.profile.org_id)}</td>}
                  <td className="px-2 py-2.5 text-ink-soft">{r.profile.branch || 'n/a'}</td>
                  <td className="px-2 py-2.5 text-ink-soft">{r.profile.batch || 'n/a'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.profile.cgpa || 'n/a'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.readiness}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.resume ?? 'n/a'}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.dsa}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.solved}</td>
                  <td className="px-2 py-2.5 tabular-nums">{r.strength}%</td>
                  <td className="px-2 py-2.5 text-[13.5px] font-semibold tabular-nums text-brand-dark">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (loading ? <RowsSkeleton rows={8} /> : <p className="py-8 text-center text-[12px] text-ink-faint">No students match.</p>)}
        </div>
      </Card>
      <AnimatePresence>{open && <StudentDrawer row={open} jobs={jobs} applications={applications} orgName={orgs.find((o) => o.id === open.profile.org_id)?.name} onClose={() => setOpen(null)} />}</AnimatePresence>
    </Page>
  )
}

/* ================================================================ jobs */
const emptyJob = {
  company: '', role: 'Software Engineer', location: '', job_type: 'Full Time', ctc_min: '', ctc_max: '', description: '',
  min_cgpa: '7', max_backlogs: '0', min_class_x: '60', min_class_xii: '60', min_internships: '0', min_projects: '1',
  branches: 'CSE, IT', batches: '', deadline: '', status: 'open' as JobPosting['status'],
  skills: Object.fromEntries(SKILLS.map((s) => [s, s === 'Data Structures & Algorithms' ? 70 : s === 'Aptitude & Reasoning' ? 60 : 0])) as Record<string, number>,
}

function JobForm({ initial, onDone }: { initial?: JobPosting; onDone: () => void }) {
  const { session } = useAuth()
  const { orgs } = useAdminOrgs()
  const [orgId, setOrgId] = useState<string>(initial?.org_id ?? '')
  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id)
  }, [orgs, orgId])
  const { showToast } = useApp()
  const [f, setF] = useState(() =>
    initial
      ? {
          company: initial.company, role: initial.role, location: initial.location, job_type: initial.job_type,
          ctc_min: initial.ctc_min?.toString() ?? '', ctc_max: initial.ctc_max?.toString() ?? '', description: initial.description,
          min_cgpa: String(initial.min_cgpa), max_backlogs: String(initial.max_backlogs), min_class_x: String(initial.min_class_x),
          min_class_xii: String(initial.min_class_xii), min_internships: String(initial.min_internships), min_projects: String(initial.min_projects),
          branches: initial.branches.join(', '), batches: initial.batches.join(', '), deadline: initial.deadline ?? '', status: initial.status,
          skills: Object.fromEntries(SKILLS.map((s) => [s, Number(initial.skill_requirements[s] ?? 0)])),
        }
      : emptyJob,
  )
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v })
  const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgId) return showToast('Choose the college this drive is for.')
    if (!f.company.trim() || !f.role.trim()) return showToast('Company and role are required.')
    if (f.description.trim().length < 80) return showToast('Paste the full job description (at least a few lines). Students are matched against it.')
    setBusy(true)
    const row = {
      company: f.company.trim(), role: f.role.trim(), location: f.location.trim(), job_type: f.job_type,
      ctc_min: f.ctc_min ? Number(f.ctc_min) : null, ctc_max: f.ctc_max ? Number(f.ctc_max) : null, description: f.description.trim(),
      min_cgpa: Number(f.min_cgpa) || 0, max_backlogs: Number(f.max_backlogs) || 0, min_class_x: Number(f.min_class_x) || 0,
      min_class_xii: Number(f.min_class_xii) || 0, min_internships: Number(f.min_internships) || 0, min_projects: Number(f.min_projects) || 0,
      branches: list(f.branches), batches: list(f.batches), deadline: f.deadline || null, status: f.status,
      skill_requirements: Object.fromEntries(Object.entries(f.skills).filter(([, v]) => v > 0)),
      org_id: orgId,
    }
    const { error } = initial
      ? await supabase.from('job_postings').update(row).eq('id', initial.id)
      : await supabase.from('job_postings').insert({ ...row, created_by: session?.user.id })
    setBusy(false)
    if (error) return showToast(`Could not save: ${error.message}`)
    showToast(initial ? 'Drive updated.' : row.status === 'open' ? 'Drive posted. Students have been notified.' : 'Draft saved.')
    onDone()
  }

  const input = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <label className="block">
      <span className="text-[11.5px] font-medium text-ink-mute">{label}</span>
      <input className="field mt-1" value={f[k] as string} onChange={(e) => set(k, e.target.value)} {...props} />
    </label>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      {orgs.length > 1 && (
        <label className="block max-w-[420px]">
          <span className="text-[11.5px] font-medium text-ink-mute">College</span>
          <select className="field mt-1" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {input('company', 'Company')}
        {input('role', 'Role')}
        {input('location', 'Location')}
        {input('ctc_min', 'CTC min (LPA)', { inputMode: 'decimal' })}
        {input('ctc_max', 'CTC max (LPA)', { inputMode: 'decimal' })}
        <label className="block">
          <span className="text-[11.5px] font-medium text-ink-mute">Type</span>
          <select className="field mt-1" value={f.job_type} onChange={(e) => set('job_type', e.target.value)}>
            {['Full Time', 'Internship', 'Internship + PPO'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[11.5px] font-medium text-ink-mute">Job description (students' resumes are matched against this)</span>
        <textarea className="field mt-1 h-auto py-2" rows={7} value={f.description} onChange={(e) => set('description', e.target.value)} />
      </label>
      <p className="text-[12px] font-semibold text-ink">Eligibility criteria</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {input('min_cgpa', 'Min CGPA')}
        {input('max_backlogs', 'Max active backlogs')}
        {input('min_class_x', 'Min Class X %')}
        {input('min_class_xii', 'Min Class XII %')}
        {input('min_internships', 'Min internships')}
        {input('min_projects', 'Min projects')}
        {input('branches', 'Branches (comma separated, empty = all)')}
        {input('batches', 'Batches (e.g. 2026, 2027)')}
        {input('deadline', 'Apply by', { type: 'date' })}
        <label className="block">
          <span className="text-[11.5px] font-medium text-ink-mute">Status</span>
          <select className="field mt-1" value={f.status} onChange={(e) => set('status', e.target.value)}>
            <option value="open">Open (visible, notifies students)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <p className="text-[12px] font-semibold text-ink">Required skill levels <span className="font-normal text-ink-faint">(0 = not required)</span></p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {SKILLS.map((s) => (
          <label key={s} className="block">
            <span className="flex justify-between text-[11.5px] text-ink-soft"><span>{s}</span><b className="tabular-nums">{f.skills[s]}</b></span>
            <input type="range" min={0} max={100} step={5} value={f.skills[s]} onChange={(e) => setF({ ...f, skills: { ...f.skills, [s]: Number(e.target.value) } })} className="w-full accent-[#0F5A45]" />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : initial ? 'Save changes' : 'Post drive'}</button>
        <button type="button" onClick={onDone} className="btn-glass">Cancel</button>
      </div>
    </form>
  )
}

export function AdminJobs() {
  const { isAdmin } = useAuth()
  const { showToast } = useApp()
  const { jobs, applications, reload } = useJobs()
  const { rows } = useStudents()
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null
  if (!isAdmin) return <Denied />

  const applicants = selected
    ? applications
        .filter((a) => a.job_id === selected.id)
        .map((a) => {
          const r = rows.find((x) => x.profile.id === a.user_id)
          return { a, r, ev: r ? evaluateJob(selected, r.profile) : null }
        })
        .sort((x, y) => (y.ev?.match ?? 0) + (y.a.ai_fit ?? 0) * 0.5 - ((x.ev?.match ?? 0) + (x.a.ai_fit ?? 0) * 0.5))
    : []
  const eligibleNotApplied = selected ? rows.filter((r) => r.profile.org_id === selected.org_id).filter((r) => !applications.some((a) => a.job_id === selected.id && a.user_id === r.profile.id) && evaluateJob(selected, r.profile).eligibleToApply).length : 0

  const setStatus = async (a: JobApplication, status: JobStatus) => {
    const { error } = await supabase.from('job_applications').update({ status }).eq('job_id', a.job_id).eq('user_id', a.user_id)
    if (error) return showToast(`Could not update: ${error.message}`)
    showToast(`Marked ${STATUS_META[status].label.toLowerCase()}. The student has been notified.`)
    reload()
  }
  const toggle = async (j: JobPosting) => {
    const status = j.status === 'open' ? 'closed' : 'open'
    const { error } = await supabase.from('job_postings').update({ status }).eq('id', j.id)
    if (error) return showToast(error.message)
    reload()
  }
  const remove = async (j: JobPosting) => {
    if (!window.confirm(`Delete the ${j.company} drive and all its applications? This cannot be undone.`)) return
    const { error } = await supabase.from('job_postings').delete().eq('id', j.id)
    if (error) return showToast(error.message)
    setSelectedId(null)
    reload()
  }

  if (mode !== 'list')
    return (
      <Page title={mode === 'new' ? 'Post a new drive' : `Edit ${selected?.company}`} subtitle="Students are scored against these criteria and the job description.">
        <Card>
          <JobForm initial={mode === 'edit' ? selected ?? undefined : undefined} onDone={() => { setMode('list'); reload() }} />
        </Card>
      </Page>
    )

  return (
    <Page title="Job postings" subtitle="Post drives, see ranked applicants and move them through the pipeline." wide actions={<button onClick={() => setMode('new')} className="btn-primary">+ Post a drive</button>}>
      {jobs.length === 0 ? (
        <Card><p className="py-10 text-center text-[13px] text-ink-mute">No drives yet. When you post one, every student is notified and scored against it instantly.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="self-start">
            <div className="space-y-2">
              {jobs.map((j) => {
                const n = applications.filter((a) => a.job_id === j.id).length
                return (
                  <button key={j.id} onClick={() => setSelectedId(j.id)} className={`w-full rounded-[3px] border p-3 text-left ${selected?.id === j.id ? 'border-brand bg-surface' : 'border-rule bg-surface-2 hover:bg-surface-2'}`}>
                    <p className="text-[13px] font-semibold text-ink">{j.company}</p>
                    <p className="text-[11.5px] text-ink-mute">{j.role}</p>
                    <p className="mt-1.5 flex gap-1.5 text-[10.5px]">
                      <span className={`rounded-md px-1.5 py-0.5 font-semibold ${j.status === 'open' ? 'bg-[#F0EDE5] text-[#0A6B50]' : j.status === 'draft' ? 'bg-surface text-ink-mute' : 'bg-[#F0EDE5] text-[#9C3526]'}`}>{j.status}</span>
                      <span className="rounded-md bg-surface px-1.5 py-0.5 text-ink-soft">{n} applicant{n === 1 ? '' : 's'}</span>
                    </p>
                  </button>
                )
              })}
            </div>
          </Card>

          {selected && (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[18px] font-semibold tracking-[-0.03em] sm:text-[20px]">{selected.company} · {selected.role}</p>
                    <p className="text-[12.5px] text-ink-mute">{ctcText(selected)} · {selected.location || 'Location TBA'} · {selected.deadline ? `apply by ${selected.deadline}` : 'no deadline'}</p>
                    <p className="mt-1 text-[12px] text-ink-mute">
                      Min CGPA {selected.min_cgpa} · backlogs ≤ {selected.max_backlogs} · {selected.branches.join(', ') || 'all branches'} · {selected.batches.join(', ') || 'all batches'}
                    </p>
                  </div>
                  <button onClick={() => setMode('edit')} className="btn-glass py-1.5 text-[12px]">Edit</button>
                  <button onClick={() => toggle(selected)} className="btn-glass py-1.5 text-[12px]">{selected.status === 'open' ? 'Close' : 'Open'}</button>
                  <button onClick={() => remove(selected)} className="btn-glass py-1.5 text-[12px] text-[#9C3526]">Delete</button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Stat label="Applicants" value={`${applicants.length}`} />
                  <Stat label="Eligible, not applied" value={`${eligibleNotApplied}`} tone="text-[#8A5A0B]" />
                  <Stat label="Offers" value={`${applicants.filter((x) => x.a.status === 'offer').length}`} tone="text-[#0A6B50]" />
                </div>
              </div>

              <Card title="Applicants, ranked by profile match and AI resume fit">
                <div className="divide-y divide-line">
                  {applicants.map(({ a, r, ev }, idx) => (
                    <div key={a.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                      <span className="w-6 text-[12px] font-semibold text-ink-faint">{idx + 1}</span>
                      <Avatar src={r?.profile.avatar_url ?? undefined} name={r?.profile.full_name || 'Student'} size={30} />
                      <span className="min-w-[140px] flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{r?.profile.full_name ?? 'Student'}</span>
                        <span className="block text-[11px] text-ink-mute">{r?.profile.branch} · CGPA {r?.profile.cgpa} · resume {r?.resume ?? 'n/a'}</span>
                      </span>
                      <span className="text-center text-[11px] text-ink-mute">Match<b className="block text-[14px] text-ink">{ev?.match ?? a.match ?? 'n/a'}%</b></span>
                      <span className="text-center text-[11px] text-ink-mute">AI fit<b className="block text-[14px] text-ink">{a.ai_fit ?? 'n/a'}</b></span>
                      <select value={a.status} onChange={(e) => setStatus(a, e.target.value as JobStatus)} className="field h-[32px] w-full py-0 text-[12px] sm:w-[130px]" aria-label={`Status for ${r?.profile.full_name}`}>
                        {(Object.keys(STATUS_META) as JobStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                    </div>
                  ))}
                  {!applicants.length && <p className="py-6 text-center text-[12px] text-ink-faint">No applications yet.</p>}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Page>
  )
}
