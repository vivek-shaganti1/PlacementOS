---
name: magnetic-effects
description: Magnetic buttons and pointer-attracted elements in PlacementIQ (Magnetic component, strength ranges, where they belong). Load before making any element follow or lean toward the pointer.
---

# Magnetic effects

## 1. Purpose
A tactile pull on the one or two calls to action that matter most on a marketing page.

## 2. When to use
Primary CTAs on the landing page ("Get started", "Start free"), a hero logo, a featured pricing button.

## 3. When NOT to use
Forms, tables, navigation lists, the signed-in app, touch devices, reduced motion (the component already renders a plain wrapper there), more than two per viewport.

## 4. Preferred libraries
`Magnetic` (`src/components/motion/Magnetic.tsx`): Motion springs (`motionConfig.spring.magnetic`), no GSAP.

## 5. Implementation patterns
- Wrap the button, not the button's text: `<Magnetic><Link className="btn-primary">…</Link></Magnetic>`.
- Strength 0.15 to 0.35. Larger elements get smaller strength.
- Optional inner parallax: move the label at a slightly higher factor than the button for depth.

## 6. Performance rules
Pointer handlers update Motion values only (no React state). One element listens; no window listeners.

## 7. Accessibility rules
Focus ring stays on the real button; the hit area never moves away from the cursor faster than it can follow; disabled on `pointer: coarse` and reduced motion.

## 8. Reusable code
```tsx
<Magnetic strength={0.2}>
  <Link to="/signup" className="btn-primary">Get started</Link>
</Magnetic>
```

## 9. Anti-patterns
Magnetic nav links; strengths above 0.5; magnetic + tilt + glow on the same element.

## 10. Examples
Landing nav "Get started" and hero "Start free".
