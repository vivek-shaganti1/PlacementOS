---
name: react-three-fiber
description: The React Three Fiber architecture in PlacementIQ (Scene wrapper, lazy scenes, drei helpers, postprocessing, frame loop, device tiers, dev tuning with Leva). Load before adding or editing any 3D scene or Canvas.
---

# React Three Fiber

## 1. Purpose
Declarative three.js in React with automatic disposal and a shared frame loop.

## 2. When to use
3D backgrounds, the brand orb, particles, product-style hero objects, image distortion planes.

## 3. When NOT to use
Inside the signed-in app pages; on mobile or low-power tiers (render the static fallback); for effects CSS can do.

## 4. Preferred libraries
`@react-three/fiber@8` (React 18; v9 needs React 19), `@react-three/drei@9`, `@react-three/postprocessing@2` + `postprocessing@6`. Dev-only tuning: `leva` (devDependency, loaded through `import.meta.env.DEV` dynamic import, never in production).

## 5. Implementation patterns
- Every scene renders inside `Scene` (`src/components/3d/Scene.tsx`): capped DPR per tier, `PerformanceMonitor` + `AdaptiveDpr`, IntersectionObserver pause, transparent, `aria-hidden`, pointer-events off by default.
- Scene modules are default exports loaded with `React.lazy`; the page decides with `intensity[tier].webgl` and renders a CSS `Glow` fallback otherwise.
- Animate in `useFrame` by mutating refs or uniforms, never with `setState`.
- Postprocessing only on the `full` tier, `multisampling={0}`, few passes (Bloom + Vignette).
- Tune live with `?tune` on the landing page (Leva panel, dev server only).

## 6. Performance rules
Keep the three chunk lazy: never import `src/components/3d/*` from a statically imported module. Delta-time everything (`useFrame((s, delta) => …)`). Lower `detail` and particle counts per tier.

## 7. Accessibility rules
Decorative canvases are `aria-hidden` and non-interactive; interactive ones need a non-3D way to do the same thing.

## 8. Reusable code
```tsx
const HeroScene = lazy(() => import('../components/3d/HeroScene'))
{intensity[tier].webgl ? (
  <Suspense fallback={<Glow size={560} />}><HeroScene className="h-full w-full" /></Suspense>
) : <Glow size={560} />}
```

## 9. Anti-patterns
Multiple Canvases on one page (share one); `frameloop="always"` for static scenes (use `"demand"` + `invalidate()`); OrbitControls on a marketing hero; forgetting the fallback.

## 10. Examples
`src/components/3d/HeroScene.tsx`, `src/components/3d/DistortionImage.tsx`, `src/components/3d/HeroTuning.tsx`.
