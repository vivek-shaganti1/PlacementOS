import { useState } from 'react'
import { Card, Page, Stat } from '../components/Page'
import { useAuth, useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { useApp } from '../lib/store'
import { errMsg } from '../lib/supabase'

const catalog = [
  { name: 'AWS Certified Solutions Architect – Associate', skill: 'Cloud & DevOps', weeks: 6, url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/' },
  { name: 'Certified Kubernetes Application Developer (CKAD)', skill: 'Cloud & DevOps', weeks: 5, url: 'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/' },
  { name: 'Google Cloud Associate Cloud Engineer', skill: 'Cloud & DevOps', weeks: 6, url: 'https://cloud.google.com/learn/certification/cloud-engineer' },
  { name: 'MongoDB Associate Developer', skill: 'Databases (SQL + NoSQL)', weeks: 3, url: 'https://learn.mongodb.com/pages/mongodb-associate-developer-exam' },
  { name: 'Oracle Database SQL Certified Associate', skill: 'Databases (SQL + NoSQL)', weeks: 4, url: 'https://education.oracle.com/' },
  { name: 'Meta Back-End Developer Professional Certificate', skill: 'Node.js / Backend', weeks: 8, url: 'https://www.coursera.org/professional-certificates/meta-back-end-developer' },
  { name: 'Meta Front-End Developer Professional Certificate', skill: 'React / Frontend', weeks: 8, url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer' },
  { name: 'Machine Learning Specialization (DeepLearning.AI)', skill: 'Machine Learning', weeks: 8, url: 'https://www.coursera.org/specializations/machine-learning-introduction' },
  { name: 'NPTEL Programming, Data Structures and Algorithms', skill: 'Data Structures & Algorithms', weeks: 8, url: 'https://nptel.ac.in/' },
  { name: 'Grokking the System Design Interview', skill: 'System Design', weeks: 4, url: 'https://www.designgurus.io/course/grokking-the-system-design-interview' },
]

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
  const recommended = catalog
    .filter((c) => !owned.has(c.name.toLowerCase()))
    .map((c) => ({ ...c, impact: blocked(c.skill) }))
    .filter((c) => c.impact > 0)
    .sort((a, b) => b.impact - a.impact || level(a.skill) - level(b.skill))
    .slice(0, 6)

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
      <div className="grid grid-cols-3 gap-3">
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
              {c.credential_url && (
                <a href={c.credential_url} target="_blank" rel="noreferrer" className="text-[11.5px] font-medium text-brand-dark hover:underline">Credential</a>
              )}
              <button onClick={() => save(p.certifications.filter((_, j) => j !== i), 'Certification removed.')} className="text-[11px] text-ink-faint opacity-0 hover:text-[#d92d20] group-hover:opacity-100">Remove</button>
            </div>
          ))}
          {p.certifications.length === 0 && <p className="py-3 text-[12px] text-ink-faint">No certifications yet. Add one below or import them from your resume.</p>}
        </div>
        <form
          className="mt-3 grid grid-cols-[1.6fr_1fr_0.7fr_1.2fr_auto] gap-2"
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
            <div key={c.name} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <a href={c.url} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-ink hover:underline">{c.name}</a>
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
