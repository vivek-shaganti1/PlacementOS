import { motion } from 'motion/react'
import { useEffect, useState, useRef } from 'react'
import type { Company } from '../data/types'
import CompanyLogo from './CompanyLogo'
import { IconArrowRight, IconBookmark, IconBot, IconClose, IconSpark } from './Icons'
import { useApp } from '../lib/store'
import { SwapText } from './motion/SwapText'
import { useDialog } from '../lib/useDialog'

const TABS = ['Overview', 'Eligibility Criteria', 'Recruitment Process', 'Package'] as const
type Tab = (typeof TABS)[number]

const pill = (c: Company) => {
  switch (c.bucket) {
    case 'eligible':
      return { text: `Eligible (${c.match}% Match)`, cls: 'bg-[#ecfdf3] text-[#067647] border-[#c9f0d9]' }
    case 'nearly':
      return { text: `Nearly Eligible (${c.match}% Match)`, cls: 'bg-[#fff8ec] text-[#b54708] border-[#fbe3bd]' }
    case 'canBecome':
      return { text: `Can Become Eligible (${c.match}% Match)`, cls: 'bg-[#eef6ff] text-[#1570cd] border-[#cfe4fb]' }
    default:
      return { text: `Not Eligible (${c.match}% Match)`, cls: 'bg-[#fef3f2] text-[#b42318] border-[#fbd5d1]' }
  }
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[74px] shrink-0 text-[11.5px] text-ink-mute">{label}</span>
      <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#eef0f3]">
        <span className="block h-full w-full origin-left rounded-full bg-[#12b76a] transition-transform duration-200 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} />
      </span>
      <span className="w-[30px] shrink-0 text-right text-[11.5px] font-semibold text-ink-soft">{value}%</span>
    </div>
  )
}

export default function CompanyPanel({ company, onClose, overlay }: { company: Company; onClose: () => void; overlay?: boolean }) {
  const [tab, setTab] = useState<Tab>('Overview')
  const { saved, toggleSave, applied, apply, openAssistant } = useApp()
  const criteria = company.criteria

  useEffect(() => {
    setTab('Overview')
  }, [company.id])
  // Escape closes the panel (but not while the assistant is open on top of it); as an overlay it also traps focus.
  const ref = useRef<HTMLElement>(null)
  useDialog(true, onClose, ref, { trap: !!overlay })

  const p = pill(company)
  const isSaved = saved.includes(company.id)
  const isApplied = applied.includes(company.id)
  const b = company.breakdown
  const overall = company.match

  const section = (
    <motion.section
      ref={ref}
      key={company.id}
      role={overlay ? 'dialog' : 'region'}
      aria-modal={overlay ? true : undefined}
      aria-label={`${company.name}, ${company.role}`}
      // Opened tens of times per session: a short ease-out, transform string on the GPU.
      initial={{ opacity: 0, transform: 'translateX(12px)' }}
      animate={{ opacity: 1, transform: 'translateX(0px)' }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
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
                  ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#067647]'
                  : 'border-[#d5cbff] bg-white text-brand-dark hover:bg-[#faf8ff]'
              }`}
            >
              <SwapText text={isApplied ? 'Applied ✓' : 'Apply Now'} />
            </button>
            <button
              onClick={() => toggleSave(company.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border py-[7px] text-[12.5px] font-medium transition sm:w-[124px] sm:flex-none ${
                isSaved ? 'border-brand bg-brand-tint text-brand-dark' : 'border-line bg-white text-ink-soft hover:bg-[#f7f8fa]'
              }`}
            >
              <IconBookmark className="h-[15px] w-[15px]" />
              <SwapText text={isSaved ? 'Saved' : 'Save Company'} />
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 flex shrink-0 gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-line bg-white/85 px-4 backdrop-blur-xl sm:gap-6 sm:px-6">
        {TABS.map((t) => {
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px pb-2.5 pt-1 text-[12.5px] transition ${
                active ? 'font-semibold text-ink' : 'font-medium text-ink-mute hover:text-ink-soft'
              }`}
            >
              {t}
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
                { k: company.provenance === 'typical' ? 'Typical CTC (unverified)' : 'CTC', v: `₹${company.ctcAvg.toFixed(1)}`, u: 'LPA', s: `Range ${company.ctcMin}–${company.ctcMax} LPA` },
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
                <p className="mt-2 text-[11.5px] leading-[1.65] text-ink-mute">{company.about || 'No verified description yet.'}</p>
                <a
                  href={company.careers || `https://www.google.com/search?q=${encodeURIComponent(`${company.name} careers India`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-brand-dark hover:underline"
                >
                  {company.careers ? 'Visit careers page' : `Search for ${company.name} careers`} <IconArrowRight className="h-3.5 w-3.5" />
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

          </>
        )}

        {tab === 'Eligibility Criteria' && company.scoredFor && (
          <p className="rounded-[12px] border border-[#d5cbff] bg-brand-tint px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-soft">
            Scored on your <b className="text-ink">{company.scoredFor}</b> skills: {company.name} hires for more than one kind of role, and this is the one your track prepares you for.
          </p>
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
                    c.met ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#067647]' : 'border-[#fbd5d1] bg-[#fef3f2] text-[#b42318]'
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
            {company.provenance === 'typical' && <p className="mt-1 text-[11.5px] text-ink-mute">The usual process for this kind of company, not confirmed for {company.name}. Your placement cell's drive notice has the real rounds.</p>}
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

        {tab === 'Package' && company.provenance === 'typical' && (
          <p className="rounded-[12px] border border-[#fedf89] bg-[#fffaeb] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#93370d]">
            A typical fresher range entered by hand, not verified and not specific to your campus. The package in your college's drive is the one that counts.
          </p>
        )}
        {tab === 'Package' && (
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
