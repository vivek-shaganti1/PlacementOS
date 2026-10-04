import { useState } from 'react'
import { BarList, BRAND, Columns, CompanyScatter, Donut, EmptyChart, SERIES, SkillRadar, STATUS, TrendChart } from '../components/charts'
import { Card, Page, Stat } from '../components/Page'
import { bucketMeta } from '../data/companies'
import type { Category } from '../data/types'
import { useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { categoryLabel, readinessOf, SKILL_SHORT, SKILLS } from '../lib/eligibility'
import { shortDate, useHistory } from '../lib/history'

const short = SKILL_SHORT

const campus = [
  { year: '2021', placed: 312 },
  { year: '2022', placed: 358 },
  { year: '2023', placed: 401 },
  { year: '2024', placed: 428 },
  { year: '2025', placed: 466 },
]

export default function Analytics() {
  const p = useProfile()
  const { companies, byBucket } = useCompanies()
  const { snapshots, resumes, matches, loading } = useHistory()
  const categories = [...new Set(companies.map((c) => c.category))] as Category[]
  const [tier, setTier] = useState<Category>('top')

  const tierCompanies = companies.filter((c) => c.category === tier)
  const radar = SKILLS.map((s) => ({
    skill: short[s],
    a: p.skills.find((x) => x.name === s)?.level ?? 0,
    b: Math.round(tierCompanies.reduce((a, c) => a + c.requirements.skills[s], 0) / Math.max(1, tierCompanies.length)),
  }))
  const byCategory = categories
    .map((cat) => {
      const list = companies.filter((c) => c.category === cat)
      return { name: categoryLabel[cat], value: Math.round(list.reduce((a, c) => a + c.match, 0) / list.length) }
    })
    .sort((a, b) => b.value - a.value)
  const gapCounts = SKILLS.map((s) => ({ name: short[s], value: companies.filter((c) => c.bucket !== 'eligible' && c.gaps.some((g) => g.skill === s)).length }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value)
  const eligibleCtc = byBucket('eligible')
  const lc = p.integrations?.leetcode
  const gh = p.integrations?.github
  const trend = snapshots.map((s) => ({ ...s, label: shortDate(s.day) }))

  return (
    <Page title="Analytics" subtitle="Everything below is computed from your own data. Daily snapshots build your history as you use PlacementIQ." wide>
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Readiness (product track)" value={`${readinessOf(companies)}`} sub="Avg. match across target tiers" tone="text-brand-dark" />
        <Stat label="Eligible today" value={`${byBucket('eligible').length}`} sub={`${byBucket('nearly').length} more nearly eligible`} tone="text-[#0d9a5b]" />
        <Stat
          label="Best eligible package"
          value={eligibleCtc.length ? `₹${Math.max(...eligibleCtc.map((c) => c.ctcAvg)).toFixed(1)} LPA` : '—'}
          sub={eligibleCtc.length ? [...eligibleCtc].sort((a, b) => b.ctcAvg - a.ctcAvg)[0].name : 'No eligible companies yet'}
        />
        <Stat label="Resume score" value={p.resume_analysis ? `${p.resume_analysis.overall}` : '—'} sub={resumes.length > 1 ? `${resumes.length} analyses so far` : 'Upload on Resume Analyzer'} />
      </div>

      <Card title="Progress over time" action={<span className="text-[11px] text-ink-faint">{snapshots.length} daily snapshots</span>}>
        {trend.length > 1 ? (
          <TrendChart
            data={trend}
            x="label"
            domain={[0, 100]}
            height={260}
            series={[
              { key: 'readiness', name: 'Readiness', color: SERIES[0] },
              { key: 'avg_skill', name: 'Avg. skill level', color: SERIES[1] },
              { key: 'resume_score', name: 'Resume score', color: SERIES[2] },
            ]}
          />
        ) : (
          <EmptyChart height={260}>{loading ? 'Loading…' : 'Come back tomorrow: a snapshot is saved each day you use PlacementIQ, and this chart fills in.'}</EmptyChart>
        )}
      </Card>

      <div className="grid grid-cols-[1.15fr_1fr] gap-4">
        <Card
          title="Your skills vs. tier requirements"
          action={
            <select value={tier} onChange={(e) => setTier(e.target.value as Category)} className="field h-[32px] w-auto py-0 text-[12px]" aria-label="Company tier">
              {categories.map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}
            </select>
          }
        >
          <SkillRadar data={radar} aName="You" bName={`${categoryLabel[tier]} (avg. required)`} height={320} />
        </Card>
        <Card title="Eligibility mix">
          <Donut data={(['eligible', 'nearly', 'canBecome', 'notEligible'] as const).map((b) => ({ name: bucketMeta[b].title, value: byBucket(b).length, color: STATUS[b] }))} centerLabel="companies" height={220} />
          <div className="mt-4 space-y-2">
            {(['eligible', 'nearly', 'canBecome', 'notEligible'] as const).map((b) => (
              <p key={b} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[b] }} />
                {bucketMeta[b].title}
                <span className="text-ink-faint">· {bucketMeta[b].hint}</span>
                <span className="ml-auto font-semibold tabular-nums text-ink">{byBucket(b).length}</span>
              </p>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Match vs. package — every tracked company" action={<span className="text-[11px] text-ink-faint">Hover a dot for details</span>}>
        <CompanyScatter data={companies.map((c) => ({ name: c.name, match: c.match, ctc: c.ctcAvg, bucket: c.bucket, label: bucketMeta[c.bucket].title }))} />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Average match by company tier">
          <BarList data={byCategory} unit="%" max={100} />
        </Card>
        <Card title="Skills blocking the most companies">
          {gapCounts.length ? <BarList data={gapCounts} color={SERIES[1]} /> : <EmptyChart height={200}>No skill gaps — every company is unlocked on skills.</EmptyChart>}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Resume score history">
          {resumes.length ? (
            <Columns data={resumes.map((r) => ({ label: shortDate(r.created_at), score: r.overall }))} x="label" y="score" name="Resume score" domain={[0, 100]} />
          ) : (
            <EmptyChart>Analyze your resume to start tracking its score.</EmptyChart>
          )}
        </Card>
        <Card title="Job-description matches">
          {matches.length ? (
            <BarList data={matches.slice(-8).map((m) => ({ name: `${shortDate(m.created_at)} · ${m.jd_title || 'JD'}`, value: m.score }))} unit="%" max={100} color={SERIES[0]} />
          ) : (
            <EmptyChart>Paste a job description on Resume Analyzer to see fit scores here.</EmptyChart>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="LeetCode problems by difficulty">
          {lc ? (
            <Columns
              data={[{ d: 'Easy', n: lc.easy }, { d: 'Medium', n: lc.medium }, { d: 'Hard', n: lc.hard }]}
              x="d"
              y="n"
              name="Solved"
              color={BRAND}
            />
          ) : (
            <EmptyChart>Connect LeetCode on My Profile to chart your problem mix.</EmptyChart>
          )}
        </Card>
        <Card title="GitHub languages (original repos)">
          {gh?.languages.length ? <BarList data={gh.languages.slice(0, 6).map((l) => ({ name: l.name, value: l.repos }))} color={SERIES[2]} /> : <EmptyChart>Connect GitHub on My Profile to chart your stack.</EmptyChart>}
        </Card>
      </div>

      <Card title="Students placed by year" action={<span className="rounded-md border border-line bg-white/70 px-2 py-[3px] text-[10.5px] font-medium text-ink-faint">Sample campus data</span>}>
        <Columns data={campus} x="year" y="placed" name="Students placed" height={200} color={SERIES[0]} />
      </Card>
    </Page>
  )
}
