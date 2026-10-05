---
name: glassmorphism
description: Glass surfaces in PlacementIQ (glass, glass-strong, glass-dark, gradient-border classes over the aurora), legibility and performance rules for backdrop blur. Load when styling panels, cards, nav bars, modals or drawers.
---

# Glassmorphism

## 1. Purpose
Layered translucent surfaces over the aurora that give the brand its depth.

## 2. When to use
Navigation bars, sidebars, modals, drawers, hero cards, pricing cards, stat tiles over the aurora.

## 3. When NOT to use
Over busy images or text; inside long scrolling tables (use solid `.card`); stacked more than two levels; on elements that animate every frame.

## 4. Preferred libraries
Classes in `src/index.css`: `.glass` (light blur), `.glass-strong` (near-opaque, for content), `.glass-dark` (dark panels), `.gradient-border` (featured items), `.card`. Background: `Aurora` (`src/components/Page.tsx`). No glass plugins.

## 5. Implementation patterns
- Content-heavy surfaces use `.glass-strong`; decorative chrome uses `.glass`.
- Add a 1 px inner highlight (already in the classes) instead of heavy borders.
- Pair with soft tinted shadows (`--shadow-1..3`), never pure black shadows.
- Dark glass for one hero card per screen (assistant card, next-step card).

## 6. Performance rules
`backdrop-filter` re-blurs on every frame something behind it changes: keep blurred areas small and static, avoid them above animated canvases, prefer `.glass-strong` (lower blur) in scroll containers.

## 7. Accessibility rules
Check text contrast over the brightest region behind the glass; increase opacity rather than lowering text contrast; honor `prefers-reduced-transparency` by using `.glass-strong` when needed.

## 8. Reusable code
```tsx
<div className="glass-strong rounded-[22px] p-6">…</div>
<div className="gradient-border rounded-[24px]"><div className="glass-strong rounded-[24px] p-6">Featured</div></div>
```

## 9. Anti-patterns
Glass on a plain white background (no depth); blur over video; three nested glass layers; glass buttons inside glass cards inside glass modals.

## 10. Examples
Topbar and sidebar (`.glass`), pricing "Pro" card (`.gradient-border` + `.glass-strong`), assistant drawer header (`.glass-dark`).
