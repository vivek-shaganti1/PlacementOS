import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

/**
 * A label that changes state (Apply Now → Applied, Save → Saved). The old and new text crossfade with a 2px blur so the
 * eye reads one morph instead of two words overlapping. 180ms ease-out; reduced motion keeps the fade, drops the movement.
 * Import from this file directly (the motion index also exports GSAP components, which must stay out of app chunks).
 */
export function SwapText({ text }: { text: string }) {
  const reduce = useReducedMotion()
  const move = reduce ? 0 : 4
  return (
    <span className="relative inline-grid">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={text}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ opacity: 0, filter: 'blur(2px)', transform: `translateY(${move}px)` }}
          animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)', transform: `translateY(${-move}px)` }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
