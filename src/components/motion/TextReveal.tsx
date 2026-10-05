import { useRef, type ElementType, type ReactNode } from 'react'
import { gsap, MM, SplitText, useGSAP } from '../../lib/gsap'

/**
 * Scroll-triggered text reveal with GSAP SplitText (lines, words or characters rising out of a mask).
 * SplitText keeps the original text available to screen readers (aria-label on the parent, split pieces hidden).
 * Reduced motion shows the text as is. Use on headings only; never on body copy.
 */
export function TextReveal({
  children, as: Tag = 'h2', by = 'words', stagger = 0.05, duration = 0.9, start = 'top 85%', scrub = false, className,
}: {
  children: ReactNode
  as?: ElementType
  by?: 'lines' | 'words' | 'chars'
  stagger?: number
  duration?: number
  /** ScrollTrigger start position. */
  start?: string
  /** Tie progress to scroll position instead of playing once. */
  scrub?: boolean
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MM.motion, () => {
        if (!ref.current) return
        const split = SplitText.create(ref.current, { type: `lines,${by}`, mask: 'lines', aria: 'auto' })
        const pieces = by === 'lines' ? split.lines : by === 'chars' ? split.chars : split.words
        gsap.from(pieces, {
          yPercent: 110,
          opacity: 0,
          stagger,
          duration,
          ease: 'expo.out',
          scrollTrigger: { trigger: ref.current, start, scrub: scrub ? 0.6 : false, once: !scrub },
        })
        return () => split.revert()
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
