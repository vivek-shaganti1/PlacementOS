import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { canUseWebGL, intensity, useMotionTier } from '../../lib/motion'
import { ErrorBoundary } from '../ErrorBoundary'

// three.js loads only on devices that get WebGL, once the browser is idle after the first paint.
// Decorative: if the chunk cannot load (slow network, or a deploy replaced it), the CSS backdrop stays.
const HeroScene = lazy(() => import('../3d/HeroScene').catch(() => ({ default: (_: { className?: string; paused?: boolean; onReady?: () => void; onSlow?: () => void }) => <></> })))

const KEY = 'piq:motion-paused'

/** True once the browser has a free moment after the first paint, so heavy decoration never competes with the content. */
function useIdle() {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const t = globalThis.setTimeout(() => setIdle(true), 1200)
    return () => globalThis.clearTimeout(t)
  }, [])
  return idle
}

/** Rendered in place of the scene if it fails while running: tells the page to show its own panes again. */
function Still({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount])
  return null
}

/**
 * The backdrop of the top of the page. A still CSS gradient is always there (prerender, phones, reduced motion, no WebGL);
 * where the device allows it, the liquid stage draws over it and takes over the panes marked `data-lq`.
 */
export function Stage({ children }: { children: ReactNode }) {
  const tier = useMotionTier()
  const idle = useIdle()
  const [live, setLive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [slow, setSlow] = useState(false)
  const can = idle && !slow && intensity[tier].webgl && canUseWebGL()

  useEffect(() => {
    try {
      setPaused(localStorage.getItem(KEY) === '1')
    } catch {
      /* storage blocked: motion stays on */
    }
  }, [])
  const start = useCallback(() => setLive(true), [])
  const stop = useCallback(() => setSlow(true), [])
  const still = useCallback(() => setLive(false), [])
  useEffect(() => {
    if (!can) setLive(false)
  }, [can])
  // Everything else that loops (the aurora, the prism, the roles tabs) follows the same switch.
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? 'paused' : 'on'
    return () => void delete document.documentElement.dataset.motion
  }, [paused])
  const toggle = () =>
    setPaused((p) => {
      try {
        localStorage.setItem(KEY, p ? '0' : '1')
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return !p
    })

  return (
    <div data-stage-root data-stage={live ? 'live' : 'still'} className="relative">
      {/* The outer box ends with the stage, so the sticky backdrop leaves with it instead of spilling into the next section. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="lq-fade absolute inset-0">
          <div className="lq-still sticky top-0 h-[calc(100svh/var(--z))] w-full" />
        </div>
        <div className="sticky top-0 h-[calc(100svh/var(--z))] w-full overflow-hidden">
          {can && (
            <ErrorBoundary fallback={<Still onMount={still} />}>
              <Suspense fallback={null}>
                <HeroScene className={`absolute inset-0 transition-opacity duration-1000 ${live ? 'opacity-100' : 'opacity-0'}`} paused={paused} onReady={start} onSlow={stop} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>
      <div className="relative z-10">{children}</div>
      {tier !== 'none' && (
        <div className="absolute inset-x-0 top-[80px] z-20 mx-auto flex max-w-[1240px] justify-end px-5 sm:px-6">
          <button type="button" onClick={toggle} aria-pressed={paused} className="rounded-full bg-white/55 px-3 py-1.5 text-[12.5px] font-medium text-ink hover:bg-white">
            {paused ? 'Play background' : 'Pause background'}
          </button>
        </div>
      )}
    </div>
  )
}
