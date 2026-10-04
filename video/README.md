# PlacementIQ film

A 100-second product film rendered with [Remotion](https://remotion.dev) from real PlacementIQ screens.

1. Run the app locally (`npm run dev` in the repo root, port 5199) with the dev-only sample-data backend enabled.
2. `CHROME=<path to chrome-headless-shell> node capture.mjs` captures every screen at 2x into `public/shots/`.
3. `python3 scripts/audio.py` synthesizes the score and sound effects; narration lines are generated with macOS `say`
   (voice Samantha) into `public/audio/vo/`.
4. `npm run studio` to preview, `npm run render` to export `out/placementiq-film.mp4`.

Scenes, timings, camera moves and the narration schedule live in `src/Film.tsx`; shared pieces (browser frame, cursor,
camera, particles, logo, type) in `src/kit.tsx`.
