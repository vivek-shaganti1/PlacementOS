import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { motionConfig } from '../../lib/motion'

export const reveal: Variants = {
  hidden: { opacity: 0, y: motionConfig.distance.md },
  show: { opacity: 1, y: 0, transition: { duration: motionConfig.duration.normal, ease: motionConfig.easing.dramatic } },
}
const still: Variants = { hidden: {}, show: {} }
const stagger: Variants = { show: { transition: { staggerChildren: motionConfig.stagger.normal } } }

/** One numbered section of the landing page; children wrapped in `Reveal` rise in one after another. */
export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <motion.section id={id} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger} className={`relative mx-auto max-w-[1240px] scroll-mt-20 px-5 sm:px-6 ${className ?? ''}`}>
      {children}
    </motion.section>
  )
}

export function Rise({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return <motion.div variants={reduce ? still : reveal} className={className}>{children}</motion.div>
}

/** "03 One platform, four desks" and the headline under it; `serif` for the questions. */
export function Heading({ n, label, children, body, serif = false }: { n: string; label: string; children: ReactNode; body?: ReactNode; serif?: boolean }) {
  return (
    <Rise>
      <p className="label-mono"><b>{n}</b> {label}</p>
      <h2 className={`mt-3 max-w-[900px] text-ink ${serif ? 'font-display text-[clamp(2.4rem,1.6rem+3.2vw,4.6rem)] leading-[1.02] tracking-[-0.015em]' : 'text-[clamp(2.1rem,1.4rem+2.4vw,3.6rem)] font-semibold leading-[1.06] tracking-[-0.04em]'}`}>{children}</h2>
      {body && <p className="mt-4 max-w-[660px] text-[16px] leading-[1.6] text-ink-soft">{body}</p>}
    </Rise>
  )
}

export const Accent = ({ children }: { children: ReactNode }) => (
  // The extra padding keeps the gradient from clipping the italic's overhang.
  <span className="-mr-[0.08em] pr-[0.08em] font-display font-normal italic tracking-[-0.015em] lq-accent">{children}</span>
)
