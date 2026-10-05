import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useMemo, type ElementType, type ReactNode } from 'react'
import { intensity, motionConfig, useMotionTier } from '../../lib/motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

export type RevealProps = {
  children: ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  /** Travel in px before the per-device intensity is applied. */
  distance?: number
  /** Start scale (1 = none). */
  scale?: number
  /** Start blur in px (0 = none). Blur is costly: use on a few large elements only. */
  blur?: number
  /** Reveal when this share of the element is visible, or 'some'. */
  amount?: number | 'some' | 'all'
  once?: boolean
  /** Animate on mount instead of on scroll into view (above-the-fold content). */
  onMount?: boolean
  as?: ElementType
  className?: string
}

const offset = (d: Direction, px: number) =>
  d === 'up' ? { y: px } : d === 'down' ? { y: -px } : d === 'left' ? { x: px } : d === 'right' ? { x: -px } : {}

/**
 * The base entrance primitive. Transform and opacity only; blur and scale are opt-in.
 * Reduced motion gets a short opacity fade, so content is never hidden behind an animation.
 */
export function Reveal({
  children, direction = 'up', delay = 0, duration = motionConfig.duration.normal, distance = motionConfig.distance.md,
  scale = 1, blur = 0, amount = 0.2, once = true, onMount = false, as = 'div', className,
}: RevealProps) {
  const reduce = useReducedMotion()
  const tier = useMotionTier()
  const px = distance * intensity[tier].distance
  const variants: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: motionConfig.duration.fast, delay } } }
    : {
        hidden: { opacity: 0, scale, filter: blur ? `blur(${blur}px)` : undefined, ...offset(direction, px) },
        show: { opacity: 1, x: 0, y: 0, scale: 1, filter: blur ? 'blur(0px)' : undefined, transition: { duration, delay, ease: motionConfig.easing.dramatic } },
      }
  // Create the motion component once per tag; creating it every render would remount the subtree.
  const Tag = useMemo(() => motion.create(as), [as])
  const trigger = onMount ? { animate: 'show' } : { whileInView: 'show', viewport: { once, amount, margin: '0px 0px -8% 0px' } }
  return (
    <Tag initial="hidden" variants={variants} className={className} {...trigger}>
      {children}
    </Tag>
  )
}

export const FadeIn = (p: Omit<RevealProps, 'direction'>) => <Reveal {...p} direction="none" />
export const ScaleIn = (p: Omit<RevealProps, 'scale'>) => <Reveal direction="none" {...p} scale={0.94} />
export const BlurReveal = (p: Omit<RevealProps, 'blur'>) => <Reveal direction="none" duration={motionConfig.duration.slow} {...p} blur={12} />
