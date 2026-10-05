/**
 * Film-grain overlay from an inline SVG turbulence filter: no image request, no canvas.
 * Static by design (animated grain costs a repaint every frame). Decorative, so hidden from assistive tech.
 */
export function Noise({ opacity = 0.06, className }: { opacity?: number; className?: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 mix-blend-overlay ${className ?? ''}`}
      style={{ opacity, backgroundImage: `url("data:image/svg+xml;utf8,${svg}")` }}
    />
  )
}
