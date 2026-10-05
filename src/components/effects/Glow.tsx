import type { CSSProperties } from 'react'

/**
 * A soft colored light behind important content (a hero visual, a featured card). Radial gradient plus blur:
 * cheap, static, and composited once. Use one or two per viewport at most.
 */
export function Glow({ color = 'oklch(0.62 0.22 285)', size = 520, opacity = 0.45, className, style }: { color?: string; size?: number; opacity?: number; className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ${className ?? ''}`}
      style={{ width: size, height: size, opacity, background: `radial-gradient(closest-side, ${color}, transparent)`, filter: 'blur(40px)', ...style }}
    />
  )
}
