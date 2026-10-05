---
name: particle-effects
description: Particle systems in PlacementIQ (GPU point fields in R3F, counts per device tier, drift and twinkle shaders, CSS alternatives). Load before adding particles, dust, stars or data-stream visuals.
---

# Particle effects

## 1. Purpose
Atmosphere and a sense of "data in motion" behind hero content, never in front of it.

## 2. When to use
Landing hero backdrop, an AI/processing illustration, a celebratory but rare moment.

## 3. When NOT to use
App pages, behind body text, on mobile/low-power tiers (counts go to 25% / 0), as loading indicators.

## 4. Preferred libraries
`ParticleField` (`src/components/3d/ParticleField.tsx`): one `Points` draw call, shader-driven motion. For a few dozen sparkles without WebGL, CSS-animated dots are fine.

## 5. Implementation patterns
- Count = base × `intensity[tier].particles` (desktop 700 to 1000).
- Motion in the vertex shader (`particles.ts`): sine drift + per-point seed; twinkle via alpha.
- Additive blending, `depthWrite={false}`, soft round sprites by distance in the fragment shader.
- Pointer influence through a damped `uMouse` uniform.

## 6. Performance rules
One geometry, built once, disposed on unmount. Never update positions on the CPU each frame. Under 5,000 points on desktop.

## 7. Accessibility rules
Decorative (`aria-hidden`), slow, low contrast against text; off for reduced motion.

## 8. Reusable code
```tsx
<Scene><ParticleField count={700} color="#a993ff" spread={[9, 5, 4]} /></Scene>
```

## 9. Anti-patterns
DOM-node particles (hundreds of divs); particles over readable text; bright white particles on light backgrounds.

## 10. Examples
`HeroScene` particle field behind the brand orb.
