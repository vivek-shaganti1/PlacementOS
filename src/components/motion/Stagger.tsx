import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { intensity, motionConfig, useMotionTier } from '../../lib/motion'

/**
 * Staggers its <StaggerItem> children into view. One observer for the whole group instead of one per child.
 */
export function Stagger({
  children, gap = motionConfig.stagger.normal, delay = 0, className, onMount = false,
}: { children: ReactNode; gap?: number; delay?: number; className?: string; onMount?: boolean }) {
  const reduce = useReducedMotion()
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : gap, delayChildren: delay } } }
  const trigger = onMount ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, amount: 0.15 } }
  return (
    <motion.div initial="hidden" variants={variants} className={className} {...trigger}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, distance = motionConfig.distance.md }: { children: ReactNode; className?: string; distance?: number }) {
  const reduce = useReducedMotion()
  const tier = useMotionTier()
  const variants: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: motionConfig.duration.fast } } }
    : {
        hidden: { opacity: 0, y: distance * intensity[tier].distance },
        show: { opacity: 1, y: 0, transition: { duration: motionConfig.duration.normal, ease: motionConfig.easing.dramatic } },
      }
  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  )
}
