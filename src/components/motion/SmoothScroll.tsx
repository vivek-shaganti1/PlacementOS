import Lenis from 'lenis'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'

const LenisCtx = createContext<Lenis | null>(null)
/** The page's Lenis instance (null when smooth scrolling is off). Use `lenis?.scrollTo(target)` for in-page links. */
export const useLenis = () => useContext(LenisCtx)

/**
 * Smooth scrolling for document-scrolling pages (the landing page). The signed-in app scrolls inside its own
 * containers and does not use this. Disabled for reduced motion and touch devices, which keep native scrolling.
 * Lenis is driven by GSAP's ticker so ScrollTrigger and Lenis share one frame loop.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (reduce || touch) return
    const l = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: { offset: -88 } })
    l.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => l.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    setLenis(l)
    return () => {
      gsap.ticker.remove(tick)
      l.destroy()
      setLenis(null)
    }
  }, [])

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}
