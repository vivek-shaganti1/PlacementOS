import { motion, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motionConfig } from '../../lib/motion'

export type TransitionKind = 'fade' | 'rise' | 'scale' | 'blur' | 'clip' | 'slide'

// Entrances only. Navigation happens tens of times a day, so the old page leaves instantly and nothing waits for an
// exit animation (that delayed every click by the exit's duration). Movement stays tiny and short.
const KINDS: Record<TransitionKind, Variants> = {
  fade: { initial: { opacity: 0 }, enter: { opacity: 1 } },
  rise: { initial: { opacity: 0, transform: 'translateY(4px)' }, enter: { opacity: 1, transform: 'translateY(0px)' } },
  scale: { initial: { opacity: 0, transform: 'scale(0.995)' }, enter: { opacity: 1, transform: 'scale(1)' } },
  blur: { initial: { opacity: 0, filter: 'blur(4px)' }, enter: { opacity: 1, filter: 'blur(0px)' } },
  clip: { initial: { clipPath: 'inset(0 0 100% 0)' }, enter: { clipPath: 'inset(0 0 0% 0)' } },
  slide: { initial: { opacity: 0, transform: 'translateX(8px)' }, enter: { opacity: 1, transform: 'translateX(0px)' } },
}

/**
 * Route transition wrapper. Keyed by pathname so browser back/forward animate too. The new page renders immediately
 * and fades in over 150ms (hardware-accelerated transform strings, not Motion's x/y shorthands).
 * After each navigation, focus moves to the new page's container so keyboard and screen-reader users land on the content.
 * Reduced motion swaps pages instantly.
 */
export function PageTransition({ children, kind = 'rise', className }: { children: ReactNode; kind?: TransitionKind; className?: string }) {
  const location = useLocation()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ref.current?.focus({ preventScroll: true })
  }, [location.pathname])

  const v = KINDS[kind]
  return (
    <motion.div
      key={location.pathname}
      ref={ref}
      tabIndex={-1}
      className={`outline-none ${className ?? ''}`}
      variants={reduce ? undefined : v}
      // The first page of a session appears without animation (never animate on load above the fold).
      initial={reduce || first.current ? false : 'initial'}
      animate="enter"
      transition={{ duration: 0.15, ease: motionConfig.easing.exit }}
    >
      {children}
    </motion.div>
  )
}
