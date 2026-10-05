---
name: motion-design
description: The motion principles and library-selection rules for PlacementIQ. Load before adding, changing or reviewing any animation, transition, scroll effect or 3D element, to decide whether it should exist at all and which tool (Motion, GSAP, Lenis, React Three Fiber, CSS) builds it.
---

# Motion design

## 1. Purpose
Decide *whether* something should move, *why*, and *with which tool*. Every other motion skill builds on this one.

## 2. When to use
- Any new animation, transition, hover state, scroll effect, loader or 3D element.
- Reviewing a page that "feels busy" or "feels flat".

## 3. When NOT to use
- Pure layout or copy changes with no state change. Motion is not decoration.

## 4. Preferred libraries (one owner per job)
| Job | Tool | Where |
|---|---|---|
| Component entrances, exits, layout, hover, modals, toasts, route changes | Motion (`motion/react`) | `src/components/motion/*` |
| Multi-step timelines, ScrollTrigger, pinning, scrubbing, text splitting | GSAP (`src/lib/gsap.ts`) | `TextReveal`, page-level timelines |
| Smooth wheel scrolling on document-scrolling pages | Lenis | `SmoothScroll` (landing only) |
| 3D, particles, shader backgrounds | React Three Fiber + drei | `src/components/3d/*` (lazy) |
| Static glows, grain, grids, spotlights | CSS | `src/components/effects/*` |
Never use GSAP for a simple UI transition Motion can do. Never add React Spring, Auto Animate, OGL or Vanta: Motion and three already cover them.

## 5. Implementation patterns
- Tokens only: `motionConfig` in `src/lib/motion.ts` (durations, easings, springs, stagger). No ad-hoc `0.37s` or `ease: 'linear'`.
- Intensity by device: `useMotionTier()` + `intensity[tier]` (desktop full; mobile shorter distance, no cursor effects, no WebGL; `none` for reduced motion).
- Entrances slower than exits (about 1.5x). Distance scales with duration.
- One hero motion per viewport. Stagger siblings 40 to 80 ms.

## 6. Performance rules
Animate `transform` and `opacity`. Blur and clip-path sparingly. Lazy-load three.js and GSAP-heavy pages. See `performance`.

## 7. Accessibility rules
Every animation has a reduced-motion path (opacity only or none). Never hide content the user came for behind an animation. See `accessibility`.

## 8. Reusable code
```tsx
import { Reveal, Stagger, StaggerItem } from '@/components/motion' // relative: '../components/motion'
<Reveal direction="up" delay={0.1}><Card /></Reveal>
<Stagger><StaggerItem>…</StaggerItem></Stagger>
```

## 9. Anti-patterns
Parallax on everything; tilt on every card; animating on load above the fold; bounce easing on data UI; motion that delays a click's result; two libraries animating the same element.

## 10. Examples
- Good: a drawer slides in 280 ms with `easing.dramatic`, exits in 180 ms.
- Good: the landing "How it works" heading reveals word by word once, on scroll (GSAP `TextReveal`).
- Bad: every dashboard stat card floats forever.
