---
name: page-transitions
description: Route transitions in PlacementIQ (PageTransition kinds fade, rise, scale, blur, clip, slide), how they interact with react-router, focus management and browser history. Load when changing how pages enter or leave.
---

# Page transitions

## 1. Purpose
Make navigation feel continuous without slowing it or breaking routing, history, focus or SEO.

## 2. When to use
Switching between top-level routes in the signed-in shell; between marketing pages.

## 3. When NOT to use
Tabs, filters, drawers or anything that is not a route (use Motion `AnimatePresence` locally). Never block navigation on an animation.

## 4. Preferred libraries
`PageTransition` (`src/components/motion/PageTransition.tsx`), Motion `AnimatePresence`. Not GSAP, not the View Transitions API (no Firefox cross-document support; same-document support is uneven).

## 5. Implementation patterns
- Keyed by `location.pathname`; `mode="wait"`; `initial={false}` so the first load does not animate.
- Default `kind="rise"` (opacity + 10 px). `blur` and `clip` are heavier: marketing only.
- Exit faster than enter (handled by the shared transition duration).
- After navigation, focus moves to the page container (`tabIndex={-1}`), so keyboard and screen-reader users land on new content.
- Suspense fallbacks render inside the transition so lazy routes still animate.

## 6. Performance rules
Total transition under 350 ms. Do not mount heavy pages twice (exit completes before enter). Avoid `blur` on large app pages.

## 7. Accessibility rules
Reduced motion swaps instantly. Focus management as above. Document title updates are the page's job.

## 8. Reusable code
```tsx
<PageTransition kind="rise" className="flex min-w-0 flex-1">
  <Suspense fallback={<Loader />}><RoleRoutes /></Suspense>
</PageTransition>
```

## 9. Anti-patterns
Full-screen wipes on every app navigation; animating the sidebar and topbar on route change; transitions longer than the data load.

## 10. Examples
`src/App.tsx` shell uses `PageTransition kind="rise"`.
