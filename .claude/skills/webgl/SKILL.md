---
name: webgl
description: When WebGL is the right tool in PlacementIQ versus CSS or Canvas 2D, how capability and device tiers gate it, and how to keep contexts, fallbacks and bundle size under control. Load before adding any canvas-based visual.
---

# WebGL

## 1. Purpose
Decide if a visual needs the GPU, and ship it so it never hurts first paint, mobile batteries or users without WebGL.

## 2. When to use
Effects CSS cannot do well: noise-driven surfaces, thousands of particles, image displacement, real 3D depth.

## 3. When NOT to use
Gradients, glows, blur, grain, simple parallax, charts (Recharts), anything in the signed-in app.

## 4. Preferred libraries
Through React Three Fiber only (`src/components/3d/Scene.tsx`). No raw `getContext('webgl')` code, no OGL (a second WebGL stack), no Vanta.

## 5. Implementation patterns
- Gate with `intensity[useMotionTier()].webgl` (false on mobile, low-power and reduced motion).
- Lazy-load the scene module; show the CSS fallback during Suspense and when gated off.
- One WebGL context per page. Browsers cap contexts (about 16); every `Canvas` is one.
- Handle context loss by letting R3F recreate; never store GL state outside React.

## 6. Performance rules
three lives in its own lazily loaded chunk (`three-*.js` ~ 220 kB gzip): verify after changes that the entry chunk does not import it (`grep 'from"./three-' dist/assets/index-*.js` must be empty). Keep shaders short, avoid dependent texture reads in loops, cap DPR.

## 7. Accessibility rules
Canvas content is decorative and `aria-hidden`; the same information exists as HTML. No flashing above 3 Hz.

## 8. Reusable code
```tsx
const tier = useMotionTier()
return intensity[tier].webgl ? <Suspense fallback={<Glow />}><LazyScene /></Suspense> : <Glow />
```

## 9. Anti-patterns
WebGL backgrounds on every section; loading three on the login page; a canvas that blocks clicks; no fallback when WebGL is disabled.

## 10. Examples
Landing hero orb (`HeroScene`), `effects/Distortion` (lazy WebGL image with plain `<img>` fallback).
