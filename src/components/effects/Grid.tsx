/**
 * Hairline grid that fades out toward the edges (mask), for technical or "engineered" sections.
 * Pure CSS gradients; scales with `cell`.
 */
export function Grid({ cell = 48, color = 'rgba(109, 74, 255, 0.08)', className }: { cell?: number; color?: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className ?? ''}`}
      style={{
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${cell}px ${cell}px`,
        maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
      }}
    />
  )
}
