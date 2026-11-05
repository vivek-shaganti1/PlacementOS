# Security risk register

Repo vivek-shaganti1/PlacementOS | branch main | commit 261d422 (261d42271b226f3186aca85d29b408e48fd4ed38) | working tree dirty: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (preserved, not part of the audited code) | audit date 2026-11-05

Source-level only. No application code, migration or test was executed; nothing was run against production.

Confirmed: 6 High, 9 Medium, 6 Low, 0 Critical. Confirmed here means proven by reading the final code path. Severities are reviewer judgement, not computed CVSS scores.

## Confirmed

### SEC-01: Self-registration needs no mailbox proof by default
- Category: Authentication. Severity: High. Confidence: High. Component: api/signup.ts
- Location: api/signup.ts:42,59-64; AdminOrg.tsx:217
- Attacker privilege: None; knows a rostered email and roll number
- Action: POST /api/signup with victim details and a chosen password
- Observed in source: Unless SIGNUP_VERIFY_EMAIL=true the account is created with email_confirm:true. The sample roster row makes roll equal the email local-part, so the roll check may add nothing. Owner can recover by reset.
- Impact: Impersonation in drives; the real student sees "already exists"
- Minimal fix: Require the emailed path and remove the direct path
- Regression test: Signup without mailbox proof is refused
- Verification: Verifier C1 CONFIRMED; production env value unknown
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-02: Org admin can squat another college's email and later inherit roles
- Category: Tenant isolation. Severity: High. Confidence: Medium. Component: signup, roster, admin RPCs
- Location: api/signup.ts:34-64; 20261021:129-146; 20261008:260-264; 20261009:134-138; AdminOrg.tsx:144-146
- Attacker privilege: org_admin
- Action: Roster victim@collegeB, self-register, delete the row; wait for link_roster_entry, add_org_admin or add_platform_admin to act on the existing account
- Observed in source: Domain check is client-only. Admin RPCs grant to an existing account with no owner consent, including super_admin. Needs a predicted email; pending admin emails are refused.
- Impact: Cross-college privilege gain; squatted rows also 409 college B's whole roster upsert
- Minimal fix: Enforce domains on org_students; grant roles to existing accounts only after the owner accepts
- Regression test: Cross-domain roster insert refused; role grant to existing account stays pending
- Verification: Verifier C2 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-03: Shared temporary password; forced change enforced only by the UI
- Category: Authentication. Severity: High. Confidence: High. Component: admin provisioning, auth gate
- Location: AdminOrg.tsx:100,152,217; api/admin.ts:74,134; App.tsx:237; auth.tsx:158; Settings.tsx:39; Login.tsx:75
- Attacker privilege: Rostered classmate in the same paste
- Action: Sign in to a classmate's unclaimed login with the shared password; updateUser needs no current password; must_change_password is user-writable metadata
- Observed in source: One password covers a whole paste of up to 50, emails look sequential, and the flag has no server enforcement or expiry. Legal.tsx:47 claims otherwise.
- Impact: Peer account takeover; staff retain a working credential
- Minimal fix: Per-person random passwords; flag in app_metadata cleared by the server; expiry; server enforcement
- Regression test: Direct REST use before password change is refused
- Verification: Verifier C3 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-04: Students can take credit for anyone's coding accounts
- Category: Evidence integrity. Severity: High. Confidence: High. Component: api/connect.ts
- Location: api/connect.ts:317-378; Jobs.tsx:92; Admin.tsx:171; ProfileExtras.tsx:227
- Attacker privilege: Student
- Action: POST /api/connect {"platform":"github","username":"<anyone>"}
- Observed in source: No ownership proof and no handle uniqueness. Stats are displayed as Verified evidence and affect rank once levels are written.
- Impact: Undermines the product's core claim shown to colleges and recruiters
- Minimal fix: Challenge-based proof or OAuth; show unproven accounts as unverified; unique (platform, lower(username))
- Regression test: Second account linking the same handle refused; unproven handle not labelled verified
- Verification: Verifier C7 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-05: Rankings use student-typed skills, projects and internships
- Category: Evidence integrity. Severity: High. Confidence: High. Component: replace_rows, scoring
- Location: 20261006:253-305; eligibility.ts:116-121; admin.ts:72; Admin.tsx:791-793; verify.ts:159-162; docs/EVIDENCE.md:3,57
- Attacker privilege: Student
- Action: rpc/replace_rows {"target":"skills","items":[{"name":"Data Structures & Algorithms","level":100}]}
- Observed in source: verify.ts never overrides stored levels and runs only in the student's browser. EVIDENCE.md line 3 ("never on self-rating") is false; the "at most 45" rule fails for several skills.
- Impact: Placement cell and recruiter ordering can be set by the student
- Minimal fix: Rank on server-derived levels; label self-rated values; correct the docs (needs a product decision)
- Regression test: Typed level does not change server-side rank
- Verification: Verifier C10 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-06: Removing a college admin in the edit form leaves the role active
- Category: Authorization. Severity: High. Confidence: High. Component: AdminOrg college form
- Location: AdminOrg.tsx:639,645,652; 20261010:90-102
- Attacker privilege: Former org_admin
- Action: Super admin removes the email from the college edit form; the former admin keeps working
- Observed in source: The form never calls remove_org_admin and sync_org_members only inserts. org_admins lists from admin_emails, so the retained admin is invisible.
- Impact: Retained access to a whole college's student data
- Minimal fix: Call remove_org_admin on removal; reconcile user_roles against admin_emails
- Regression test: Removed email has no org_admin role
- Verification: Found by verifier (N1) from source; no second reviewer
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-07: remove_org_admin matches by current email
- Category: Authorization. Severity: Medium. Confidence: High. Component: remove_org_admin
- Location: 20261008:286-287; 20261009:164
- Attacker privilege: org_admin
- Action: Move auth email to another registered address, then be removed
- Observed in source: Role deletion joins on current email so nothing matches.
- Impact: Insider persistence
- Minimal fix: Resolve by user_id
- Regression test: Removal works after an email change
- Verification: Verifier C6 CONFIRMED; the email change needs a run
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-08: NPTEL verified label is fail-open and not bound to the holder
- Category: Evidence integrity. Severity: Medium. Confidence: Medium. Component: api/connect.ts
- Location: api/connect.ts:279-287; 20261025:39
- Attacker privilege: Student
- Action: POST /api/connect {"credential":"nptel","ref":"<friend's ID>","skill":"..."}
- Observed in source: Holder name never compared; uniqueness is per user; any 200 without a not-found phrase is verified.
- Impact: Unearned "Verified at source" label
- Minimal fix: Require positive proof, compare the name to the roster, make ref unique per kind
- Regression test: Friend's ID and fabricated ID both refused
- Verification: Verifier C8 CONFIRMED; upstream page behaviour unknown
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-09: Credly and GATE name checks use editable full_name
- Category: Evidence integrity. Severity: Medium. Confidence: High. Component: api/connect.ts
- Location: api/connect.ts:126-138,307; 20261024000100:31-58; 20261008:47-54
- Attacker privilege: Student
- Action: PATCH full_name to blank or to the badge-holder's name, connect, restore
- Observed in source: full_name is writable and unpinned; blank skips the check.
- Impact: Stolen badges score up to level 85; GATE stays pending review
- Minimal fix: Compare with org_students.full_name server-side; fail when empty
- Regression test: Blank or edited name does not pass
- Verification: Verifier C9 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-10: Resume score and ai_fit come from text the student chooses
- Category: Evidence integrity. Severity: Medium. Confidence: High. Component: api/resume.ts
- Location: api/resume.ts:217-226,242; 20261008:51-54; Admin.tsx:793
- Attacker privilege: Student
- Action: Send any text to analyze, or PATCH resume_text then match
- Observed in source: The server never reads the stored PDF. ai_fit carries 0.5 weight in applicant sort. Injection effect on the model is unverified.
- Impact: Applicant ordering and recruiter-visible summary can be shaped
- Minimal fix: Extract server-side from the stored file; revoke update(resume_text); mark ai_fit advisory
- Regression test: Client text ignored by analyze
- Verification: Verifier C11 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-11: Drive branch rule is not enforced server-side
- Category: Business logic. Severity: Medium. Confidence: High. Component: meets_job_minimums
- Location: 20261024000100:104-121; eligibility.ts:229,251
- Attacker privilege: Student
- Action: Direct POST to job_applications for a drive limited to other branches
- Observed in source: RLS checks CGPA, backlogs and class marks but not branches. The code comment calls branch a hard requirement.
- Impact: A college criterion is bypassed
- Minimal fix: Add branches to meets_job_minimums
- Regression test: Wrong-branch insert refused
- Verification: Verifier C12 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-12: Recruiters can read JD text from other drives
- Category: Tenant isolation. Severity: Medium. Confidence: High. Component: can_view_user
- Location: 20261021:412-432; 20261008:172-177; 20261025:51-52
- Attacker privilege: Recruiter
- Action: GET /jd_matches?user_id=eq.<applicant>
- Observed in source: Full-profile access is documented as intended; over-exposure is jd_text and fit scores from other drives. Requires an application and non-private visibility.
- Impact: Company-to-company disclosure
- Minimal fix: Admin-only predicate for jd_matches, mock_feedback, progress_snapshots; limited recruiter view
- Regression test: Recruiter gets no jd_matches for other drives
- Verification: Verifier C13 PARTLY
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-13: College A can plant roles on college B's people
- Category: Tenant isolation. Severity: Medium. Confidence: High. Component: add_org_admin, org_recruiters, org_admins
- Location: 20261008:244-313; 20261021:328-331; auth.tsx:150
- Attacker privilege: org_admin
- Action: rpc/add_org_admin with a student of another college, then rpc/org_admins
- Observed in source: Role granted without consent; uuid and name returned; victim's UI flips and they lose the student portal. No further B data readable.
- Impact: Disruption and limited identity disclosure across colleges
- Minimal fix: Refuse emails rostered elsewhere or require acceptance
- Regression test: Cross-college grant refused
- Verification: Verifier C15 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-14: Oversized fields inflate AI token use per quota action
- Category: Resource consumption. Severity: Medium. Confidence: Medium. Component: api/chat.ts, api/resume.ts
- Location: api/chat.ts:39-42; api/resume.ts:109; profileShape.ts:84
- Attacker privilege: Student
- Action: PATCH target_roles with several MB, then chat
- Observed in source: Fields are neither clipped nor length-limited.
- Impact: Shared per-minute model budget exhaustion; bill impact unverified
- Minimal fix: Clip fields; cap prompt; add DB length checks and a per-minute limit
- Regression test: Oversized prompt refused
- Verification: Original review only
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-15: Published public statements contradicted by code
- Category: Privacy / accuracy. Severity: Medium. Confidence: High. Component: Legal.tsx, Help.tsx, Trust.tsx
- Location: Legal.tsx:17,22,45-47,49; Help.tsx:10; Trust.tsx:15-19
- Attacker privilege: n/a
- Action: Read /privacy and /security
- Observed in source: Forced change claim is UI-only; "39 tests" (48 exist, 4 vacuous); "delete your account" has no feature; providers omitted; no grievance contact.
- Impact: Inaccurate public statements; needs legal review, not an engineering conclusion
- Minimal fix: Correct the text; add a contact; legal review
- Regression test: Statements re-checked against code
- Verification: Verifier C24 PARTLY; encryption/audit/retention sub-claims rejected
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-16: Seat limit and roster removal bypass through email edits
- Category: Business logic. Severity: Low. Confidence: High. Component: org_students triggers
- Location: 20261021:309; 20261008:430; 20261010:106-117
- Attacker privilege: org_admin
- Action: PATCH org_students.email repeatedly
- Observed in source: Seat trigger ignores email changes and leaves stale links.
- Impact: Billing and roster invariant; insider only
- Minimal fix: Unlink on email change
- Regression test: Email edit cannot exceed seats
- Verification: Verifier C14 CONFIRMED
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-17: Connect rate limits are avoidable
- Category: Resource consumption. Severity: Low. Confidence: Medium. Component: api/connect.ts
- Location: api/connect.ts:324-325,335,349-351
- Attacker privilege: Student
- Action: Alternate null username with a sync, or submit invalid handles
- Observed in source: Limiter reads deletable rows and failures leave no row.
- Impact: Shared GitHub token exhaustion; unthrottled third-party requests
- Minimal fix: Attempts table written before fetch
- Regression test: Burst is limited
- Verification: Original review only
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-18: Five bad attempts lock a student's signup for an hour
- Category: Availability. Severity: Low. Confidence: High. Component: signup_attempt
- Location: 20261021:272
- Attacker privilege: None
- Action: Five failed attempts for the victim's email
- Observed in source: The limiter counts per email regardless of source.
- Impact: Targeted signup denial
- Minimal fix: Count per email and IP pair
- Regression test: Other IP is not locked out
- Verification: Original review only
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-19: Client match value accepted on application insert
- Category: Data integrity. Severity: Low. Confidence: High. Component: job_applications policy
- Location: 20261021:398-407; Admin.tsx:793,890
- Attacker privilege: Student
- Action: Insert job_applications with match:100
- Observed in source: No trigger rewrites it. It shows only when evidence is null and does not affect sort.
- Impact: Misleading figure on private profiles
- Minimal fix: Require match null; compute server-side
- Regression test: Forged match not stored
- Verification: Verifier C12 low impact
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-20: Smaller access-lifecycle gaps
- Category: Authorization. Severity: Low. Confidence: High. Component: several
- Location: 20261021:328-331; api/connect.ts:322,332; api/admin.ts:37,131; 20261025:50; 20261004:47
- Attacker privilege: Mixed
- Action: See items
- Observed in source: Recruiter email edit keeps the old role (N2); removed students keep non-college functions; admins can probe email existence; GATE row delete and PDF overwrite with no file hash (N4); resume_path not limited to own folder (peer resume shown with viewer's rights only).
- Impact: Minor
- Minimal fix: Per item
- Regression test: Per item
- Verification: N2, N4 by verifier; others original review
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

### SEC-21: Personal data in tracked files
- Category: Privacy. Severity: Low. Confidence: Medium. Component: migrations, README, video, office files, public/
- Location: 20261007:240; 20261010:136; README.md:64,72; video/capture.mjs:59,147; public/profile.jpg
- Attacker privilege: Anyone with repo access
- Action: Read the files
- Observed in source: Roll-format emails, a platform admin's personal email and an unreferenced portrait. Severity rises if the repo is public, which is unconfirmed.
- Impact: Phishing target and needless exposure
- Minimal fix: Use example identities; seed admins out of band; delete profile.jpg
- Regression test: gitleaks plus a PII grep in CI
- Verification: Original review only
- Reproduction: not executed (target execution blocked). Status CONFIRMED means the code path was proven by reading it.

## Needs validation (no definitive severity)

- **NV-01 Roles attach on auth.users insert with no email_confirmed_at check** (20261014:109-139; 20261011:37; 20261008:363-379): Source half confirmed. Signup OFF: not exploitable. Signup ON, confirm OFF: instant role for any pending email, including super_admin (would be Critical). Signup ON, confirm ON: password is attacker-chosen and works after the owner confirms an unsolicited mail. Also bypasses the roll check and limiter for rostered students. Test: Check Auth settings; on an isolated stack insert a pending email with null email_confirmed_at and inspect user_roles.
- **NV-02 Email change to a pending or unclaimed address** (20261024000000:12-15): Trigger only allowlists; a later admin_emails update re-grants by current email. Depends on confirmation settings. Test: Attempt on an isolated stack with autoconfirm on and off.
- **NV-03 Proxy may collapse per-IP Auth limits** (vercel.json:4; supabase.ts:9-10): If Supabase sees Vercel egress IPs, one abuser or a campus login spike could throttle everyone. Test: Staging: trip the limit from one IP, sign in from a second.
- **NV-04 Parallel signup attempts overshoot the limiter** (20261021:271-277): Read-committed count before insert. Test: 50 parallel calls on an isolated stack; at most 5 true.
- **NV-05 replace_rows duplicate or lost rows between writers** (20261006:266-270; resumeFlow.ts:42): Two concurrent calls may both insert. Test: Two parallel RPCs, count rows.
- **NV-06 Invites may fail: sendInvite omits the authorization header** (api/admin.ts:31,156): Verifier leans false; check auth.users.invited_at. Test: One invite on staging.
- **NV-07 UTC dates in an IST product** (store.tsx:134; jobs.ts:40; 20261021:403): Deadline may stay open until 05:30 IST next day. Test: Confirm DB timezone; test at 00:30 IST.
- **NV-08 Backup and PITR promise** (Landing.tsx:81): No evidence in source; no restore runbook. Test: Check dashboard; restore drill.
- **NV-09 Known-vulnerable dependency versions** (package-lock.json): No advisory DB queried. Versions look patched from memory; esbuild 0.21.5 is dev-only. Test: npm audit --omit=dev (needs approval).
- **NV-10 Contrast, screen reader, responsive, Web Vitals** (tailwind.config.js:16; HoldButton.tsx:66; Landing.tsx:99): #9a97ad computes to about 2.8:1 on white. Hold-to-confirm under VoiceOver unknown. Test: Browser, axe and Lighthouse in an isolated run.
- **NV-11 Drift between production and migrations** (supabase/migrations; 20261021:153-161): org_students_email_global is conditional; rls_auto_enable shows objects outside migrations. Test: Read-only schema diff by the owner.

## Rejected

- **REJ-01 Secret in git history**: gitleaks hit at commit 8a05cbc is the Supabase publishable key, public by design; identical to the current value. .env held only two VITE values.
- **REJ-02 useStudents silently truncates at 1000 rows**: It is paginated. The truncation risk applies to roster, recruiters and job_applications (DEF-13).
- **REJ-03 Legal pages make false encryption, audit or retention claims**: No such promises exist in Legal or Landing.
- **REJ-04 org_admin can reach super_admin directly**: Not found. Only through SEC-02 or NV-01.
- **REJ-05 Student can read another student's resume**: Folder predicate holds; avatar and resume policies cleared.

## Residual risk
Runtime behaviour, production Auth settings, live schema and dependency advisories are unverified. Absence of a finding is not proof of absence.
