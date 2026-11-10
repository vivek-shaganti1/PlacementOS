# Security risk register

Repo vivek-shaganti1/PlacementOS | branch main | commit e1ee372 | working tree: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (user's, preserved, out of scope) | audit date 2026-11-10 | Phase A, source-level only: no target code, tests, browsers or databases were run, nothing touched production.

Confirmed means proved by reading the final code path; nothing was exploited. Severities are reviewer judgement, not computed CVSS. NEEDS_VALIDATION items carry no severity.

Confirmed: 0 Critical, 0 High, 3 Medium, 18 Low. One conditional High (W1-10) depends on production state. Needs validation: 11.

### W1-10: Release depends on the 20261105 migration and on Auth sign-up being off
- Severity: High (conditional). Status: NEEDS_VALIDATION.
- Location: supabase/migrations/20261105000000_security_remediation.sql; api/*
- Actor or affected: anyone
- Impact: On the old database NV-01 (public sign-up gaining roles, including platform admin) and the temporary-password gate are open. Not a regression from the new code
- Minimal fix: Apply the migration; turn Allow new users to sign up off; verify both
- Regression test: Read-only check on production of pg_proc for private.account_ready and Auth settings
- Verification: A01 PARTLY: real, pre-existing, not worse with new code

### W1-1: A college admin can claim another college's not-yet-registered students as its own admins
- Severity: Medium. Status: CONFIRMED (reproduced).
- Location: 20261105_security_remediation.sql:82-99 (belongs_elsewhere), :197-227 (add_org_admin), :120-124 (attach_user_to_org)
- Actor or affected: org_admin of college B
- Impact: B adds a college-A-domain email as admin before A registers that student; on invite the student becomes B's admin and never A's student; A's temp-login and the student's self-registration are refused
- Minimal fix: Refuse in belongs_elsewhere when the email domain belongs to another college
- Regression test: add_org_admin(beta, x@alpha.example) returns refused and leaves admin_emails unchanged
- Verification: A01 CONFIRMED Medium; worse path: B can send the invite itself; RUNTIME: Reproduced on throwaway DB (raw/repro.log): student became the other college's admin; signup_check returns admin.

### W3-1: Credly ownership is "proven" by a loose name match
- Severity: Medium. Status: CONFIRMED.
- Location: api/connect.ts:129-134 (sameName), :153, :404-405; migration :576
- Actor or affected: student
- Impact: Another person's badges count as verified and the unique index then blocks the real owner
- Minimal fix: Require a proof code for Credly, or an exact full-name match of at least two full words
- Regression test: sameName("R Kumar","Rahul Kumar") and subset names must not prove Credly ownership
- Verification: A01 CONFIRMED Medium; name matching cannot prove ownership even for exact names

### W6-1: Preview deployments use production Supabase; staging cannot work as configured
- Severity: Medium. Status: CONFIRMED.
- Location: vercel.json:5-6,31 (rewrite and CSP); src/lib/supabase.ts:6-12; api/_lib.ts:7-9
- Actor or affected: developer, preview visitor
- Impact: Unreviewed code reads and writes production data; a staging project is blocked by CSP; missing env vars fall back to production
- Minimal fix: Per-environment proxy target and CSP, no production fallbacks, separate Preview env vars
- Regression test: A preview deployment talks only to a staging host
- Verification: A01 PARTLY: VITE_SUPABASE_DIRECT disables the proxy, but CSP still blocks staging

### W1-12: Account deletion needs no re-authentication
- Severity: Low. Status: CONFIRMED.
- Location: api/account.ts:14-23
- Actor or affected: holder of a stolen session token
- Impact: Irreversible deletion with only a token and the visible email
- Minimal fix: Require a recent sign-in or a server-side password check
- Regression test: Old session is refused for delete
- Verification: original reviewer only

### W1-2: Admins can learn whether an email belongs to another college
- Severity: Low. Status: CONFIRMED.
- Location: add_org_admin :214-219; sync_recruiter_role :426,:434; check_roster_domain :278; api/admin.ts:153
- Actor or affected: org_admin
- Impact: Enumeration of other colleges' rosters, recruiters and admins
- Minimal fix: One neutral answer for all refusals
- Regression test: refused answers are identical for elsewhere and unknown
- Verification: original reviewer only

### W1-3: A recruiter whose email another college rosters can never confirm their invite
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: attach_user_to_org :126 inside the auth.users trigger; sync_recruiter_role :421-424
- Actor or affected: org_admin of another college
- Impact: The Auth confirm update raises every time; the person is locked out until the row is removed
- Minimal fix: Skip cross-college checks on internal link updates; make roster checks symmetric with recruiter checks
- Regression test: Confirming such a recruiter succeeds without a role
- Verification: Also W2-2; A01 CONFIRMED Low; RUNTIME: Reproduced: confirming the recruiter raises ROSTER_DOMAIN.

### W1-4: Deleting a login whose roster row is linked fails with a foreign key error
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: 20261008:122 (on delete set null); link_roster_entry :378-381
- Actor or affected: admin action
- Impact: Such users cannot be deleted from the dashboard or admin API; the earlier dangling-link prediction was wrong. /api/account is unaffected because it deletes the roster row first.
- Minimal fix: In link_roster_entry keep old.user_id only when new.user_id is not null
- Regression test: Deleting a linked auth user succeeds and nulls org_students.user_id
- Verification: Code review and A01 predicted a dangling link; RUNTIME showed the delete fails with foreign_key_violation (raw/repro.log)

### W1-7: /api/password honours the user-writable flag
- Severity: Low. Status: CONFIRMED.
- Location: api/password.ts:20
- Actor or affected: session holder
- Impact: Password change without re-authentication if Supabase secure password change is enabled
- Minimal fix: Drop the user_metadata branch once the migration is applied
- Regression test: Flag set via updateUser is refused
- Verification: Kept on purpose in the remediation log

### W1-8: Sign-up limiter: lock-out still possible, campus NAT throttled, per-IP cap races
- Severity: Low. Status: CONFIRMED.
- Location: signup_attempt :510-519
- Actor or affected: anonymous
- Impact: Targeted sign-up denial; whole-campus throttling
- Minimal fix: Count per email and IP pair; per-IP advisory lock; index on at
- Regression test: Parallel test (needs two sessions)
- Verification: Also W2-4, W3-10

### W2-1: Migration step that unlinks unconfirmed accounts from rosters does nothing
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: 20261105 :467 with :378-381
- Actor or affected: n/a
- Impact: Squatter links stay on roster rows (profile access is removed)
- Minimal fix: Disable the link trigger around that statement
- Regression test: legacy test: org_students.user_id is null for an unconfirmed account
- Verification: RUNTIME: Reproduced: setting user_id to null is ignored.

### W2-11: Audit log misses organization deletion, drive edits, recruiter and platform admin changes; no retention
- Severity: Low. Status: CONFIRMED.
- Location: 20261105 :980-1001
- Actor or affected: insider
- Impact: Disputes cannot be resolved for those actions
- Minimal fix: Add triggers; define retention
- Regression test: Each action appears in audit_log
- Verification: original reviewer only

### W2-6: Recruiters can read every file in an applicant's resume folder, including GATE scorecards
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: 20261008:183-185; 20261021:425-431; ProfileExtras.tsx:436
- Actor or affected: recruiter
- Impact: Disclosure of scorecards and old resume files to company recruiters
- Minimal fix: Limit the recruiter branch to the current resume_path, or move scorecards to an admin-only bucket
- Regression test: Recruiter select on storage.objects for gate-*.pdf returns 0 rows
- Verification: RUNTIME: Reproduced: recruiter can see a GATE scorecard object.

### W2-7: Old JSON columns on profiles still expose JD matches and mock notes to recruiters
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: 20261005:12-19; 20261006:214-222; 20261008:181
- Actor or affected: recruiter
- Impact: SEC-12 can be bypassed through the REST API if those columns hold data
- Minimal fix: Null and revoke or drop the legacy columns; give recruiters a limited view
- Regression test: Recruiter select of jd_match, mock_feedback from profiles returns null or is denied
- Verification: Data presence in production NEEDS_VALIDATION; RUNTIME: Reproduced: recruiter reads the legacy jd_match column.

### W2-9: Applying the migration takes exclusive locks on every table until commit
- Severity: Low. Status: CONFIRMED.
- Location: 20261105 :1168-1192
- Actor or affected: n/a (operations)
- Impact: App blocked during the run; deadlock aborts the migration
- Minimal fix: Maintenance window and lock_timeout
- Regression test: n/a
- Verification: original reviewer only

### W3-10: Sign-up answers reveal whether an email and roll number match
- Severity: Low. Status: CONFIRMED.
- Location: api/signup.ts:11-13,30-51
- Actor or affected: anonymous
- Impact: Roll-number oracle; invite spam
- Minimal fix: Always return the same answer; email only on a match
- Regression test: All outcomes return the same body
- Verification: original reviewer only

### W3-2: GATE file path with ".." makes the server hash another student's file
- Severity: Low. Status: CONFIRMED.
- Location: api/connect.ts:346-358; Admin.tsx:159
- Actor or affected: student
- Impact: Existence oracle and a hash of another file; names are hard to guess
- Minimal fix: Reject dot segments and require ^uid/gate-[\w-]+\.pdf$
- Regression test: Traversal path returns 422
- Verification: original reviewer only

### W3-20: Account deletion removes at most 1,000 files per bucket
- Severity: Low. Status: CONFIRMED.
- Location: api/account.ts:33-43
- Actor or affected: n/a
- Impact: Files left after deletion
- Minimal fix: Paginate the listing
- Regression test: 1,001 files all removed
- Verification: original reviewer only

### W3-4: Connect attempt limit fails open on any database error
- Severity: Low. Status: CONFIRMED.
- Location: api/connect.ts:298-305
- Actor or affected: student
- Impact: No limit during transient errors or before the migration
- Minimal fix: Fail closed except PGRST202
- Regression test: Limiter error returns 503
- Verification: original reviewer only

### W3-5: One student can use up the shared GitHub token
- Severity: Low. Status: CONFIRMED.
- Location: api/connect.ts:30-71
- Actor or affected: student
- Impact: GitHub evidence fails for everyone for an hour
- Minimal fix: Per-user GitHub budget; cache trees
- Regression test: Budget enforced
- Verification: original reviewer only

### W3-7: A student can reserve another student's certificate or GATE registration number
- Severity: Low. Status: CONFIRMED.
- Location: connect.ts:330-333,361-364; migration :529-537
- Actor or affected: student
- Impact: Real owner gets a conflict until the attacker's college rejects it
- Minimal fix: Uniqueness only for verified rows, or a dispute path
- Regression test: Two pending rows from different colleges are accepted
- Verification: Also W2-5

### W3-8: Prototype names pass the platform allowlist
- Severity: Low. Status: CONFIRMED.
- Location: api/connect.ts:380-381,411
- Actor or affected: student
- Impact: 500 errors and wasted attempts
- Minimal fix: Object.hasOwn
- Regression test: platform=constructor returns 400
- Verification: original reviewer only

### W1-5: Mailbox proof may carry over to a changed email
- Severity: —. Status: NEEDS_VALIDATION.
- Location: mailbox_proven :52-56; block_email_change :350-357
- Actor or affected: unlinked invited account
- Impact: Could take a pending admin email if email change autoconfirms
- Minimal fix: Store the proven email and compare it
- Regression test: Decided by Auth email-change settings
- Verification: original reviewer only

### W1-6: Public sign-up can squat a rostered email
- Severity: —. Status: NEEDS_VALIDATION.
- Location: 20261011:21-38
- Actor or affected: anonymous
- Impact: Lock-out or temporary takeover if public sign-up is on
- Minimal fix: Turn public sign-up off
- Regression test: Decided by Auth settings
- Verification: original reviewer only

### W1-9: private.roster_academics(uid) returns any student's academics
- Severity: —. Status: NEEDS_VALIDATION.
- Location: 20261105 :592-602
- Actor or affected: student
- Impact: Leaks only if the private schema is exposed in the Data API
- Minimal fix: Use auth.uid() inside; no argument
- Regression test: Decided by exposed-schema setting
- Verification: Also W2-12

### W2-10: Conditional unique indexes are skipped with only a notice
- Severity: —. Status: NEEDS_VALIDATION.
- Location: 20261105 :529-537,:569-582; 20261021:153-161
- Actor or affected: n/a
- Impact: Ownership and one-college-per-email rules absent without anyone noticing
- Minimal fix: Raise instead of notice
- Regression test: Decided by pg_indexes on production
- Verification: original reviewer only

### W2-3: Old NOT VALID constraints can make roster sync and Auth attach fail
- Severity: —. Status: NEEDS_VALIDATION.
- Location: 20261005:44; 20261021:350-371
- Actor or affected: n/a
- Impact: Whole roster batches or invite confirmation fail if a violating legacy row exists
- Minimal fix: Clean rows, validate each constraint separately
- Regression test: Decided by a production count of violating rows
- Verification: A01: Medium if any violating row exists

### W3-14: Invite redirect built from the request origin
- Severity: —. Status: NEEDS_VALIDATION.
- Location: api/signup.ts:39; api/admin.ts:144
- Actor or affected: n/a
- Impact: Safety depends on the Supabase redirect allowlist
- Minimal fix: Fixed site URL
- Regression test: Decided by Auth redirect settings
- Verification: original reviewer only

### W3-16: Proof code accepted anywhere in whole pages or team JSON
- Severity: —. Status: NEEDS_VALIDATION.
- Location: api/connect.ts:175,197,271,417
- Actor or affected: student
- Impact: Proof from content the owner does not control
- Minimal fix: Check only bio or name fields
- Regression test: n/a
- Verification: original reviewer only

### W3-3: Refunds after failed AI calls may let billed calls escape the quota
- Severity: —. Status: NEEDS_VALIDATION.
- Location: api/_lib.ts:182-255; chat.ts:76-79
- Actor or affected: student
- Impact: Uncounted Groq spend
- Minimal fix: Refund only for pre-call failures; separate per-minute counter
- Regression test: Decided by Groq billing on failures
- Verification: original reviewer only

### W3-6: Response size guard trusts content-length
- Severity: —. Status: NEEDS_VALIDATION.
- Location: api/connect.ts:16-23
- Actor or affected: student
- Impact: Edge memory or time exhaustion
- Minimal fix: Stream with a byte cap
- Regression test: n/a
- Verification: original reviewer only

### W4-25: Uploaded files are served from the app origin through /supabase
- Severity: —. Status: NEEDS_VALIDATION.
- Location: vercel.json:4-7; supabase.ts:10-11
- Actor or affected: student
- Impact: Mitigated by bucket MIME allowlist, CSP and nosniff
- Minimal fix: Confirm headers on proxied storage
- Regression test: Decided by live bucket settings
- Verification: original reviewer only

### N-1: Development tools carry High advisories (Vite dev-server path traversal, source-map-js DoS)
- Severity: Low. Status: CONFIRMED.
- Location: package-lock.json: vite (direct), source-map-js, esbuild, postcss-selector-parser
- Actor or affected: someone who can reach a running dev server
- Impact: The dev server loads .env secrets into the process (vite.config.ts); it listens on localhost only, which limits exposure. Production dependencies have 0 High.
- Minimal fix: Upgrade Vite within the supported line and re-run npm audit; never run vite --host with real keys
- Regression test: npm audit shows 0 High
- Verification: RUNTIME: npm audit (raw/npm-audit.json)

### N-2: Production dependency advisories: react-router (2 Moderate)
- Severity: Low. Status: CONFIRMED.
- Location: react-router 6.30.6
- Actor or affected: n/a
- Impact: Open redirect needs an attacker-controlled path (none found); SSR advisory not applicable
- Minimal fix: Upgrade when a 6.x fix exists or plan v7
- Regression test: npm audit --omit=dev shows 0
- Verification: RUNTIME: npm audit --omit=dev

## Rejected after review
- SSRF in /api/connect: fixed hosts, handle regex, encoded paths.
- BOLA in /api: every write stamped with the verified caller.
- Removed recruiter keeps application access: policy subquery runs under the caller's RLS.
- Pending temporary-password accounts using definer functions: all admin checks refuse pending accounts.
- org_admin reaching super_admin directly.
- Guessable proof code: 48-bit HMAC bound to user, platform and handle, rate limited.
- CI secrets exposed to pull requests.
- Prerender reaching the network.
- Frontend XSS, open redirects, CSV formula injection, source maps (checked, not found).
