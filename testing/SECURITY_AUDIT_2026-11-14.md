# Security audit, before and after (2026-11-14)

- **Before:** `main` at `29d45b6`, the code the live site runs.
- **After:** the six open pull requests combined (#14 to #19), plus the fixes below.

Every scan ran locally on a throwaway Supabase stack with synthetic data. The only checks against production were
read-only requests a signed-out visitor could make.

The Paperclip repository (github.com/paperclipai/paperclip) was cloned to a scratch folder outside the project for
reference. It is an AI-agent orchestration app, not a scanner, so it was not installed or run. None of its files are in
this repository.

## Results

| Check | Tool | Before | After |
|---|---|---|---|
| Production dependency advisories | `npm audit --omit=dev` | 2 moderate (react-router) | **0** |
| All dependency advisories (incl. build tools) | `npm audit` | 2 high, 4 moderate | 1 high, 1 moderate (dev only, see below) |
| Mobile app dependencies | `npm audit` in `mobile/` | n/a | 3 moderate (Expo tooling, dev only) |
| Secrets in files and full git history | gitleaks 8.30.1 | 1 hit, false positive (public key) | same |
| Static analysis | Semgrep 1.181 (default, OWASP Top 10, React, TypeScript, GitHub Actions, secrets) | 11 findings, 0 real | 12 findings, 1 real (fixed) |
| Active attack scan of the running app | OWASP ZAP 2.17.0 full scan + AJAX spider | 0 failures, 136 rules passed, gate passes | 0 failures, 136 rules passed, gate passes |
| Database access rules | pgTAP | 38 of 38 | 51 of 51 |
| RLS, remediation, follow-up, lifecycle, legacy, branch suites | `scripts/test-db.sh` | 261 of 261 | 261 of 261 |
| API handlers | unit tests | 46 of 46 | 60 of 60 |
| Every page, every role, desktop and phone, Chromium and WebKit | Playwright | n/a | 62 of 62 |
| Live site, read-only | `scripts/smoke-live.mjs`, headers, TLS | 25 of 25; HSTS preload, CSP, `X-Frame-Options: DENY`, nosniff, http → https (308) | not deployed |

## Fixed in this round

| Finding | Severity | Fix |
|---|---|---|
| react-router 6.30.6: open redirect via backslash in `<Link>`/`useNavigate` (GHSA-wrjc-x8rr-h8h6) and constructor injection in SSR hydration (GHSA-337j-9hxr-rhxg) | Moderate | Upgraded to 7.18.5 (2.5 weeks old). Not exploitable here before the upgrade: no navigation target comes from user input, notification links are written only by database triggers, and there is no SSR hydration. The upgrade removes the advisory anyway. |
| Notification links followed without a check | Hardening | The top bar now follows only paths inside the app, so nothing written to a notification can send someone to another site. |
| Dependabot proposes packages published minutes ago (`dependabot-missing-cooldown`) | Medium (supply chain) | 7-day cooldown on all three ecosystems. Security updates are not delayed. |
| Transitive `source-map-js` and `postcss-selector-parser` advisories | High / moderate (build only) | `npm audit fix` (non-breaking). |

## Reviewed and left as they are

| Finding | Why it stays |
|---|---|
| `vite` ≤ 6.4 (high) and `esbuild` ≤ 0.24 (moderate) | Both affect only the local development server, never the built site or users. The fix is Vite 8, a major upgrade; Dependabot pull requests #3 and #9 track it. Until then, don't run `npm run dev` on an untrusted network. |
| Expo `minimatch` via `@expo/fingerprint` (moderate) | Build-time tooling of the mobile app; the suggested "fix" is a downgrade to an older SDK. Will be resolved by a later Expo SDK. |
| gitleaks: `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` (commit 8a05cbc, 2026-10-04) | The publishable key is public by design and ships in every page. No secret key, database password or Groq key appears anywhere in history. |
| Semgrep `detect-non-literal-regexp` (7) | Patterns are built from fixed keyword lists in the code (escaped) or a database UUID, never from user text, and contain no nested quantifiers. |
| Semgrep `missing-integrity` on `index.html` | Flags the canonical `<link>`, which loads nothing. |
| Semgrep `unsafe-add-mask-workflow-command` | Masks the throwaway local stack's demo key in CI. |
| ZAP 10055, 10099, 90004, 10036, 10098, 40040 | Reasons are recorded in `.zap/accepted.json`. 40040 (CORS on `/supabase/auth/v1/token`) was added in this round: it is Supabase Auth's own wildcard CORS passed through the proxy. Sessions never use cookies, so another origin gains nothing. |

## Still open (owner actions, unchanged)

- Run migrations `20261114000000_contact_enquiries.sql` and `20261115000000_live_console.sql` before merging.
- Set `CONNECT_PROOF_SECRET` in Vercel. In Supabase, turn on secure password change, set the minimum password length to 10, turn on leaked-password protection, and use exact redirect URLs.
- Add the two backup secrets (`testing/BACKUPS.md`) and a staging Supabase project for Vercel previews (`docs/ENGINEERING.md`).
