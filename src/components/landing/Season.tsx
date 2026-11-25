import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'

const Row = ({ a, b, tag, tone = 'text-ink-soft' }: { a: string; b?: string; tag?: string; tone?: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
    <p className="min-w-0 truncate text-[14px] font-medium text-ink">{a}{b && <span className="ml-2 font-normal text-ink-soft">{b}</span>}</p>
    {tag && <span className={`shrink-0 text-[13px] font-medium ${tone}`}>{tag}</span>}
  </div>
)

const Sheet = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-[24px] bg-white p-5 shadow-pop sm:p-6">
    <p className="mb-1.5 text-[13px] text-ink-soft">{title}</p>
    {children}
  </div>
)

const ok = 'text-[#067647]'
const steps: { who: string; title: string; body: string; visual: ReactNode }[] = [
  {
    who: 'The college',
    title: 'adds its students',
    body: 'Upload the student list once. Only people on it can sign in, so there is nothing to police later.',
    visual: <Sheet title="Student list"><Row a="22CS104" b="Computer Science, A" tag="Invited" /><Row a="22EC031" b="Electronics, B" tag="Joined" tone={ok} /><Row a="22ME077" b="Mechanical, A" tag="Joined" tone={ok} /></Sheet>,
  },
  {
    who: 'The student',
    title: 'shows what they can do',
    body: 'Marks come from the college. Skills are backed by a resume, GitHub, coding profiles, certificates or a GATE score, so a claim and a proof never look the same.',
    visual: <Sheet title="Evidence"><Row a="CGPA" b="7.6" tag="From the college" tone={ok} /><Row a="Data structures" b="72" tag="Proved by coding profile" tone={ok} /><Row a="System design" b="58" tag="Self-reported" tone="text-[#93370d]" /></Sheet>,
  },
  {
    who: 'PlacementIQ',
    title: 'answers for every company',
    body: 'Eligible, nearly, can become or not yet, each with the exact checks behind it and the next thing worth fixing.',
    visual: <Sheet title="Company A, software engineer"><Row a="CGPA 7.0 or above" tag="Met" tone={ok} /><Row a="No active backlogs" tag="Met" tone={ok} /><Row a="System design 62" tag="4 short" tone="text-[#93370d]" /></Sheet>,
  },
  {
    who: 'The college',
    title: 'posts a drive',
    body: 'Set the criteria once. The placement cell sees who qualifies straight away, by branch and section, and eligible students can apply.',
    visual: <Sheet title="Drive: Company A, 12 LPA"><Row a="Criteria" b="CGPA 7.0, no backlogs, CSE and ECE" /><Row a="Who qualifies" tag="Listed by section" /><Row a="Applications" tag="Arriving live" tone={ok} /></Sheet>,
  },
  {
    who: 'The recruiter',
    title: 'shortlists',
    body: 'They open a ranked list of the people who applied to their drive and nobody else. The student sees the status change.',
    visual: <Sheet title="Applicants, ranked"><Row a="22EC031" b="91% match" tag="Shortlisted" tone={ok} /><Row a="22CS104" b="84% match" tag="Under review" /><Row a="22CS118" b="79% match" tag="Under review" /></Sheet>,
  },
]

/** A placement season in five moves. The thread between them fills as the reader goes; every step is readable without it. */
export function Season() {
  const ref = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 65%', 'end 60%'] })
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1])
  return (
    <>
    <ol ref={ref} className="relative mt-14 space-y-14 pl-9 md:space-y-20 md:pl-0">
      <span aria-hidden className="absolute bottom-0 left-[7px] !mt-0 top-2 w-[6px] rounded-full bg-[oklch(0.6_0.05_285/.2)] md:left-1/2 md:-ml-[3px]" />
      <motion.span aria-hidden style={{ scaleY: reduce ? 1 : fill }} className="absolute bottom-0 left-[7px] !mt-0 top-2 w-[6px] origin-top rounded-full bg-[linear-gradient(180deg,#6d4aff,#38bdf8_50%,#5fdcc0)] md:left-1/2 md:-ml-[3px]" />
      {steps.map((s, i) => (
        <li key={i} className="relative grid grid-cols-1 items-center gap-5 md:grid-cols-2 md:gap-28">
          <span aria-hidden className="absolute -left-9 top-1 h-5 w-5 rounded-full border-[5px] border-white bg-ink shadow-card md:left-1/2 md:top-1/2 md:-ml-[10px] md:-mt-[10px]" />
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-12% 0px' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className={i % 2 ? 'md:order-2' : 'md:text-right'}>
            <h3 className="text-[clamp(1.4rem,1.1rem+1.1vw,2rem)] font-semibold leading-[1.15] tracking-[-0.03em] text-ink">
              <span className="text-brand-dark">{s.who}</span> {s.title}
            </h3>
            <p className={`mt-3 max-w-[440px] text-[16px] leading-[1.6] text-ink-soft ${i % 2 ? '' : 'md:ml-auto'}`}>{s.body}</p>
          </motion.div>
          <motion.div initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-12% 0px' }} transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} className={i % 2 ? 'md:order-1' : ''}>
            {s.visual}
          </motion.div>
        </li>
      ))}
    </ol>
    <p className="mt-12 text-[13.5px] text-ink-soft md:text-center">The panels above are examples, not real students or companies.</p>
    </>
  )
}
