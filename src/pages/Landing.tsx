import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { AnimatedValue, Aurora, trackSpotlight } from '../components/Page'
import { companyCatalog } from '../data/companies'
import { inr, PLANS } from '../lib/pricing'

const ease = [0.16, 1, 0.3, 1] as const
const reveal: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }
const stagger: Variants = { show: { transition: { staggerChildren: 0.08 } } }

/* ---------------------------------------------------------------- pricing */

const SALES_EMAIL = import.meta.env.VITE_SALES_EMAIL

function Pricing() {
  return (
    <Section id="pricing" className="pb-28">
      <motion.p variants={reveal} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">Pricing</motion.p>
      <motion.h2 variants={reveal} className="mt-3 max-w-[720px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
        Colleges subscribe. <span className="font-display font-normal italic text-gradient">Students never pay.</span>
      </motion.h2>
      <motion.p variants={reveal} className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-ink-mute">
        Each college gets its own private placement cell, its own roster and its own drives. Only students your college adds can sign in.
      </motion.p>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((p) => (
          <motion.div key={p.name} variants={reveal} className={p.featured ? 'gradient-border rounded-[24px]' : ''}>
            <div className={`${p.featured ? 'glass-strong' : 'glass'} flex h-full flex-col rounded-[24px] p-6`}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold tracking-[-0.02em] text-ink">{p.name}</p>
                {p.featured && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Most chosen</span>}
              </div>
              <p className="mt-4 text-[34px] font-semibold tracking-[-0.04em] text-ink">
                {p.key === 'enterprise' && <span className="mr-1 text-[15px] font-medium text-ink-mute">from</span>}
                {inr(p.pricePerSeat)}
              </p>
              <p className="text-[12px] text-ink-faint">{p.key === 'trial' ? '30 days' : 'per student / year'}</p>
              <p className="mt-1 text-[12px] text-ink-mute">{p.platformFee ? `+ ${inr(p.platformFee)} platform fee / year` : 'No platform fee'} · {p.seats}</p>
              <p className="mt-3 text-[13px] leading-[1.55] text-ink-mute">{p.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-[13px] text-ink-soft">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              {SALES_EMAIL ? (
                <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`PlacementIQ ${p.name} plan`)}`} className={`${p.featured ? 'btn-primary' : 'btn-glass'} mt-6 h-[42px] justify-center text-[13px]`}>
                  {p.name === 'Enterprise' ? 'Talk to us' : p.name === 'Trial' ? 'Start a trial' : `Choose ${p.name}`}
                </a>
              ) : (
                <Link to="/login" className={`${p.featured ? 'btn-primary' : 'btn-glass'} mt-6 h-[42px] justify-center text-[13px]`}>
                  {p.name === 'Enterprise' ? 'Talk to us' : p.name === 'Trial' ? 'Start a trial' : `Choose ${p.name}`}
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.p variants={reveal} className="mt-5 text-[12px] text-ink-faint">
        Prices exclude 18% GST. Seats are counted by students on your roster. The platform fee covers hosting, security, backups and onboarding for your college.
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

/* ---------------------------------------------------------------- launch intro */
function LaunchIntro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2100)
    return () => window.clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#0d0a24]"
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
      onClick={onDone}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.55_0.24_285)] opacity-30 blur-[120px]" />
      <div className="relative flex flex-col items-center">
        <LogoMark size={96} animate />
        <motion.p
          initial={{ opacity: 0, y: 10, letterSpacing: '0.3em' }}
          animate={{ opacity: 1, y: 0, letterSpacing: '-0.03em' }}
          transition={{ delay: 0.9, duration: 0.8, ease }}
          className="mt-6 text-[34px] font-semibold text-white"
        >
          Placement<span className="text-gradient font-bold">IQ</span>
        </motion.p>
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.1, duration: 0.9, ease }}
          className="mt-4 block h-px w-48 origin-left bg-gradient-to-r from-transparent via-white/60 to-transparent"
        />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35, duration: 0.5 }} className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
          Placement intelligence
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- hero product preview */
const previewCompanies = companyCatalog.filter((c) => ['Google', 'Microsoft', 'Amazon', 'Atlassian', 'Goldman Sachs', 'Uber', 'NVIDIA', 'Infosys', 'Zoho', 'Razorpay', 'Databricks', 'Jane Street'].includes(c.name))
const buckets = [
  { name: 'Eligible', color: '#12b76a', items: ['Infosys', 'Zoho', 'Razorpay'] },
  { name: 'Nearly', color: '#f79009', items: ['Atlassian', 'Goldman Sachs', 'Uber'] },
  { name: 'Can become', color: '#2e90fa', items: ['Google', 'Microsoft', 'Amazon'] },
  { name: 'Stretch', color: '#f04438', items: ['NVIDIA', 'Databricks', 'Jane Street'] },
]

function ProductPreview() {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 })

  return (
    <motion.div
      onPointerMove={(e) => {
        if (reduce) return
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1400 }}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.25, ease }}
      className="gradient-border relative rounded-[26px]"
    >
      <div className="glass-strong overflow-hidden rounded-[26px]">
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
          <span className="ml-3 rounded-full bg-white/70 px-3 py-0.5 text-[10.5px] text-ink-faint">placementiq.app/eligibility</span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_150px]">
          <div className="grid grid-cols-4 gap-2.5">
            {buckets.map((b, bi) => (
              <div key={b.name}>
                <div className="rounded-[12px] px-2 py-2 text-center" style={{ background: `${b.color}14`, border: `1px solid ${b.color}33` }}>
                  <p className="text-[10.5px] font-semibold" style={{ color: b.color }}>{b.name}</p>
                </div>
                {b.items.map((name, i) => {
                  const c = previewCompanies.find((x) => x.name === name)
                  return (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, y: -18, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.9 + bi * 0.12 + i * 0.09, type: 'spring', stiffness: 300, damping: 22 }}
                      className="mt-2 flex items-center gap-1.5 rounded-[11px] border border-white/80 bg-white/90 px-1.5 py-2 shadow-[var(--shadow-1)]"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-bold text-white" style={{ background: c?.brand ?? '#6d4aff' }}>
                        {name[0]}
                      </span>
                      <span className="truncate text-[10.5px] font-semibold text-ink">{name}</span>
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="hidden space-y-2.5 sm:block">
            <div className="rounded-[16px] border border-white/80 bg-white/80 p-3 text-center">
              <p className="text-[10px] font-medium text-ink-mute">Readiness</p>
              <svg viewBox="0 0 80 80" className="mx-auto mt-1 h-[84px] w-[84px] -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(0.92 0.015 285)" strokeWidth="8" />
                <motion.circle
                  cx="40" cy="40" r="32" fill="none" stroke="url(#lp-ring)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={201} initial={{ strokeDashoffset: 201 }} animate={{ strokeDashoffset: 201 * 0.18 }}
                  transition={{ delay: 1.1, duration: 1.4, ease }}
                />
                <defs><linearGradient id="lp-ring"><stop offset="0" stopColor="#6d4aff" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
              </svg>
              <p className="-mt-[58px] mb-[34px] text-[20px] font-semibold text-ink"><AnimatedValue value="82" /></p>
            </div>
            <div className="rounded-[16px] border border-white/80 bg-white/80 p-3">
              <p className="text-[10px] font-medium text-ink-mute">Resume score</p>
              {[['Metrics', 91, '#12b76a'], ['Keywords', 84, '#12b76a'], ['Action verbs', 58, '#f79009']].map(([l, v, c], i) => (
                <div key={l as string} className="mt-2">
                  <div className="flex justify-between text-[9.5px] text-ink-soft"><span>{l}</span><span>{v}%</span></div>
                  <span className="mt-1 block h-[5px] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)]">
                    <motion.span className="block h-full origin-left rounded-full" style={{ background: c as string }} initial={{ scaleX: 0 }} animate={{ scaleX: (v as number) / 100 }} transition={{ delay: 1.3 + i * 0.1, duration: 0.9, ease }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.8, duration: 0.6, ease }}
        className="glass-dark absolute -bottom-6 -left-6 hidden max-w-[260px] rounded-[18px] p-3.5 text-white md:block"
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/50">AI assistant</p>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-white/90">Close System Design (62 → 75) and Google moves from <b>Can become</b> to <b>Nearly</b>.</p>
      </motion.div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- bento */
function Bento({ title, body, children, className }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <motion.div variants={reveal} onPointerMove={trackSpotlight} className={`card card-hover spotlight flex flex-col overflow-hidden p-6 ${className ?? ''}`}>
      <div className="flex-1">{children}</div>
      <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em] text-ink">{title}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mute">{body}</p>
    </motion.div>
  )
}

const steps = [
  ['Create your profile', 'Academics, skills, projects and internships, stored in structured tables that only you can read.'],
  ['Connect your evidence', 'Upload your resume and link GitHub, LeetCode, Codeforces and CodeChef. We pull real numbers.'],
  ['Get scored against 66 recruiters', 'Every company has tier-specific requirements. You see your match, stack and exact gaps.'],
  ['Close gaps and apply', 'Follow the roadmap, practise, log mocks, tailor your resume per JD, and track every application.'],
]

/* ---------------------------------------------------------------- page */
export default function Landing() {
  const reduce = useReducedMotion()
  const [intro, setIntro] = useState(() => {
    if (reduce) return false
    try {
      return !sessionStorage.getItem('piq-intro')
    } catch {
      return true
    }
  })
  const finishIntro = () => {
    setIntro(false)
    try {
      sessionStorage.setItem('piq-intro', '1')
    } catch {
      /* private mode */
    }
  }
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const names = companyCatalog.map((c) => c.name)

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Aurora />
      <AnimatePresence>{intro && <LaunchIntro onDone={finishIntro} />}</AnimatePresence>
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-[#6d4aff] via-[#38bdf8] to-[#8ef5d9]" />

      {/* nav */}
      <div className="sticky top-0 z-40 px-4 pt-4">
        <nav className="glass mx-auto flex max-w-[1160px] items-center gap-6 rounded-[20px] px-4 py-2.5">
          <Link to="/" aria-label="PlacementIQ home"><Logo size={32} tagline={false} /></Link>
          <div className="ml-4 hidden items-center gap-5 text-[13px] font-medium text-ink-soft md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#trust" className="hover:text-ink">Security</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="whitespace-nowrap rounded-[11px] px-3 py-2 text-[12.5px] font-semibold text-ink-soft hover:bg-white/70">Sign in</Link>
            <Link to="/signup" className="btn-primary whitespace-nowrap">Get started</Link>
          </div>
        </nav>
      </div>

      <main className="relative z-10">
        {/* hero */}
        <section className="mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div initial="hidden" animate={intro ? 'hidden' : 'show'} variants={stagger}>
            <motion.span variants={reveal} className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a] shadow-[0_0_0_4px_rgba(18,183,106,.18)]" />
              Live eligibility engine · AI resume intelligence
            </motion.span>
            <motion.h1 variants={reveal} className="mt-6 text-[clamp(2.6rem,1.6rem+3.6vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-ink">
              Placement season,
              <br />
              <span className="font-display font-normal italic tracking-[-0.01em] text-gradient">decoded.</span>
            </motion.h1>
            <motion.p variants={reveal} className="mt-6 max-w-[520px] text-[16px] leading-[1.65] text-ink-mute">
              PlacementIQ scores your real profile against every campus recruiter, reads your resume like an ATS, syncs your coding
              platforms and tells you the one thing to fix next for each company.
            </motion.p>
            <motion.div variants={reveal} className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn-primary h-[46px] px-6 text-[14px]">Start free — it takes 2 minutes</Link>
              <a href="#how" className="btn-glass h-[46px] px-5 text-[14px]">See how it works</a>
            </motion.div>
            <motion.div variants={reveal} className="mt-10 flex items-center gap-6 text-[12px] text-ink-mute">
              {[['66', 'recruiters scored'], ['4', 'platforms synced'], ['< 10s', 'resume analysis']].map(([n, l]) => (
                <div key={l}>
                  <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink"><AnimatedValue value={n} /></p>
                  <p>{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
          {!intro && <ProductPreview />}
        </section>

        {/* marquee */}
        <div className="relative border-y border-white/60 bg-white/30 py-5 backdrop-blur-md [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee__track flex w-max gap-10 whitespace-nowrap text-[15px] font-semibold tracking-[-0.01em] text-ink-faint">
            {[...names, ...names].map((n, i) => <span key={i}>{n}</span>)}
          </div>
        </div>

        {/* features */}
        <Section id="features" className="py-28">
          <motion.p variants={reveal} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">Everything, end to end</motion.p>
          <motion.h2 variants={reveal} className="mt-3 max-w-[720px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
            One profile. Every recruiter. <span className="font-display font-normal italic text-ink-mute">No guesswork.</span>
          </motion.h2>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
            <Bento className="md:col-span-4" title="Eligibility engine" body="Requirements per recruiter tier — FAANG, quant, AI, fintech, startups, services. Your match %, stack and exact skill gaps update the moment your profile changes.">
              <div className="flex h-[150px] items-end gap-2">
                {[38, 52, 61, 70, 76, 82, 88, 91, 86, 94, 72, 64].map((h, i) => (
                  <motion.span
                    key={i}
                    variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { delay: i * 0.04, duration: 0.6, ease } } }}
                    className="flex-1 origin-bottom rounded-t-[8px]"
                    style={{ height: `${h}%`, background: h >= 85 ? 'linear-gradient(#34d399,#12b76a)' : h >= 70 ? 'linear-gradient(#fbbf24,#f79009)' : 'linear-gradient(#93c5fd,#2e90fa)' }}
                  />
                ))}
              </div>
            </Bento>
            <Bento className="md:col-span-2" title="Resume intelligence" body="PDF and DOCX parsed in your browser, measured with six ATS checks, then reviewed by AI with rewrites of your actual bullets.">
              <div className="grid h-[150px] place-items-center">
                <div className="relative grid h-[120px] w-[120px] place-items-center rounded-full bg-[conic-gradient(#6d4aff_0_79%,oklch(0.92_0.015_285)_79%_100%)]">
                  <div className="grid h-[96px] w-[96px] place-items-center rounded-full bg-white/95">
                    <p className="text-[28px] font-semibold tracking-[-0.03em]"><AnimatedValue value="79" /></p>
                  </div>
                </div>
              </div>
            </Bento>
            <Bento className="md:col-span-2" title="JD matcher" body="Paste any job description to get a fit score, matched and missing skills, and tailored bullets.">
              <div className="flex h-[150px] flex-wrap content-center gap-1.5">
                {['React', 'TypeScript', 'REST', 'Git', 'SQL'].map((t) => <span key={t} className="rounded-full border border-[#c9f0d9] bg-[#ecfdf3] px-2.5 py-1 text-[11px] font-semibold text-[#0d9a5b]">✓ {t}</span>)}
                {['Kafka', 'Kubernetes'].map((t) => <span key={t} className="rounded-full border border-[#fbd5d1] bg-[#fef3f2] px-2.5 py-1 text-[11px] font-semibold text-[#d92d20]">+ {t}</span>)}
              </div>
            </Bento>
            <Bento className="md:col-span-2" title="Verified coding profile" body="GitHub repos and languages, LeetCode, Codeforces and CodeChef stats become verified skill levels.">
              <div className="grid h-[150px] grid-cols-2 content-center gap-2">
                {[['GitHub', '22 repos'], ['LeetCode', '412 solved'], ['Codeforces', '1487'], ['CodeChef', '3★']].map(([p, v]) => (
                  <div key={p} className="rounded-[12px] border border-white/80 bg-white/80 px-3 py-2">
                    <p className="text-[10.5px] text-ink-mute">{p}</p>
                    <p className="text-[14px] font-semibold text-ink">{v}</p>
                  </div>
                ))}
              </div>
            </Bento>
            <Bento className="md:col-span-2" title="AI career assistant" body="Ask anything. Answers are grounded in your own profile, resume and computed eligibility — not generic advice.">
              <div className="flex h-[150px] flex-col justify-center gap-2">
                <span className="self-end rounded-[14px] rounded-br-[4px] bg-brand px-3 py-2 text-[11.5px] text-white">What should I fix for Uber?</span>
                <span className="self-start rounded-[14px] rounded-bl-[4px] border border-white/80 bg-white/90 px-3 py-2 text-[11.5px] text-ink-soft">Cloud & DevOps 51 → 63 first, then System Design.</span>
              </div>
            </Bento>
            <Bento className="md:col-span-6" title="Analytics that move with you" body="Daily snapshots of readiness, stacks, skills, problems solved and resume score — so you can see the trend, not just today.">
              <svg viewBox="0 0 600 140" className="h-[150px] w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lp-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d4aff" stopOpacity=".35" /><stop offset="1" stopColor="#6d4aff" stopOpacity="0" /></linearGradient>
                </defs>
                <motion.path d="M0 120 C60 112 90 100 140 96 S230 70 290 72 S390 40 450 38 S540 18 600 12 L600 140 L0 140Z" fill="url(#lp-area)" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.4, duration: 0.8 } } }} />
                <motion.path d="M0 120 C60 112 90 100 140 96 S230 70 290 72 S390 40 450 38 S540 18 600 12" fill="none" stroke="#6d4aff" strokeWidth="3" strokeLinecap="round" variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 1.6, ease } } }} />
              </svg>
            </Bento>
          </div>
        </Section>

        {/* how it works */}
        <Section id="how" className="pb-28">
          <motion.p variants={reveal} className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">How it works</motion.p>
          <motion.h2 variants={reveal} className="mt-3 text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">From sign-up to offer, in four moves.</motion.h2>
          <div className="relative mt-14 grid grid-cols-1 gap-5 md:grid-cols-4">
            <motion.span
              variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 1.4, ease } } }}
              className="absolute left-[12%] right-[12%] top-[27px] hidden h-[2px] origin-left bg-gradient-to-r from-[#6d4aff] via-[#38bdf8] to-[#8ef5d9] md:block"
            />
            {steps.map(([t, b], i) => (
              <motion.div key={t} variants={reveal} className="relative">
                <span className="glass-strong relative grid h-14 w-14 place-items-center rounded-[18px] text-[18px] font-semibold text-brand-dark">{i + 1}</span>
                <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{t}</p>
                <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mute">{b}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* trust */}
        <Section id="trust" className="pb-28">
          <motion.div variants={reveal} className="glass-dark relative overflow-hidden rounded-[30px] p-10 text-white md:p-14">
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[oklch(0.6_0.22_285)] opacity-40 blur-[90px]" />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.18em] text-white/50">Under the hood</p>
            <h2 className="relative mt-3 max-w-[640px] text-[clamp(1.8rem,1.3rem+1.6vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
              Your data is structured, private and yours.
            </h2>
            <div className="relative mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                ['Row-level security', 'Every table — skills, projects, analyses, matches — is locked to your account at the database level.'],
                ['Private resume storage', 'Resumes live in a private bucket under your user ID and open through short-lived signed links.'],
                ['Keys stay server-side', 'AI and integration calls run in server functions. Nothing secret ever ships to the browser.'],
              ].map(([t, b]) => (
                <div key={t} className="rounded-[18px] border border-white/10 bg-white/[0.05] p-5">
                  <p className="text-[15px] font-semibold">{t}</p>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-white/65">{b}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </Section>

        <Pricing />

        {/* CTA */}
        <Section className="pb-24">
          <motion.div variants={reveal} className="gradient-border rounded-[30px]">
            <div className="glass-strong rounded-[30px] px-8 py-14 text-center">
              <LogoMark size={56} className="mx-auto" />
              <h2 className="mx-auto mt-6 max-w-[640px] text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
                Walk into every drive <span className="font-display font-normal italic text-gradient">prepared.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-[520px] text-[15px] text-ink-mute">Free for students. Your first full analysis takes about two minutes.</p>
              <div className="mt-8 flex justify-center gap-3">
                <Link to="/signup" className="btn-primary h-[46px] px-6 text-[14px]">Create your account</Link>
                <Link to="/login" className="btn-glass h-[46px] px-5 text-[14px]">I already have one</Link>
              </div>
            </div>
          </motion.div>
        </Section>

        <footer className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-4 px-6 pb-10 text-[12px] text-ink-faint">
          <Logo size={26} tagline={false} />
          <span className="ml-auto">© {new Date().getFullYear()} PlacementIQ · Built for campus placement season</span>
        </footer>
      </main>
    </div>
  )
}
