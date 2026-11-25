import { useControls } from 'leva'
import { useEffect } from 'react'

export type HeroParams = { strength: number; speed: number; tilt: number; a: string; b: string; c: string; d: string }

/**
 * Dev-only Leva panel for tuning the landing stage live (open the landing page with ?tune).
 * Loaded through a dynamic import guarded by import.meta.env.DEV, so leva never ships to production.
 */
export default function HeroTuning({ onChange }: { onChange: (p: HeroParams) => void }) {
  const p = useControls('Landing stage', {
    strength: { value: 1.1, min: 0, max: 3, step: 0.05 }, speed: { value: 1, min: 0, max: 3, step: 0.05 },
    tilt: { value: -0.5, min: -1.6, max: 0, step: 0.02 }, a: '#6d4aff', b: '#38bdf8', c: '#8ef5d9', d: '#ffc2a1',
  })
  useEffect(() => onChange(p as HeroParams), [p, onChange])
  return null
}
