import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Company } from '../data/types'
import Avatar from './Avatar'
import CompanyLogo from './CompanyLogo'
import { IconArrowRight, IconBookmark, IconBot, IconChevronDown, IconClose, IconLinkedIn, IconMessage, IconSpark } from './Icons'
import { useApp } from '../lib/store'
import { linkedInSearch } from '../lib/links'

const TABS = ['Overview', 'Eligibility Criteria', 'Recruitment Process', 'Alumni', 'Statistics'] as const
type Tab = (typeof TABS)[number]

const pill = (c: Company) => {
  switch (c.bucket) {
    case 'eligible':
      return { text: `Eligible (${c.match}% Match)`, cls: 'bg-[#ecfdf3] text-[#0d9a5b] border-[#c9f0d9]' }
    case 'nearly':
      return { text: `Nearly Eligible (${c.match}% Match)`, cls: 'bg-[#fff8ec] text-[#d97706] border-[#fbe3bd]' }
    case 'canBecome':
      return { text: `Can Become Eligible (${c.match}% Match)`, cls: 'bg-[#eef6ff] text-[#1570cd] border-[#cfe4fb]' }
    default:
      return { text: `Not Eligible (${c.match}% Match)`, cls: 'bg-[#fef3f2] text-[#d92d20] border-[#fbd5d1]' }
  }
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-[11.5px] text-ink-mute">{label}</span>
      <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef0f3]">
        <span className="block h-full rounded-full bg-[#12b76a] transition-[width] duration-500" style={{ width: `${value}%` }} />
      </span>
      <span className="w-[30px] shrink-0 text-right text-[11.5px] font-semibold text-ink-soft">{value}%</span>
    </div>
  )
}

export default function CompanyPanel({ company, onClose, overlay }: { company: Company; onClose: () => void; overlay?: boolean }) {
  const [tab, setTab] = useState<Tab>('Overview')
  const [showAllAlumni, setShowAllAlumni] = useState(false)
  const { saved, toggleSave, applied, apply, openAssistant } = useApp()
  const criteria = company.criteria

  useEffect(() => {
    setTab('Overview')
    setShowAllAlumni(false)
  }, [company.id])

  const p = pill(company)
  const isSaved = saved.includes(company.id)
  const isApplied = applied.includes(company.id)
  const alumni = showAllAlumni ? company.alumni : company.alumni.slice(0, 4)
  const b = company.breakdown
  const overall = company.match

  const section = (
    <motion.section
      key={company.id}
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      onMouseDown={overlay ? (e) => e.stopPropagation() : undefined}
      className={`glass-strong scroll-thin relative flex flex-col overflow-y-auto rounded-[24px] ${overlay ? 'h-full w-full max-w-[592px] !bg-[oklch(0.975_0.008_285)]' : 'my-3 mr-3 w-[592px] shrink-0'}`}
    >
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-mute hover:bg-[#f3f4f6]"
      >
        <IconClose className="h-[18px] w-[18px]" />
      </button>

      <div className="shrink-0 px-4 pb-5 pt-8 sm:px-6">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center">
            <CompanyLogo company={company} size={44} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-bold leading-tight tracking-[-.02em] text-ink">{company.name}</h2>
            <p className="mt-0.5 text-[13px] text-ink-mute">{company.role}</p>
            <span className={`mt-2 inline-block rounded-md border px-2 py-[3px] text-[11.5px] font-semibold ${p.cls}`}>
              {p.text}
            </span>
          </div>
          <div className="flex w-full shrink-0 flex-row gap-2 sm:w-auto sm:flex-col sm:pt-6">
            <button
              onClick={() => apply(company.id)}
              disabled={isApplied}
              className={`flex-1 rounded-[9px] border py-[7px] text-[12.5px] font-semibold transition sm:w-[124px] sm:flex-none ${
                isApplied
                  ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]'
                  : 'border-[#d5cbff] bg-white text-brand-dark hover:bg-[#faf8ff]'
              }`}
            >
              {isApplied ? 'Applied ✓' : 'Apply Now'}
            </button>
            <button
              onClick={() => toggleSave(company.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border py-[7px] text-[12.5px] font-medium transition sm:w-[124px] sm:flex-none ${
                isSaved ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line bg-white text-ink-soft hover:bg-[#f7f8fa]'
              }`}
            >
              <IconBookmark className="h-[15px] w-[15px]" />
              {isSaved ? 'Saved' : 'Save Company'}
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 flex shrink-0 gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line bg-white/85 px-4 backdrop-blur-xl sm:gap-6 sm:px-6">
        {TABS.map((t) => {
          const label = t === 'Alumni' ? `Alumni (${company.alumni.length})` : t
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px pb-2.5 pt-1 text-[12.5px] transition ${
                active ? 'font-semibold text-ink' : 'font-medium text-ink-mute hover:text-ink-soft'
              }`}
            >
              {label}
              {active && <motion.span layoutId="panel-tab" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 space-y-4 bg-white/30 px-3 py-4 sm:px-6 sm:py-5">
        {tab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: 'CTC (Average)', v: `₹${company.ctcAvg.toFixed(1)}`, u: 'LPA', s: `Min: ${company.ctcMin} LPA | Max: ${company.ctcMax} LPA` },
                { k: 'Work Location', v: company.location, s: 'On-site' },
                { k: 'Job Type', v: company.jobType, s: company.tenure },
                { k: 'Batch', v: company.batches, s: 'Eligible' },
              ].map((x) => (
                <div key={x.k} className="card px-3 py-3">
                  <p className="text-[11px] font-medium text-ink-mute">{x.k}</p>
                  <p className="mt-1.5 text-[16px] font-bold leading-tight text-ink">
                    {x.v}
                    {x.u && <span className="ml-1 text-[11px] font-semibold text-ink-mute">{x.u}</span>}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-faint">{x.s}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <p className="text-[13px] font-semibold text-ink">About {company.name}</p>
                <p className="mt-2 text-[11.5px] leading-[1.65] text-ink-mute">{company.about}</p>
                <a
                  href={company.careers}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-brand-dark hover:underline"
                >
                  Visit Careers Page <IconArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="card p-4">
                <p className="text-[13px] font-semibold text-ink">Your Match Breakdown</p>
                <div className="mt-3 space-y-2.5">
                  <Bar label="Academic" value={b.academic} />
                  <Bar label="Skills" value={b.skills} />
                  <Bar label="Experience" value={b.experience} />
                  <Bar label="Projects" value={b.projects} />
                  <div className="flex items-center gap-3 pt-0.5">
                    <span className="w-[74px] shrink-0 text-[11.5px] font-semibold text-ink">Overall</span>
                    <span className="h-[6px] flex-1 rounded-full bg-transparent" />
                    <span className="w-[30px] shrink-0 text-right text-[11.5px] font-bold text-ink">{overall}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">
                  Alumni from your college ({company.alumni.length})
                </p>
                <button
                  onClick={() => setTab('Alumni')}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-brand-dark hover:underline"
                >
                  View All Alumni <IconArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 divide-y divide-line">
                {alumni.map((a) => (
                  <div key={a.name + a.batch} className="flex items-center gap-3 py-2.5">
                    <Avatar src={a.avatar} name={a.name} size={34} />
                    <div className="min-w-0 flex-1 sm:w-[188px] sm:flex-none">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{a.name}</p>
                      <p className="truncate text-[11px] text-ink-mute">{a.title}</p>
                      <p className="truncate text-[10.5px] text-ink-faint">{a.batch}</p>
                    </div>
                    <div className="hidden w-[76px] sm:block">
                      <p className="text-[10.5px] text-ink-faint">Experience</p>
                      <p className="text-[11.5px] font-medium text-ink-soft">{a.years}</p>
                    </div>
                    <div className="hidden w-[80px] sm:block">
                      <p className="text-[10.5px] text-ink-faint">Location</p>
                      <p className="text-[11.5px] font-medium text-ink-soft">{a.location}</p>
                    </div>
                    <a
                      href={linkedInSearch(a.name, company.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-7 w-7 place-items-center rounded-md border border-line text-[#0A66C2] hover:bg-[#f7f8fa]"
                    >
                      <IconLinkedIn className="h-[15px] w-[15px]" />
                    </a>
                    <button
                      onClick={() => openAssistant(`Draft a short intro message to ${a.name}, ${a.title}.`)}
                      className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]"
                    >
                      <IconMessage className="h-[14px] w-[14px]" />
                      Message
                    </button>
                  </div>
                ))}
              </div>

              {company.alumni.length > 4 && (
                <button
                  onClick={() => setShowAllAlumni((v) => !v)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-line py-2 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]"
                >
                  {showAllAlumni ? 'Show less' : `Show ${company.alumni.length - 4} more alumni`}
                  <IconChevronDown className={`h-3.5 w-3.5 transition ${showAllAlumni ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </>
        )}

        {tab === 'Eligibility Criteria' && (
          <div className="card overflow-x-auto">
            <div className="grid min-w-[460px] grid-cols-[1.3fr_1fr_1fr_auto] gap-3 border-b border-line bg-[#fafbfc] px-4 py-2.5 text-[11px] font-semibold text-ink-mute">
              <span>Criteria</span>
              <span>Required</span>
              <span>Your Profile</span>
              <span>Status</span>
            </div>
            {criteria.map((c) => (
              <div key={c.label} className="grid min-w-[460px] grid-cols-[1.3fr_1fr_1fr_auto] items-center gap-3 border-b border-line px-4 py-3 text-[12px] last:border-0">
                <span className="font-medium text-ink">{c.label}</span>
                <span className="text-ink-mute">{c.required}</span>
                <span className="text-ink-soft">{c.yours}</span>
                <span
                  className={`rounded-md border px-2 py-[3px] text-[11px] font-semibold ${
                    c.met ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]' : 'border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]'
                  }`}
                >
                  {c.met ? 'Met' : 'Gap'}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Recruitment Process' && (
          <div className="card p-4">
            <p className="text-[13px] font-semibold text-ink">Selection Rounds</p>
            <ol className="mt-4 space-y-0">
              {company.process.map((s, i) => (
                <li key={s.stage} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < company.process.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-line" />}
                  <span className="z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full bg-brand-tint text-[12px] font-bold text-brand-dark ring-4 ring-white">
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {s.stage} <span className="ml-1.5 font-medium text-ink-faint">· {s.duration}</span>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-ink-mute">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === 'Alumni' && (
          <div className="card p-4">
            <p className="text-[13px] font-semibold text-ink">All alumni at {company.name} ({company.alumni.length})</p>
            <div className="mt-2 divide-y divide-line">
              {company.alumni.map((a) => (
                <div key={a.name + a.batch} className="flex items-center gap-3 py-2.5">
                  <Avatar src={a.avatar} name={a.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink">{a.name}</p>
                    <p className="truncate text-[11px] text-ink-mute">{a.title} · {a.batch}</p>
                  </div>
                  <span className="text-[11.5px] text-ink-mute">{a.years}</span>
                  <span className="hidden w-[80px] text-[11.5px] text-ink-mute sm:inline">{a.location}</span>
                  <button
                    onClick={() => openAssistant(`Draft a short intro message to ${a.name}, ${a.title}.`)}
                    className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11.5px] font-medium text-ink-soft hover:bg-[#f7f8fa]"
                  >
                    <IconMessage className="h-[14px] w-[14px]" />
                    Message
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Statistics' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {company.stats.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-[11px] font-medium text-ink-mute">{s.label}</p>
                <p className="mt-1.5 text-[19px] font-bold text-ink">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl2 border border-[#e6e0ff] bg-[#f6f3ff] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-dark shadow-card">
              <IconBot className="h-[19px] w-[19px]" />
            </span>
            <div className="flex-1">
              <p className="text-[12.5px] font-semibold text-ink">Need Help?</p>
              <p className="mt-0.5 text-[11.5px] text-ink-mute">
                Talk to our AI Career Assistant for personalized guidance about this company.
              </p>
            </div>
            <button
              onClick={() => openAssistant(`Tell me how to prepare for ${company.name} ${company.role}.`)}
              className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-[#d5cbff] bg-white px-3.5 py-2 text-[12px] font-semibold text-brand-dark hover:bg-[#faf8ff]"
            >
              <IconSpark className="h-[15px] w-[15px]" />
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  )

  if (!overlay) return section
  return (
    <motion.div className="fixed inset-0 z-50 flex justify-end bg-[oklch(0.2_0.05_285/0.2)] p-2 sm:p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={onClose}>
      {section}
    </motion.div>
  )
}
