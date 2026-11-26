# Production settings

Settings that live in dashboards, not in code. A new project is set up from this page. "Owner" means nobody can check or
change it from the repository.

## Supabase (Authentication)
| Setting | Value |
|---|---|
| Allow new users to sign up | Off |
| Secure password change; leaked-password protection | On |
| Minimum password length | 10 |
| JWT expiry; refresh token rotation | 3600 s; on |
| Multi-factor: TOTP | On (admins must use it; the database enforces it) |
| Sessions: time-box, inactivity timeout | 12 hours, 1 hour (the app also signs idle people out) |
| CAPTCHA (Turnstile) | On, once the keys exist and the sign-in form sends the token. Not built yet |
| Redirect URLs | Exactly `https://<domain>/reset-password` and `https://<domain>/login` |
| Custom SMTP | Required before inviting a whole college (the built-in sender allows a few emails an hour) |
| Project plan | Paid. Free projects are paused after a week without use, which takes the whole product down |

## Vercel (environment variables)
| Name | Production | Preview |
|---|---|---|
| `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `CONNECT_PROOF_SECRET` | Set | Staging values only, or unset |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Set (defaults exist) | Staging project, or unset |
| `VITE_GRIEVANCE_CONTACT` | A named person and email | unset |
| `VITE_SENTRY_DSN`, `SENTRY_DSN` | Set to turn error reports on | A separate Sentry project |
| `AI_DISABLED` | unset; `true` pauses every AI feature | unset |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Optional (off-campus search, and companies hiring now for research) | unset |
| `RESEARCH_WORKER_SECRET` | Set, the same value as the Vault secret `research_worker_secret` (docs/RESEARCH.md) | unset |
| `TAVILY_API_KEY` or `BRAVE_SEARCH_API_KEY` | Optional: lets research find official pages by web search | unset |

The production domain is named in `vercel.json` (three `host` rules: the `/supabase` proxy and the content security policy).
Change it there when the domain changes. A preview on any other host cannot reach the production database: its pages have no
backend, its functions answer 503 and its content security policy does not list the project.

## GitHub
- `main` is protected: pull request, linear history, required checks `build`, `database`, `secrets`, `e2e, pgTAP, ZAP, Lighthouse`.
- Environment `production-backup` (branch `main` only): secrets `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`; optionally
  `BACKUP_S3_KEY_ID`, `BACKUP_S3_SECRET` and variables `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT` for a copy outside GitHub.
- `uptime.yml` opens an issue when the site is down; `backup.yml` opens one when a backup fails. Watch the repository's issues.

## Database
- AI ceiling for the whole platform, per day: `update private.platform_settings set value = 5000 where key = 'ai_daily_cap';`
- Retention runs daily through pg_cron (`piq-retention`). Where pg_cron is missing, run `select private.apply_retention();`.

## Recovery targets
| | Target | Depends on |
|---|---|---|
| Data loss (RPO) | 24 hours | The nightly backup, once its two secrets are set. Today: **no backup has ever succeeded** |
| Time to restore (RTO) | 4 hours | `testing/BACKUPS.md`, into a new project, then the host name in `vercel.json` |
| Stored files (resumes, photos) | Not backed up | Needs a bucket copy; not built |
