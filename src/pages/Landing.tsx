import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, type Variants } from 'motion/react'
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { SkipLink } from '../components/SkipLink'
import { Aurora } from '../components/effects/Aurora'
import { companyCatalog } from '../data/companies'
import { coreCatalog } from '../data/coreCompanies'

/** Software and core recruiters together (the landing counts them; each student sees the ones for their tracks). */
const RECRUITERS = companyCatalog.length + coreCatalog.length
import { Glow } from '../components/effects'
import { CursorFollower, Magnetic, ScrollHighlight, ScrollProgress, SmoothScroll, TextReveal } from '../components/motion'
import { intensity, useMotionTier } from '../lib/motion'
import { usd, PLANS } from '../lib/pricing'
import { ContactDialog, openContact } from '../components/landing/ContactDialog'
import { Features } from '../components/landing/Features'
import { HeroPreview } from '../components/landing/HeroPreview'
import { HowItWorks } from '../components/landing/HowItWorks'
import { MegaFooter } from '../components/landing/MegaFooter'
import { Trust } from '../components/landing/Trust'

// three.js loads only on devices that get WebGL, once the browser is idle after the first paint.
// Decorative: if the 3D chunk cannot load (slow network, or a deploy replaced it), keep the static glow.
const HeroScene = lazy(() =>
  import('../components/3d/HeroScene').catch(() => ({ default: (_: { className?: string }) => <Glow size={560} className="right-[10%] top-[10%]" /> })),
)

const ease = [0.16, 1, 0.3, 1] as const
const reveal: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }
const stagger: Variants = { show: { transition: { staggerChildren: 0.08 } } }

/* ---------------------------------------------------------------- pricing */

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL

function Pricing() {
  return (
    <Section id="pricing" className="pb-28">
      <motion.p variants={reveal} className="label-mono"><b>06</b> Pricing</motion.p>
      <motion.h2 variants={reveal} className="mt-3 max-w-[720px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
        Colleges subscribe. <span className="font-display font-normal italic text-gradient">Students never pay.</span>
      </motion.h2>
      <motion.p variants={reveal} className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-ink-mute">
        Each college gets its own private placement cell, its own roster and its own drives. Only students your college adds can sign in.
      </motion.p>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((p) => (
          <motion.div key={p.name} variants={reveal} className={`transition-transform duration-300 hover:-translate-y-1 ${p.featured ? 'gradient-border rounded-[24px] shadow-[0_24px_60px_oklch(0.5_0.2_285/.25)]' : ''}`}>
            <div className={`${p.featured ? 'glass-strong' : 'glass'} flex h-full flex-col rounded-[24px] p-6`}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{p.name}</p>
                {p.featured && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Most chosen</span>}
              </div>
              <p className="mt-4 text-[34px] font-semibold tracking-[-0.04em] text-ink">
                {p.key === 'enterprise' && <span className="mr-1 text-[15px] font-medium text-ink-mute">from</span>}
                {usd(p.pricePerSeat)}
              </p>
              <p className="text-[12px] text-ink-faint">{p.key === 'trial' ? '30 days' : 'per student / year'}</p>
              <p className="mt-1 text-[12px] text-ink-mute">{p.platformFee ? `+ ${usd(p.platformFee)} platform fee / year` : 'No platform fee'} · {p.seats}</p>
              <p className="mt-3 text-[13px] leading-[1.55] text-ink-mute">{p.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-[13px] text-ink-soft">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-tint text-[9px] font-bold text-brand-dark">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {SALES_EMAIL ? (
                <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`PlacementIQ ${p.name} plan`)}`} className={`${p.featured ? 'btn-primary' : 'btn-glass'} mt-6 h-[42px] justify-center text-[13px]`}>
                  {p.name === 'Enterprise' ? 'Talk to us' : p.name === 'Trial' ? 'Start a trial' : `Choose ${p.name}`}
                </a>
              ) : (
                <button type="button" onClick={() => openContact(`${p.name} plan`)} className={`${p.featured ? 'btn-primary' : 'btn-glass'} mt-6 h-[42px] justify-center text-[13px]`}>
                  {p.name === 'Enterprise' ? 'Talk to us' : p.name === 'Trial' ? 'Start a trial' : `Choose ${p.name}`}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={reveal} className="mt-5 text-[12px] text-ink-faint">
        Prices in US dollars, excluding applicable taxes. Seats are counted by students on your roster. The platform fee covers hosting, security and onboarding for your college.
        AI actions are assistant replies, resume analyses and job-description matches.
      </motion.p>
    </Section>
  )
}

function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section id={id} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger} className={`relative mx-auto max-w-[1160px] px-6 ${className ?? ''}`}>
      {children}
    </motion.section>
  )
}

/* ---------------------------------------------------------------- announcement, nav, ask bar */
function Announcement() {
  return (
    <a href="#roles" className="relative z-50 flex items-center justify-center gap-2.5 bg-[oklch(0.17_0.04_285)] px-4 py-2 text-[12px] text-white/80 hover:text-white">
      <span className="rounded-[6px] bg-[#8ef5d9] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0b3b30]">New</span>
      <span className="truncate">Recruiter workspaces and the What-If Simulator are live for every college</span>
      <span aria-hidden className="hidden text-[#8ef5d9] sm:inline">See what changed →</span>
    </a>
  )
}

/** Three floating pills: section links, the brand, and account actions with keyboard hints (C, S). */
function Nav() {
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // WCAG 2.1.4: single-letter shortcuts fire only when nothing interactive has focus (so screen-reader and speech
      // users who type letters while on a control never trigger them).
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || t.closest('input, textarea, select, button, a, [role="tab"], [contenteditable="true"]')) return
      if (e.key === 'c') openContact()
      if (e.key === 's') navigate('/login')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  const pill = 'glass flex h-[46px] items-center rounded-full px-2'
  return (
    <div className="sticky top-0 z-40 px-4 pt-3">
      <nav aria-label="Main" className="mx-auto flex max-w-[1160px] items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <div className={`${pill} hidden justify-self-start gap-0.5 lg:flex`}>
          {[['#features', 'Features'], ['#roles', 'For colleges'], ['#how', 'How it works'], ['#pricing', 'Pricing']].map(([h, l]) => (
            <a key={h} href={h} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:bg-white/80 hover:text-ink">{l}</a>
          ))}
        </div>
        <Link to="/" aria-label="PlacementIQ home" className={`${pill} px-2 min-[400px]:px-4 lg:col-start-2 lg:justify-self-center`}>
          {/* Below 400px (most Android phones, small iPhones, folded phones) the wordmark would push the sign-in buttons off screen. */}
          <span className="min-[400px]:hidden"><LogoMark size={30} /></span>
          <span className="hidden min-[400px]:block"><Logo size={28} tagline={false} /></span>
        </Link>
        <div className={`${pill} gap-1 lg:col-start-3 lg:justify-self-end`}>
          <Link to="/login" className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:bg-white/80 hover:text-ink sm:px-3.5">
            Sign in <span className="kbd kbd-light hidden sm:inline-grid">S</span>
          </Link>
          <button type="button" onClick={() => openContact()} className="btn-ink h-[34px] whitespace-nowrap px-4 text-[12.5px]">
            Contact us <span className="kbd hidden sm:inline-grid">C</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

const prompts = [
  'Which companies can I unlock with my profile?',
  'What should I fix first for Google?',
  'Is my resume ready for Atlassian?',
  'Build me a 4-week DSA plan',
]

/** A real input styled as the assistant's prompt. Asking takes you to sign-up, where answers are grounded in your data. */
function AskBar({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  useEffect(() => {
    if (reduce || value) return
    const t = window.setInterval(() => setI((n) => (n + 1) % prompts.length), 3200)
    return () => window.clearInterval(t)
  }, [reduce, value])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate('/login')
  }
  return (
    <form onSubmit={submit} className={`gradient-border rounded-[20px] ${compact ? 'w-[min(560px,calc(100vw-32px))]' : 'w-full max-w-[540px]'}`}>
      <div className="flex items-center gap-2 rounded-[20px] bg-white/95 p-2 pl-4 shadow-[var(--shadow-3)] backdrop-blur-xl">
        <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint"><LogoMark size={18} /></span>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Ask the AI career assistant</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} className="h-[40px] w-full bg-transparent text-[14px] text-ink outline-none" />
          {!value && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={i}
                aria-hidden
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease }}
                className="pointer-events-none absolute inset-y-0 left-0 right-0 block truncate leading-[40px] text-[14px] text-ink-faint"
              >
                {prompts[i]}
              </motion.span>
            </AnimatePresence>
          )}
        </label>
        <button type="submit" className="btn-ink h-[40px] shrink-0 px-4 text-[12.5px]">
          Ask <span aria-hidden>↵</span>
        </button>
      </div>
    </form>
  )
}

/** The ask bar follows the reader once the hero has scrolled away, and steps aside for the final call to action. */
function AskDock() {
  const { scrollY } = useScroll()
  const [past, setPast] = useState(false)
  const [closing, setClosing] = useState(false)
  const [reading, setReading] = useState(false)
  const idle = useRef<number>()
  // Out of the way while you scroll down through content; back when you pause or scroll up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    setPast(y > window.innerHeight * 0.9)
    const down = y > (scrollY.getPrevious() ?? y)
    setReading(down)
    window.clearTimeout(idle.current)
    if (down) idle.current = window.setTimeout(() => setReading(false), 1200)
  })
  useEffect(() => () => window.clearTimeout(idle.current), [])
  // Steps aside while the final call to action or the footer is on screen, so it never covers them.
  useEffect(() => {
    const targets = ['#closing', 'footer'].map((q) => document.querySelector(q)).filter((x): x is Element => !!x)
    const seen = new Set<Element>()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)))
      setClosing(seen.size > 0)
    })
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [])
  const show = past && !closing && !reading
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.25 } }}
          transition={{ duration: 0.45, ease }}
          className="fixed inset-x-0 bottom-4 z-40 hidden justify-center px-4 md:flex"
        >
          <AskBar compact />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------- floating recruiter chips */
const chips = [
  { name: 'Razorpay', note: '91% match', color: '#12b76a', pos: 'left-[44%] top-[14%]', delay: '0s' },
  { name: 'Atlassian', note: 'Nearly · 2 gaps', color: '#f79009', pos: 'right-[3%] top-[3%]', delay: '-1.6s' },
  { name: 'Google', note: 'System Design 62 → 75', color: '#2e90fa', pos: 'right-[8%] bottom-[9%]', delay: '-3.1s' },
]
function FloatingChips() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      {chips.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2 + i * 0.08, duration: 0.5, ease }}
          className={`absolute ${c.pos} z-20`}
        >
          <div className="float-y glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5" style={{ animationDelay: c.delay }}>
            <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span>
            <span className="text-[11.5px] font-semibold text-ink">{c.name}</span>
            <span className="font-mono text-[10.5px] text-ink-mute">{c.note}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- manifesto */
function Manifesto() {
  return (
    <Section className="pb-28 pt-4">
      <motion.div variants={reveal} className="glass relative overflow-hidden rounded-[32px] px-7 py-16 md:px-16 md:py-24">
        <div aria-hidden className="prism" />
        <div aria-hidden className="prism prism--thin" style={{ animationDelay: '-5s' }} />
        <p className="label-mono relative"><b>01</b> Why we built it</p>
        <ScrollHighlight className="relative mt-6 max-w-[860px] text-[clamp(1.35rem,1rem+1.3vw,2.15rem)] font-medium leading-[1.35] tracking-[-0.025em] text-ink">
          Every placement season, thousands of students guess. They guess which drives they qualify for, which skill
          matters, and why a shortlist never came. Cut-offs say who is out, never what would let them in. PlacementIQ
          replaces the guess with a reason for every company, and a next step you can act on today.
        </ScrollHighlight>
      </motion.div>
    </Section>
  )
}

/* ---------------------------------------------------------------- roles */
const roles = [
  {
    key: 'student', label: 'Students', title: 'A reason for every company, and the next step.',
    points: [`Four eligibility stacks across ${RECRUITERS} recruiters, for every branch`, 'What-If Simulator before you study', 'Resume and JD matching with AI rewrites'],
    rows: [['Razorpay', 'Eligible', '#12b76a', 91], ['Atlassian', 'Nearly', '#f79009', 82], ['Google', 'Can become', '#2e90fa', 71], ['Jane Street', 'Stretch', '#f04438', 48]],
  },
  {
    key: 'cell', label: 'Placement cells', title: 'Your whole batch, by year, branch and section.',
    points: ['Roster-only access with roll-number sign-up', 'Filters by CGPA, backlogs, score and drive', 'Post drives and see who is eligible instantly'],
    rows: [['CSE · 4th year · A', '62 students', '#6d4aff', 78], ['CSE · 4th year · B', '58 students', '#6d4aff', 71], ['ECE · 4th year', '64 students', '#38bdf8', 63], ['EEE · 3rd year', '49 students', '#38bdf8', 52]],
  },
  {
    key: 'recruiter', label: 'Recruiters', title: 'Only your drives, only your applicants.',
    points: ['Post roles with exact criteria', 'Ranked applicants with match breakdowns', 'Database-enforced isolation per company'],
    rows: [['SDE Intern · 2027', '142 applied', '#12b76a', 88], ['Backend Engineer', '96 applied', '#12b76a', 74], ['Data Analyst', '51 applied', '#f79009', 61], ['QA Engineer', '33 applied', '#f79009', 45]],
  },
  {
    key: 'admin', label: 'Platform admins', title: 'Every college, plan and quota in one place.',
    points: ['Colleges, plans, seats and AI quotas', 'Margins and platform fees per college', 'Admins and placement-cell logins'],
    rows: [['Anurag University', 'Pro · 1,000 seats', '#6d4aff', 84], ['College B', 'Basic · 600 seats', '#38bdf8', 58], ['College C', 'Trial · 30 days', '#8ef5d9', 22], ['College D', 'Enterprise', '#6d4aff', 91]],
  },
] as const

const ROLE_MS = 6000

function Roles() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<(typeof roles)[number]['key']>('student')
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const role = roles.find((r) => r.key === active)!
  useEffect(() => {
    if (!auto || paused || reduce) return
    const t = window.setTimeout(() => {
      const i = roles.findIndex((r) => r.key === active)
      setActive(roles[(i + 1) % roles.length].key)
    }, ROLE_MS)
    return () => window.clearTimeout(t)
  }, [active, auto, paused, reduce])
  return (
    <Section id="roles" className="pb-28">
      <motion.p variants={reveal} className="label-mono"><b>03</b> One platform, four desks</motion.p>
      <motion.h2 variants={reveal} className="mt-3 max-w-[760px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
        Everyone sees <span className="font-display font-normal italic text-gradient">exactly</span> what they should.
      </motion.h2>
      <motion.div variants={reveal} role="tablist" aria-label="Roles" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="glass scroll-thin mt-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
        {roles.map((r) => (
          <button
            key={r.key}
            role="tab"
            aria-selected={active === r.key}
            onClick={() => {
              setAuto(false)
              setActive(r.key)
            }}
            className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors ${active === r.key ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            {active === r.key && (
              <motion.span layoutId="role-pill" className="absolute inset-0 overflow-hidden rounded-full bg-[oklch(0.2_0.045_285)]" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
                {/* Time until the next desk; restarts on every change and freezes while paused. */}
                {auto && !reduce && (
                  <span
                    key={active}
                    className="role-progress absolute inset-y-0 left-0 bg-white/15"
                    style={{ animationDuration: `${ROLE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                  />
                )}
              </motion.span>
            )}
            <span className="relative">{r.label}</span>
          </button>
        ))}
      </motion.div>
      <motion.div variants={reveal} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card p-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={role.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease }}>
              <p className="text-[22px] font-semibold leading-[1.2] tracking-[-0.03em] text-ink">{role.title}</p>
              <ul className="mt-5 space-y-3">
                {role.points.map((pt, n) => (
                  <li key={pt} className="flex items-start gap-3 text-[14px] text-ink-soft">
                    <span className="mt-[2px] font-mono text-[11px] text-brand">0{n + 1}</span>
                    {pt}
                  </li>
                ))}
              </ul>
              {/* Only students register themselves; colleges, recruiters and admins get a login from their college or the platform. */}
              <Link to="/login" className="btn-bracket mt-7 -ml-1">{role.key === 'student' ? 'Sign in as a student' : `Sign in to the ${role.label.toLowerCase().replace(/s$/, '')} view`} →</Link>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="glass-strong hairline-grid relative overflow-hidden rounded-[22px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">placementiq · {role.label.toLowerCase()}</span>
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#067647]"><span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" /> live</span>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={role.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-2.5">
              {role.rows.map(([name, note, color, v], n) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: n * 0.06, duration: 0.4, ease }}
                  className="flex items-center gap-3 rounded-[14px] border border-white/80 bg-white/85 px-3.5 py-3 shadow-[var(--shadow-1)]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[12px] font-bold text-white" style={{ background: color }}>{name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
                    <p className="text-[11.5px] text-ink-mute">{note}</p>
                  </div>
                  <div className="hidden w-[34%] sm:block">
                    <span className="block h-[6px] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]">
                      <motion.span className="block h-full origin-left rounded-full" style={{ background: color }} initial={{ scaleX: 0 }} animate={{ scaleX: v / 100 }} transition={{ delay: 0.15 + n * 0.06, duration: 0.7, ease }} />
                    </span>
                  </div>
                  <span className="w-9 text-right font-mono text-[12px] text-ink-soft">{v}%</span>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </Section>
  )
}

/* ---------------------------------------------------------------- page */
/** True once the browser has a free moment after the first paint, so heavy decoration never competes with the content. */
function useIdle() {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const t = globalThis.setTimeout(() => setIdle(true), 1200)
    return () => globalThis.clearTimeout(t)
  }, [])
  return idle
}

export default function Landing() {
  const idle = useIdle()
  const names = companyCatalog.map((c) => c.name)
  const tier = useMotionTier()

  return (
    <SmoothScroll>
    <div className="relative min-h-[calc(100svh/var(--z))] overflow-x-hidden">
      <SkipLink />
      <Aurora />
      <CursorFollower />
      <ScrollProgress />

      <Announcement />
      <Nav />
      {!import.meta.env.SSR && <AskDock />}
      {!import.meta.env.SSR && <ContactDialog />}

      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        {/* hero */}
        <section className="relative mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-10 px-6 pb-16 pt-12 sm:gap-14 sm:pb-24 sm:pt-16 lg:grid-cols-[0.85fr_1.15fr]">
          {/* 3D brand orb behind the product preview; a static glow everywhere WebGL is off. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-[-8%] -z-10 hidden w-[70%] lg:block">
            {idle && intensity[tier].webgl ? (
              <Suspense fallback={<Glow size={560} className="right-[10%] top-[10%]" />}>
                <HeroScene className="h-full w-full" />
              </Suspense>
            ) : (
              <Glow size={560} className="right-[10%] top-[10%]" />
            )}
          </div>
          {!import.meta.env.SSR && <FloatingChips />}
          {/* The hero text and call to action are there from the first paint; only the product preview beside them animates in. */}
          <motion.div initial={false} animate="show" variants={stagger}>
            <motion.p variants={reveal} className="label-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a] shadow-[0_0_0_4px_rgba(18,183,106,.18)]" /> Live eligibility engine
            </motion.p>
            <motion.h1 variants={reveal} className="mt-6 text-[clamp(2.6rem,1.6rem+3.6vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-ink">
              Placement season,
              <br />
              <span className="font-display font-normal italic tracking-[-0.01em] text-gradient">decoded.</span>
            </motion.h1>
            <motion.p variants={reveal} className="mt-6 max-w-[520px] text-[16px] leading-[1.65] text-ink-mute">
              PlacementIQ scores your real profile against every campus recruiter, reads your resume like an ATS, syncs your coding
              platforms and tells you the one thing to fix next for each company.
            </motion.p>
            <motion.div variants={reveal} className="mt-8">
              <AskBar />
            </motion.div>
            <motion.div variants={reveal} className="mt-5 flex flex-wrap items-center gap-3">
              <Magnetic><button type="button" onClick={() => openContact()} className="btn-ink">Contact us <span className="kbd hidden sm:inline-grid">C</span></button></Magnetic>
              <a href="#how" className="btn-bracket">See how it works</a>
            </motion.div>
            <motion.div variants={reveal} className="mt-10 flex items-center gap-6 text-[12px] text-ink-mute">
              {[[String(RECRUITERS), 'recruiters scored'], ['9', 'evidence sources'], ['< 10s', 'resume analysis']].map(([n, l]) => (
                <div key={l}>
                  <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink">{n}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
          {!import.meta.env.SSR && <HeroPreview />}
        </section>

        {/* marquee */}
        <p className="mb-3 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-faint">Every student scored against {RECRUITERS} recruiters</p>
        <div className="relative border-y border-white/60 bg-white/30 py-5 backdrop-blur-md [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee__track flex w-max gap-10 whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-ink-faint">
            {[...names, ...names].map((n, i) => <span key={i}>{n}</span>)}
          </div>
        </div>

        <div className="h-12 sm:h-24" />
        <Manifesto />

        {/* features */}
        <Section id="features" className="pb-28">
          <motion.p variants={reveal} className="label-mono"><b>02</b> Everything, end to end</motion.p>
          <motion.h2 variants={reveal} className="mt-3 max-w-[720px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
            One profile. Every recruiter. <span className="font-display font-normal italic text-ink-mute">No guesswork.</span>
          </motion.h2>

          <Features />
        </Section>

        <Roles />

        {/* how it works */}
        <Section id="how" className="pb-28">
          <motion.p variants={reveal} className="label-mono"><b>04</b> How it works</motion.p>
          <TextReveal className="mt-3 text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">From sign-up to offer, in four moves.</TextReveal>
          <HowItWorks />
        </Section>

        {/* trust */}
        <Section id="trust" className="pb-28">
          <Trust />
        </Section>

        <Pricing />

        {/* CTA */}
        <Section id="closing" className="pb-24">
          <motion.div variants={reveal} className="gradient-border rounded-[30px]">
            <div className="glass-strong relative overflow-hidden rounded-[30px] px-8 py-16 text-center">
              <div aria-hidden className="prism opacity-70" />
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-[22%] h-40 w-40 -translate-x-1/2 rounded-full bg-[oklch(0.6_0.22_285)] opacity-30 blur-[60px]" />
              <LogoMark size={56} className="relative mx-auto" />
              <h2 className="relative mx-auto mt-6 max-w-[640px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                Walk into every drive <span className="font-display font-normal italic text-gradient">prepared.</span>
              </h2>
              <p className="relative mx-auto mt-4 max-w-[520px] text-[15px] text-ink-mute">Bring PlacementIQ to your college. Students join free through their placement cell.</p>
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => openContact()} className="btn-ink">Contact us <span className="kbd hidden sm:inline-grid">C</span></button>
                <Link to="/login" className="btn-bracket">Sign in</Link>
              </div>
            </div>
          </motion.div>
        </Section>

      </main>
      <MegaFooter />
    </div>
    </SmoothScroll>
  )
}
