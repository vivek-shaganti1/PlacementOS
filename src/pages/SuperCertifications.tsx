import { useMemo, useState, type FormEvent } from 'react'
import { HoldButton } from '../components/HoldButton'
import { Card, Page, Stat } from '../components/Page'
import { SKILL_RULES } from '../lib/branches'
import { useCertCatalog } from '../lib/certs'
import { plural } from '../lib/format'
import { safeUrl } from '../lib/links'
import { useApp } from '../lib/store'
import { errMsg, supabase } from '../lib/supabase'

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
const blankCourse = { provider_id: '', title: '', url: '', weeks: '4', level: 'beginner' as (typeof LEVELS)[number], skills: [] as string[] }

function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[20px] w-[36px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${on ? 'bg-brand' : 'bg-[#dfe2e7]'}`}
    >
      <span className={`absolute left-[3px] top-[3px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${on ? 'translate-x-[16px]' : 'translate-x-0'}`} />
    </button>
  )
}

/**
 * Platform admin: the certification providers and courses students are recommended. Enable a provider when you partner
 * with it (Coursera, NPTEL, Autodesk, ...); students then see its courses wherever a course's skills are holding them back.
 */
export default function SuperCertifications() {
  const { showToast } = useApp()
  const { providers, courses, live, loading, reload } = useCertCatalog()
  const [busy, setBusy] = useState(false)
  const [prov, setProv] = useState({ name: '', website: '' })
  const [course, setCourse] = useState(blankCourse)
  const [skillDraft, setSkillDraft] = useState('')
  const [filter, setFilter] = useState({ provider: 'all', q: '' })
  const countFor = (id: string) => courses.filter((c) => c.provider_id === id).length
  const nameOf = useMemo(() => new Map(providers.map((p) => [p.id, p.name])), [providers])
  const shown = courses.filter((c) => (filter.provider === 'all' || c.provider_id === filter.provider) && `${c.title} ${c.skills.join(' ')}`.toLowerCase().includes(filter.q.toLowerCase()))

  const run = async (fn: () => PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true)
    const { error } = await fn()
    setBusy(false)
    if (error) return showToast(errMsg(error)), false
    showToast(ok)
    await reload()
    return true
  }

  const addProvider = async (e: FormEvent) => {
    e.preventDefault()
    const name = prov.name.trim()
    if (name.length < 2) return showToast('Enter the provider name.')
    const website = prov.website.trim() ? (/^https:\/\//i.test(prov.website.trim()) ? prov.website.trim() : `https://${prov.website.trim().replace(/^http:\/\//i, '')}`) : ''
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    if (await run(() => supabase.from('cert_providers').insert({ name, website, slug, sort: 100 + providers.length }), `${name} added. Turn on "Partner" if you collaborate with them.`)) setProv({ name: '', website: '' })
  }

  const addCourse = async (e: FormEvent) => {
    e.preventDefault()
    const weeks = Number(course.weeks)
    if (!course.provider_id) return showToast('Choose the provider.')
    if (course.title.trim().length < 3) return showToast('Enter the course title.')
    if (!/^https:\/\//i.test(course.url.trim())) return showToast('Enter the course link (https://…).')
    if (!course.skills.length) return showToast('Add at least one skill the course builds.')
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) return showToast('Duration must be 1 to 52 weeks.')
    const row = { provider_id: course.provider_id, title: course.title.trim(), url: course.url.trim(), weeks, level: course.level, skills: course.skills }
    if (await run(() => supabase.from('cert_courses').insert(row), 'Course added. Students whose gaps match will see it.')) setCourse({ ...blankCourse, provider_id: course.provider_id })
  }

  const addSkill = (name: string) => {
    const s = SKILL_RULES.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
    if (!s) return showToast('Pick a skill from the list.')
    if (!course.skills.includes(s.name) && course.skills.length < 6) setCourse({ ...course, skills: [...course.skills, s.name] })
    setSkillDraft('')
  }

  return (
    <Page title="Certifications" subtitle="The providers and courses students are recommended. Enable a provider once you partner with it; students see its courses wherever their skills fall short." wide>
      {!live && !loading && (
        <Card>
          <p className="text-[12.5px] text-[#b54708]">
            Showing the built-in catalog (read-only). Run the migration <code className="font-mono text-[11.5px]">20261026000000_certification_partners.sql</code> to manage providers and courses here.
          </p>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Providers" value={String(providers.length)} sub={`${providers.filter((p) => p.enabled).length} enabled`} />
        <Stat label="Partners" value={String(providers.filter((p) => p.partnered).length)} sub="labelled for students" tone="text-brand-dark" />
        <Stat label="Courses" value={String(courses.length)} sub={`${courses.filter((c) => c.enabled).length} enabled`} />
        <Stat label="Skills covered" value={String(new Set(courses.flatMap((c) => c.skills)).size)} sub={`of ${SKILL_RULES.length} across all branches`} />
      </div>

      <Card title="Providers">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead className="text-[11px] text-ink-mute">
              <tr className="border-b border-line">
                <th className="px-2 py-2 font-medium">Provider</th>
                <th className="px-2 py-2 font-medium">Courses</th>
                <th className="px-2 py-2 font-medium">Enabled</th>
                <th className="px-2 py-2 font-medium">Partner</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-line/70">
                  <td className="px-2 py-2.5">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    {safeUrl(p.website) && <a href={safeUrl(p.website)} target="_blank" rel="noreferrer" className="text-[11px] text-brand-dark hover:underline">{p.website.replace(/^https:\/\//, '')}</a>}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-ink-soft">{countFor(p.id)}</td>
                  <td className="px-2 py-2.5"><Switch on={p.enabled} label={`${p.name} enabled`} disabled={!live || busy} onChange={() => run(() => supabase.from('cert_providers').update({ enabled: !p.enabled }).eq('id', p.id), `${p.name} ${p.enabled ? 'hidden from' : 'shown to'} students.`)} /></td>
                  <td className="px-2 py-2.5"><Switch on={p.partnered} label={`${p.name} is a partner`} disabled={!live || busy} onChange={() => run(() => supabase.from('cert_providers').update({ partnered: !p.partnered }).eq('id', p.id), p.partnered ? `${p.name} is no longer marked as a partner.` : `${p.name} marked as a partner.`)} /></td>
                  <td className="px-2 py-2.5 text-right">
                    {live && (
                      <HoldButton onConfirm={() => run(() => supabase.from('cert_providers').delete().eq('id', p.id), `${p.name} removed.`)} warning={`Removes ${p.name} and its ${plural(countFor(p.id), 'course')}.`} className="rounded px-1 text-[12px] text-[#d92d20] underline">
                        Remove
                      </HoldButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {live && (
          <form onSubmit={addProvider} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <input value={prov.name} onChange={(e) => setProv({ ...prov, name: e.target.value })} placeholder="Provider name (e.g. Udemy Business)" aria-label="Provider name" maxLength={80} className="field" />
            <input value={prov.website} onChange={(e) => setProv({ ...prov, website: e.target.value })} placeholder="Website (https://…)" aria-label="Provider website" className="field" />
            <button disabled={busy} className="btn-primary">Add provider</button>
          </form>
        )}
      </Card>

      <Card
        title="Courses"
        action={
          <span className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select value={filter.provider} onChange={(e) => setFilter({ ...filter, provider: e.target.value })} aria-label="Filter by provider" className="field h-[32px] w-full max-w-full text-[12px] sm:w-auto">
              <option value="all">All providers</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} placeholder="Search title or skill" aria-label="Search courses" className="field h-[32px] w-full text-[12px] sm:w-[180px]" />
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead className="text-[11px] text-ink-mute">
              <tr className="border-b border-line">
                <th className="px-2 py-2 font-medium">Course</th>
                <th className="px-2 py-2 font-medium">Provider</th>
                <th className="px-2 py-2 font-medium">Skills it builds</th>
                <th className="px-2 py-2 font-medium">Length</th>
                <th className="px-2 py-2 font-medium">Enabled</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-line/70 align-top">
                  <td className="px-2 py-2.5">
                    <a href={safeUrl(c.url)} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:underline">{c.title}</a>
                    <span className="block text-[11px] capitalize text-ink-faint">{c.level}</span>
                  </td>
                  <td className="px-2 py-2.5 text-ink-soft">{nameOf.get(c.provider_id) ?? '—'}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {c.skills.map((sk) => <span key={sk} className="rounded-full border border-line bg-white/80 px-2 py-0.5 text-[10.5px] text-ink-soft">{sk}</span>)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-ink-soft">{plural(c.weeks, 'week')}</td>
                  <td className="px-2 py-2.5"><Switch on={c.enabled} label={`${c.title} enabled`} disabled={!live || busy} onChange={() => run(() => supabase.from('cert_courses').update({ enabled: !c.enabled }).eq('id', c.id), c.enabled ? 'Course hidden from students.' : 'Course shown to students.')} /></td>
                  <td className="px-2 py-2.5 text-right">
                    {live && (
                      <HoldButton onConfirm={() => run(() => supabase.from('cert_courses').delete().eq('id', c.id), 'Course removed.')} warning={`Removes ${c.title} from recommendations.`} className="rounded px-1 text-[12px] text-[#d92d20] underline">
                        Remove
                      </HoldButton>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-6 text-center text-[12px] text-ink-faint">No courses match.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {live && (
          <form onSubmit={addCourse} className="mt-4 space-y-2 border-t border-line pt-4">
            <p className="text-[12px] font-semibold text-ink">Add a course</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1.6fr_1.4fr_0.6fr_0.9fr]">
              <select value={course.provider_id} onChange={(e) => setCourse({ ...course, provider_id: e.target.value })} aria-label="Provider" className="field">
                <option value="">Provider…</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} placeholder="Course title" aria-label="Course title" maxLength={160} className="field" />
              <input value={course.url} onChange={(e) => setCourse({ ...course, url: e.target.value })} placeholder="https://…" aria-label="Course link" className="field" />
              <input value={course.weeks} onChange={(e) => setCourse({ ...course, weeks: e.target.value })} inputMode="numeric" aria-label="Length in weeks" placeholder="Weeks" className="field" />
              <select value={course.level} onChange={(e) => setCourse({ ...course, level: e.target.value as (typeof LEVELS)[number] })} aria-label="Level" className="field capitalize">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {course.skills.map((sk) => (
                <button key={sk} type="button" onClick={() => setCourse({ ...course, skills: course.skills.filter((x) => x !== sk) })} className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-medium text-brand-dark" aria-label={`Remove ${sk}`}>
                  {sk} ×
                </button>
              ))}
              <input
                list="cert-skills"
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (skillDraft.trim()) addSkill(skillDraft)
                  }
                }}
                placeholder={course.skills.length ? 'Add another skill' : 'Skills it builds (any branch)'}
                aria-label="Add a skill"
                className="field h-[32px] w-[240px] text-[12px]"
              />
              <datalist id="cert-skills">{SKILL_RULES.map((s) => <option key={s.name} value={s.name} />)}</datalist>
              <button type="button" onClick={() => skillDraft.trim() && addSkill(skillDraft)} className="btn-glass h-[32px] py-0 text-[12px]">Add skill</button>
              <button disabled={busy} className="btn-primary ml-auto">Add course</button>
            </div>
          </form>
        )}
      </Card>
    </Page>
  )
}
