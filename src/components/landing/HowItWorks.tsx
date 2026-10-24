import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useRef } from 'react'
import { IconRoadmap, IconSpark, IconStacks, IconUser } from '../Icons'
import { companyCatalog } from '../../data/companies'
import { coreCatalog } from '../../data/coreCompanies'

const RECRUITERS = companyCatalog.length + coreCatalog.length

const steps = [
  { title: 'Create your profile', body: 'Academics, skills, projects and internships, stored in structured tables that only you can read.', Icon: IconUser, meta: '2 min' },
  { title: 'Connect your evidence', body: 'Upload your resume and link what proves your branch: design files on GitHub, Credly badges, NPTEL certificates, a GATE scorecard, coding platforms.', Icon: IconSpark, meta: '9 sources' },
  { title: `Get scored against ${RECRUITERS} recruiters`, body: 'Software, VLSI, embedded, power, mechanical, civil, chemical and more. You see your match, stack and exact gaps.', Icon: IconStacks, meta: '< 1 ms' },
  { title: 'Close gaps and apply', body: 'Follow the roadmap, practise, log mocks, tailor your resume per job, and track every application.', Icon: IconRoadmap, meta: 'every drive' },
]

/** One step: lights up when the scroll-linked progress line reaches it (Motion values, no re-render per frame). */
function Step({ i, progress, reduce }: { i: number; progress: MotionValue<number>; reduce: boolean | null }) {
  const at = i / (steps.length - 1)
  const lit = useTransform(progress, [Math.max(0, at - 0.12), at], [0, 1])
  const opacity = useTransform(lit, [0, 1], [0.45, 1])
  const glow = useTransform(lit, [0, 1], ['0 0 0 0 rgba(109,74,255,0)', '0 0 0 8px rgba(109,74,255,.12), 0 12px 30px rgba(109,74,255,.35)'])
  const { title, body, Icon, meta } = steps[i]
  return (
    <motion.div style={reduce ? undefined : { opacity }} className="relative">
      <motion.span style={reduce ? undefined : { boxShadow: glow }} className="glass-strong relative z-10 grid h-14 w-14 place-items-center rounded-[18px] text-brand-dark">
        <Icon className="h-5 w-5" />
        <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full bg-[oklch(0.2_0.045_285)] px-1.5 font-mono text-[10px] text-white">0{i + 1}</span>
      </motion.span>
      <p className="mt-5 text-[16px] font-semibold tracking-[-0.02em]">{title}</p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-mute">{body}</p>
      <span className="mt-3 inline-block rounded-full bg-white/70 px-2.5 py-1 font-mono text-[10.5px] text-ink-soft ring-1 ring-line">{meta}</span>
    </motion.div>
  )
}

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 55%'] })
  return (
    <div ref={ref} className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-5">
      {/* Track and the part already travelled. */}
      <span aria-hidden className="absolute left-[28px] right-[12%] top-[27px] hidden h-[2px] rounded-full bg-[oklch(0.6_0.05_285/.15)] md:block" />
      <motion.span
        aria-hidden
        style={{ scaleX: reduce ? 1 : scrollYProgress }}
        className="absolute left-[28px] right-[12%] top-[27px] hidden h-[2px] origin-left rounded-full bg-gradient-to-r from-[#6d4aff] via-[#38bdf8] to-[#8ef5d9] md:block"
      />
      {steps.map((_, i) => (
        <Step key={i} i={i} progress={scrollYProgress} reduce={reduce} />
      ))}
    </div>
  )
}
