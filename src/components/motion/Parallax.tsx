import { motion, useScroll, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { intensity, useMotionTier } from '../../lib/motion'

/**
 * Moves its child vertically as it crosses the viewport. speed 0.1 to 0.5: positive drifts up (feels further away).
 * Scroll-linked through Motion's shared scroll observer (no per-element listeners). Off on low-power and reduced motion.
 */
export function Parallax({ children, speed = 0.3, className }: { children: ReactNode; speed?: number; className?: string }) {
  const tier = useMotionTier()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const range = 160 * speed * intensity[tier].parallax
  const y = useTransform(scrollYProgress, [0, 1], [range, -range])
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y: range ? y : 0, willChange: range ? 'transform' : undefined }}>{children}</motion.div>
    </div>
  )
}
