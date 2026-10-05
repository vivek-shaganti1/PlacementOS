import { useEffect, useState } from 'react'

/**
 * Motion tokens: the only durations, easings and springs animations should use.
 * Motion (motion/react) takes seconds and bezier arrays; GSAP takes seconds and the string eases below.
 */
export const motionConfig = {
  duration: { instant: 0.15, fast: 0.3, normal: 0.6, slow: 1.0, cinematic: 1.5 },
  easing: {
    /** The app's workhorse: fast out, long settle. */
    smooth: [0.22, 1, 0.36, 1] as const,
    /** Entrances and reveals. */
    dramatic: [0.16, 1, 0.3, 1] as const,
    /** Moves between two on-screen states. */
    inOut: [0.65, 0, 0.35, 1] as const,
    /** Exits get out of the way. */
    exit: [0.7, 0, 0.84, 0] as const,
  },
  gsapEase: { smooth: 'expo.out', dramatic: 'expo.out', inOut: 'power3.inOut', exit: 'power3.in' },
  spring: {
    gentle: { type: 'spring', stiffness: 120, damping: 20 } as const,
    snappy: { type: 'spring', stiffness: 300, damping: 25 } as const,
    magnetic: { type: 'spring', stiffness: 220, damping: 18, mass: 0.6 } as const,
  },
  stagger: { tight: 0.04, normal: 0.07, loose: 0.12 },
  distance: { sm: 12, md: 24, lg: 48 },
} as const

export type MotionTier = 'full' | 'reduced-desktop' | 'mobile' | 'low-power' | 'none'

/**
 * How much motion this device should get. Mobile is its own design, not desktop scaled down:
 * no cursor effects, no 3D, shorter distances. `none` means the user asked for reduced motion.
 */
export function detectMotionTier(): MotionTier {
  if (typeof window === 'undefined') return 'none'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'none'
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.matchMedia('(max-width: 767px)').matches
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const lowPower = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || !!nav.connection?.saveData
  if (narrow || coarse) return lowPower ? 'low-power' : 'mobile'
  if (lowPower) return 'reduced-desktop'
  return 'full'
}

/** Live motion tier; updates when the reduced-motion preference or viewport changes. */
export function useMotionTier(): MotionTier {
  const [tier, setTier] = useState<MotionTier>(() => detectMotionTier())
  useEffect(() => {
    const queries = ['(prefers-reduced-motion: reduce)', '(max-width: 767px)', '(pointer: coarse)'].map((q) => window.matchMedia(q))
    const update = () => setTier(detectMotionTier())
    queries.forEach((q) => q.addEventListener('change', update))
    return () => queries.forEach((q) => q.removeEventListener('change', update))
  }, [])
  return tier
}

/** Per-tier intensity knobs used by the motion, effects and 3D components. */
export const intensity: Record<MotionTier, { distance: number; parallax: number; particles: number; dpr: [number, number]; cursor: boolean; webgl: boolean }> = {
  full: { distance: 1, parallax: 1, particles: 1, dpr: [1, 2], cursor: true, webgl: true },
  'reduced-desktop': { distance: 0.8, parallax: 0.6, particles: 0.4, dpr: [1, 1.25], cursor: true, webgl: true },
  mobile: { distance: 0.6, parallax: 0.35, particles: 0.25, dpr: [1, 1.5], cursor: false, webgl: false },
  'low-power': { distance: 0.5, parallax: 0, particles: 0, dpr: [1, 1], cursor: false, webgl: false },
  none: { distance: 0, parallax: 0, particles: 0, dpr: [1, 1], cursor: false, webgl: false },
}
