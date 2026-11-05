# Architecture (from source)

Browser SPA (Vite 5, React 18, TypeScript, Tailwind 3, router 6). Scoring runs client-side (eligibility.ts, predict.ts, verify.ts).
Vercel edge functions in api/: admin, chat, connect, health, resume, signup.
Supabase Postgres (31 public tables, all RLS on), Auth, Storage, reached via same-origin rewrite /supabase/* in production; direct on localhost.
Integrations: Groq; GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime; archive.nptel.ac.in.
Auth flow: Supabase session in localStorage; bearer token to PostgREST and api/; no local JWT verification, every path sends the token to PostgREST first.
Authorization: user_roles (super_admin, org_admin, recruiter); students via org_students and profiles.org_id; UI gates are convenience.
Trust boundaries: browser to Vercel; browser to Supabase (RLS is the boundary); edge functions hold the secret key; third-party fetches; LLM output.
Sensitive data: resumes, academics, contact details, coding profiles; resume text is sent to Groq.
Risks: no background workers or queues; no IaC; no CI; manual migrations; single production environment. Not verified at runtime.
