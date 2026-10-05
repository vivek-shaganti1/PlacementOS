---
name: typography-animation
description: Animating text in PlacementIQ (word and character reveals, line masks, blur-to-sharp, gradient text, counters) with SplitText (Motion) and TextReveal (GSAP). Load before animating any heading, number or label.
---

# Typography animation

## 1. Purpose
Give headlines a moment of arrival and numbers a sense of progress, without ever making text hard to read.

## 2. When to use
Hero headline (on mount), section headings (on scroll), key stats (count-up), one gradient accent word.

## 3. When NOT to use
Body copy, labels, buttons, table cells, anything users read repeatedly in the app.

## 4. Preferred libraries
| Need | Tool |
|---|---|
| Words/chars on mount (above the fold) | `SplitText` (Motion) |
| Lines/words on scroll, masked | `TextReveal` (GSAP SplitText) |
| Count-up values | `AnimatedValue` in `src/components/Page.tsx` |
| Gradient accent | `.text-gradient` class |

## 5. Implementation patterns
- Words, not characters, for anything longer than ~3 words.
- Masked line reveals (`mask: 'lines'`) look most refined: text rises from below its own line.
- Blur-to-sharp up to 6 px on short headlines only.
- Stagger 30 to 60 ms; whole reveal under 1 s.

## 6. Performance rules
Split only headings (dozens of spans, not hundreds). Revert splits on unmount (`TextReveal` does). Avoid animating `letter-spacing` or `font-size`.

## 7. Accessibility rules
Screen readers must get the whole string once: `SplitText` sets `aria-label` and hides pieces; GSAP SplitText uses `aria: 'auto'`. Reduced motion renders plain text. Never animate text color to low contrast.

## 8. Reusable code
```tsx
<h1><SplitText text="Placement season, decoded." by="words" /></h1>
<TextReveal as="h2" by="words" className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] font-semibold">From sign-up to offer, in four moves.</TextReveal>
```

## 9. Anti-patterns
Typewriter effects on long copy; per-character animation of paragraphs; scrambled text that never resolves for screen readers; looping text animations.

## 10. Examples
Landing "How it works" heading (`TextReveal`), hero stats (`AnimatedValue`).
