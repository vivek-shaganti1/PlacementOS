# How PlacementIQ is built, tested and released

This is the working agreement for every change, whether a person or an assistant makes it. The short version: work on a
branch, open a pull request, let CI prove it, apply any migration in production first, merge, and let the post-deploy check
confirm the live site.

## Environments

| Where | What it is | Database | Who uses it |
|---|---|---|---|
| Local | `npm run dev`, or the full local stack (README, "Everything local") | Your own Supabase, or `supabase start` | Development |
| CI | `.github/workflows/full-stack.yml`: a throwaway Supabase plus the build served like Vercel | Created and destroyed in each run | Every pull request |
| Preview | Vercel builds every pull request | **Production** (the `/supabase` proxy and the built-in defaults point there) | Look only, never sign in |
| Production | https://placementiq-os.vercel.app, deployed from `main` | Production Supabase | Students, colleges, recruiters |

The preview row is a known weak spot: a preview is a new build talking to the real database. Until there is a staging
Supabase project, do not sign in on previews. To fix it properly:
1. Create a second Supabase project.
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_DIRECT=true` and the server keys for the
   *Preview* environment in Vercel.

## The flow for every change

1. **Branch** from `main`: `git switch -c short-description`.
2. **Build and test locally** before pushing:
   ```bash
   npm run build && npm run test:unit
   ```
   - For database changes, also run `npm run test:db`.
   - For anything a user sees, also run the full local stack and `npm run test:e2e`.
3. **Pull request** into `main`. The template lists what to confirm.
4. **CI must pass.** `main` is protected and these checks are required:
   - `build`: typecheck, production build, entry chunk free of three and GSAP, API unit tests, production dependency audit.
   - `database`: every migration replayed on plain Postgres, then the RLS, remediation, follow-up, journey, legacy and branch suites.
   - `secrets`: gitleaks over the whole history.
   - `e2e, pgTAP, ZAP, Lighthouse`:
     - Playwright on every page for every role, in three browsers.
     - pgTAP access rules.
     - OWASP ZAP active scan. It fails on any High alert, and on any Medium alert not reviewed in `.zap/accepted.json`.
     - Lighthouse budgets. Accessibility, best practices, SEO and layout shift block the merge; performance warns.
5. **Migrations go to production before the merge.** See below.
6. **Merge.** Vercel deploys `main` to production.
7. **Post-deploy check.** `.github/workflows/post-deploy.yml` runs when Vercel reports the production deployment. It runs read-only checks:
   - Pages answer.
   - `/api/health` reaches the database.
   - Security headers are present.
   - Fonts come from the site itself.
   - Public sign-up is off.
   - Protected tables refuse anonymous reads.

   If it fails, roll back (see below) and fix on a branch.

## Database migrations

- One file per change in `supabase/migrations/`, named `YYYYMMDDHHMMSS_what.sql`. The timestamp must be later than every
  existing one.
- Each file is one transaction (`begin; … commit;`) and must be safe to run twice. CI replays the latest one a second time
  and fails if it is not.
- Prefer additive changes. Removing a column or table needs a release in between: stop using it first, remove it later.
- Every migration that changes access gets a pgTAP test in `supabase/tests/pgtap/`, and that test must fail without the
  migration.
- **Applying in production**: open the Supabase SQL editor, paste the file, run it during a quiet hour, then record it in
  the ledger below in the same pull request. CI cannot do this step, because the database password is not in CI on
  purpose.

### Production ledger

| Migration | What | Applied in production |
|---|---|---|
| 20261004000000 … 20261031000000 | Schema, roles, roster, drives, evidence, certifications | Yes (before 2026-11) |
| 20261105000000_security_remediation | Mailbox proof, temporary passwords, audit log, limits | 2026-11-11 |
| 20261110000000_audit_followups | Roster linking, neutral refusals, certificate ownership | 2026-11-11 |
| 20261112000000_review_followups | File paths, upload rule, indexes, more audit | 2026-11-12 |
| 20261113000000_admin_two_factor | Admin powers need a second factor | 2026-11-12 |

## Releases and versions

- `package.json` holds the version, following semantic versioning:
  - **Major:** something users must act on.
  - **Minor:** new features.
  - **Patch:** fixes.
- Every merged pull request adds a line to `CHANGELOG.md` under "Unreleased". Releasing means moving those lines under a
  version heading, bumping `package.json`, merging, then tagging:
  ```bash
  git tag v0.3.0
  git push origin v0.3.0
  ```

## Rolling back

| What broke | Do this |
|---|---|
| The app (bad deploy) | Vercel → Deployments → the previous production deployment → **Instant Rollback**. It takes seconds and does not touch the database. |
| A migration | Migrations have no automatic down step. Write a new migration that undoes it. If data was damaged, restore from the nightly backup into a new project (`testing/BACKUPS.md`) and copy the affected rows back. |
| A leaked key | Rotate it in Supabase or Groq, update Vercel, redeploy. The secret key also signs proof codes unless `CONNECT_PROOF_SECRET` is set. |

## Scheduled jobs

| Job | When | Where it reports |
|---|---|---|
| Database backup (encrypted, restore-tested) | Nightly, 03:00 IST | Actions; GitHub emails on failure |
| CI on `main` | Weekly, Mondays | Catches new dependency advisories |
| Full stack plus live Lighthouse (read-only) | Weekly, Mondays | Actions artifacts |
| Dependabot (actions and npm) | Weekly, Mondays 09:00 IST | Pull requests |

## Two-factor sign-in for admins

- Platform admins and placement cells must enter a code from an authenticator app.
- The database enforces this (`20261113000000_admin_two_factor.sql`): a password-only session has no admin powers.
- **Before applying it**, tell every admin they will be asked to set up an app at their next sign-in, and suggest a second
  app (Settings → Two-factor sign-in) as a backup.
- **A lost phone** is reset by the project owner in Supabase: Authentication → Users → the user → remove the MFA factor. The
  admin then sets up a new app at their next sign-in.

## Where things live

| Thing | Where |
|---|---|
| Secrets (Supabase secret key, Groq key, proof secret) | Vercel environment variables only |
| Backup secrets | GitHub environment `production-backup` (branch `main` only) |
| Auth settings (sign-up off, redirect URLs, SMTP, MFA) | Supabase dashboard; listed in `testing/RELEASE_RUNBOOK.md` |
| Test accounts | `tests/e2e/accounts.json`, valid only in a local or CI stack |
| Reviews and test reports | `testing/` |
