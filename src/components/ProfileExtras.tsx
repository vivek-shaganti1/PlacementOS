import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { SKILLS } from '../lib/eligibility'
import { useApp } from '../lib/store'
import { errMsg, type Profile } from '../lib/supabase'
import { allEvidence } from '../lib/verify'
import { Card } from './Page'

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
        <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
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

const platforms = [
  { key: 'github', label: 'GitHub', placeholder: 'GitHub username', url: (u: string) => `https://github.com/${u}` },
  { key: 'leetcode', label: 'LeetCode', placeholder: 'LeetCode username', url: (u: string) => `https://leetcode.com/u/${u}` },
  { key: 'codeforces', label: 'Codeforces', placeholder: 'Codeforces handle', url: (u: string) => `https://codeforces.com/profile/${u}` },
  { key: 'codechef', label: 'CodeChef', placeholder: 'CodeChef username', url: (u: string) => `https://www.codechef.com/users/${u}` },
] as const

function statsLine(p: Profile, key: (typeof platforms)[number]['key']) {
  const i = p.integrations ?? {}
  if (key === 'github' && i.github)
    return `${i.github.original_repos} repos · ${i.github.stars}★ · ${i.github.languages.slice(0, 4).map((l) => l.name).join(', ') || 'no languages'}`
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

  const syncAll = async () => {
    for (const { key } of platforms) {
      const u = p[`${key}_username`]
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

  const anyConnected = platforms.some(({ key }) => p[`${key}_username`])

  return (
    <div id="accounts">
      <Card title="Connected accounts" action={anyConnected ? <button onClick={syncAll} disabled={!!busy} className={btnGhost}>Sync all</button> : undefined}>
        <div className="divide-y divide-line">
          {platforms.map(({ key, label, placeholder, url }) => {
            const username = p[`${key}_username`]
            const synced = p.integrations?.[key]?.synced_at
            return (
              <div key={key} className="flex items-center gap-3 py-3">
                <span className="w-[92px] text-[12.5px] font-semibold text-ink">{label}</span>
                {username ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <a href={url(username)} target="_blank" rel="noreferrer" className="text-[12.5px] font-medium text-brand-dark hover:underline">@{username}</a>
                      <p className="truncate text-[11.5px] text-ink-mute">{statsLine(p, key)}</p>
                      {synced && <p className="text-[10.5px] text-ink-faint">Synced {ago(synced)}</p>}
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

        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-line pt-3">
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
  const evidence = allEvidence(p.integrations ?? {}, p.resume_analysis)
  const names = SKILLS.filter((n) => evidence[n])
  if (!names.length)
    return (
      <Card title="Verified skill levels">
        <p className="text-[12px] text-ink-mute">Connect GitHub or a coding platform, or analyze your resume, to calculate skill levels from real evidence instead of self-rating.</p>
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
        <div className="grid grid-cols-[1.4fr_70px_70px_2fr] gap-2 pb-2 text-[11px] font-semibold text-ink-mute">
          <span>Skill</span><span>Current</span><span>Verified</span><span>Evidence</span>
        </div>
        {names.map((n) => {
          const cur = p.skills.find((s) => s.name === n)?.level ?? 0
          const v = evidence[n]!
          return (
            <div key={n} className="grid grid-cols-[1.4fr_70px_70px_2fr] items-center gap-2 py-2 text-[12px]">
              <span className="font-medium text-ink">{n}</span>
              <span className="text-ink-mute">{cur}%</span>
              <span className={`font-semibold ${v.level >= cur ? 'text-[#0d9a5b]' : 'text-[#d97706]'}`}>{v.level}%</span>
              <span className="truncate text-[11px] text-ink-faint" title={v.sources.join(' · ')}>{v.sources.join(' · ')}</span>
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
      <div className="grid grid-cols-2 gap-2">
        {gh.top_repos.map((r) => (
          <div key={r.name} className="rounded-[11px] border border-line p-3">
            <div className="flex items-center gap-2">
              <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-[12.5px] font-semibold text-brand-dark hover:underline">{r.name}</a>
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
            <button onClick={() => save(p.achievements.filter((_, j) => j !== i), 'Removed.')} className="text-[11px] text-ink-faint opacity-0 hover:text-[#d92d20] group-hover:opacity-100">Remove</button>
          </div>
        ))}
        {p.achievements.length === 0 && <p className="py-2 text-[12px] text-ink-faint">Add hackathon wins, contest ranks, club roles, publications…</p>}
      </div>
      <form
        className="mt-3 grid grid-cols-[1.2fr_1.6fr_0.8fr_auto] gap-2"
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
