import { useState } from 'react'
import { Card, Page, Stat } from '../components/Page'

const owned = [
  { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', date: 'Jun 2025', id: 'AWS-CP-99213' },
  { name: 'Meta Front-End Developer', issuer: 'Coursera', date: 'Mar 2025', id: 'MFE-44120' },
  { name: 'Google Data Analytics', issuer: 'Coursera', date: 'Nov 2024', id: 'GDA-77510' },
]

const recommended = [
  { name: 'AWS Solutions Architect - Associate', why: 'Unlocks 6 cloud-heavy companies in your stacks', weeks: 6 },
  { name: 'Kubernetes (CKAD)', why: 'Closes your DevOps gap (51% → 70%)', weeks: 5 },
  { name: 'MongoDB Associate Developer', why: 'Strengthens the databases criterion', weeks: 3 },
  { name: 'Google Cloud Associate Engineer', why: 'Common requirement for product companies', weeks: 6 },
]

export default function Certifications() {
  const [enrolled, setEnrolled] = useState<string[]>([])

  return (
    <Page title="Certifications" subtitle="Credentials you hold and the ones that move your eligibility the most.">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Certifications held" value={`${owned.length}`} />
        <Stat label="In progress" value={`${enrolled.length}`} tone="text-[#d97706]" />
        <Stat label="Recommended" value={`${recommended.length}`} tone="text-brand-dark" />
      </div>

      <Card title="Your certifications">
        <div className="divide-y divide-line">
          {owned.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                <p className="text-[11.5px] text-ink-mute">{c.issuer} · {c.date}</p>
              </div>
              <span className="text-[11px] text-ink-faint">ID {c.id}</span>
              <span className="rounded-md border border-[#c9f0d9] bg-[#ecfdf3] px-2 py-[3px] text-[11px] font-semibold text-[#0d9a5b]">Verified</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recommended for your target companies">
        <div className="divide-y divide-line">
          {recommended.map((c) => (
            <div key={c.name} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                <p className="text-[11.5px] text-ink-mute">{c.why}</p>
              </div>
              <span className="text-[11.5px] text-ink-faint">~{c.weeks} weeks</span>
              <button
                onClick={() => setEnrolled((e) => (e.includes(c.name) ? e.filter((x) => x !== c.name) : [...e, c.name]))}
                className={`w-[92px] rounded-[9px] border py-[7px] text-[12px] font-semibold ${
                  enrolled.includes(c.name) ? 'border-[#fbe3bd] bg-[#fff8ec] text-[#d97706]' : 'border-[#d5cbff] text-brand-dark hover:bg-[#faf8ff]'
                }`}
              >
                {enrolled.includes(c.name) ? 'Enrolled' : 'Enroll'}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
