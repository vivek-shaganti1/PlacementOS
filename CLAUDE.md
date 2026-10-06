# PlacementIQ: working rules for Claude

PlacementIQ is a multi-college placement platform: students (rostered by their college), placement-cell admins (one college),
company recruiters (added by a college; see only applicants to their own drives) and platform admins (all colleges). Stack: Vite 5 + React 18 + TypeScript + Tailwind 3 + react-router 6, Supabase (Postgres
with RLS, Auth, Storage), Vercel edge functions in `api/`, Groq for AI.

## Commands
- `npm run dev`: Vite on port 5199 (also serves `api/*` locally).
- `npm run build`: `tsc -b` (app) + `tsc -p tsconfig.api.json` (functions) + `vite build`. This is the typecheck; there is no separate lint step.
- After any visual or dependency change, run the build and check the chunk rules in the `performance` skill.

## Product invariants (never break these)
- Access is role based and enforced in the database: `user_roles` (`super_admin`, `org_admin`, `recruiter`), roster-only student access
  (`org_students`), allowlist trigger on `auth.users`. UI checks are convenience only.
- The Supabase secret key, Groq key and database password never go into `VITE_*` variables or committed files.
- AI calls go through `consumeAi()` (plan quota) before the model call.
- Pricing numbers live only in `src/lib/pricing.ts`.
- Predictions (expected CTC, interview readiness, what-if) live in `src/lib/predict.ts` and must stay explainable: every number
  is a documented function of the student's own data.

## Design philosophy
The product should feel premium, cinematic, modern, fluid, responsive, interactive, sophisticated, fast, minimal and
intentional. Priority order: **hierarchy → storytelling → interaction → motion → performance**.
- Do not add an animation because it is possible. Every animation needs a purpose: orient, give feedback, show a change, or
  direct attention.
- The signed-in app is a working tool: quick, quiet motion (entrances, feedback, transitions). The landing page is where
  cinematic scroll, 3D and cursor effects live.
- Create an original visual language on the existing system (glass over aurora, violet/sky/mint, Geist + Instrument Serif).
  Do not copy another site.

## Library ownership (one owner per job)
| Job | Use | Not |
|---|---|---|
| Component entrances/exits, layout, hover, modals, drawers, toasts, route transitions | Motion (`motion/react`) | GSAP |
| Timelines, ScrollTrigger, pinning, scrubbing, horizontal scroll, line/word text reveals | GSAP via `src/lib/gsap.ts` | Motion |
| Smooth wheel scrolling (document-scrolling pages only) | Lenis via `SmoothScroll` | app pages |
| 3D, particles, shader surfaces | React Three Fiber + drei (lazy) | OGL, Vanta |
| Glows, grain, grids, spotlights | CSS (`src/components/effects`) | WebGL |
| Motion graphics from designers | `@lottiefiles/dotlottie-react` (lazy, `.lottie` files) | GIF/video loops |
| Live tuning of 3D (dev only) | Leva (`?tune` on the landing page) | production code |

Not installed on purpose: `framer-motion` (Motion is its successor, already used), React Spring and Auto Animate (Motion
springs and `layout` cover them), OGL and Vanta (duplicate WebGL stacks; Vanta pins an old three), shadcn/ui and Lucide (the
app has its own token system, components and icon set; adding them would create a second design system), Spline runtime
(add `@splinetool/react-spline` lazily only when a real Spline scene exists).

## Motion system
- Tokens: `src/lib/motion.ts` (`motionConfig` durations, easings, springs, stagger, distances). Use nothing else.
- Device tiers: `useMotionTier()` → `full`, `reduced-desktop`, `mobile`, `low-power`, `none` (reduced motion);
  `intensity[tier]` gives distance, parallax, particle, DPR, cursor and WebGL settings. Mobile is its own design, not desktop
  scaled down: shorter distances, no cursor effects, no WebGL, native scrolling.
- Components (`src/components/motion`): `Reveal`, `FadeIn`, `ScaleIn`, `BlurReveal`, `Stagger`/`StaggerItem`, `Magnetic`,
  `Parallax`, `SplitText` (Motion, on mount), `TextReveal` (GSAP, on scroll), `PageTransition`, `ScrollProgress`,
  `CursorFollower`, `SmoothScroll`/`useLenis`.
- Effects (`src/components/effects`): `Aurora`, `Glow`, `Noise`, `Grid`, `Spotlight`, `Distortion` (lazy WebGL).
- 3D (`src/components/3d`): `Scene` (the only Canvas wrapper), `GradientSphere`, `ParticleField`, `FloatingObject`,
  `InteractiveModel`, `HeroScene` and `DistortionImage` (lazy default exports), `shaders/*`.
- APIs: `<Reveal direction="up" delay={0.2} duration={0.8}>`, `<Magnetic strength={0.25}>`, `<Parallax speed={0.4}>`.

## Rules for every animation
1. Transform and opacity only, unless there is a reason (then keep it small: blur ≤ 12 px, short clip-paths).
2. Entrances 0.3 to 0.8 s with `easing.dramatic`; exits about two thirds of that. Interactions ≤ 180 ms.
3. One hero motion per viewport; stagger siblings 40 to 80 ms.
4. Reduced motion: opacity-only or instant. All provided components already do this; custom code must too.
5. GSAP code always inside `useGSAP` with `gsap.matchMedia()`; three.js objects created imperatively are disposed.
6. Never animate on load above the fold in the app; never delay the result of a click.

## Assets
- Images: AVIF or WebP, sized to the slot, `loading="lazy"` and `decoding="async"` below the fold; SVG for icons and logos.
- Video: H.264/HEVC + WebM, muted, `playsInline`, poster frame, no autoplay with sound, under ~3 MB for loops.
- Lottie: `.lottie` (dotLottie) under ~150 kB, lazy-loaded.
- 3D: `.glb` with Draco or Meshopt compression, KTX2/WebP textures, under ~1.5 MB per scene, in `public/models`.
- Fonts: Geist and Instrument Serif from Google Fonts with `display=swap`; no new families without a reason.

## Performance budgets
- Entry JS must not import the three or GSAP chunks (check `dist/assets/index-*.js` after building).
- three.js only through lazily imported scenes; GSAP only in marketing pages.
- No `setState` per frame or per pointer move; use Motion values, refs or CSS variables.
- Respect `prefers-reduced-motion`, pause off-screen work, cap DPR, reduce particles on mobile.

## Accessibility
Content is never hidden behind an animation, focus is always visible and managed on route changes, decorative visuals are
`aria-hidden`, no flashing above 3 Hz, touch never depends on hover. See the `accessibility` skill.

## Skills
Project skills in `.claude/skills/`: `motion-design` (start here), `premium-ui`, `framer-motion`, `gsap`, `smooth-scroll`,
`threejs`, `react-three-fiber`, `webgl`, `shaders`, `3d-interactions`, `cinematic-scroll`, `micro-interactions`,
`page-transitions`, `magnetic-effects`, `parallax`, `particle-effects`, `cursor-effects`, `glassmorphism`,
`typography-animation`, `performance`, `accessibility`.

## Before finishing any change
1. `npm run build` passes.
2. Entry chunk does not import three or GSAP.
3. Reduced motion, mobile width and keyboard navigation checked in the browser.
4. No console errors or React warnings introduced; no leftover dev mocks (`src/dev/` must not exist in commits).
