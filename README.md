# PlacementIQ

Campus placement readiness app (Vite + React + Tailwind) backed by Supabase Auth, Postgres and Storage.

## Local setup

Node 22 (`.nvmrc`; 20 or later works).

```bash
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:5199 (also serves /api)
```

With the example values the app opens and the sign-in page works, but nothing can sign in and `/api/health` answers
503: it needs a real backend. Either use your own Supabase project, or run everything locally:

### Everything local (Docker and the Supabase CLI)

```bash
supabase start               # Postgres, Auth, Storage and REST, with every migration applied
npm run stack:seed           # synthetic colleges, roster, drives and logins (tests/e2e/accounts.json)
supabase status -o env       # the local URL and keys for .env.local
```

The seeded logins share the password in `tests/e2e/accounts.json`; they exist only in this local database.

## Tests

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm run build` | Typecheck (app and API) and production build | nothing |
| `npm run test:unit` | API handlers with every outside service faked | nothing |
| `npm run test:db` | All migrations replayed on plain Postgres, then the RLS, remediation and journey suites | Postgres 16 (`psql`, `initdb`) |
| `npm run test:pgtap` | pgTAP checks of RLS coverage, access rules and the latest fixes | `supabase start` |
| `npm run test:e2e` | Playwright: every page for every role, buttons, journeys, public pages in three browsers | `supabase start`, `npm run stack:seed`, a build, `npm run stack:serve` |

CI (`.github/workflows/full-stack.yml`) runs the last two plus OWASP ZAP and Lighthouse against a throwaway local
stack on every pull request. Nothing in it can reach production.

## Database

Migrations live in `supabase/migrations/` and are applied in order. Every per-student collection is its own table,
and Row Level Security on each one limits a student to their own rows.

| Table | Holds |
| --- | --- |
| `profiles` | Scalar profile fields: academics, contact, links, target role, settings, resume pointer and extracted text |
| `user_skills` | One row per skill with its level (0-100) |
| `projects`, `internships`, `certifications`, `achievements` | Ordered lists, written atomically through the `replace_rows` RPC |
| `coding_profiles`, `github_repos` | Stats and repositories the server fetched from the seven evidence platforms: GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime |
| `credentials` | NPTEL certificates and GATE scorecards with their review status |
| `resume_analyses`, `jd_matches` | Full history of resume analyses and job-description matches |
| `mock_feedback`, `practice_attempts`, `roadmap_progress`, `mock_bookings`, `cert_enrollments` | Preparation activity |
| `saved_companies`, `applications` | Shortlist and application pipeline (with stage) |
| `progress_snapshots` | One row per day (readiness, stacks, skills, problems solved, resume score) for history charts |
| `chat_messages`, `notifications` | Assistant history and in-app notifications |
| `job_postings`, `job_applications` | Drives posted by the placement cell, and student applications with a status pipeline |
| `organizations`, `org_students`, `org_recruiters` | Colleges, each college's roster (with official academics) and its recruiters |
| `user_roles` | `super_admin`, `org_admin` and `recruiter` grants, enforced in RLS |
| `audit_log` | Append-only record of role, roster, academic and application status changes, written by triggers |
| storage `resumes` (private, also holds GATE scorecards), `avatars` (public) | Files under `<user id>/…` |

The older jsonb columns on `profiles` (`skills`, `projects`, …) are deprecated and no longer read by the app.

## Server functions (`/api`)

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | AI Career Assistant (Groq), grounded in the caller's profile and computed eligibility |
| `POST /api/resume` | `analyze` a resume's extracted text, or `match` it against a job description |
| `POST /api/connect` | Sync or disconnect any of the seven evidence platforms, or add an NPTEL or GATE credential |
| `POST /api/signup` | Student self-registration through an emailed link |
| `POST /api/admin` | Account creation and invitations for placement cells and platform admins |
| `POST /api/password` | Replace a temporary password (signed in with it, or from a reset email); only the server can clear the must-change flag |
| `POST /api/account` | Delete your own account: login, profile, files and roster link (the email must be typed to confirm) |
| `GET /api/health` | `{ ok }` from a database probe (503 when the database is unreachable); platform admins can add `?details=1` for configuration booleans and `&ping=1` to check the Groq key |

Calls read and write as the signed-in user wherever possible, so RLS applies. `/api/signup` and the account-creation paths of
`/api/admin` use the secret key, which never leaves the server.

## Environment variables

Names only; `.env.example` lists them. Set real values in `.env.local` and in Vercel, never in a committed file.

| Name | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser and server | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Supabase publishable key |
| `VITE_SALES_EMAIL` | Browser, optional | Address behind the pricing buttons on the landing page |
| `VITE_SUPABASE_DIRECT` | Browser, previews and staging only | `true` makes the browser call `VITE_SUPABASE_URL` directly instead of this site's `/supabase` proxy, which points at production |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server, optional | Server-side fallbacks for the two `VITE_` names above |
| `SUPABASE_SECRET_KEY` | Server only | Creates accounts and sends invitations |
| `GROQ_API_KEY` | Server only | AI calls |
| `GROQ_MODEL` | Server only, optional | Primary model, default `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODELS` | Server only, optional | Comma-separated models used when the primary is rate limited, default `openai/gpt-oss-20b,qwen/qwen3.8-27b` |
| `GITHUB_TOKEN` | Server only, optional | Raises the GitHub rate limit for evidence reads |
| `CONNECT_PROOF_SECRET` | Server only | Used by `/api/connect` for proof that a student owns an account |

`SIGNUP_VERIFY_EMAIL` no longer exists: self-registration always goes through the emailed link. Remove it if it is still set.

## Recruiters and evidence

The catalog holds 66 recruiters (`src/data/companies.ts`) plus 50 core recruiters (`src/data/coreCompanies.ts`) across 23 categories,
and a student is scored only against the categories their tracks hire for. Evidence comes from seven platforms read by the server
(GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime) plus NPTEL and GATE credentials. The ranking rule is in
[`docs/EVIDENCE.md`](docs/EVIDENCE.md).

## Roles and flows

- **Students** register through a link emailed to their roster address (there is no direct password sign-up), then complete a 5-step onboarding (details, academics, resume, accounts, skills) before using the app.
- **Colleges** can instead create a login with a random temporary password for one person. Until that person picks their own,
  the database refuses everything except that step, and temporary passwords expire after 7 days.
- **Admins** (placement cell) get an extra sidebar section: overview, ranked students (CSV export), job postings with
  ranked applicants and status updates (students are notified automatically), and admin management from Admin → Admins.
- **Students** delete their own account in Settings, which removes their rows, files and roster entry. Admin and recruiter
  accounts are removed by a college or platform admin.

## Design

Soft-depth glass UI over an animated aurora, built with Tailwind and [Motion](https://motion.dev); charts use Recharts.
Animations respect `prefers-reduced-motion`. The logo is an SVG component in `src/components/Logo.tsx` (favicon in `public/favicon.svg`).

## Accounts and roles

There are three separate kinds of account, decided by the database (`user_roles`), never by the client:

- **Platform admin** (`super_admin`, e.g. owner@example.com): sees only the platform pages. Creates colleges with their
  official code, admin login emails (any address, e.g. tpo@college.example), plan, seats and price per seat, and sees each
  college's students, activity, storage, AI usage and contract value (`public.org_usage()`). Platform admin emails are
  listed in `private.platform_admin_emails`; a listed email gets the role once its mailbox is proven.
- **Placement cell** (`org_admin` of one college): sees only that college's students (profiles, resumes, repos,
  LeetCode/Codeforces/CodeChef stats), its roster, its drives and its admins.
- **Recruiter** (`recruiter` of one college): added by that college's placement cell with a company name. Posts drives
  only under that company and sees full profiles of the students who applied to those drives, nothing else.
- **Student**: gets access only when their college adds their email to its roster (e.g. student@college.example).
  Removing them from the roster removes access. Unlisted accounts see a "waiting for your college" screen.

## Supabase dashboard settings

Authentication → URL Configuration:

- **Site URL**: your production URL (e.g. `https://placementiq.vercel.app`)
- **Redirect URLs**: `http://localhost:5199/**` and `https://<your-vercel-domain>/**`

These are needed for the registration and password-reset emails to land back in the app.

## Deploy (Vercel)

Add the variables from [Environment variables](#environment-variables) under Project → Settings → Environment Variables, then redeploy.
Never put the secret / service-role key in a `VITE_` variable — it would be bundled into the browser.
