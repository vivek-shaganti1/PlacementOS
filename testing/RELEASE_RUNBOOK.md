# Release runbook: November 2026 security remediation

The site is safe to deploy before the database step, and it keeps working. Most fixes only take effect once step 1 is done, so run it straight after the deploy.

## 1. Apply the migration (owner, in the Supabase SQL editor)

Paste and run `supabase/migrations/20261105000000_security_remediation.sql`. It is one transaction: if anything fails nothing changes. It is safe to run again.

Then run this read-only check. Both rows must say `true`. If one says `false`, duplicates stopped that index being created: resolve them and run the migration again.

```sql
select 'credentials_one_owner' as index, exists (select 1 from pg_indexes where indexname = 'credentials_one_owner') as present
union all
select 'coding_profiles_one_owner', exists (select 1 from pg_indexes where indexname = 'coding_profiles_one_owner');
```

What it changes in existing data:
- Former college admins left in place by the old form lose the role.
- Accounts attached before confirming their email lose that access until they confirm.
- Accounts still on an old temporary password are held until they use "Forgot password?". Those passwords were shared across a paste, so they cannot simply be swapped.
- NPTEL certificates marked verified go back to the placement cell for confirmation.
- Students stuck in onboarding by a partial academics upload are released.

## 2. Supabase settings (owner, dashboard)

| Setting | Value | Why |
|---|---|---|
| Authentication, Allow new users to sign up | **Off** | Closes NV-01 fully. Invites and server-created logins still work. |
| Custom SMTP | **On** | Every self-registration is now an email. The built-in sender allows only a few per hour, so registration fails without this. |
| Secure password change | On | Stops a stolen session changing the password through the API. |
| Leaked password protection, minimum length 10 | On | Matches the app. |
| Backups | Confirm, and do one restore drill | No backup claim is verified. |

Optional, for networks that block `*.supabase.co`: change the invite email template to link to `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=invite`.

Create platform admins with Invite user, never Create user: a dashboard-created account gets no role.

## 3. Vercel environment (owner)

- Set `GITHUB_TOKEN` if it is not set. GitHub evidence is rate limited without it.
- Optional: set `CONNECT_PROOF_SECRET`. Without it, proof codes are derived from the Supabase secret key.
- Remove `SIGNUP_VERIFY_EMAIL`. It no longer exists.

## 4. Check it live, on synthetic accounts

The tests ran on a local stand-in for Supabase Auth, so these must be seen once on the real service:

1. Roster a test student, register from the sign-up page, open the emailed link, set a password, reach onboarding.
2. Create a login with a random password, sign in, confirm nothing loads until the password is changed, change it, reach the app.
3. Use "Forgot password?" on that account.
4. Connect GitHub on a test account: it shows Not proven and a code. Add the code to the bio and press Prove it.

## 5. GitHub (owner)

Protect `main` and require the CI checks in `.github/workflows/ci.yml`. CI only blocks a release once this is on.

## 6. Tell people what changes

- **Colleges:** ranking scores will drop on day one. Connected accounts count only after students prove them, and typed skills, projects and internships no longer count.
- **Students:** press Prove it on each connected account.
- **Placement cells:** NPTEL certificates now wait for their confirmation. Skills typed by students are labelled self-rated.

## Rollback

- Site: redeploy the previous build.
- After the migration has run, the old site does not work properly with the new database: old sign-ups attach to nothing, temporary-password users see an empty app, and resume analysis fails. So do not roll the site back past this release without a database plan. Fix forward.
- The migration itself has no down script. Restore from a backup taken just before step 1.
