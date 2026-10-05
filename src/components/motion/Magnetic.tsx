import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef, type PointerEvent, type ReactNode } from 'react'
import { intensity, motionConfig, useMotionTier } from '../../lib/motion'

/**
 * Pulls its child toward the pointer while hovered, then springs back. Pointer devices only:
 * on touch and reduced motion it renders the child untouched. Keep strength between 0.15 and 0.35.
 */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const tier = useMotionTier()
  const ref = useRef<HTMLSpanElement>(null)
  const x = useSpring(useMotionValue(0), motionConfig.spring.magnetic)
  const y = useSpring(useMotionValue(0), motionConfig.spring.magnetic)
  if (!intensity[tier].cursor) return <span className={className}>{children}</span>

  const move = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - (r.left + r.width / 2)) * strength)
    y.set((e.clientY - (r.top + r.height / 2)) * strength)
  }
  const leave = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <motion.span ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ x, y, display: 'inline-flex' }} className={className}>
      {children}
    </motion.span>
  )
}
