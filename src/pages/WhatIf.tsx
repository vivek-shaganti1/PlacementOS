import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeedbackPrompt } from '../components/Feedback'
import { Card, Page, Stat } from '../components/Page'
import { bucketMeta, bucketOrder } from '../data/companies'
import type { Bucket } from '../data/types'
import { useProfile } from '../lib/auth'
import { SKILL_SHORT, SKILLS } from '../lib/eligibility'
import { bucketChanges, snapshot } from '../lib/predict'

const delta = (n: number, unit = '') => (n > 0 ? `+${n}${unit}` : n < 0 ? `${n}${unit}` : `no change`)
const lpa = (n: number) => `₹${n.toFixed(1)} LPA`

/**
 * What-If Simulator: change CGPA, backlogs, skill levels, projects, internships and mock interview scores and see,
 * instantly and without saving anything, how eligibility, readiness, expected salary and interview readiness move.
 */
export default function WhatIf() {
  const profile = useProfile()
  const baseSkills = useMemo(() => Object.fromEntries(SKILLS.map((s) => [s, profile.skills.find((x) => x.name === s)?.level ?? 0])), [profile.skills])
  const baseMock = profile.mock_feedback.length ? profile.mock_feedback.reduce((a, m) => a + Number(m.score), 0) / profile.mock_feedback.length : 0
  const initial = { cgpa: profile.cgpa, backlogs: profile.backlogs, skills: baseSkills, extraProjects: 0, extraInternships: 0, mock: Math.round(baseMock * 10) / 10 }
  const [s, setS] = useState(initial)

  const before = useMemo(() => snapshot(profile), [profile])
  const simulated = useMemo(
    () => ({
      ...profile,
      cgpa: s.cgpa,
      backlogs: s.backlogs,
      skills: SKILLS.map((name) => ({ name, level: s.skills[name] })),
      projects: [...profile.projects, ...Array.from({ length: s.extraProjects }, (_, i) => ({ title: `New project ${i + 1}`, tech: '', description: '', url: null }))],
      internships: [...profile.internships, ...Array.from({ length: s.extraInternships }, (_, i) => ({ org: `New internship ${i + 1}`, role: '', period: '' }))],
      mock_feedback: s.mock > 0 ? [{ type: 'Simulated', date: '', score: s.mock, note: '' }] : [],
    }),
    [profile, s],
  )
  const after = useMemo(() => snapshot(simulated), [simulated])
  const changes = useMemo(() => bucketChanges(before, after), [before, after])

  // The single change worth the most readiness right now: +10 on each skill, tested one at a time.
  const levers = useMemo(() => {
    return SKILLS.map((name) => {
      const lvl = s.skills[name]
      if (lvl >= 100) return { name, gain: 0 }
      const test = snapshot({ ...simulated, skills: SKILLS.map((n) => ({ name: n, level: n === name ? Math.min(100, lvl + 10) : s.skills[n] })) })
      return { name, gain: test.readiness - after.readiness, moved: bucketChanges(after, test).length }
    })
      .filter((l) => l.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3)
  }, [simulated, s.skills, after.readiness])

  const changed = JSON.stringify(s) !== JSON.stringify(initial)
  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, base?: number) => (
    <label className="block">
      <span className="flex justify-between text-[12px] text-ink-soft">
        <span>{label}</span>
        <b className="tabular-nums text-ink">
          {value}
          {base !== undefined && value !== base && <span className="ml-1 font-normal text-ink-faint">(was {base})</span>}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#6d4aff]" aria-label={label} />
    </label>
  )

  return (
    <Page
      title="What-If Simulator"
      subtitle="Try changes before you make them. Nothing here is saved: move a slider and see how your eligibility, readiness, expected salary and interview readiness respond."
      wide
      actions={changed ? <button onClick={() => setS(initial)} className="btn-glass">Reset to my profile</button> : undefined}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Placement readiness" value={`${after.readiness}`} sub={delta(after.readiness - before.readiness)} />
        <Stat label="Eligible companies" value={`${after.counts.eligible}`} sub={`${delta(after.counts.eligible - before.counts.eligible)} · ${after.counts.nearly} nearly`} />
        <Stat label="Expected CTC" value={lpa(after.salary.expected)} sub={`${lpa(after.salary.low)} to ${lpa(after.salary.high)} · ${delta(Math.round((after.salary.expected - before.salary.expected) * 10) / 10, ' LPA')}`} />
        <Stat label="Interview readiness" value={`${after.interview.score}`} sub={delta(after.interview.score - before.interview.score)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card title="Your profile, adjusted">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {slider('CGPA', s.cgpa, 0, 10, 0.1, (v) => setS({ ...s, cgpa: Math.round(v * 10) / 10 }), profile.cgpa)}
            {slider('Active backlogs', s.backlogs, 0, 6, 1, (v) => setS({ ...s, backlogs: v }), profile.backlogs)}
            {slider('Extra projects', s.extraProjects, 0, 5, 1, (v) => setS({ ...s, extraProjects: v }))}
            {slider('Extra internships', s.extraInternships, 0, 3, 1, (v) => setS({ ...s, extraInternships: v }))}
            {slider('Mock interview average (out of 10)', s.mock, 0, 10, 0.5, (v) => setS({ ...s, mock: v }), Math.round(baseMock * 10) / 10)}
          </div>
          <p className="mt-5 text-[12px] font-semibold text-ink">Skill levels</p>
          <div className="mt-2 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            {SKILLS.map((name) => (
              <div key={name}>{slider(SKILL_SHORT[name] ?? name, s.skills[name], 0, 100, 5, (v) => setS({ ...s, skills: { ...s.skills, [name]: v } }), baseSkills[name])}</div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Eligibility, before and after">
            <div className="space-y-2.5">
              {bucketOrder.map((b: Bucket) => {
                const total = after.companies.length || 1
                return (
                  <div key={b}>
                    <div className="flex justify-between text-[12px]">
                      <span className={`font-semibold ${bucketMeta[b].text}`}>{bucketMeta[b].title}</span>
                      <span className="tabular-nums text-ink-mute">
                        {before.counts[b]} → <b className="text-ink">{after.counts[b]}</b>
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-[oklch(0.94_0.01_285)]">
                      <div className={`absolute inset-y-0 left-0 rounded-full opacity-35 ${bucketMeta[b].dot}`} style={{ width: `${(before.counts[b] / total) * 100}%` }} />
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${bucketMeta[b].dot}`} style={{ width: `${(after.counts[b] / total) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card title={changes.length ? `${changes.length} compan${changes.length === 1 ? 'y moves' : 'ies move'}` : 'Companies that move'}>
            {changes.length === 0 ? (
              <p className="py-3 text-[12.5px] text-ink-faint">Move a slider to see which companies change category.</p>
            ) : (
              <div className="max-h-[260px] divide-y divide-line overflow-y-auto">
                {changes.slice(0, 30).map((x) => (
                  <Link key={x.company.id} to={`/eligibility?company=${x.company.id}`} className="flex items-center gap-3 py-2 text-[12.5px] hover:bg-white/50">
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{x.company.name}</span>
                    <span className={bucketMeta[x.from].text}>{bucketMeta[x.from].title}</span>
                    <span className="text-ink-faint">to</span>
                    <span className={`font-semibold ${bucketMeta[x.to].text}`}>{bucketMeta[x.to].title}</span>
                    <span className="w-14 text-right tabular-nums text-ink-mute">{delta(x.matchDelta, '%')}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="Biggest levers from here">
            {levers.length === 0 ? (
              <p className="text-[12.5px] text-ink-faint">Your skills already meet what your target companies ask for.</p>
            ) : (
              <ul className="space-y-1.5 text-[12.5px] text-ink-soft">
                {levers.map((l) => (
                  <li key={l.name}>
                    <b className="text-ink">{l.name} +10</b>: readiness {delta(l.gain)}{l.moved ? `, ${l.moved} compan${l.moved === 1 ? 'y changes' : 'ies change'} category` : ''}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] text-ink-faint">
              Expected CTC weights each company's average package by your chance of converting it (category and match score).
              Top contributors: {after.salary.drivers.slice(0, 3).map((d) => `${d.name} (₹${d.ctc} LPA)`).join(', ') || 'none yet'}.
            </p>
            <FeedbackPrompt target="what_if" className="mt-3" />
          </Card>
        </div>
      </div>
    </Page>
  )
}
