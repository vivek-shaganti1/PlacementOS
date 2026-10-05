---
name: cinematic-scroll
description: Scroll-driven storytelling in PlacementIQ marketing pages (reveals, pinned sections, horizontal scroll, image scale and mask, scroll-linked gradients, section transitions) with the right tool for each. Load when designing how a page unfolds as the user scrolls.
---

# Cinematic scroll

## 1. Purpose
Let a page tell a story in the order the user scrolls, with one clear focus per screen.

## 2. When to use
Landing and future marketing pages: feature walkthroughs, "how it works", product reveals.

## 3. When NOT to use
App pages and forms; any page users scan quickly for one value.

## 4. Preferred libraries
| Effect | Tool |
|---|---|
| Fade/rise reveals | Motion `Reveal`, `Stagger` |
| Parallax layers | Motion `Parallax` |
| Reading progress | Motion `ScrollProgress` |
| Pinned sequences, scrubbed timelines, horizontal scroll | GSAP ScrollTrigger |
| Line/word reveals | GSAP `TextReveal` |
| Smoothness | Lenis `SmoothScroll` |

## 5. Implementation patterns
- One pinned section per page at most; pin length 100 to 200% of viewport.
- Image scale and mask: `clipPath: inset()` or `scale` scrubbed from 0.9 to 1.
- Horizontal scroll: pin the section, translate the track by `-(track.scrollWidth - innerWidth)` with `scrub`.
- Scroll-linked gradient: Motion `useScroll` + `useTransform` to a CSS variable.
- Build desktop and mobile timelines separately with `gsap.matchMedia` (`MM.desktop` / `MM.mobile`); mobile gets simple reveals, no pinning.

## 6. Performance rules
Few ScrollTriggers (one per section). `will-change` only during the animation. Preload images used in scrubbed sections.

## 7. Accessibility rules
Content readable without scrolling effects (reduced motion shows final states). No scroll-jacking; keyboard and find-in-page must work.

## 8. Reusable code
```tsx
useGSAP(() => {
  const mm = gsap.matchMedia()
  mm.add(MM.desktop, () => {
    const track = ref.current!.querySelector('.track') as HTMLElement
    gsap.to(track, { x: () => -(track.scrollWidth - innerWidth), ease: 'none',
      scrollTrigger: { trigger: ref.current, pin: true, scrub: 0.6, end: () => '+=' + track.scrollWidth, invalidateOnRefresh: true } })
  })
  return () => mm.revert()
}, { scope: ref })
```

## 9. Anti-patterns
Every section pinned; text that only becomes readable mid-scrub; 10 parallax layers; scroll-snap combined with Lenis.

## 10. Examples
Landing: `ScrollProgress`, `Section` reveals, `TextReveal` on "How it works", hero 3D backdrop.
