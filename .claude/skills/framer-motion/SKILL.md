---
name: framer-motion
description: How to use Motion (motion/react, the successor of Framer Motion) in PlacementIQ for entrances, exits, layout, gestures and UI state. Load when writing any component animation, AnimatePresence, variants, layout animation or scroll-linked Motion value.
---

# Motion (Framer Motion)

## 1. Purpose
Declarative UI animation tied to React state. Package is `motion` (v14), import from `motion/react`. Do not install `framer-motion`; it is the same library under its old name.

## 2. When to use
Entrances and exits, modals and drawers, toasts, tab and list changes, layout shifts, hover and press, route transitions, simple scroll-linked values (`useScroll` + `useTransform`).

## 3. When NOT to use
Multi-scene timelines, pinned scroll sequences, scrubbing, text splitting by line: use GSAP. 3D: use R3F.

## 4. Preferred libraries
`motion/react` only. Tokens from `src/lib/motion.ts`. Prebuilt: `Reveal`, `FadeIn`, `ScaleIn`, `BlurReveal`, `Stagger`, `StaggerItem`, `Magnetic`, `Parallax`, `SplitText`, `PageTransition`, `ScrollProgress`, `CursorFollower` in `src/components/motion`.

## 5. Implementation patterns
- Variants for anything with children; `staggerChildren` on the parent.
- `AnimatePresence` with a stable `key`; `mode="wait"` only for route-like swaps.
- `layout` / `layoutId` for shared-element moves (the sidebar `nav-pill` uses `layoutId`).
- `whileInView` with `viewport={{ once: true, amount: 0.2 }}` for scroll entrances.
- `useReducedMotion()` to switch to opacity-only.

## 6. Performance rules
Motion values (`useMotionValue`, `useSpring`, `useTransform`) update styles without re-rendering React: use them for pointer and scroll. Never `setState` on every pointermove. `motion.create(Tag)` must be memoized (see `Reveal`).

## 7. Accessibility rules
Reduced motion: no translate/scale/blur, short opacity only. Do not animate focus outlines away. Exiting elements must not stay focusable.

## 8. Reusable code
```tsx
const reduce = useReducedMotion()
<motion.div
  initial={{ opacity: 0, y: reduce ? 0 : 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: reduce ? 0 : -8, transition: { duration: motionConfig.duration.fast * 0.6 } }}
  transition={{ duration: motionConfig.duration.normal, ease: motionConfig.easing.dramatic }}
/>
```

## 9. Anti-patterns
Inline objects re-created per render as `transition` on hot components (hoist them); animating `width/height` (use `layout` or scale); nesting many `whileInView` children instead of one `Stagger`; springs with bounce on data values.

## 10. Examples
`src/components/AssistantDrawer.tsx` (drawer), `src/App.tsx` toast, `src/components/Sidebar.tsx` (`layoutId` pill), `src/components/motion/Reveal.tsx`.
