import { motion, useScroll, useSpring } from 'motion/react'
import type { RefObject } from 'react'

/**
 * Thin reading-progress bar. Tracks the document by default, or a scroll container via `container`.
 * Purely visual (aria-hidden); it does not replace landmarks or a table of contents.
 */
export function ScrollProgress({ container, className }: { container?: RefObject<HTMLElement>; className?: string }) {
  const { scrollYProgress } = useScroll(container ? { container } : undefined)
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className={className ?? 'fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-[#6d4aff] via-[#38bdf8] to-[#8ef5d9]'}
    />
  )
}
