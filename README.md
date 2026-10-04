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
| storage `resumes` (private), `avatars` (public) | Files under `<user id>/…` |

The older jsonb columns on `profiles` (`skills`, `projects`, …) are deprecated and no longer read by the app.

## Server functions (`/api`)

| Route | Purpose |
| --- | --- |
| `POST /api/chat` | AI Career Assistant (Groq), grounded in the caller's profile and computed eligibility |
| `POST /api/resume` | `analyze` a resume's extracted text, or `match` it against a job description |
| `POST /api/connect` | Sync or disconnect GitHub, LeetCode, Codeforces or CodeChef |

Each function requires a Supabase access token and reads/writes as that user, so RLS applies.
Server-only environment variables: `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`), optional `GITHUB_TOKEN`.

## Design

Soft-depth glass UI over an animated aurora, built with Tailwind and [Motion](https://motion.dev); charts use Recharts.
Animations respect `prefers-reduced-motion`. The logo is an SVG component in `src/components/Logo.tsx` (favicon in `public/favicon.svg`).

## Supabase dashboard settings

Authentication → URL Configuration:

- **Site URL**: your production URL (e.g. `https://placementiq.vercel.app`)
- **Redirect URLs**: `http://localhost:5199/**` and `https://<your-vercel-domain>/**`

These are needed for the sign-up confirmation and password-reset emails to land back in the app.

## Deploy (Vercel)

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project → Settings → Environment Variables, then redeploy.
Never put the secret / service-role key in a `VITE_` variable — it would be bundled into the browser.
