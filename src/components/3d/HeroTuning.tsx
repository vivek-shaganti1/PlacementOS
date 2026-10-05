import { useControls } from 'leva'
import { useEffect } from 'react'

export type HeroParams = { amp: number; particles: number; bloom: number }

/**
 * Dev-only Leva panel for tuning the hero scene live (open the landing page with ?tune).
 * Loaded through a dynamic import guarded by import.meta.env.DEV, so leva never ships to production.
 */
export default function HeroTuning({ onChange }: { onChange: (p: HeroParams) => void }) {
  const p = useControls('Hero scene', { amp: { value: 0.2, min: 0, max: 0.6, step: 0.01 }, particles: { value: 700, min: 0, max: 3000, step: 50 }, bloom: { value: 0.45, min: 0, max: 2, step: 0.05 } })
  useEffect(() => onChange(p), [p, onChange])
  return null
}
