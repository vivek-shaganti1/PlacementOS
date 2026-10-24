import { useState } from 'react'
import { Card, Page, Stat } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { useApp } from '../lib/store'
import { errMsg } from '../lib/supabase'
import { safeUrl } from '../lib/links'
import { useCertCatalog } from '../lib/certs'
import { skillsFor } from '../lib/branches'


const input = 'h-[34px] w-full rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none focus:border-[#d5cbff]'

export default function Certifications() {
  const p = useProfile()
  const { updateProfile } = useAuth()
  const { enrollments: enrolled, toggleEnrollment, showToast } = useApp()
  const { companies } = useCompanies()
  const [d, setD] = useState({ name: '', issuer: '', date: '', credential_url: '' })

  // How many not-yet-eligible companies list each skill as a gap.
  const blocked = (skill: string) => companies.filter((c) => c.bucket !== 'eligible' && c.gaps.some((g) => g.skill === skill)).length
  const level = (skill: string) => p.skills.find((s) => s.name === skill)?.level ?? 0
  const owned = new Set(p.certifications.map((c) => c.name.toLowerCase()))
  // Courses from the providers the platform admin has enabled, ranked by how many companies their skills unlock.
  const { providers, courses } = useCertCatalog()
  const providerOf = new Map(providers.map((x) => [x.id, x]))
  const mine = new Set(skillsFor(p))
  const recommended = courses
    .filter((c) => c.enabled && providerOf.get(c.provider_id)?.enabled && !owned.has(c.title.toLowerCase()))
    .map((c) => {
      // The course's most blocking skill among the student's own skills.
      const ranked = c.skills.filter((sk) => mine.has(sk)).map((sk) => ({ sk, n: blocked(sk) })).sort((a, b) => b.n - a.n || level(a.sk) - level(b.sk))
      return { ...c, name: c.title, skill: ranked[0]?.sk ?? c.skills[0], impact: ranked[0]?.n ?? 0, provider: providerOf.get(c.provider_id)! }
    })
    .filter((c) => c.impact > 0)
    .sort((a, b) => b.impact - a.impact || Number(b.provider.partnered) - Number(a.provider.partnered) || level(a.skill) - level(b.skill))
    .slice(0, 8)

  const save = async (certifications: typeof p.certifications, msg: string) => {
    try {
      await updateProfile({ certifications })
      showToast(msg)
      return true
    } catch (e) {
      showToast(errMsg(e))
      return false
    }
  }

  return (
    <Page title="Certifications" subtitle="Credentials you hold and the ones that move your eligibility the most.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Certifications held" value={`${p.certifications.length}`} />
        <Stat label="In progress" value={`${enrolled.length}`} tone="text-[#d97706]" />
        <Stat label="Recommended" value={`${recommended.length}`} tone="text-brand-dark" />
      </div>

      <Card title="Your certifications">
        <div className="divide-y divide-line">
          {p.certifications.map((c, i) => (
            <div key={c.name + i} className="group flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                <p className="text-[11.5px] text-ink-mute">{[c.issuer, c.date].filter(Boolean).join(' · ') || 'Issuer not set'}</p>
              </div>
              {safeUrl(c.credential_url) && (
                <a href={safeUrl(c.credential_url)} target="_blank" rel="noreferrer" className="text-[11.5px] font-medium text-brand-dark hover:underline">Credential</a>
              )}
              <button onClick={() => save(p.certifications.filter((_, j) => j !== i), 'Certification removed.')} className="text-[11px] text-ink-faint opacity-0 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-[#d92d20] group-hover:opacity-100">Remove</button>
            </div>
          ))}
          {p.certifications.length === 0 && <p className="py-3 text-[12px] text-ink-faint">No certifications yet. Add one below or import them from your resume.</p>}
        </div>
        <form
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_0.7fr_1.2fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!d.name.trim()) return showToast('Certification name is required.')
            const url = d.credential_url.trim()
            const entry = { name: d.name.trim(), issuer: d.issuer.trim(), date: d.date.trim(), ...(url ? { credential_url: /^https?:\/\//.test(url) ? url : `https://${url}` } : {}) }
            if (await save([...p.certifications, entry], 'Certification added.')) setD({ name: '', issuer: '', date: '', credential_url: '' })
          }}
        >
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Certification name" className={input} />
          <input value={d.issuer} onChange={(e) => setD({ ...d, issuer: e.target.value })} placeholder="Issuer" className={input} />
          <input value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} placeholder="Jun 2025" className={input} />
          <input value={d.credential_url} onChange={(e) => setD({ ...d, credential_url: e.target.value })} placeholder="Credential URL (optional)" className={input} />
          <button className="rounded-md border border-line px-3 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]">Add</button>
        </form>
      </Card>

      <Card title="Recommended for your gaps">
        <div className="divide-y divide-line">
          {recommended.map((c) => (
            <div key={c.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <div className="min-w-[200px] flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <a href={safeUrl(c.url)} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-ink hover:underline">{c.name}</a>
                  <span className="rounded-full border border-line bg-white/80 px-2 py-0.5 text-[10.5px] font-medium text-ink-mute">{c.provider.name}</span>
                  {c.provider.partnered && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[10.5px] font-semibold text-brand-dark">Partner</span>}
                </span>
                <p className="text-[11.5px] text-ink-mute">
                  {c.skill} is a gap at {c.impact} compan{c.impact === 1 ? 'y' : 'ies'} you are not yet eligible for (you: {level(c.skill)}%).
                </p>
              </div>
              <span className="text-[11.5px] text-ink-faint">~{c.weeks} weeks</span>
              <button
                onClick={() => toggleEnrollment(c.name)}
                className={`w-[92px] rounded-[9px] border py-[7px] text-[12px] font-semibold ${
                  enrolled.includes(c.name) ? 'border-[#fbe3bd] bg-[#fff8ec] text-[#d97706]' : 'border-[#d5cbff] text-brand-dark hover:bg-[#faf8ff]'
                }`}
              >
                {enrolled.includes(c.name) ? 'Enrolled' : 'Enroll'}
              </button>
            </div>
          ))}
          {recommended.length === 0 && <p className="py-3 text-[12px] text-ink-faint">No skill gaps that a certification would close. Nice work.</p>}
        </div>
      </Card>
    </Page>
  )
}
