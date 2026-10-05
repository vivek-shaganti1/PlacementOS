/**
 * GSAP entry point. Import gsap, ScrollTrigger, SplitText and useGSAP from here, never from 'gsap' directly,
 * so plugins are registered exactly once and tree-shaking stays predictable.
 * GSAP (including ScrollTrigger and SplitText) is free for commercial use since 3.13.
 */
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP)
gsap.defaults({ ease: 'expo.out', duration: 0.8 })

export { gsap, ScrollTrigger, SplitText, useGSAP }

/** gsap.matchMedia conditions shared by every timeline: write one branch per motion intent. */
export const MM = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
} as const
