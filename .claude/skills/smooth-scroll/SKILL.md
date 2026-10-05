---
name: smooth-scroll
description: Lenis smooth scrolling in PlacementIQ, where it is allowed (document-scrolling marketing pages), how it syncs with GSAP ScrollTrigger, and how to scroll programmatically. Load before touching scrolling behavior, anchors or scroll-linked effects.
---

# Smooth scroll (Lenis)

## 1. Purpose
Inertial wheel scrolling that makes scroll-linked effects feel continuous.

## 2. When to use
The landing page and future marketing pages that scroll the document.

## 3. When NOT to use
The signed-in app (it scrolls inside `<main>` containers), modals, drawers, chat panes, tables. Touch devices and reduced motion keep native scrolling (handled inside `SmoothScroll`).

## 4. Preferred libraries
`lenis` via `src/components/motion/SmoothScroll.tsx`. Do not add `locomotive-scroll` or GSAP ScrollSmoother.

## 5. Implementation patterns
- Wrap the page once: `<SmoothScroll>…</SmoothScroll>`.
- Lenis is driven by `gsap.ticker` and calls `ScrollTrigger.update` on scroll, so do not start a second RAF loop.
- In-page anchors work (`anchors: { offset: -88 }` for the sticky nav). For code: `const lenis = useLenis(); lenis?.scrollTo('#pricing')`.
- Elements that must scroll natively inside a Lenis page: add `data-lenis-prevent`.

## 6. Performance rules
`lerp: 0.1` is the ceiling; lower feels floaty and hides jank. Never read layout in a scroll callback; use ScrollTrigger or Motion's `useScroll`.

## 7. Accessibility rules
Keyboard scrolling, find-in-page, and screen-reader navigation must keep working (Lenis keeps native scroll position). Disabled under `prefers-reduced-motion`.

## 8. Reusable code
```tsx
<SmoothScroll>
  <Landing />
</SmoothScroll>
// inside: const lenis = useLenis(); onClick={() => lenis ? lenis.scrollTo('#how') : document.getElementById('how')?.scrollIntoView()}
```

## 9. Anti-patterns
Smooth scroll on app pages with nested scroll containers; scroll-jacking (snapping sections that fight the wheel); `overflow: hidden` on html; two Lenis instances.

## 10. Examples
`src/pages/Landing.tsx` (wrapped), `src/components/motion/SmoothScroll.tsx`.
