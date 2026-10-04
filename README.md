# PlacementIQ

Campus placement readiness app (Vite + React + Tailwind) backed by Supabase Auth, Postgres and Storage.

## Local setup

```bash
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:5199
```

## Database

Migrations live in `supabase/migrations/` and are applied in order. Every per-student collection is its own table,
and Row Level Security on each one limits a student to their own rows.

| Table | Holds |
| --- | --- |
| `profiles` | Scalar profile fields: academics, contact, links, target role, settings, resume pointer and extracted text |
| `user_skills` | One row per skill with its level (0-100) |
| `projects`, `internships`, `certifications`, `achievements` | Ordered lists, written atomically through the `replace_rows` RPC |
| `coding_profiles`, `github_repos` | Synced GitHub / LeetCode / Codeforces / CodeChef stats and repositories |
| `resume_analyses`, `jd_matches` | Full history of resume analyses and job-description matches |
| `mock_feedback`, `practice_attempts`, `roadmap_progress`, `mock_bookings`, `cert_enrollments` | Preparation activity |
| `saved_companies`, `applications` | Shortlist and application pipeline (with stage) |
| `progress_snapshots` | One row per day (readiness, stacks, skills, problems solved, resume score) for history charts |
| `chat_messages`, `notifications` | Assistant history and in-app notifications |
| `job_postings`, `job_applications` | Drives posted by the placement cell, and student applications with a status pipeline |
| `user_roles` | Placement-cell admins (enforced in RLS through `private.is_admin()`) |
| storage `resumes` (private), `avatars` (public) | Files under `<user id>/…` |

The older jsonb columns on `profiles` (`skills`, `projects`, …) are deprecated and no longer read by the app.

## Server functions (`/api`)

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | AI Career Assistant (Groq), grounded in the caller's profile and computed eligibility |
| `POST /api/resume` | `analyze` a resume's extracted text, or `match` it against a job description |
| `POST /api/connect` | Sync or disconnect GitHub, LeetCode, Codeforces or CodeChef |
| `GET /api/health` | Which server settings are configured (booleans only); `?ping=1` also checks the Groq key |

Each function requires a Supabase access token and reads/writes as that user, so RLS applies.
Server-only environment variables: `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`),
`GROQ_FALLBACK_MODELS` (default `openai/gpt-oss-20b,qwen/qwen3.8-27b`, used when the primary model is rate limited), optional `GITHUB_TOKEN`.

## Roles and flows

- **Students** complete a 5-step onboarding (details, academics, resume, accounts, skills) before using the app.
- **Admins** (placement cell) get an extra sidebar section: overview, ranked students (CSV export), job postings with
  ranked applicants and status updates (students are notified automatically), and admin management.
  Make someone an admin from Admin → Admins, or in SQL: `insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');`

## Design

Soft-depth glass UI over an animated aurora, built with Tailwind and [Motion](https://motion.dev); charts use Recharts.
Animations respect `prefers-reduced-motion`. The logo is an SVG component in `src/components/Logo.tsx` (favicon in `public/favicon.svg`).

## Accounts and roles

There are three separate kinds of account, decided by the database (`user_roles`), never by the client:

- **Platform admin** (`super_admin`, e.g. shagantivivekgoud@gmail.com): sees only the platform pages. Creates colleges with their
  official code, admin login emails (any address, e.g. admin1@gmail.com), plan, seats and price per seat, and sees each
  college's students, activity, storage, AI usage and contract value (`public.org_usage()`). Platform admin emails are
  listed in `private.platform_admin_emails`; listed emails get the role when they sign up.
- **Placement cell** (`org_admin` of one college): sees only that college's students (profiles, resumes, repos,
  LeetCode/Codeforces/CodeChef stats), its roster, its drives and its admins.
- **Student**: gets access only when their college adds their email to its roster (e.g. 23eg105f59@anurag.edu.in).
  Removing them from the roster removes access. Unlisted accounts see a "waiting for your college" screen.

## Supabase dashboard settings

Authentication → URL Configuration:

- **Site URL**: your production URL (e.g. `https://placementiq.vercel.app`)
- **Redirect URLs**: `http://localhost:5199/**` and `https://<your-vercel-domain>/**`

These are needed for the sign-up confirmation and password-reset emails to land back in the app.

## Deploy (Vercel)

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project → Settings → Environment Variables, then redeploy.
Never put the secret / service-role key in a `VITE_` variable — it would be bundled into the browser.
