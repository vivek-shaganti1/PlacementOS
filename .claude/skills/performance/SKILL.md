---
name: performance
description: Performance budgets and checks for PlacementIQ animation, 3D and assets (60 fps rules, bundle and chunk checks, lazy loading, device tiers, memory and cleanup). Load before shipping any visual change and whenever something feels janky or the bundle grows.
---

# Performance

## 1. Purpose
Keep the app fast on mid-range Android phones and college lab PCs while the marketing pages stay rich.

## 2. When to use
Every visual change; every new dependency; any jank, battery or memory report.

## 3. When NOT to use
Never skip it.

## 4. Preferred libraries
Browser DevTools (Performance, Rendering > Paint flashing, Layers), `npm run build` chunk report, R3F `PerformanceMonitor` (already in `Scene`).

## 5. Implementation patterns
- Animate `transform` and `opacity`; avoid `width/height/top/left/margin/box-shadow` animation.
- Device tiers (`useMotionTier`): mobile and low-power get lighter motion, no WebGL, no cursor effects.
- Lazy-load: three.js scenes (`React.lazy`), heavy pages (already lazy in `App.tsx`), GSAP stays in the Landing chunk.
- IntersectionObserver to pause off-screen work (`Scene` pauses its frame loop).
- Passive listeners; one listener per concern; Motion values instead of state for continuous input.

## 6. Performance rules (budgets)
- Entry JS (index + react + supabase) must not grow by more than 10 kB gzip per feature.
- After `npm run build`, the entry chunk must not import `three-*.js` or the GSAP chunk:
  `grep -l 'from"./three-' dist/assets/index-*.js` returns nothing.
- three chunk is loaded only by `HeroScene` / `DistortionImage`.
- Interaction to next paint under 200 ms; no long tasks over 50 ms during scroll.
- Images: AVIF/WebP, sized to their slot, `loading="lazy"` below the fold. Models: compressed `.glb` < 1.5 MB.
- Cleanup: GSAP via `useGSAP`/`matchMedia().revert()`, Lenis `destroy()`, three `dispose()` for imperative objects.

## 7. Accessibility rules
Performance work must not remove reduced-motion paths or fallbacks.

## 8. Reusable code
```ts
const tier = useMotionTier()
const count = Math.round(900 * intensity[tier].particles)
```

## 9. Anti-patterns
Manual chunks that pull shared deps into the three chunk (this happened once: React's scheduler and `buffer` ended up preloading three on every page; chunking is now left to Rollup with readable names only); `setState` in `pointermove`; un-disposed geometries; `backdrop-filter` over animated canvases.

## 10. Examples
`vite.config.ts` (`chunkFileNames`), `src/components/3d/Scene.tsx`, `src/lib/motion.ts` (`intensity`).
