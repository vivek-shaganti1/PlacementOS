import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { companyCatalog } from '../../data/companies'
import { coreCatalog } from '../../data/coreCompanies'
import type { Bucket } from '../../data/types'
import { motionConfig } from '../../lib/motion'
import { runDemo, startProfile } from './demo'
import { Accent, Heading, Rise } from './Section'

const ease = motionConfig.easing.dramatic
/** Software and core recruiters together (each student sees the ones for their tracks). */
const RECRUITERS = companyCatalog.length + coreCatalog.length
const GREEN = '#12b76a', AMBER = '#f79009', BLUE = '#2e90fa', RED = '#f04438', VIOLET = '#6d4aff', SKY = '#0ea5e9'
/** The tile behind a white letter: the same hue, dark enough to read. */
const TILE: Record<string, string> = { [GREEN]: '#067647', [AMBER]: '#b54708', [BLUE]: '#175cd3', [RED]: '#b42318', [SKY]: '#026aa2', '#0d9488': '#0f766e' }
type Row = { name: string; note: string; color: string; value: number }
type Role = { key: string; label: string; title: string; points: string[]; cta: string; view: string; rows: Row[] }

const BUCKETS: [Bucket, string, string][] = [['eligible', 'Eligible', GREEN], ['nearly', 'Nearly', AMBER], ['canBecome', 'Can become', BLUE], ['notEligible', 'Not yet', RED]]
/** The student's view is the real engine on the demo's starting profile: the best match in each group. */
const studentRows = (): Row[] => {
  const all = runDemo(startProfile('cse'))
  return BUCKETS.flatMap(([b, note, color]) => {
    const c = all.find((x) => x.bucket === b)
    return c ? [{ name: c.name, note, color, value: c.match }] : []
  })
}

const roles = (): Role[] => [
  {
    key: 'student', label: 'Students', title: 'A reason for every company, and the next step.',
    points: [`Four eligibility groups across ${RECRUITERS} recruiters, for every branch`, 'What-If Simulator before you study', 'Resume and job-description matching with AI rewrites'],
    cta: 'Sign in as a student', view: 'students', rows: studentRows(),
  },
  {
    key: 'cell', label: 'Placement cells', title: 'Your whole batch, by year, branch and section.',
    points: ['Only students on your list can sign in', 'Filters by CGPA, backlogs, score and drive', 'Post drives and see who qualifies at once'],
    cta: 'Sign in to the placement cell', view: 'placement cell',
    rows: [{ name: 'CSE, 4th year, A', note: '62 students', color: VIOLET, value: 78 }, { name: 'CSE, 4th year, B', note: '58 students', color: VIOLET, value: 71 }, { name: 'ECE, 4th year', note: '64 students', color: SKY, value: 63 }, { name: 'EEE, 3rd year', note: '49 students', color: SKY, value: 52 }],
  },
  {
    key: 'recruiter', label: 'Recruiters', title: 'Only your drives, only your applicants.',
    points: ['Applicants ranked, with the reasons', 'Rankings built on confirmed evidence', 'Shortlist, interview and offer in one place'],
    cta: 'Sign in as a recruiter', view: 'recruiter',
    rows: [{ name: '22EC031', note: 'Shortlisted', color: GREEN, value: 91 }, { name: '22CS104', note: 'Under review', color: BLUE, value: 84 }, { name: '22CS118', note: 'Under review', color: BLUE, value: 79 }, { name: '22IT052', note: 'Applied', color: AMBER, value: 66 }],
  },
  {
    key: 'admin', label: 'Platform admins', title: 'Every college and plan in one place.',
    points: ['Colleges, plans, seats and AI limits', 'Certificate checks and college enquiries', 'Placement-cell logins and an activity log'],
    cta: 'Sign in as a platform admin', view: 'seats in use',
    rows: [{ name: 'College A', note: 'Pro, 1,000 seats', color: VIOLET, value: 84 }, { name: 'College B', note: 'Basic, 600 seats', color: SKY, value: 58 }, { name: 'College C', note: 'Trial, 30 days', color: '#0d9488', value: 22 }, { name: 'College D', note: 'Enterprise, 3,000 seats', color: VIOLET, value: 91 }],
  },
]

const ROLE_MS = 6500

export function Roles() {
  const reduce = useReducedMotion()
  const list = useMemo(roles, [])
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const inView = useInView(root, { amount: 0.5 })
  const role = list[active]
  const run = auto && !paused && inView && !reduce

  // Moves on by itself until the visitor takes over, hovers or focuses it, or the page's motion is paused.
  useEffect(() => {
    if (!run) return
    const t = window.setTimeout(() => {
      if (document.documentElement.dataset.motion !== 'paused') setActive((i) => (i + 1) % list.length)
    }, ROLE_MS)
    return () => window.clearTimeout(t)
  }, [run, active, list.length])

  // On phones the tabs scroll sideways: keep the current one in view (the strip only, never the page).
  useEffect(() => {
    const tab = tabs.current[active]
    const strip = tab?.parentElement
    if (tab && strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [active, reduce])

  const pick = (i: number) => {
    setAuto(false)
    setActive(i)
  }
  const onKey = (e: KeyboardEvent) => {
    const to = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: list.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    const i = (to + list.length) % list.length
    pick(i)
    tabs.current[i]?.focus()
  }
  const hold = { onPointerEnter: () => setPaused(true), onPointerLeave: () => setPaused(false), onFocus: () => setPaused(true), onBlur: () => setPaused(false) }

  return (
    <>
      <Heading n="03" label="One platform, four desks">Everyone sees <Accent>exactly</Accent> what they should.</Heading>
      <Rise>
        <div ref={root} {...hold}>
          <div role="tablist" aria-label="Roles" onKeyDown={onKey} className="glass scroll-thin relative mt-9 inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none]">
            {list.map((r, i) => (
              <button
                key={r.key}
                ref={(el) => (tabs.current[i] = el)}
                id={`role-tab-${r.key}`}
                role="tab"
                aria-selected={active === i}
                aria-controls="role-panel"
                tabIndex={active === i ? 0 : -1}
                onClick={() => pick(i)}
                className={`relative h-[42px] shrink-0 whitespace-nowrap rounded-full px-5 text-[14px] font-semibold transition-colors ${active === i ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
              >
                {active === i && (
                  <motion.span layoutId="role-pill" className="absolute inset-0 overflow-hidden rounded-full bg-[oklch(0.2_0.045_285)]" transition={motionConfig.spring.snappy}>
                    {/* Time until the next desk; freezes while paused. */}
                    {auto && !reduce && inView && <span key={active} className="role-progress absolute inset-y-0 left-0 bg-white/15" style={{ animationDuration: `${ROLE_MS}ms`, animationPlayState: paused ? 'paused' : undefined }} />}
                  </motion.span>
                )}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>

          <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${role.key}`} className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="glass flex flex-col rounded-[28px] p-7 sm:p-9">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={role.key} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease }} className="flex flex-1 flex-col">
                  <p className="text-[clamp(1.5rem,1.3rem+0.6vw,1.8rem)] font-semibold leading-[1.18] tracking-[-0.03em] text-ink">{role.title}</p>
                  <ul className="mt-6 space-y-3.5">
                    {role.points.map((pt, n) => (
                      <li key={pt} className="flex items-baseline gap-3.5 text-[15.5px] leading-[1.45] text-ink-soft">
                        <span aria-hidden className="font-mono text-[12px] text-brand-dark">0{n + 1}</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-9">
                    <Link to="/login" className="btn-bracket -ml-1 !text-[14px]">{role.cta} <span aria-hidden>→</span></Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="glass-strong hairline-grid relative flex flex-col overflow-hidden rounded-[28px] p-5 sm:p-6">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_100%_0%,oklch(0.88_0.1_205/.75),transparent_70%)]" />
              <div className="relative mb-4 flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[11.5px] uppercase tracking-[0.14em] text-ink-soft">placementiq · {role.view}</span>
                <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-medium text-ink-soft">Example</span>
              </div>
              <div className="relative grid min-h-[372px] flex-1">
                <AnimatePresence initial={false}>
                  <motion.div key={role.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25 }} className="col-start-1 row-start-1 grid auto-rows-fr gap-3">
                    {role.rows.map((r, n) => (
                      <motion.div
                        key={r.name}
                        initial={reduce ? false : { opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: n * motionConfig.stagger.normal, duration: 0.4, ease }}
                        className="flex items-center gap-4 rounded-[18px] border border-white/80 bg-white/90 px-4 py-3.5 shadow-card"
                      >
                        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-[15px] font-bold text-white" style={{ background: TILE[r.color] ?? r.color }}>{r.name[0]}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-ink">{r.name}</p>
                          <p className="text-[13px] text-ink-soft">{r.note}</p>
                        </div>
                        <span aria-hidden className="hidden h-[7px] w-[32%] overflow-hidden rounded-full bg-[oklch(0.92_0.015_285)] sm:block">
                          <motion.span className="block h-full origin-left rounded-full" style={{ background: r.color }} initial={{ scaleX: reduce ? r.value / 100 : 0 }} animate={{ scaleX: r.value / 100 }} transition={{ delay: 0.15 + n * motionConfig.stagger.normal, duration: 0.7, ease }} />
                        </span>
                        <span className="w-11 text-right font-mono text-[13.5px] text-ink-soft">{r.value}%</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </Rise>
    </>
  )
}

const rows: [string, string, string, string][] = [
  ['One student’s profile and marks', 'Their own', 'Their college', 'Applicants who allow it'],
  ['The whole batch', 'No', 'Their college', 'No'],
  ['Applicants to a drive', 'Own application', 'All drives', 'Their drives'],
  ['Another college', 'No', 'No', 'No'],
]

/** The limits behind "exactly what they should". */
export function WhoSees() {
  return (
    <Rise className="mt-4">
      <div className="glass scroll-thin overflow-x-auto rounded-[28px] p-3 sm:p-5" tabIndex={0} role="region" aria-label="Who can see what">
        <table className="w-full min-w-[620px] border-collapse text-left text-[15px]">
          <caption className="px-4 pb-2 pt-3 text-left text-[20px] font-semibold tracking-[-0.025em] text-ink">Who can see what</caption>
          <thead>
            <tr className="text-[13.5px] text-ink-soft">
              <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Information</span></th>
              {['Student', 'Placement cell', 'Recruiter'].map((h) => <th key={h} scope="col" className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([what, ...cells]) => (
              <tr key={what} className="border-t border-line">
                <th scope="row" className="px-4 py-3.5 font-medium text-ink">{what}</th>
                {cells.map((c, i) => <td key={i} className={`px-4 py-3.5 ${c === 'No' ? 'text-ink-mute' : 'font-medium text-[#067647]'}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="max-w-[760px] px-4 pb-3 pt-4 text-[14.5px] leading-[1.6] text-ink-soft">
          These limits are rules in the database, not settings on a screen. Resumes open through links that expire within minutes, and college and platform admins sign in with a second step. <a href="/security" className="font-medium text-brand-dark underline underline-offset-4">How we protect data</a>
        </p>
      </div>
    </Rise>
  )
}
