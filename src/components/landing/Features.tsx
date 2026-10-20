import { motion, useInView, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatedValue, trackSpotlight } from '../Page'
import { IconBot, IconChart, IconFileText, IconSpark, IconStacks, IconTarget } from '../Icons'

const ease = [0.16, 1, 0.3, 1] as const
const reveal: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }

/** A bento card: numbered mono label, icon chip, live visual, title and copy. Gradient edge and spotlight on hover. */
function Bento({ n, icon, title, body, children, className }: { n: string; icon: ReactNode; title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <motion.article variants={reveal} onPointerMove={trackSpotlight} className={`bento group card spotlight flex flex-col overflow-hidden p-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-faint">{n}</span>
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/80 text-brand-dark ring-1 ring-line transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]">{icon}</span>
      </div>
      <div className="relative mt-4 flex-1">{children}</div>
      <p className="mt-5 text-[17px] font-semibold tracking-[-0.025em] text-ink">{title}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mute">{body}</p>
    </motion.article>
  )
}

const bars = [
  ['Infosys', 38], ['TCS', 52], ['Wipro', 61], ['Zoho', 70], ['Swiggy', 76], ['Razorpay', 82],
  ['Deloitte', 88], ['Accenture', 91], ['Atlassian', 86], ['Uber', 94], ['Google', 72], ['NVIDIA', 64],
] as const
const barColor = (h: number) => (h >= 85 ? 'linear-gradient(#34d399,#12b76a)' : h >= 70 ? 'linear-gradient(#fbbf24,#f79009)' : 'linear-gradient(#93c5fd,#2e90fa)')

function EligibilityViz() {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="relative h-[170px]">
      {/* "Eligible" threshold */}
      <div className="absolute inset-x-0 border-t border-dashed border-[#12b76a]/50" style={{ bottom: '85%' }}>
        <span className="absolute -top-[9px] right-0 rounded-full bg-[#ecfdf3] px-1.5 font-mono text-[9.5px] text-[#0d9a5b]">eligible ≥ 85</span>
      </div>
      <div className="relative flex h-full items-end gap-2">
        {bars.map(([name, h], i) => (
          <div key={name} className="relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <motion.span
              variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { delay: i * 0.04, duration: 0.7, ease } } }}
              className="block w-full origin-bottom rounded-t-[8px] transition-[filter] duration-150"
              style={{ height: `${h}%`, background: barColor(h), filter: hover === null || hover === i ? 'none' : 'saturate(.35) opacity(.6)' }}
            />
            {hover === i && (
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[8px] bg-[oklch(0.18_0.04_285)] px-2 py-1 font-mono text-[10.5px] text-white shadow-[var(--shadow-2)]">
                {name} · {h}%
              </span>
            )}
          </div>
        ))}
      </div>
      <span aria-hidden className="scan-line" />
    </div>
  )
}

function ResumeViz() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const checks = [['Quantified impact', true], ['ATS keywords', true], ['Action verbs', false]] as const
  return (
    <div ref={ref} className="flex h-[170px] items-center gap-5">
      <div className="relative grid h-[124px] w-[124px] shrink-0 place-items-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="oklch(0.92 0.015 285)" strokeWidth="11" />
          <motion.circle cx="60" cy="60" r="50" fill="none" stroke="url(#rv)" strokeWidth="11" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: inView ? 0.79 : 0 }} transition={{ duration: 1.3, ease }} />
          <defs><linearGradient id="rv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6d4aff" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
        </svg>
        <p className="text-[30px] font-semibold tracking-[-0.04em] text-ink"><AnimatedValue value="79" /></p>
      </div>
      <ul className="space-y-2">
        {checks.map(([label, ok], i) => (
          <motion.li key={label} initial={{ opacity: 0, x: 10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease }} className="flex items-center gap-2 text-[12px] text-ink-soft">
            <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white ${ok ? 'bg-[#12b76a]' : 'bg-[#f79009]'}`}>{ok ? '✓' : '!'}</span>
            {label}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function JdViz() {
  const have = ['React', 'TypeScript', 'REST', 'Git', 'SQL']
  const missing = ['Kafka', 'Kubernetes']
  return (
    <div className="flex h-[170px] flex-col justify-center gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">SDE II · Backend</span>
        <span className="rounded-full bg-[oklch(0.2_0.045_285)] px-2.5 py-1 font-mono text-[11px] text-white">fit 82%</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[...have.map((t) => [t, true] as const), ...missing.map((t) => [t, false] as const)].map(([t, ok], i) => (
          <motion.span
            key={t}
            variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1, transition: { delay: 0.2 + i * 0.06, type: 'spring', stiffness: 380, damping: 22 } } }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${ok ? 'border-[#c9f0d9] bg-[#ecfdf3] text-[#0d9a5b]' : 'border-[#fbd5d1] bg-[#fef3f2] text-[#d92d20]'}`}
          >
            {ok ? '✓' : '+'} {t}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

function CodingViz() {
  const tiles = [['GitHub', '22', 'repos', '#24292f'], ['LeetCode', '412', 'solved', '#ffa116'], ['Codeforces', '1487', 'rating', '#1f8acb'], ['CodeChef', '3', '★ stars', '#5b4638']] as const
  return (
    <div className="grid h-[170px] grid-cols-2 content-center gap-2">
      {tiles.map(([p, v, unit, c]) => (
        <div key={p} className="rounded-[14px] border border-white/80 bg-white/85 px-3 py-2.5 shadow-[var(--shadow-1)] transition-transform duration-200 hover:-translate-y-0.5">
          <p className="flex items-center gap-1.5 text-[10.5px] text-ink-mute"><span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />{p}</p>
          <p className="mt-0.5 text-[16px] font-semibold tracking-[-0.02em] text-ink"><AnimatedValue value={v} /> <span className="text-[10.5px] font-medium text-ink-faint">{unit}</span></p>
        </div>
      ))}
    </div>
  )
}

function AssistantViz() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduce) return setStep(3)
    const t = [window.setTimeout(() => setStep(1), 200), window.setTimeout(() => setStep(2), 900), window.setTimeout(() => setStep(3), 2000)]
    return () => t.forEach(clearTimeout)
  }, [inView, reduce])
  return (
    <div ref={ref} className="flex h-[170px] flex-col justify-center gap-2">
      {step >= 1 && (
        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="self-end rounded-[14px] rounded-br-[4px] bg-gradient-to-b from-[#7b5cff] to-[#5a35f0] px-3 py-2 text-[11.5px] text-white shadow-[0_6px_16px_rgba(90,53,240,.3)]">
          What should I fix for Uber?
        </motion.span>
      )}
      {step === 2 && (
        <span className="flex gap-1 self-start rounded-[14px] rounded-bl-[4px] border border-white/80 bg-white/90 px-3 py-2.5" aria-label="Assistant is typing">
          {[0, 1, 2].map((d) => <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-brand" style={{ animationDelay: `${d * 0.15}s` }} />)}
        </span>
      )}
      {step >= 3 && (
        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="self-start rounded-[14px] rounded-bl-[4px] border border-white/80 bg-white/90 px-3 py-2 text-[11.5px] leading-[1.5] text-ink-soft shadow-[var(--shadow-1)]">
          Cloud &amp; DevOps <b className="text-ink">51 → 63</b> first, then System Design. That moves Uber to Nearly Eligible.
        </motion.span>
      )}
    </div>
  )
}

function AnalyticsViz() {
  const d = 'M0 120 C60 112 90 100 140 96 S230 70 290 72 S390 40 450 38 S540 18 600 12'
  return (
    <div className="relative h-[170px]">
      <svg viewBox="0 0 600 140" className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="av-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d4aff" stopOpacity=".32" /><stop offset="1" stopColor="#6d4aff" stopOpacity="0" /></linearGradient>
          <linearGradient id="av-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6d4aff" /><stop offset=".6" stopColor="#38bdf8" /><stop offset="1" stopColor="#12b76a" /></linearGradient>
        </defs>
        {[35, 70, 105].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="oklch(0.6 0.05 285 / .12)" strokeDasharray="4 6" />)}
        <motion.path d={`${d} L600 140 L0 140Z`} fill="url(#av-area)" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.5, duration: 0.8 } } }} />
        <motion.path d={d} fill="none" stroke="url(#av-line)" strokeWidth="3.5" strokeLinecap="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.6, ease } } }} />
      </svg>
      <span aria-hidden className="pulse-dot absolute right-0 top-[7%] h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#12b76a] ring-4 ring-white" />
      <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[9.5px] text-ink-faint">
        {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'].map((w) => <span key={w}>{w}</span>)}
      </div>
      <span className="absolute left-0 top-0 rounded-full bg-white/85 px-2 py-0.5 font-mono text-[10.5px] text-ink-soft ring-1 ring-line">readiness <b className="text-[#0d9a5b]">+34</b></span>
    </div>
  )
}

export function Features() {
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
      <Bento n="01 · engine" icon={<IconStacks className="h-4 w-4" />} className="md:col-span-4" title="Eligibility engine" body="Requirements per recruiter tier: FAANG, quant, AI, fintech, startups and services. Your match, stack and exact skill gaps update the moment your profile changes.">
        <EligibilityViz />
      </Bento>
      <Bento n="02 · resume" icon={<IconFileText className="h-4 w-4" />} className="md:col-span-2" title="Resume intelligence" body="PDF and DOCX parsed in your browser, measured with six ATS checks, then reviewed by AI with rewrites of your actual bullets.">
        <ResumeViz />
      </Bento>
      <Bento n="03 · jd match" icon={<IconTarget className="h-4 w-4" />} className="md:col-span-2" title="JD matcher" body="Paste any job description to get a fit score, matched and missing skills, and tailored bullets.">
        <JdViz />
      </Bento>
      <Bento n="04 · evidence" icon={<IconSpark className="h-4 w-4" />} className="md:col-span-2" title="Verified coding profile" body="GitHub repos and languages, LeetCode, Codeforces and CodeChef stats become verified skill levels.">
        <CodingViz />
      </Bento>
      <Bento n="05 · assistant" icon={<IconBot className="h-4 w-4" />} className="md:col-span-2" title="AI career assistant" body="Ask anything. Answers are grounded in your own profile, resume and computed eligibility, not generic advice.">
        <AssistantViz />
      </Bento>
      <Bento n="06 · analytics" icon={<IconChart className="h-4 w-4" />} className="md:col-span-6" title="Analytics that move with you" body="Daily snapshots of readiness, stacks, skills, problems solved and resume score, so you see the trend, not just today.">
        <AnalyticsViz />
      </Bento>
    </div>
  )
}
