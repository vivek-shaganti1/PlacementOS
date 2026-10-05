import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motionConfig } from '../../lib/motion'

export type TransitionKind = 'fade' | 'rise' | 'scale' | 'blur' | 'clip' | 'slide'

const KINDS: Record<TransitionKind, Variants> = {
  fade: { initial: { opacity: 0 }, enter: { opacity: 1 }, exit: { opacity: 0 } },
  rise: { initial: { opacity: 0, y: 10 }, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } },
  scale: { initial: { opacity: 0, scale: 0.985 }, enter: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.01 } },
  blur: { initial: { opacity: 0, filter: 'blur(8px)' }, enter: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(4px)' } },
  clip: { initial: { clipPath: 'inset(0 0 100% 0)' }, enter: { clipPath: 'inset(0 0 0% 0)' }, exit: { opacity: 0 } },
  slide: { initial: { opacity: 0, x: 24 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -16 } },
}

/**
 * Route transition wrapper. Keyed by pathname so browser back/forward animate too; exits are faster than entrances.
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
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        ref={ref}
        tabIndex={-1}
        className={`outline-none ${className ?? ''}`}
        variants={reduce ? undefined : v}
        initial={reduce ? false : 'initial'}
        animate="enter"
        exit={reduce ? undefined : 'exit'}
        transition={{ duration: motionConfig.duration.fast + 0.02, ease: motionConfig.easing.dramatic }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
