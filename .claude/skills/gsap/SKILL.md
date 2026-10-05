---
name: gsap
description: How to use GSAP, ScrollTrigger and SplitText in PlacementIQ for timelines, cinematic sequences, pinned and scrubbed scroll sections and text splitting, with correct React cleanup. Load before writing any gsap code.
---

# GSAP

## 1. Purpose
Choreography Motion is not built for: sequenced timelines, ScrollTrigger pinning and scrubbing, horizontal scroll, line/word/char text splitting.

## 2. When to use
Hero sequences with several actors, pinned storytelling sections, scrubbed progress, `TextReveal` headings, horizontal galleries.

## 3. When NOT to use
Hover, press, modal, list or route transitions (Motion). Anything inside the signed-in app (it scrolls in containers and should stay light).

## 4. Preferred libraries
Import only from `src/lib/gsap.ts`: `gsap`, `ScrollTrigger`, `SplitText`, `useGSAP`, `MM`. Plugins are registered there once. All GSAP plugins are free for commercial use since 3.13.

## 5. Implementation patterns
- Always `useGSAP(() => { … }, { scope: ref })` so selectors are scoped and everything reverts on unmount.
- Wrap in `gsap.matchMedia()` with `MM.motion` / `MM.desktop` / `MM.mobile` so reduced motion and mobile get their own branch.
- One ScrollTrigger per section, not per element; use a timeline with `scrollTrigger` on the section.
- `SplitText.create(el, { type: 'lines,words', mask: 'lines', aria: 'auto' })` and `split.revert()` in cleanup.
- Lenis drives the ticker (`SmoothScroll`), so ScrollTrigger stays in sync automatically.

## 6. Performance rules
Animate transforms (`x`, `y`, `scale`, `rotation`, `yPercent`) and `opacity`. `scrub: 0.5` to 1 rather than `true` for smoothness. Avoid `pin` on mobile. Kill timelines you create outside `useGSAP`.

## 7. Accessibility rules
Reduced-motion branch shows the final state immediately (`gsap.set` or no animation). Pinned sections must not trap keyboard scrolling; keep pin durations short. Split text keeps an `aria-label` on the parent.

## 8. Reusable code
```tsx
const ref = useRef<HTMLElement>(null)
useGSAP(() => {
  const mm = gsap.matchMedia()
  mm.add(MM.desktop, () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=120%', scrub: 0.6, pin: true } })
    tl.from('.panel', { yPercent: 30, opacity: 0, stagger: 0.2 })
  })
  return () => mm.revert()
}, { scope: ref })
```

## 9. Anti-patterns
`gsap.to` in a plain `useEffect` without cleanup; importing from 'gsap' directly in components; ScrollTrigger on every card; animating the same element with Motion and GSAP; `markers: true` committed.

## 10. Examples
`src/components/motion/TextReveal.tsx` (SplitText + ScrollTrigger), `src/components/motion/SmoothScroll.tsx` (ticker sync).
