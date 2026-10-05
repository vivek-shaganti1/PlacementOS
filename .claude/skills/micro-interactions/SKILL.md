---
name: micro-interactions
description: Small feedback animations in PlacementIQ (buttons, inputs, toggles, tooltips, loading, success and error states, card hover and tilt, icon motion). Load when adding feedback to any interactive control.
---

# Micro-interactions

## 1. Purpose
Confirm every action within 100 ms and make state changes legible.

## 2. When to use
Buttons, links, inputs, toggles, tabs, copy-to-clipboard, save, upload, apply, toasts, skeleton-to-content swaps.

## 3. When NOT to use
On things that are not interactive (no hover lift on static cards); repeated forever (no idle pulsing on dashboards).

## 4. Preferred libraries
CSS transitions for hover/active color and shadow (`.btn-primary`, `.btn-glass` already include them). Motion for press scale, state swaps (`AnimatePresence`), and layout. `Magnetic` for primary CTAs on marketing pages only.

## 5. Implementation patterns
- Press: `active:scale-[.98]` (CSS) or `whileTap={{ scale: 0.97 }}`.
- Hover: 120 to 180 ms, color/shadow/translateY(-1px). Never more than 4 px of movement.
- Loading: disable the control, keep its width, swap the label (`Saving…`); skeletons (`RowsSkeleton`) for content.
- Success/error: toast via `useApp().showToast`, inline field message with `role="alert"` for errors.
- Card tilt: only on marketing cards, max 6 to 8 degrees, sprung back (see `ProductPreview` in Landing).
- Icons: rotate/translate a few px on hover (`group-hover:translate-x-0.5`).

## 6. Performance rules
CSS for hover where possible (no JS). Motion values for pointer-driven effects. No layout-affecting hover.

## 7. Accessibility rules
Every hover effect has a `:focus-visible` equivalent. Status changes announced (`role="status"` toast, `aria-live`). Disabled states remain readable. Touch has no hover: never hide actions behind hover.

## 8. Reusable code
```tsx
<motion.button whileTap={{ scale: 0.97 }} transition={motionConfig.spring.snappy} className="btn-primary" disabled={busy}>
  {busy ? 'Saving…' : 'Save'}
</motion.button>
```

## 9. Anti-patterns
Magnetic buttons inside forms or tables; confetti for routine saves; spinners replacing content that could show a skeleton; shaking inputs without a text explanation.

## 10. Examples
`Magnetic` on landing CTAs, roster inline section edit (toast on save), `LoginMethod` radio swap, assistant typing indicator.
