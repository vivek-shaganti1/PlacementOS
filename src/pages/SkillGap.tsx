import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bucketMeta } from '../data/companies'
import { SkillRadar } from '../components/charts'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Meter, Page } from '../components/Page'
import { useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { categoryLabel, SKILL_SHORT, SKILLS } from '../lib/eligibility'
import { useApp } from '../lib/store'

const tone = (v: number) => (v >= 75 ? '#12b76a' : v >= 60 ? '#f79009' : '#f04438')

export default function SkillGap() {
  const student = useProfile()
  const { companies, byId } = useCompanies()
  const { openAssistant } = useApp()
  const navigate = useNavigate()
  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name))
  const [targetId, setTargetId] = useState(() => companies.find((c) => c.bucket !== 'eligible')?.id ?? companies[0].id)
  const target = byId(targetId) ?? companies[0]
  const req = target.requirements.skills
  const level = (n: string) => student.skills.find((s) => s.name === n)?.level ?? 0
  const m = bucketMeta[target.bucket]
  const verified = student.integrations?.leetcode || student.integrations?.codeforces || student.integrations?.codechef || student.integrations?.github

  return (
    <Page title="Skill Gap Analyzer" subtitle="Compare your current skills against a target company's expectations.">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12.5px] font-medium text-ink-soft">Target company</span>
          <select value={target.id} onChange={(e) => setTargetId(e.target.value)} className="h-[36px] rounded-[9px] border border-line bg-white px-3 text-[12.5px] outline-none">
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <CompanyLogo company={target} size={24} />
          <span className="rounded-md border border-line bg-[#fafbfc] px-2 py-[3px] text-[11px] font-medium text-ink-mute">{categoryLabel[target.category]}</span>
          <span className={`rounded-md border px-2 py-[3px] text-[11px] font-semibold ${m.head} ${m.text}`}>{m.title}</span>
          <span className="ml-auto text-[12.5px] text-ink-mute">Overall match <b className="text-ink">{target.match}%</b></span>
        </div>
        {!verified && (
          <p className="mt-3 rounded-[9px] border border-[#e6e0ff] bg-[#f6f3ff] px-3 py-2 text-[11.5px] text-ink-mute">
            Your levels are self-reported.{' '}
            <button onClick={() => navigate('/profile')} className="font-semibold text-brand-dark hover:underline">Connect GitHub, LeetCode, Codeforces or CodeChef</button>{' '}
            to verify them from real activity.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Your level">
          <div className="space-y-3">
            {SKILLS.map((n) => <Meter key={n} label={n} value={level(n)} tone={level(n) >= req[n] ? '#12b76a' : tone(level(n))} />)}
          </div>
        </Card>
        <Card title={`Required for ${target.name}`}>
          <div className="space-y-3">
            {SKILLS.map((n) => <Meter key={n} label={n} value={req[n]} tone="#6d4aff" />)}
          </div>
        </Card>
      </div>

      <Card title={`Skill shape: you vs. ${target.name}`}>
        <SkillRadar
          aName="You"
          bName={`${target.name} requires`}
          height={330}
          data={SKILLS.map((n) => ({ skill: SKILL_SHORT[n], a: level(n), b: req[n] }))}
        />
      </Card>

      <Card title="Academic & experience requirements">
        <div className="grid grid-cols-3 gap-2">
          {target.criteria.filter((c) => !(SKILLS as readonly string[]).includes(c.label)).map((c) => (
            <div key={c.label} className={`rounded-[11px] border px-3 py-2.5 ${c.met ? 'border-[#c9f0d9] bg-[#f6fef9]' : 'border-[#fbd5d1] bg-[#fef8f7]'}`}>
              <p className="text-[11px] text-ink-mute">{c.label}</p>
              <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{c.yours} <span className="font-normal text-ink-faint">/ needs {c.required}</span></p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Gaps to close"
        action={
          <button
            onClick={() => openAssistant(`Build me a week-by-week plan to close my skill gaps for ${target.name}: ${target.gaps.map((g) => `${g.skill} ${g.have}%→${g.need}%`).join(', ') || 'none'}.`)}
            className="text-[11.5px] font-medium text-brand-dark hover:underline"
          >
            Ask AI for a plan →
          </button>
        }
      >
        <div className="divide-y divide-line">
          {target.gaps.length === 0 && (
            <p className="py-5 text-center text-[12.5px] text-[#0d9a5b]">No skill gaps — you meet every skill bar for {target.name}.</p>
          )}
          {target.gaps.map((g) => (
            <div key={g.skill} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-[12.5px] font-medium text-ink">{g.skill}</span>
              <span className="text-[11.5px] text-ink-mute">{g.have}% → {g.need}%</span>
              <span className="w-[64px] rounded-md border border-[#fbe3bd] bg-[#fff8ec] py-[3px] text-center text-[11px] font-semibold text-[#d97706]">
                +{g.need - g.have}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
