---
name: 3d-interactions
description: Pointer, scroll and hover interaction with 3D objects in PlacementIQ (look-at-pointer, damped follow, scroll-linked camera, hover states) without blocking the page. Load when making a 3D element respond to the user.
---

# 3D interactions

## 1. Purpose
Make 3D feel alive and physical while the page underneath stays fully usable.

## 2. When to use
Hero objects that lean toward the pointer, models that turn as you scroll, hover distortion on images.

## 3. When NOT to use
Touch devices (no hover; use a slow idle motion instead), reduced motion, anything that changes meaning (3D stays decorative).

## 4. Preferred libraries
R3F `useFrame` with `state.pointer` (normalized −1..1, tracked by R3F on the canvas), drei `Float`, Motion's `useScroll` for scroll progress passed in as a value.

## 5. Implementation patterns
- Damped follow: `rot += (target - rot) * Math.min(1, delta * k)`; k 2 to 4.
- Keep the canvas `pointer-events: none` and read `pointer` from R3F (it still receives window pointer moves when `eventSource` is the page) or pass pointer from a Motion value.
- Scroll: compute progress outside (Motion `useScroll`) and read it in `useFrame` through a ref.
- Hover on 3D meshes only when `Scene interactive` is set; give an HTML equivalent.

## 6. Performance rules
No raycasting every frame on large scenes; throttle hover checks; never trigger React renders from `useFrame`.

## 7. Accessibility rules
Interactions are enhancements; the page must work identically without them. Respect `intensity[tier].cursor`.

## 8. Reusable code
```tsx
useFrame(({ pointer }, delta) => {
  const k = Math.min(1, delta * 3)
  group.current.rotation.y += (pointer.x * 0.35 - group.current.rotation.y) * k
  group.current.rotation.x += (-pointer.y * 0.18 - group.current.rotation.x) * k
})
```

## 9. Anti-patterns
OrbitControls capturing the wheel on a scrolling page; instant (undamped) snaps to the pointer; dragging required to see content.

## 10. Examples
`GradientSphere` (leans with the pointer), `InteractiveModel` (look-at-pointer GLB), `DistortionImage` (hover falloff).
