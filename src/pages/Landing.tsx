import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo, LogoMark } from '../components/Logo'
import { bucketMeta, bucketOrder, companyCatalog } from '../data/companies'
import { evaluateAll, readinessOf, SKILLS } from '../lib/eligibility'

/* ---------------------------------------------------------------- brief opening */
function Opening({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1300)
    return () => window.clearTimeout(t)
  }, [onDone])
  return (
    <motion.div className="fixed inset-0 z-[100] grid place-items-center bg-paper" exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={onDone}>
      <div className="flex items-center gap-4">
        <LogoMark size={56} animate />
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }} className="font-display text-[34px] font-medium text-ink">
          Placement<span className="font-mono text-[26px] text-brand">IQ</span>
        </motion.span>
      </div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- live demo (real scoring engine) */
const SLIDERS = [
  { key: 'Data Structures & Algorithms', label: 'DSA' },
  { key: 'System Design', label: 'System design' },
  { key: 'Node.js / Backend', label: 'Backend' },
  { key: 'Cloud & DevOps', label: 'Cloud and DevOps' },
] as const

function Range({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-medium text-ink-soft">{label}</span>
        <span className="figure text-ink">{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full accent-[#0F5A45]" aria-label={label} />
    </label>
  )
}

function Demo() {
  const [cgpa, setCgpa] = useState(8.2)
  const [levels, setLevels] = useState<Record<string, number>>({ 'Data Structures & Algorithms': 72, 'System Design': 55, 'Node.js / Backend': 68, 'Cloud & DevOps': 45 })
  const [internships, setInternships] = useState(1)
  const [projects, setProjects] = useState(2)

  const result = useMemo(() => {
    const base: Record<string, number> = { 'React / Frontend': 70, 'Databases (SQL + NoSQL)': 65, 'Machine Learning': 40, 'Aptitude & Reasoning': 70 }
    const student = {
      cgpa,
      backlogs: 0,
      class_x: 85,
      class_xii: 82,
      skills: SKILLS.map((name) => ({ name, level: levels[name] ?? base[name] ?? 0 })),
      projects: Array.from({ length: projects }),
      internships: Array.from({ length: internships }),
    }
    const all = evaluateAll(student)
    const blockers = Object.entries(
      all.filter((c) => c.bucket !== 'eligible').flatMap((c) => c.gaps.slice(0, 1).map((g) => g.skill)).reduce<Record<string, number>>((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1])
    return { all, readiness: readinessOf(all), blocker: blockers[0] }
  }, [cgpa, levels, internships, projects])

  const counts = bucketOrder.map((b) => ({ b, n: result.all.filter((c) => c.bucket === b).length }))
  const dot: Record<string, string> = { eligible: '#0A7A5C', nearly: '#B47B12', canBecome: '#2D5FA0', notEligible: '#A63A2A' }

  return (
    <div className="grid grid-cols-1 border border-rule bg-surface lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 border-b border-rule p-5 lg:border-b-0 lg:border-r">
        <p className="eyebrow">Sample student</p>
        <Range label="CGPA" value={cgpa} min={5} max={10} step={0.1} onChange={setCgpa} />
        {SLIDERS.map((s) => (
          <Range key={s.key} label={s.label} value={levels[s.key]} min={0} max={100} suffix="%" onChange={(v) => setLevels({ ...levels, [s.key]: v })} />
        ))}
        <div className="grid grid-cols-2 gap-4">
          <Range label="Internships" value={internships} min={0} max={3} onChange={setInternships} />
          <Range label="Projects" value={projects} min={0} max={6} onChange={setProjects} />
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <div>
            <p className="eyebrow">Readiness</p>
            <p className="figure mt-1 text-[40px] font-medium leading-none text-ink">{result.readiness}</p>
          </div>
          <div>
            <p className="eyebrow">Eligible today</p>
            <p className="figure mt-1 text-[40px] font-medium leading-none text-ink">
              {counts[0].n}
              <span className="text-[16px] text-ink-faint"> / {result.all.length}</span>
            </p>
          </div>
          {result.blocker && (
            <div className="min-w-[180px] flex-1">
              <p className="eyebrow">Biggest blocker</p>
              <p className="mt-1.5 text-[14px] font-semibold text-ink">{result.blocker[0]}</p>
              <p className="text-[12px] text-ink-mute">first gap at {result.blocker[1]} companies</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex h-[10px] w-full gap-[2px]" aria-hidden>
          {counts.map(({ b, n }) => n > 0 && <span key={b} style={{ flex: n, background: dot[b] }} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-soft">
          {counts.map(({ b, n }) => (
            <span key={b} className="flex items-center gap-1.5">
              <span className="h-2 w-2" style={{ background: dot[b] }} />
              {bucketMeta[b].title} <span className="figure text-ink">{n}</span>
            </span>
          ))}
        </div>

        <table className="mt-5 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-rule text-[11px] uppercase tracking-[0.1em] text-ink-faint">
              <th className="py-2 font-semibold">Best matches</th>
              <th className="py-2 font-semibold">Stack</th>
              <th className="py-2 text-right font-semibold">Match</th>
            </tr>
          </thead>
          <tbody>
            {result.all.slice(0, 6).map((c) => (
              <tr key={c.id} className="border-b border-rule/70">
                <td className="py-2 font-medium text-ink">{c.name}</td>
                <td className={`py-2 text-[12px] ${bucketMeta[c.bucket].text}`}>{bucketMeta[c.bucket].title}</td>
                <td className="figure py-2 text-right text-ink">{c.match}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[11.5px] text-ink-faint">This is the same scoring engine the app uses, running in your browser on the sample values at left.</p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- page */
const features = [
  ['Eligibility engine', 'Each recruiter has requirements set by tier: product, fintech, services, quant, AI and more. Your match, stack and exact skill gaps are recalculated whenever your profile changes.'],
  ['Resume analysis', 'PDF and DOCX resumes are read in your browser and measured with six ATS checks, then reviewed by an AI model that rewrites your weakest bullets using your own content.'],
  ['Job-description matching', 'Paste any job description, or pick a drive from your placement cell, to get a fit score with matched and missing skills.'],
  ['Verified coding profile', 'GitHub, LeetCode, Codeforces and CodeChef statistics become skill levels backed by real evidence.'],
  ['Career assistant', 'Every answer draws on your own profile, resume and computed eligibility.'],
  ['Progress history', 'A daily snapshot of readiness, stacks, skills and resume score shows how you are trending over the season.'],
]

const cellFeatures = [
  'Post drives with eligibility criteria and a full job description',
  'See every applicant ranked by profile match and AI resume fit',
  'Move applicants through shortlist, interview and offer; students are notified automatically',
  'Rank the whole batch and export it as a spreadsheet',
]

export default function Landing() {
  const reduce = useReducedMotion()
  const [opening, setOpening] = useState(() => {
    if (reduce) return false
    try {
      return !sessionStorage.getItem('piq-intro')
    } catch {
      return false
    }
  })
  const done = () => {
    setOpening(false)
    try {
      sessionStorage.setItem('piq-intro', '1')
    } catch {
      /* storage unavailable */
    }
  }
  const names = companyCatalog.map((c) => c.name)

  return (
    <div className="min-h-screen bg-paper">
      <AnimatePresence>{opening && <Opening onDone={done} />}</AnimatePresence>

      <header className="sticky top-0 z-40 border-b border-rule bg-paper">
        <nav className="mx-auto flex max-w-[1120px] items-center gap-6 px-5 py-3">
          <Link to="/" aria-label="PlacementIQ home"><Logo size={28} tagline={false} /></Link>
          <div className="ml-4 hidden items-center gap-6 text-[13px] text-ink-soft md:flex">
            <a href="#demo" className="hover:text-ink hover:underline">Demo</a>
            <a href="#features" className="hover:text-ink hover:underline">Features</a>
            <a href="#cells" className="hover:text-ink hover:underline">Placement cells</a>
            <Link to="/privacy" className="hover:text-ink hover:underline">Privacy</Link>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="whitespace-nowrap px-3 py-2 text-[13px] font-semibold text-ink-soft hover:underline">Sign in</Link>
            <Link to="/signup" className="btn-primary whitespace-nowrap">Create account</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1120px] px-5 pb-14 pt-14 sm:pt-20">
          <p className="eyebrow">Campus placement intelligence</p>
          <h1 className="mt-4 max-w-[860px] font-display text-[clamp(2.4rem,1.6rem+3vw,4.2rem)] font-medium leading-[1.04] text-ink">
            Know which companies you can clear, and exactly what to fix for the rest.
          </h1>
          <p className="mt-6 max-w-[620px] text-[17px] leading-[1.7] text-ink-soft">
            PlacementIQ scores your academics, resume and coding record against every recruiter your college works with, then tells you the
            single change that would move you furthest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="btn-primary h-[44px] px-5 text-[14px]">Create a free account</Link>
            <a href="#demo" className="btn-glass h-[44px] px-5 text-[14px]">Try the live demo</a>
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-[1120px] scroll-mt-20 px-5 pb-20">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[26px] font-medium text-ink">Move the sliders and watch the stacks change</h2>
            <p className="text-[13px] text-ink-mute">66 recruiters, scored live</p>
          </div>
          <Demo />
        </section>

        <section className="border-y border-rule bg-surface">
          <div className="mx-auto max-w-[1120px] px-5 py-6">
            <p className="eyebrow">Recruiters in the model</p>
            <p className="mt-2 text-[13.5px] leading-[1.9] text-ink-soft">{names.join(', ')}.</p>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-[1120px] scroll-mt-20 px-5 py-20">
          <p className="eyebrow">What it does</p>
          <h2 className="mt-3 max-w-[640px] font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.8rem)] font-medium leading-[1.1] text-ink">One profile, scored against every recruiter.</h2>
          <dl className="mt-10 grid grid-cols-1 gap-x-14 md:grid-cols-2">
            {features.map(([t, d], i) => (
              <div key={t} className="border-t border-rule py-6">
                <dt className="flex items-baseline gap-3">
                  <span className="figure text-[13px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[17px] font-semibold text-ink">{t}</span>
                </dt>
                <dd className="mt-2 pl-8 text-[14px] leading-[1.7] text-ink-soft">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="cells" className="scroll-mt-20 bg-pine text-[#FBF9F4]">
          <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-5 py-20 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FBF9F4]/60">For placement cells</p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.6rem)] font-medium leading-[1.1]">Run every drive from one place.</h2>
              <p className="mt-4 max-w-[420px] text-[15px] leading-[1.7] text-[#FBF9F4]/75">
                Students arrive with verified profiles. Your team posts the drive and works from a ranked list.
              </p>
            </div>
            <ol className="self-center">
              {cellFeatures.map((t, i) => (
                <li key={t} className="flex gap-4 border-t border-[#FBF9F4]/15 py-4 text-[14.5px] leading-[1.6] text-[#FBF9F4]/85">
                  <span className="figure text-[#FBF9F4]/50">{String(i + 1).padStart(2, '0')}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-5 py-20">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="eyebrow">Your data</p>
              <h2 className="mt-3 font-display text-[clamp(1.7rem,1.3rem+1.3vw,2.3rem)] font-medium leading-[1.15] text-ink">Private by default, visible only to you and your placement cell.</h2>
            </div>
            <div className="space-y-4 text-[14.5px] leading-[1.75] text-ink-soft">
              <p>Every record is locked to your account in the database with row-level security. Resumes sit in private storage and open only through short-lived links.</p>
              <p>AI analysis runs on the server, so no keys or other students' information ever reach your browser. Coding platforms are read from public data only.</p>
              <p>
                The full details are in the <Link to="/privacy" className="text-brand underline">Privacy Policy</Link> and{' '}
                <Link to="/terms" className="text-brand underline">Terms of Service</Link>.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-rule">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-6 px-5 py-14">
            <h2 className="flex-1 font-display text-[clamp(1.7rem,1.3rem+1.3vw,2.3rem)] font-medium leading-[1.15] text-ink">Start before the next drive is announced.</h2>
            <div className="flex gap-3">
              <Link to="/signup" className="btn-primary h-[44px] px-5 text-[14px]">Create a free account</Link>
              <Link to="/login" className="btn-glass h-[44px] px-5 text-[14px]">Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-6 text-[12.5px] text-ink-mute">
          <Logo size={24} tagline={false} />
          <Link to="/terms" className="hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/login" className="hover:underline">Sign in</Link>
          <span className="ml-auto">© {new Date().getFullYear()} PlacementIQ</span>
        </div>
      </footer>
    </div>
  )
}
