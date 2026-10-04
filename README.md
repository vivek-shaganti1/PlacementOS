# PlacementIQ

Campus placement readiness app (Vite + React + Tailwind) backed by Supabase Auth, Postgres and Storage.

## Local setup

```bash
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:5199
```

## Database

The schema lives in `supabase/migrations/`. Apply it once to a fresh project (SQL editor, `psql`, or `supabase db push`).
It creates:

| Table / bucket | Purpose |
| --- | --- |
| `profiles` | One row per user (auto-created on sign-up): academics, skills, projects, internships, settings, resume pointer |
| `saved_companies`, `applications` | Shortlist and application tracking (with stage) |
| `roadmap_progress`, `mock_bookings`, `cert_enrollments`, `practice_attempts` | Learning progress |
| `chat_messages`, `notifications` | Assistant history and in-app notifications |
| storage `resumes` (private), `avatars` (public) | Files stored under `<user id>/…` |

Row Level Security is enabled on every table; users can only read and write their own rows.

## Supabase dashboard settings

Authentication → URL Configuration:

- **Site URL**: your production URL (e.g. `https://placementiq.vercel.app`)
- **Redirect URLs**: `http://localhost:5199/**` and `https://<your-vercel-domain>/**`

These are needed for the sign-up confirmation and password-reset emails to land back in the app.

## Deploy (Vercel)

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project → Settings → Environment Variables, then redeploy.
Never put the secret / service-role key in a `VITE_` variable — it would be bundled into the browser.
