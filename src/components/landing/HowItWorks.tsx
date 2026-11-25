import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { companyCatalog } from '../../data/companies'
import { coreCatalog } from '../../data/coreCompanies'
import { IconDrives, IconSpark, IconStacks, IconUser } from '../Icons'

const RECRUITERS = companyCatalog.length + coreCatalog.length

const steps = [
  { title: 'Create your profile', body: 'Your college adds you and records your marks. You add skills, projects and internships.', Icon: IconUser, meta: 'one profile' },
  { title: 'Connect your evidence', body: 'Upload your resume and link what proves your branch: design files on GitHub, Credly badges, NPTEL certificates, a GATE scorecard, coding platforms.', Icon: IconSpark, meta: '9 sources' },
  { title: `Get scored against ${RECRUITERS} recruiters`, body: 'Software, VLSI, embedded, power, mechanical, civil, chemical and more. You see your match, your group and the exact gaps.', Icon: IconStacks, meta: 'every change' },
  { title: 'Close gaps and apply', body: 'Follow the roadmap, practise, log mocks, tailor your resume per job, and track every application.', Icon: IconDrives, meta: 'every drive' },
]

/**
 * One step: its tile lights up when the line reaches it (Motion values, no re-render per frame). The text is always at full
 * contrast, so a step the line has not reached yet is still readable.
 */
function Step({ i, progress, reduce }: { i: number; progress: MotionValue<number>; reduce: boolean | null }) {
  const at = i / (steps.length - 1)
  const lit = useTransform(progress, [Math.max(0, at - 0.12), Math.max(0.01, at)], [i === 0 ? 1 : 0, 1])
  const scale = useTransform(lit, [0, 1], [0.92, 1])
  const { title, body, Icon, meta } = steps[i]
  return (
    <li className="relative flex gap-5 md:block">
      <motion.span style={reduce ? undefined : { scale }} className="glass-strong relative z-10 grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[20px] text-brand-dark">
        {/* The halo is its own layer, so only its opacity changes. */}
        <motion.span aria-hidden style={{ opacity: reduce ? 1 : lit }} className="absolute inset-0 rounded-[20px] shadow-[0_0_0_8px_rgba(109,74,255,.13),0_14px_34px_rgba(109,74,255,.34)]" />
        <Icon className="relative h-[22px] w-[22px]" />
        <span className="absolute -right-2.5 -top-2.5 grid h-7 min-w-7 place-items-center rounded-full bg-[oklch(0.2_0.045_285)] px-1.5 font-mono text-[11px] text-white">0{i + 1}</span>
      </motion.span>
      <div className="md:mt-6 md:pr-4">
        <h3 className="text-[18px] font-semibold leading-[1.25] tracking-[-0.022em] text-ink">{title}</h3>
        <p className="mt-2 text-[15px] leading-[1.6] text-ink-soft">{body}</p>
        <span className="mt-4 inline-block rounded-full bg-white/80 px-3 py-1.5 font-mono text-[12px] text-ink-soft ring-1 ring-line">{meta}</span>
      </div>
    </li>
  )
}

export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 78%', 'end 62%'] })
  const line = reduce ? 1 : scrollYProgress
  return (
    <ol ref={ref} className="relative mt-14 grid grid-cols-1 gap-11 md:grid-cols-4 md:gap-6">
      {/* The track and the part already travelled: across on wide screens, down on phones. */}
      <li aria-hidden className="pointer-events-none absolute inset-0 list-none" role="presentation">
        <span className="absolute left-[30px] right-[calc(25%-30px)] top-[29px] hidden h-[2px] rounded-full bg-[oklch(0.6_0.05_285/.18)] md:block" />
        <motion.span style={{ scaleX: line }} className="absolute left-[30px] right-[calc(25%-30px)] top-[29px] hidden h-[2px] origin-left rounded-full bg-gradient-to-r from-[#6d4aff] via-[#38bdf8] to-[#5fdcc0] md:block" />
        <span className="absolute bottom-24 left-[29px] top-[30px] w-[2px] rounded-full bg-[oklch(0.6_0.05_285/.18)] md:hidden" />
        <motion.span style={{ scaleY: line }} className="absolute bottom-24 left-[29px] top-[30px] w-[2px] origin-top rounded-full bg-gradient-to-b from-[#6d4aff] via-[#38bdf8] to-[#5fdcc0] md:hidden" />
      </li>
      {steps.map((_, i) => <Step key={i} i={i} progress={scrollYProgress} reduce={reduce} />)}
    </ol>
  )
}
