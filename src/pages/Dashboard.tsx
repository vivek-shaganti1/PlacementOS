import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { BRAND, Donut, EmptyChart, STATUS, TrendChart } from '../components/charts'
import CompanyLogo from '../components/CompanyLogo'
import { Card, Meter, Page, revealProps, Ring, Stat } from '../components/Page'
import { completeness } from '../components/ProfileExtras'
import { bucketMeta } from '../data/companies'
import { useProfile } from '../lib/auth'
import { useCompanies } from '../lib/companies'
import { evaluateJob, readinessOf } from '../lib/eligibility'
import { ctcText, isOpen, STATUS_META, useJobs } from '../lib/jobs'
import { shortDate, useHistory } from '../lib/history'
import { useApp } from '../lib/store'
import { interviewReadiness, predictSalary } from '../lib/predict'
import { FeedbackPrompt } from '../components/Feedback'

const tone = (v: number) => (v >= 75 ? '#12b76a' : v >= 60 ? '#f79009' : '#f04438')

export default function Dashboard() {
  const navigate = useNavigate()
  const { applied, saved, roadmapDone, openAssistant } = useApp()
  const student = useProfile()
  const { companies, byBucket } = useCompanies()
  const { snapshots } = useHistory()
  const strength = completeness(student).pct
  const readiness = readinessOf(companies)
  const salary = predictSalary(companies)
  const interview = interviewReadiness(student)
  const counts = (['eligible', 'nearly', 'canBecome', 'notEligible'] as const).map((b) => ({ b, n: byBucket(b).length }))
  const toApply = companies.filter((c) => (c.bucket === 'eligible' || c.bucket === 'nearly') && !applied.includes(c.id)).slice(0, 5)
  const prev = snapshots.length > 1 ? snapshots[snapshots.length - 2].readiness : null
  const weakest = [...student.skills].sort((a, b) => a.level - b.level).slice(0, 2)
  const first = (student.full_name || 'there').split(' ')[0]
  const { jobs, applications } = useJobs()
  const drives = jobs
    .filter(isOpen)
    .map((j) => ({ job: j, ev: evaluateJob(j, student), app: applications.find((a) => a.job_id === j.id && a.user_id === student.id) }))
    .sort((a, b) => Number(b.ev.eligibleToApply) - Number(a.ev.eligibleToApply) || b.ev.match - a.ev.match)
    .slice(0, 4)

  return (
    <Page title={`Welcome back, ${first}`} subtitle="Your placement readiness, computed live from your profile, resume and coding activity." wide>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <motion.section {...revealProps} className="glass-dark relative overflow-hidden rounded-[22px] p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[oklch(0.6_0.22_285)] opacity-45 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 left-20 h-60 w-60 rounded-full bg-[oklch(0.75_0.12_200)] opacity-25 blur-[80px]" />
          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
            <div className="rounded-full bg-white/95 p-2 shadow-[0_10px_40px_rgba(0,0,0,.25)]">
              <Ring value={readiness} size={132} stroke={11} label="Readiness" sub={prev !== null ? `${readiness - prev >= 0 ? '+' : ''}${readiness - prev} vs yesterday` : 'Product-track companies'} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Next best step</p>
              <p className="mt-2 text-[17px] font-semibold leading-[1.3] tracking-[-0.02em] sm:text-[19px]">
                Lift <span className="text-[#8ef5d9]">{weakest[0]?.name}</span> from {weakest[0]?.level}% — it is the gap holding back the most companies.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button onClick={() => navigate('/skill-gap')} className="rounded-[11px] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#2c2075] transition hover:bg-white/90 active:scale-[.98]">
                  Open Skill Gap
                </button>
                <button onClick={() => openAssistant(`Give me a 2-week plan to improve ${weakest[0]?.name}.`)} className="rounded-[11px] border border-white/20 bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/15">
                  Ask AI for a plan
                </button>
                <button onClick={() => navigate('/what-if')} className="rounded-[11px] border border-white/20 bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/15">
                  Try a what-if
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Eligible companies" value={`${counts[0].n}`} sub={`of ${companies.length} tracked`} tone="text-[#0d9a5b]" />
          <Stat label="Applications" value={`${applications.filter((a) => a.user_id === student.id).length + applied.length}`} sub={`Campus drives + tracked · ${saved.length} shortlisted`} />
          <Stat label="Expected CTC" value={salary.expected ? `₹${salary.expected.toFixed(1)} LPA` : 'n/a'} sub={salary.expected ? `Likely ₹${salary.low}–${salary.high} LPA · best ₹${salary.bestRealistic} LPA` : 'Complete your profile'} tone="text-[#0d9a5b]" />
          <Stat label="Interview readiness" value={`${interview.score}`} sub={`Work on ${interview.weakest.join(' and ').toLowerCase()}`} tone="text-brand-dark" />
          <Stat label="Profile strength" value={`${strength}%`} sub="Completeness & verification" tone="text-brand-dark" />
          <Stat label="Roadmap tasks" value={`${roadmapDone.length}`} sub="completed so far" />
        </div>
      </div>
      <FeedbackPrompt target="next_step" label="Was the next best step useful?" />

      {drives.length > 0 && (
        <Card title="Campus drives for you" action={<button onClick={() => navigate('/jobs')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">All campus jobs →</button>}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {drives.map(({ job, ev, app }) => (
              <button key={job.id} onClick={() => navigate(`/jobs?job=${job.id}`)} className="rounded-[16px] border border-white/80 bg-white/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-2)]">
                <p className="truncate text-[13.5px] font-semibold text-ink">{job.company}</p>
                <p className="truncate text-[11.5px] text-ink-mute">{job.role}</p>
                <p className="mt-1 text-[11px] text-ink-faint">{ctcText(job)}</p>
                <p className="mt-2 flex items-center gap-2">
                  <span className={`text-[14px] font-semibold ${bucketMeta[ev.bucket].text}`}>{ev.match}%</span>
                  {app ? (
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold ${STATUS_META[app.status].cls}`}>{STATUS_META[app.status].label}</span>
                  ) : (
                    <span className={`text-[11px] font-medium ${ev.eligibleToApply ? 'text-[#0d9a5b]' : 'text-[#d92d20]'}`}>{ev.eligibleToApply ? 'You can apply' : 'Not eligible'}</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
        <Card title="Your stacks" action={<button onClick={() => navigate('/eligibility')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">Open stacks →</button>}>
          <Donut
            centerLabel="companies"
            data={counts.map(({ b, n }) => ({ name: bucketMeta[b].title, value: n, color: STATUS[b] }))}
          />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {counts.map(({ b, n }) => (
              <p key={b} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[b] }} />
                {bucketMeta[b].title}
                <span className="ml-auto font-semibold tabular-nums text-ink">{n}</span>
              </p>
            ))}
          </div>
        </Card>

        <Card title="Readiness trend" action={<button onClick={() => navigate('/analytics')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">All analytics →</button>}>
          {snapshots.length > 1 ? (
            <TrendChart
              data={snapshots.map((s) => ({ ...s, label: shortDate(s.day) }))}
              x="label"
              series={[{ key: 'readiness', name: 'Readiness', color: BRAND }]}
              height={250}
              domain={[0, 100]}
            />
          ) : (
            <EmptyChart height={250}>Your trend appears here from tomorrow — PlacementIQ records one snapshot per day as you use it.</EmptyChart>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Best matches right now" action={<button onClick={() => navigate('/drives')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">All drives →</button>}>
          <div className="divide-y divide-line">
            {companies.slice(0, 6).map((c) => (
              <button key={c.id} onClick={() => navigate(`/eligibility?company=${c.id}`)} className="group flex w-full items-center gap-3 py-2.5 text-left">
                <CompanyLogo company={c} size={26} />
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold text-ink transition group-hover:text-brand-dark">{c.name}</span>
                  <span className="block text-[11px] text-ink-mute">{c.role}</span>
                </span>
                <span className="hidden text-[12px] text-ink-mute sm:inline">₹{c.ctcAvg.toFixed(1)} LPA</span>
                <span className={`w-[52px] text-right text-[13px] font-semibold tabular-nums ${bucketMeta[c.bucket].text}`}>{c.match}%</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Skill snapshot" action={<button onClick={() => navigate('/profile')} className="text-[11.5px] font-semibold text-brand-dark hover:underline">Edit →</button>}>
          <div className="space-y-3">
            {student.skills.slice(0, 6).map((s) => <Meter key={s.name} label={s.name} value={s.level} tone={tone(s.level)} />)}
          </div>
        </Card>
      </div>

      <Card title="Apply next" action={<span className="text-[11px] text-ink-faint">Eligible or nearly eligible, not yet applied</span>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {toApply.map((c) => (
            <button key={c.id} onClick={() => navigate(`/eligibility?company=${c.id}`)} className="rounded-[16px] border border-white/80 bg-white/70 p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[var(--shadow-2)]">
              <CompanyLogo company={c} size={26} />
              <p className="mt-2.5 truncate text-[13px] font-semibold text-ink">{c.name}</p>
              <p className="text-[11px] text-ink-mute">₹{c.ctcAvg.toFixed(1)} LPA</p>
              <p className={`mt-1.5 text-[12px] font-semibold ${bucketMeta[c.bucket].text}`}>{c.match}% · {bucketMeta[c.bucket].title}</p>
            </button>
          ))}
          {toApply.length === 0 && (
            <p className="col-span-full py-4 text-center text-[12px] text-ink-faint">
              Nothing left to apply to. <button onClick={() => navigate('/skill-gap')} className="font-semibold text-brand-dark hover:underline">Close a gap</button> to unlock more.
            </p>
          )}
        </div>
      </Card>
    </Page>
  )
}
