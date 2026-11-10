# Architecture (rebuilt from code, e1ee372)

- Frontend: Vite 5.4.21, React 18.3.1, TypeScript 5.9.3, Tailwind 3, react-router-dom 6.30.6; lazy routes; signed-in Shell with 25 pages; scoring in the browser (src/lib).
- API: 8 Vercel edge functions (account, admin, chat, connect, health, password, resume, signup) + api/_lib.ts. Caller's token forwarded to PostgREST (RLS applies). Secret key used by insertVerified, saveServerField, rosterName, refundAi, admin, account, password, signup.
- Supabase: Postgres with RLS on every public table, Auth (password, reset, invite links), Storage (resumes private, avatars public). Browser reaches it via same-origin /supabase rewrite to the production project. No Realtime.
- External: Groq; GitHub API and raw content; LeetCode; Codeforces; CodeChef; Credly; Hugging Face; CTFtime; NPTEL; Google Fonts.
- Build: tsc, vite build, scripts/prerender.mjs (no network; backend stubbed) producing index, privacy, terms, security, app.html, 404.html.
- Deploy: Vercel with pinned build command; strict CSP; noindex on app routes; migrations pasted by hand.

Trust boundaries: browser/CDN; browser to Vercel to Supabase proxy; browser to /api; edge functions with the secret key; edge to Groq; edge to third-party evidence sites; Auth email links; operator to production database; CI to GitHub; developer machine (.env with keys).
