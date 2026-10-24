import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { FILE_SIGNALS, GATE_PAPERS, SKILL_BY_NAME, skillsFor, TRACK_BY_ID, tracksFor, tracksForBranch, type FileSignal } from '../lib/branches'
import { parseGateScorecard } from '../lib/gateScorecard'
import { extractResumeText } from '../lib/resumeText'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/store'
import { errMsg, type Profile } from '../lib/supabase'
import { allEvidence } from '../lib/verify'
import { Card } from './Page'
import { safeUrl } from '../lib/links'
import { plural } from '../lib/format'

const input =
  'h-[34px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff] focus:ring-4 focus:ring-brand/10'
const btnGhost = 'rounded-md border border-line px-3 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa] disabled:opacity-50'
const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`
}

export function completeness(p: Profile) {
  const i = p.integrations ?? {}
  const items: [string, boolean, string][] = [
    ['Name, branch, batch & college', !!(p.full_name && p.branch && p.batch && p.college), '/profile'],
    ['Phone number', !!p.phone, '/profile'],
    ['CGPA and Class X / XII marks', !!(p.cgpa && p.class_x && p.class_xii), '/profile'],
    ['Resume uploaded & analyzed', !!p.resume_analysis, '/resume'],
    ['GitHub connected', !!i.github, '/profile'],
    ['A coding platform connected', !!(i.leetcode || i.codeforces || i.codechef), '/profile'],
    ['LinkedIn profile', !!p.linkedin_url, '/profile'],
    ['At least 2 projects', p.projects.length >= 2 || (i.github?.original_repos ?? 0) >= 2, '/profile'],
    ['Internship / experience', p.internships.length > 0, '/profile'],
    ['Skill levels set', p.skills.some((s) => s.level > 0), '/profile'],
    ['A certification', p.certifications.length > 0, '/certifications'],
  ]
  return { items, pct: Math.round((items.filter((x) => x[1]).length / items.length) * 100) }
}

export function Completeness({ p }: { p: Profile }) {
  const navigate = useNavigate()
  const { items, pct } = completeness(p)
  const missing = items.filter((x) => !x[1])
  return (
    <Card title="Profile strength" action={<span className="text-[13px] font-bold text-brand-dark">{pct}%</span>}>
      <span className="block h-[8px] overflow-hidden rounded-full bg-[#eef0f3]">
        <span className="block h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }} />
      </span>
      {missing.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {missing.map(([label, , to]) => (
            <button key={label} onClick={() => (to === '/profile' ? document.getElementById('accounts')?.scrollIntoView({ behavior: 'smooth' }) : navigate(to))} className="rounded-md border border-[#fbe3bd] bg-[#fff8ec] px-2 py-[3px] text-[11px] font-medium text-[#b45309] hover:underline">
              + {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12px] font-medium text-[#0d9a5b]">Everything recruiters look for is on your profile.</p>
      )}
    </Card>
  )
}

/** Evidence sources. `show` decides whether a source is relevant to the student's tracks. */
const platforms = [
  { key: 'github', label: 'GitHub', placeholder: 'GitHub username', url: (u: string) => `https://github.com/${u}`, show: () => true },
  { key: 'credly', label: 'Credly', placeholder: 'Credly username', url: (u: string) => `https://www.credly.com/users/${u}`, show: () => true },
  { key: 'leetcode', label: 'LeetCode', placeholder: 'LeetCode username', url: (u: string) => `https://leetcode.com/u/${u}`, show: (sk: string[]) => sk.includes('Data Structures & Algorithms') },
  { key: 'codeforces', label: 'Codeforces', placeholder: 'Codeforces handle', url: (u: string) => `https://codeforces.com/profile/${u}`, show: (sk: string[]) => sk.includes('Data Structures & Algorithms') },
  { key: 'codechef', label: 'CodeChef', placeholder: 'CodeChef username', url: (u: string) => `https://www.codechef.com/users/${u}`, show: (sk: string[]) => sk.includes('Data Structures & Algorithms') },
  { key: 'huggingface', label: 'Hugging Face', placeholder: 'Hugging Face username', url: (u: string) => `https://huggingface.co/${u}`, show: (sk: string[]) => sk.includes('Deep Learning') || sk.includes('Machine Learning') },
  { key: 'ctftime', label: 'CTFtime', placeholder: 'CTFtime team id', url: (u: string) => `https://ctftime.org/team/${u}`, show: (sk: string[]) => sk.includes('Security Fundamentals') },
] as const
type PlatformKey = (typeof platforms)[number]['key']
const usernameOf = (p: Profile, key: PlatformKey) =>
  (key === 'github' || key === 'leetcode' || key === 'codeforces' || key === 'codechef' ? p[`${key}_username`] : null) ?? p.integrations?.[key]?.username ?? null

function statsLine(p: Profile, key: PlatformKey) {
  const i = p.integrations ?? {}
  if (key === 'credly' && i.credly) return i.credly.badges.length ? `${plural(i.credly.badges.length, 'verified badge')} · ${i.credly.badges.slice(0, 2).map((b) => b.name).join(', ')}` : 'No public badges yet'
  if (key === 'huggingface' && i.huggingface) return `${plural(i.huggingface.models, 'model')} · ${plural(i.huggingface.datasets, 'dataset')} · ${plural(i.huggingface.spaces, 'space')} · ${i.huggingface.downloads.toLocaleString('en-US')} downloads`
  if (key === 'ctftime' && i.ctftime) return `${i.ctftime.team} · ${Math.round(i.ctftime.rating_points)} rating points (${i.ctftime.year})${i.ctftime.country_place ? ` · #${i.ctftime.country_place} in country` : ''}`
  if (key === 'github' && i.github)
    return `${plural(i.github.original_repos, 'repo')} · ${i.github.stars}★ · ${i.github.languages.slice(0, 4).map((l) => l.name).join(', ') || 'no languages'}`
  if (key === 'leetcode' && i.leetcode)
    return `${i.leetcode.solved} solved (E ${i.leetcode.easy} · M ${i.leetcode.medium} · H ${i.leetcode.hard})${i.leetcode.contest_rating ? ` · contest ${i.leetcode.contest_rating}` : ''}`
  if (key === 'codeforces' && i.codeforces)
    return `${i.codeforces.rating ? `${i.codeforces.rating} (${i.codeforces.rank})` : 'Unrated'} · max ${i.codeforces.max_rating ?? '—'} · ${i.codeforces.solved} solved`
  if (key === 'codechef' && i.codechef)
    return `${i.codechef.rating ? `${i.codechef.rating}${i.codechef.stars ? ` · ${i.codechef.stars}★` : ''}` : 'Unrated'} · ${i.codechef.solved} solved`
  return null
}

export function ConnectedAccounts({ p }: { p: Profile }) {
  const { refreshProfile, updateProfile } = useAuth()
  const { showToast } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [links, setLinks] = useState({ linkedin_url: p.linkedin_url ?? '', portfolio_url: p.portfolio_url ?? '', hackerrank_username: p.hackerrank_username ?? '' })

  const sync = async (platform: string, username: string | null) => {
    setBusy(platform)
    try {
      await callApi('connect', { platform, username })
      await refreshProfile()
      showToast(username ? `${platform[0].toUpperCase() + platform.slice(1)} synced.` : 'Disconnected.')
      setDraft((d) => ({ ...d, [platform]: '' }))
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const skills = skillsFor(p)
  const shown = platforms.filter((x) => x.show(skills) || usernameOf(p, x.key))
  const syncAll = async () => {
    for (const { key } of shown) {
      const u = usernameOf(p, key)
      if (u) await sync(key, u)
    }
  }

  const saveLinks = async () => {
    const clean = (v: string) => v.trim() || null
    const url = (v: string) => {
      const t = v.trim()
      if (!t) return null
      return /^https?:\/\//i.test(t) ? t : `https://${t}`
    }
    try {
      await updateProfile({ linkedin_url: url(links.linkedin_url), portfolio_url: url(links.portfolio_url), hackerrank_username: clean(links.hackerrank_username) })
      showToast('Links saved.')
    } catch (e) {
      showToast(errMsg(e))
    }
  }

  const anyConnected = shown.some(({ key }) => usernameOf(p, key))
  const signals = Object.entries(p.integrations?.github?.signals ?? {}) as [FileSignal, { repos: string[]; files: number }][]
  const kicad = p.integrations?.github?.kicad ?? []

  return (
    <div id="accounts">
      <Card title="Connected accounts" action={anyConnected ? <button onClick={syncAll} disabled={!!busy} className={btnGhost}>Sync all</button> : undefined}>
        <div className="divide-y divide-line">
          {shown.map(({ key, label, placeholder, url }) => {
            const username = usernameOf(p, key)
            const synced = p.integrations?.[key]?.synced_at
            return (
              <div key={key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <span className="w-full text-[12.5px] font-semibold text-ink sm:w-[92px]">{label}</span>
                {username ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <a href={url(username)} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-brand-dark hover:underline">@{username}</a>
                      <p className="truncate text-[11.5px] text-ink-mute">{statsLine(p, key)}</p>
                      {synced && <p className="text-[10.5px] text-ink-faint">Synced {ago(synced)}</p>}
                      {key === 'github' && signals.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {signals.map(([sig, v]) => (
                            <span key={sig} title={v.repos.join(', ')} className="rounded-full border border-[#c9f0d9] bg-[#ecfdf3] px-2 py-0.5 text-[10.5px] font-medium text-[#067647]">
                              {FILE_SIGNALS[sig].label} · {plural(v.files, 'file')} in {plural(v.repos.length, 'repo')}
                            </span>
                          ))}
                        </div>
                      )}
                      {key === 'github' && kicad.length > 0 && (
                        <p className="mt-1 text-[11px] text-ink-mute">
                          <b className="font-semibold text-ink-soft">Components in your KiCad schematics:</b>{' '}
                          {[...new Set(kicad.flatMap((k) => k.components))].slice(0, 14).join(', ')} ({plural(kicad.reduce((a, k) => a + k.parts, 0), 'part')} placed)
                        </p>
                      )}
                    </div>
                    <button onClick={() => sync(key, username)} disabled={!!busy} className={btnGhost}>{busy === key ? 'Syncing…' : 'Sync'}</button>
                    <button onClick={() => sync(key, null)} disabled={!!busy} className="text-[11px] text-ink-faint hover:text-[#d92d20]">Disconnect</button>
                  </>
                ) : (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (draft[key]?.trim()) sync(key, draft[key].trim())
                    }}
                  >
                    <input value={draft[key] ?? ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} placeholder={placeholder} className={input} />
                    <button disabled={!!busy || !draft[key]?.trim()} className="rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                      {busy === key ? 'Connecting…' : 'Connect'}
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-3">
          {([['linkedin_url', 'LinkedIn URL', 'linkedin.com/in/you'], ['portfolio_url', 'Portfolio / website', 'yourname.dev'], ['hackerrank_username', 'HackerRank username', 'username']] as const).map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="text-[11px] font-medium text-ink-mute">{label}</span>
              <input value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder={ph} className={`${input} mt-1`} />
            </label>
          ))}
        </div>
        <button onClick={saveLinks} className={`${btnGhost} mt-2`}>Save links</button>
      </Card>
    </div>
  )
}

export function VerifiedSkills({ p }: { p: Profile }) {
  const { updateProfile } = useAuth()
  const { showToast } = useApp()
  const SKILLS = skillsFor(p)
  const evidence = allEvidence(p.integrations ?? {}, p.resume_analysis, { skills: SKILLS, credentials: p.credentials })
  const names = SKILLS.filter((n) => evidence[n])
  if (!names.length)
    return (
      <Card title="Verified skill levels">
        <p className="text-[12px] text-ink-mute">Connect GitHub (with your design or code files), Credly or a coding platform, add an NPTEL certificate, or analyze your resume, to calculate skill levels from real evidence instead of self-rating.</p>
      </Card>
    )

  const apply = async () => {
    const skills = SKILLS.map((name) => ({ name, level: evidence[name]?.level ?? p.skills.find((s) => s.name === name)?.level ?? 0 }))
    try {
      await updateProfile({ skills })
      showToast('Skill levels updated from your verified evidence. Eligibility re-calculated.')
    } catch (e) {
      showToast(errMsg(e))
    }
  }

  return (
    <Card title="Verified skill levels" action={<button onClick={apply} className="rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark">Use verified levels</button>}>
      <div className="divide-y divide-line">
        <div className="grid grid-cols-[1.4fr_60px_60px] gap-2 pb-2 text-[11px] font-semibold text-ink-mute sm:grid-cols-[1.4fr_70px_70px_2fr]">
          <span>Skill</span><span>Current</span><span>Verified</span><span className="hidden sm:inline">Evidence</span>
        </div>
        {names.map((n) => {
          const cur = p.skills.find((s) => s.name === n)?.level ?? 0
          const v = evidence[n]!
          return (
            <div key={n} className="grid grid-cols-[1.4fr_60px_60px] items-center gap-2 py-2 text-[12px] sm:grid-cols-[1.4fr_70px_70px_2fr]">
              <span className="font-medium text-ink">{n}</span>
              <span className="text-ink-mute">{cur}%</span>
              <span className={`font-semibold ${v.level >= cur ? 'text-[#0d9a5b]' : 'text-[#d97706]'}`}>{v.level}%</span>
              <span className="col-span-3 truncate text-[11px] text-ink-faint sm:col-span-1" title={v.sources.join(' · ')}>{v.sources.join(' · ')}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function GithubProjects({ p }: { p: Profile }) {
  const { updateProfile } = useAuth()
  const { showToast } = useApp()
  const gh = p.integrations?.github
  if (!gh?.top_repos.length) return null
  const has = (name: string) => p.projects.some((x) => x.title.toLowerCase() === name.toLowerCase())
  const add = async (r: (typeof gh.top_repos)[number]) => {
    const tech = [r.language, ...r.topics.slice(0, 4)].filter(Boolean).join(', ')
    try {
      await updateProfile({ projects: [...p.projects, { title: r.name, tech, description: r.description ?? '', url: r.url, source: 'github' }] })
      showToast(`${r.name} added to your projects.`)
    } catch (e) {
      showToast(errMsg(e))
    }
  }
  return (
    <Card title={`GitHub projects (${gh.original_repos} original repos)`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {gh.top_repos.map((r) => (
          <div key={r.name} className="rounded-[11px] border border-line p-3">
            <div className="flex items-center gap-2">
              <a href={safeUrl(r.url)} target="_blank" rel="noreferrer" className="flex-1 truncate text-[12.5px] font-semibold text-brand-dark hover:underline">{r.name}</a>
              <span className="text-[11px] text-ink-faint">★ {r.stars}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-mute">{r.description ?? 'No description'}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-ink-faint">{[r.language, ...r.topics.slice(0, 3)].filter(Boolean).join(' · ')}</span>
              <button onClick={() => add(r)} disabled={has(r.name)} className="ml-auto text-[11px] font-semibold text-brand-dark hover:underline disabled:text-ink-faint disabled:no-underline">
                {has(r.name) ? 'In projects' : '+ Add'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Achievements({ p }: { p: Profile }) {
  const { updateProfile } = useAuth()
  const { showToast } = useApp()
  const [d, setD] = useState({ title: '', detail: '', date: '' })
  const save = async (achievements: Profile['achievements'], msg: string) => {
    try {
      await updateProfile({ achievements })
      showToast(msg)
      return true
    } catch (e) {
      showToast(errMsg(e))
      return false
    }
  }
  return (
    <Card title="Achievements, hackathons & positions of responsibility">
      <div className="divide-y divide-line">
        {p.achievements.map((a, i) => (
          <div key={a.title + i} className="group flex items-center py-2.5">
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold text-ink">{a.title} {a.date && <span className="font-normal text-ink-faint">· {a.date}</span>}</p>
              {a.detail && <p className="text-[11.5px] text-ink-mute">{a.detail}</p>}
            </div>
            <button onClick={() => save(p.achievements.filter((_, j) => j !== i), 'Removed.')} className="text-[11px] text-ink-faint opacity-0 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-[#d92d20] group-hover:opacity-100">Remove</button>
          </div>
        ))}
        {p.achievements.length === 0 && <p className="py-2 text-[12px] text-ink-faint">Add hackathon wins, contest ranks, club roles, publications…</p>}
      </div>
      <form
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1.6fr_0.8fr_auto]"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!d.title.trim()) return showToast('Title is required.')
          if (await save([...p.achievements, { title: d.title.trim(), detail: d.detail.trim(), date: d.date.trim() }], 'Achievement added.')) setD({ title: '', detail: '', date: '' })
        }}
      >
        <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Smart India Hackathon finalist" className={input} />
        <input value={d.detail} onChange={(e) => setD({ ...d, detail: e.target.value })} placeholder="Details" className={input} />
        <input value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} placeholder="2025" className={input} />
        <button className={btnGhost}>Add</button>
      </form>
    </Card>
  )
}


/** The career tracks a student is measured against (skills, recruiters, resume checks). */
export function TrackPicker({ p }: { p: Profile }) {
  const { updateProfile } = useAuth()
  const { showToast } = useApp()
  const current = tracksFor(p)
  const [busy, setBusy] = useState(false)
  const toggle = async (id: string) => {
    const next = current.includes(id) ? current.filter((t) => t !== id) : current.length >= 3 ? current : [...current, id]
    if (!next.length) return showToast('Keep at least one track.')
    setBusy(true)
    try {
      await updateProfile({ tracks: next })
      showToast('Tracks updated. Skills, recruiters and eligibility re-calculated.')
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card title="Your tracks">
      <p className="text-[12px] text-ink-mute">What you are preparing for, up to three. Your skills, recruiters, resume checks and verified levels follow these.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tracksForBranch(p.branch).map((t) => {
          const on = current.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              disabled={busy}
              aria-pressed={on}
              title={t.blurb}
              onClick={() => toggle(t.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-60 ${on ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line bg-white text-ink-soft hover:bg-[#faf8ff]'}`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">{current.map((t) => TRACK_BY_ID.get(t)?.label).join(' · ')}</p>
    </Card>
  )
}

const statusChip: Record<string, string> = {
  verified: 'border-[#c9f0d9] bg-[#ecfdf3] text-[#067647]',
  pending: 'border-[#fde7c2] bg-[#fffaeb] text-[#b54708]',
  rejected: 'border-[#fbd5d1] bg-[#fef3f2] text-[#b42318]',
}

/** NPTEL certificates (verified at nptel.ac.in) and GATE scorecards (read from the PDF, confirmed by the placement cell). */
export function Credentials({ p }: { p: Profile }) {
  const { refreshProfile, session } = useAuth()
  const { showToast } = useApp()
  const skills = skillsFor(p).filter((n) => (SKILL_BY_NAME.get(n)?.nptel ?? []).length)
  const [nptel, setNptel] = useState({ ref: '', skill: skills[0] ?? '' })
  const [busy, setBusy] = useState<string | null>(null)
  const creds = p.credentials ?? []
  const gateRelevant = skillsFor(p).some((n) => (SKILL_BY_NAME.get(n)?.gate ?? []).length && n !== 'Aptitude & Reasoning')

  const addNptel = async () => {
    setBusy('nptel')
    try {
      await callApi('connect', { credential: 'nptel', ref: nptel.ref.trim(), skill: nptel.skill })
      await refreshProfile()
      setNptel({ ...nptel, ref: '' })
      showToast('Certificate verified on nptel.ac.in.')
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const addGate = async (file: File | undefined) => {
    if (!file || !session) return
    if (file.type !== 'application/pdf' || file.size > 5_000_000) return showToast('Upload the official scorecard PDF (up to 5 MB).')
    setBusy('gate')
    try {
      const fields = parseGateScorecard(await extractResumeText(file, file.name))
      if (!fields) throw new Error('This does not look like a GATE scorecard. Upload the PDF downloaded from GOAPS.')
      const path = `${session.user.id}/gate-${fields.year}-${fields.paper}.pdf`
      const up = await supabase.storage.from('resumes').upload(path, file, { upsert: true, contentType: 'application/pdf' })
      if (up.error) throw up.error
      await callApi('connect', { credential: 'gate', ...fields, file_path: path })
      await refreshProfile()
      showToast(`GATE ${fields.year} ${fields.paper} score ${fields.score} added. Your placement cell confirms it from the PDF.`)
    } catch (e) {
      showToast(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('credentials').delete().eq('id', id)
    if (error) return showToast(errMsg(error))
    await refreshProfile()
  }

  return (
    <Card title="Certificates & GATE">
      <p className="text-[12px] text-ink-mute">Only credentials that can be checked count: NPTEL certificates are verified on nptel.ac.in; a GATE score is read from your official scorecard and confirmed by your placement cell.</p>
      {creds.length > 0 && (
        <div className="mt-3 divide-y divide-line rounded-[12px] border border-line bg-white/70">
          {creds.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12px]">
              <span className="font-semibold text-ink">{c.kind === 'gate' ? c.title : `NPTEL · ${c.title || c.ref}`}</span>
              <span className="text-ink-mute">{c.kind === 'gate' ? `Score ${c.score}${c.data.air ? ` · AIR ${c.data.air}` : ''}` : `${c.skill} · ${String(c.data.discipline ?? '')}`}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${statusChip[c.status]}`}>
                {c.status === 'verified' ? (c.verified_by === 'college' ? 'Confirmed by placement cell' : 'Verified at source') : c.status === 'pending' ? 'Awaiting placement cell' : 'Rejected'}
              </span>
              <button onClick={() => remove(c.id)} className="ml-auto text-[11px] text-ink-faint hover:text-[#d92d20]">Remove</button>
            </div>
          ))}
        </div>
      )}
      {skills.length > 0 && (
        <form
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            if (nptel.ref.trim()) addNptel()
          }}
        >
          <input value={nptel.ref} onChange={(e) => setNptel({ ...nptel, ref: e.target.value })} placeholder="NPTEL certificate ID (e.g. NPTEL24EE42S…)" aria-label="NPTEL certificate ID" className={input} autoCapitalize="characters" />
          <select value={nptel.skill} onChange={(e) => setNptel({ ...nptel, skill: e.target.value })} aria-label="Skill this course is for" className={input}>
            {skills.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button disabled={!!busy || !nptel.ref.trim()} className="rounded-md bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{busy === 'nptel' ? 'Verifying…' : 'Verify certificate'}</button>
        </form>
      )}
      {gateRelevant && (
        <label className="mt-3 flex cursor-pointer flex-wrap items-center gap-2 text-[12px] text-ink-soft">
          <span className="rounded-md border border-line bg-white px-3 py-1.5 text-[11.5px] font-medium hover:bg-[#f7f8fa]">{busy === 'gate' ? 'Reading scorecard…' : 'Upload GATE scorecard (PDF)'}</span>
          <span className="text-[11px] text-ink-faint">Papers: {Object.keys(GATE_PAPERS).slice(0, 8).join(', ')}…</span>
          <input type="file" accept="application/pdf" className="hidden" disabled={!!busy} onChange={(e) => addGate(e.target.files?.[0])} />
        </label>
      )}
    </Card>
  )
}
