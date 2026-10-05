import { motion, useReducedMotion, type Variants } from 'motion/react'
import type { ElementType } from 'react'
import { motionConfig } from '../../lib/motion'

/**
 * Per-word or per-character entrance on mount, done with Motion (no GSAP needed). For hero headlines above the fold.
 * Screen readers get the full string once (aria-label); the animated pieces are hidden from them.
 * For scroll-triggered or line-based reveals use <TextReveal> (GSAP SplitText) instead.
 */
export function SplitText({
  text, by = 'words', as: Tag = 'span', delay = 0, stagger = motionConfig.stagger.tight, className,
}: { text: string; by?: 'words' | 'chars'; as?: ElementType; delay?: number; stagger?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <Tag className={className}>{text}</Tag>
  const parts = by === 'words' ? text.split(/(\s+)/) : Array.from(text)
  const item: Variants = {
    hidden: { opacity: 0, y: '0.6em', filter: 'blur(6px)' },
    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: motionConfig.duration.normal, ease: motionConfig.easing.dramatic } },
  }
  return (
    <Tag className={className} aria-label={text}>
      <motion.span aria-hidden initial="hidden" animate="show" transition={{ staggerChildren: stagger, delayChildren: delay }} style={{ display: 'inline' }}>
        {parts.map((p, i) =>
          /^\s+$/.test(p) ? (
            <span key={i}>{p}</span>
          ) : (
            <motion.span key={i} variants={item} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
              {p}
            </motion.span>
          ),
        )}
      </motion.span>
    </Tag>
  )
}
