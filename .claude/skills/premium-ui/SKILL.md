---
name: premium-ui
description: Visual design rules that make PlacementIQ screens feel premium (hierarchy, type, spacing, color, depth, glass surfaces) before any motion is added. Load when building or restyling any page, section, card, form or marketing block.
---

# Premium UI

## 1. Purpose
Make the static frame excellent first. Most of "premium" is hierarchy, type and spacing, not effects.

## 2. When to use
New pages, landing sections, dashboards, empty states, pricing, forms, any restyle.

## 3. When NOT to use
Data-dense admin tables where clarity beats atmosphere: keep them plain, readable, and fast.

## 4. Preferred libraries
Tailwind 3 (tokens in `tailwind.config.js`, components in `src/index.css`: `.glass`, `.glass-strong`, `.glass-dark`, `.card`, `.btn-primary`, `.btn-glass`, `.field`, `.text-gradient`). Existing primitives in `src/components/Page.tsx` (`Page`, `Card`, `Stat`, `Meter`, `Ring`, `Aurora`). Icons: `src/components/Icons.tsx`. Fonts: Geist (UI) and Instrument Serif (display accents).
No shadcn/ui: it would introduce a second token system and component style. Build on the classes above.

## 5. Implementation patterns
- One accent family (brand violet `#6d4aff`, sky `#38bdf8`, mint `#8ef5d9`), one radius scale (12 / 14 / 18 / 22 / 28), one shadow model (`--shadow-1..3`).
- Headline scale with `clamp()`; tighten tracking as size grows (`tracking-[-0.04em]` on display).
- Serif italic only for one emphasized word per headline (`font-display italic text-gradient`).
- Glass over the aurora only, never glass on glass more than two levels deep.
- 8 px spacing rhythm; generous section padding (`py-28` on landing).

## 6. Performance rules
`backdrop-filter` is expensive: avoid on long scrolling lists and on elements that animate. Prefer `.glass-strong` (opaque-ish) inside scroll containers.

## 7. Accessibility rules
Body text contrast at least 4.5:1 on its real background (check glass over the brightest aurora area). Never text over an unmasked image without a scrim. Focus rings stay visible.

## 8. Reusable code
```tsx
<section className="mx-auto max-w-[1160px] px-6 py-28">
  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-brand">Eyebrow</p>
  <h2 className="mt-3 text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
    Headline <span className="font-display font-normal italic text-gradient">accent.</span>
  </h2>
</section>
```

## 9. Anti-patterns
Purple-to-blue 45-degree hero gradients everywhere; five font sizes in one card; glass cards on a white page with nothing behind them; icon-only buttons without labels; gradients on body text.

## 10. Examples
Landing hero, pricing cards (`featured` uses `.gradient-border` + `.glass-strong`), the Organizations stat row.
