import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/**
 * Liquid glass over ordinary page content (the nav pill), where the WebGL stage cannot see what is behind it.
 * An SVG displacement filter bends the real page under the pill's edge, with the same falloff as the stage's glass
 * (adapted from liquid-glass-js, MIT; see THIRD_PARTY_NOTICES.md). Only Chromium applies SVG filters to a backdrop, so every
 * other browser keeps the plain frosted `.lq-nav` style, as does reduced transparency.
 */
const chromium = () => typeof navigator !== 'undefined' && !!(navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.some((b) => b.brand === 'Chromium')

/** Red and green hold the x and y shift for each pixel: none in the middle, rising towards the rounded edge. */
function displacement(w: number, h: number): string | null {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  const img = ctx.createImageData(w, h)
  const r = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5
      const dx = px - Math.max(r, Math.min(w - r, px))
      const dy = y + 0.5 - r
      const len = Math.hypot(dx, dy) || 1
      const inside = Math.max(0, r - len)
      const bend = Math.min(1, Math.exp(-inside * 0.13) * 0.8 + Math.exp(-inside * 0.5) * 0.35)
      const i = (y * w + x) * 4
      img.data[i] = 128 - (dx / len) * bend * 127
      img.data[i + 1] = 128 - (dy / len) * bend * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c.toDataURL()
}

export function LiquidGlass({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = `lg${useId().replace(/:/g, '')}`
  const [map, setMap] = useState<{ url: string; w: number; h: number } | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !chromium() || window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return
    const measure = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      const url = w > 8 && h > 8 ? displacement(w, h) : null
      setMap(url ? { url, w, h } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className={`lq-nav ${className ?? ''}`} style={map ? { backdropFilter: `url(#${id}) blur(3px) saturate(150%)` } : undefined}>
      {map && (
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id={id} x="0" y="0" width={map.w} height={map.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feImage href={map.url} x="0" y="0" width={map.w} height={map.h} result="m" preserveAspectRatio="none" />
            <feDisplacementMap in="SourceGraphic" in2="m" scale="46" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      {children}
    </div>
  )
}
