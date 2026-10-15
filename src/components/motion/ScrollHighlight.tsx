import { useRef, type ElementType, type ReactNode } from 'react'
import { gsap, MM, SplitText, useGSAP } from '../../lib/gsap'

/**
 * Manifesto-style reading highlight: words start faint and become full ink as the block scrolls through the viewport.
 * GSAP owns it because it is scrubbed to scroll. Reduced motion shows the text at full contrast.
 * Use for one statement paragraph per page, never for body copy the reader needs to scan.
 */
export function ScrollHighlight({ children, as: Tag = 'p', className }: { children: ReactNode; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MM.motion, () => {
        if (!ref.current) return
        const split = SplitText.create(ref.current, { type: 'words', aria: 'auto' })
        gsap.fromTo(
          split.words,
          { opacity: 0.18 },
          { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: ref.current, start: 'top 80%', end: 'bottom 45%', scrub: 0.4 } },
        )
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
