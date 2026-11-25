import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Canvas, type CanvasProps } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { intensity, useMotionTier } from '../../lib/motion'

/**
 * The one Canvas wrapper for every 3D scene.
 * - Pixel ratio capped per device tier, and lowered further at runtime if frames drop (PerformanceMonitor).
 * - Renders only while on screen: the frame loop stops when the canvas scrolls away (IntersectionObserver).
 * - Transparent and pointer-events none by default, so it never blocks the page or keyboard focus.
 * - R3F disposes geometries and materials declared in JSX on unmount; dispose anything you create imperatively.
 * Callers must lazy-load the module that renders this, and render a static fallback when WebGL is off.
 */
export function Scene({ children, className, camera = { position: [0, 0, 5], fov: 40 }, interactive = false, maxDpr = 2, ...rest }: { children: ReactNode; className?: string; interactive?: boolean; maxDpr?: number } & Omit<CanvasProps, 'children'>) {
  const tier = useMotionTier()
  const wrap = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  // A full-screen shader costs four times as much at a pixel ratio of 2 and looks the same; its scene passes a lower cap.
  const top = Math.min(intensity[tier].dpr[1], maxDpr)
  const [dpr, setDpr] = useState(top)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={wrap} aria-hidden className={className} style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
      <Canvas
        dpr={[intensity[tier].dpr[0], dpr]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: tier === 'full', alpha: true, powerPreference: 'high-performance' }}
        camera={camera}
        {...rest}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(top)} />
        <AdaptiveDpr pixelated={false} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  )
}
