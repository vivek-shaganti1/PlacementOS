import { useRef, type PointerEvent, type ReactNode } from 'react'
import { intensity, useMotionTier } from '../../lib/motion'

/**
 * A light that follows the pointer inside a card or panel. Writes two CSS variables on pointermove
 * (no React re-render), so it costs one style update per event. Off on touch and reduced motion.
 */
export function Spotlight({ children, className, color = 'rgba(124, 92, 255, 0.14)', size = 380 }: { children: ReactNode; className?: string; color?: string; size?: number }) {
  const tier = useMotionTier()
  const ref = useRef<HTMLDivElement>(null)
  const on = intensity[tier].cursor
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--sx', `${e.clientX - r.left}px`)
    el.style.setProperty('--sy', `${e.clientY - r.top}px`)
  }
  return (
    <div ref={ref} onPointerMove={on ? move : undefined} className={`group relative overflow-hidden ${className ?? ''}`}>
      {on && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(${size}px circle at var(--sx, 50%) var(--sy, 50%), ${color}, transparent 70%)` }}
        />
      )}
      {children}
    </div>
  )
}
