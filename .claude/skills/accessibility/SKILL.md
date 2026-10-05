---
name: accessibility
description: Accessibility rules for motion, 3D and visual effects in PlacementIQ (prefers-reduced-motion, focus, screen readers, contrast, flashing, touch). Load before shipping any animation, transition, effect or interactive visual.
---

# Accessibility (motion and effects)

## 1. Purpose
Everyone gets the same content and control; motion is an enhancement, never a requirement.

## 2. When to use
Every animation, transition, scroll effect, 3D scene and visual effect.

## 3. When NOT to use
Never optional.

## 4. Preferred libraries
`useReducedMotion` (Motion), `gsap.matchMedia` with `MM.reduce`/`MM.motion`, `useMotionTier` (`none` when reduced motion is set), semantic HTML.

## 5. Implementation patterns
- `@media (prefers-reduced-motion: reduce)`: opacity-only or instant; no parallax, smooth scroll, magnetic, cursor or WebGL (all components here already switch off).
- Route changes move focus to the new page container (`PageTransition`).
- Split text exposes the whole string (`aria-label`) and hides pieces.
- Decorative visuals: `aria-hidden`, `pointer-events: none`.
- Status changes: toasts use `role="status"`; errors `role="alert"`.
- Touch: no hover-only information or actions.

## 6. Performance rules
Jank is an accessibility issue for vestibular users: keep motion smooth or remove it.

## 7. Accessibility rules
- Text contrast ≥ 4.5:1 (≥ 3:1 for 24 px+), including over glass and aurora.
- Nothing flashes more than 3 times per second.
- Content is never hidden until an animation finishes; if JS fails, text is visible.
- Keyboard: every interactive element reachable, visible focus ring, no focus traps (drawers and modals return focus).
- Animations under 5 s or pausable; no infinite motion near reading content.

## 8. Reusable code
```tsx
const reduce = useReducedMotion()
<motion.div initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} />
```

## 9. Anti-patterns
Ignoring reduced motion "because it is subtle"; `outline: none` without replacement; text revealed only by scroll scrubbing; autoplaying video with motion behind text.

## 10. Examples
`Reveal` (opacity-only branch), `TextReveal` (matchMedia), `SmoothScroll` (disabled when reduced), `Scene` (`aria-hidden`).
