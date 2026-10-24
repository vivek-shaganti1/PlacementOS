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
    const l = new Lenis({ lerp: 0.1, smoothWheel: true })
    l.on('scroll', ScrollTrigger.update)
    // In-page anchors: Lenis' own `anchors` option measured targets relative to the current scroll position, so every
    // jump after the first overshot by scrollY. Resolve the absolute position ourselves and scroll to that number.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      const id = a?.getAttribute('href')?.slice(1)
      const el = id ? document.getElementById(decodeURIComponent(id)) : null
      if (!el) return
      e.preventDefault()
      l.scrollTo(el.getBoundingClientRect().top + window.scrollY - 88)
      history.replaceState(null, '', `#${id}`)
    }
    document.addEventListener('click', onClick)
    const tick = (time: number) => l.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    setLenis(l)
    return () => {
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(tick)
      l.destroy()
      setLenis(null)
    }
  }, [])

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}
