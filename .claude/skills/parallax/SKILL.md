---
name: parallax
description: Scroll and pointer parallax in PlacementIQ (Parallax component, speed ranges, layering, per-device intensity). Load before giving any element depth through differential movement.
---

# Parallax

## 1. Purpose
Suggest depth by moving layers at different speeds, for a handful of layers on marketing pages.

## 2. When to use
Hero visuals, background shapes behind a section, a product image drifting slightly against its text.

## 3. When NOT to use
Text blocks people read, app pages, lists, more than three layers per section, low-power and reduced-motion devices (the component disables itself).

## 4. Preferred libraries
`Parallax` (Motion `useScroll` + `useTransform`) for scroll; Motion values for pointer parallax (see `ProductPreview` tilt in `Landing.tsx`). GSAP ScrollTrigger only inside a larger timeline.

## 5. Implementation patterns
- `speed` 0.1 to 0.5; background layers higher, foreground near 0.
- Intensity scales with `intensity[tier].parallax` (desktop 1, mobile 0.35, low-power 0).
- Pointer parallax: map pointer to ±6 to 10 degrees or ±12 px with a spring.

## 6. Performance rules
`transform` only; `will-change: transform` only on the moving layer; no parallax on elements with `backdrop-filter`.

## 7. Accessibility rules
No essential content in moving layers; reduced motion gets static layout.

## 8. Reusable code
```tsx
<Parallax speed={0.3}><img src="/hero-shape.webp" alt="" /></Parallax>
```

## 9. Anti-patterns
Parallax on every image; opposite-direction layers that cause motion sickness; parallax inside scroll containers.

## 10. Examples
`src/components/motion/Parallax.tsx`; Landing `ProductPreview` pointer tilt.
