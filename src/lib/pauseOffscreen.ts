import { useEffect, type RefObject } from 'react'

/**
 * Pauses looping CSS animations while their element is off-screen. A decorative loop that nobody can see still costs a
 * repaint every frame (a spinning gradient border, a panning grid), which shows up as dropped frames while scrolling.
 * Elements matching `selector` inside `root` get `data-offscreen` while out of view; index.css pauses on that attribute.
 */
export function usePauseOffscreen(root: RefObject<HTMLElement>, selector: string) {
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.target as HTMLElement).toggleAttribute('data-offscreen', !e.isIntersecting)
      },
      { rootMargin: '80px' },
    )
    const seen = new WeakSet<Element>()
    const scan = () => {
      for (const node of el.querySelectorAll(selector)) {
        if (seen.has(node)) continue
        seen.add(node)
        io.observe(node)
      }
    }
    scan()
    // Sections that mount later (lazy chunks, client-only previews) are picked up too; scans are batched per frame.
    let queued = 0
    const mo = new MutationObserver(() => {
      if (queued) return
      queued = requestAnimationFrame(() => {
        queued = 0
        scan()
      })
    })
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      if (queued) cancelAnimationFrame(queued)
    }
  }, [root, selector])
}
