---
name: cursor-effects
description: Cursor-driven effects in PlacementIQ (CursorFollower glow, Spotlight on cards, custom cursor rules). Load before adding anything that reacts to the mouse position.
---

# Cursor effects

## 1. Purpose
Subtle light that follows the pointer to add depth to marketing surfaces.

## 2. When to use
Landing page background glow, spotlight on feature/pricing cards.

## 3. When NOT to use
Touch devices, reduced motion, low-power devices, the signed-in app, replacing the system cursor (never hide the native cursor).

## 4. Preferred libraries
`CursorFollower` (Motion springs, one passive window listener), `Spotlight` (CSS variables updated on pointermove, no re-render). Both check `intensity[tier].cursor`.

## 5. Implementation patterns
- One `CursorFollower` per page, low alpha (≤ 0.2), large (400+ px), behind content (`z-0`, `pointer-events: none`).
- `Spotlight` wraps a card: radial gradient at `var(--sx) var(--sy)`, fades in on hover.
- Mouse only: ignore pen/touch (`pointerType !== 'mouse'`).

## 6. Performance rules
Passive listeners; Motion values or CSS variables, never React state per move; no `mix-blend-mode` on large fixed layers over complex content.

## 7. Accessibility rules
Never required to discover content; keyboard focus gets an equivalent highlight (focus ring); nothing hides the native cursor.

## 8. Reusable code
```tsx
<CursorFollower size={420} color="rgba(124,92,255,0.18)" />
<Spotlight className="card rounded-[24px] p-6">…</Spotlight>
```

## 9. Anti-patterns
Custom cursors with lag; blob cursors covering link text; multiple followers; following on mobile.

## 10. Examples
Landing page `CursorFollower`; `src/components/effects/Spotlight.tsx`.
