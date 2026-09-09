import { useState } from 'react'
import { companies } from '../data/companies'
import { student } from '../data/student'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Meter, Page } from '../components/Page'
import { useApp } from '../lib/store'

export default function SkillGap() {
  const [targetId, setTargetId] = useState(companies[0].id)
  const target = companies.find((c) => c.id === targetId)!
  const { openAssistant } = useApp()

  const required: Record<string, number> = {
    'Data Structures & Algorithms': Math.min(95, target.match + 8),
    'System Design': Math.min(95, target.match + 4),
    'React / Frontend': 70,
    'Node.js / Backend': 72,
    'Databases (SQL + NoSQL)': 75,
    'Machine Learning': 55,
    'Cloud & DevOps': 65,
    'Aptitude & Reasoning': 75,
  }

  return (
    <Page title="Skill Gap Analyzer" subtitle="Compare your current skills against a target company's expectations.">
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-medium text-ink-soft">Target company</span>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="h-[36px] rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none">
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <CompanyLogo company={target} size={24} />
          <span className="ml-auto text-[12.5px] text-ink-mute">Overall match <b className="text-ink">{target.match}%</b></span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Your level">
          <div className="space-y-3">
            {student.skills.map((s) => <Meter key={s.name} label={s.name} value={s.level} />)}
          </div>
        </Card>
        <Card title={`Required for ${target.name}`}>
          <div className="space-y-3">
            {student.skills.map((s) => <Meter key={s.name} label={s.name} value={required[s.name]} tone="#12b76a" />)}
          </div>
        </Card>
      </div>

      <Card title="Gaps to close" action={<button onClick={() => openAssistant('Build me a plan to close my skill gaps.')} className="text-[11.5px] font-medium text-brand-dark hover:underline">Ask AI for a plan →</button>}>
        <div className="divide-y divide-line">
          {student.skills
            .map((s) => ({ ...s, gap: required[s.name] - s.level }))
            .filter((s) => s.gap > 0)
            .sort((a, b) => b.gap - a.gap)
            .map((s) => (
              <div key={s.name} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-[12.5px] font-medium text-ink">{s.name}</span>
                <span className="text-[11.5px] text-ink-mute">{s.level}% → {required[s.name]}%</span>
                <span className="w-[64px] rounded-md border border-[#fbe3bd] bg-[#fff8ec] py-[3px] text-center text-[11px] font-semibold text-[#d97706]">
                  +{s.gap}
                </span>
              </div>
            ))}
        </div>
      </Card>
    </Page>
  )
}
