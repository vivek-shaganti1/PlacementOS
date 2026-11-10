# Defect register

Repo vivek-shaganti1/PlacementOS | branch main | commit e1ee372 | working tree: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (user's, preserved, out of scope) | audit date 2026-11-10 | Phase A, source-level only: no target code, tests, browsers or databases were run, nothing touched production.

Confirmed: 1 High, 12 Medium, 35 Low. Needs validation: 10.

### W4-1: Keyboard-only users cannot upload a resume, and onboarding requires one
- Severity: High. Status: CONFIRMED (reproduced).
- Location: Onboarding.tsx:112-113,256-259; ResumeAnalyzer.tsx:122-130; Profile.tsx:126-128; ProfileExtras.tsx:488-491
- Actor or affected: keyboard user
- Impact: Cannot enter the app (WCAG 2.1.1)
- Minimal fix: sr-only input with a focusable label or button
- Regression test: Keyboard-only onboarding in Playwright
- Verification: A01 CONFIRMED High; RUNTIME: Reproduced in the local preview (fake backend): file input display:none, label tabIndex -1, not focusable.

### W4-13: Public grievance and security contact is still a placeholder
- Severity: Medium. Status: CONFIRMED.
- Location: Legal.tsx:10-12,31,58; Help.tsx:44
- Actor or affected: public
- Impact: Dead-end contact; DPDP expectations
- Minimal fix: Named contact and legal review
- Regression test: Contact present
- Verification: original reviewer only

### W4-16: Landing says tables "only you can read" while the privacy page says colleges and recruiters can
- Severity: Medium. Status: CONFIRMED.
- Location: HowItWorks.tsx:10; Legal.tsx:25
- Actor or affected: public
- Impact: Misleading public statement
- Minimal fix: Correct the copy
- Regression test: Copy review
- Verification: original reviewer only

### W4-2: Several inputs show no or almost no focus indicator
- Severity: Medium. Status: CONFIRMED.
- Location: Landing.tsx:286; Drives.tsx:42; SkillGap.tsx:34; Applications.tsx:104; Settings.tsx:107,127
- Actor or affected: keyboard user
- Impact: WCAG 2.4.7 / 1.4.11
- Minimal fix: Shared focus-visible ring
- Regression test: axe plus Tab pass
- Verification: original reviewer only

### W4-3: Fields labelled only by placeholder or not at all
- Severity: Medium. Status: CONFIRMED.
- Location: AdminOrg.tsx:255-260,296,405-407,483,935; ProfileExtras.tsx:199,344-346; MockInterviews.tsx:73,77; Drives.tsx:28-42; Admin.tsx:476,765
- Actor or affected: screen-reader user
- Impact: WCAG 1.3.1, 3.3.2, 4.1.2
- Minimal fix: Labels or aria-label
- Regression test: axe label rule
- Verification: original reviewer only

### W4-4: Small success-green text fails contrast
- Severity: Medium. Status: CONFIRMED.
- Location: #0d9a5b in Login.tsx:203, Page.tsx:176, CompanyPanel.tsx; #12b76a Landing.tsx:497
- Actor or affected: low-vision user
- Impact: WCAG 1.4.3
- Minimal fix: Use #067647 for small text
- Regression test: axe color-contrast
- Verification: original reviewer only

### W4-5: Assistant replies are not announced
- Severity: Medium. Status: CONFIRMED.
- Location: AssistantDrawer.tsx:94-115
- Actor or affected: screen-reader user
- Impact: WCAG 4.1.3
- Minimal fix: role=log aria-live
- Regression test: Screen reader check
- Verification: original reviewer only

### W5-11: Invented data shown as real: company statistics, cut-offs, mock interview slots, roadmap, Analytics sample chart
- Severity: Medium. Status: CONFIRMED.
- Location: data/companies.ts:34-53; MockInterviews.tsx:11-16; Roadmap.tsx; Analytics.tsx:14-20
- Actor or affected: all users
- Impact: Students and colleges act on fabricated numbers and bookings nobody receives
- Minimal fix: Remove or label as illustrative; hide booking
- Regression test: Snapshot test for disclaimers
- Verification: Also W4-18, W4-19

### W5-14: Classes page and recruiter list are unpaged
- Severity: Medium. Status: CONFIRMED.
- Location: AdminOrg.tsx:1003, :365
- Actor or affected: placement cell
- Impact: Silently incomplete above 1,000 rows
- Minimal fix: allRows and error handling
- Regression test: 1,001 seeded rows counted
- Verification: original reviewer only

### W5-22: Student page load still makes about 24 requests; each save re-runs 13
- Severity: Medium. Status: CONFIRMED.
- Location: auth.tsx:85-97; store.tsx:94-159
- Actor or affected: all students
- Impact: Load on the proxy and database at scale (PERF-02 open)
- Minimal fix: One profile RPC
- Regression test: Request count on cold load
- Verification: original reviewer only

### W5-24: Admin pages reload the whole student population on every visit, including all history rows
- Severity: Medium. Status: CONFIRMED.
- Location: src/lib/admin.ts:53-92; Admin.tsx:803-812
- Actor or affected: placement cell
- Impact: Slow pages for large colleges
- Minimal fix: Server summary RPC, latest rows only, caching
- Regression test: Payload with realistic seeds
- Verification: original reviewer only

### W5-25: 60-second polling re-downloads full drives and applications on every page
- Severity: Medium. Status: CONFIRMED.
- Location: src/lib/jobs.ts:51-74; store.tsx:123-130
- Actor or affected: all users
- Impact: Egress and database load
- Minimal fix: Narrow columns, deltas or one shared subscription
- Regression test: Bytes per minute on staging
- Verification: original reviewer only

### W5-4: Roster re-import blanks names, sections and academics and forces B.Tech
- Severity: Medium. Status: CONFIRMED (reproduced).
- Location: api/admin.ts:122-174; AdminOrg.tsx:55-66
- Actor or affected: org_admin (own action)
- Impact: Silent data loss; empty roster names then fail Credly and GATE checks
- Minimal fix: Upsert only non-empty columns; per-row academics; reject invalid values
- Regression test: Re-import email-only rows leaves data unchanged
- Verification: A01 CONFIRMED Medium; also W2-8; RUNTIME: Reproduced with the same upsert PostgREST performs: name blanked, program forced to B.Tech, CGPA nulled.

### W1-T: Several regression tests do not test what their names say
- Severity: Low. Status: CONFIRMED.
- Location: remediation_tests.sql:192-197 (SEC-16), :247 (NV-07), :162; rls_tests.sql T27; SEC-02 domain tests
- Actor or affected: n/a
- Impact: False assurance
- Minimal fix: Rewrite to exercise the real path
- Regression test: n/a
- Verification: W1 and W2-13

### W4-10: Top-bar menus lose focus on Escape
- Severity: Low. Status: CONFIRMED.
- Location: Topbar.tsx:26-38
- Actor or affected: keyboard user
- Impact: Focus lost
- Minimal fix: Return focus
- Regression test: n/a
- Verification: original reviewer only

### W4-14: Privacy description promises DPDP rights the page does not state
- Severity: Low. Status: CONFIRMED.
- Location: seo.ts:14; Legal.tsx:17-32
- Actor or affected: public
- Impact: Inaccurate metadata
- Minimal fix: Align text
- Regression test: n/a
- Verification: original reviewer only

### W4-15: Public test counts disagree (103 vs 104)
- Severity: Low. Status: CONFIRMED.
- Location: Trust.tsx:20,43; Legal.tsx:53
- Actor or affected: public
- Impact: Inaccurate claim
- Minimal fix: Single source
- Regression test: n/a
- Verification: original reviewer only

### W4-17: Recruiter count differs between sign-in and landing (66 vs about 116)
- Severity: Low. Status: CONFIRMED.
- Location: Login.tsx:125,128
- Actor or affected: public
- Impact: Inconsistent claim
- Minimal fix: Shared constant
- Regression test: n/a
- Verification: original reviewer only

### W4-22: Visibility option that does nothing
- Severity: Low. Status: CONFIRMED.
- Location: Settings.tsx:81
- Actor or affected: student
- Impact: Confusing
- Minimal fix: Remove or implement
- Regression test: n/a
- Verification: original reviewer only

### W4-23: /login and /signup indexable but served with landing metadata
- Severity: Low. Status: CONFIRMED.
- Location: seo.ts:27-28; vercel.json
- Actor or affected: n/a
- Impact: SEO mismatch
- Minimal fix: Prerender or noindex
- Regression test: curl
- Verification: original reviewer only

### W4-24: Nested unknown paths under app prefixes return 200
- Severity: Low. Status: CONFIRMED.
- Location: vercel.json rewrite (/.*)?
- Actor or affected: n/a
- Impact: Soft 404s
- Minimal fix: Exact sub-routes
- Regression test: curl
- Verification: original reviewer only

### W4-6: Marquee and carousels move without a pause control; marquee names read twice
- Severity: Low. Status: CONFIRMED.
- Location: Landing.tsx:435-442,592-596
- Actor or affected: screen-reader user
- Impact: WCAG 2.2.2
- Minimal fix: Pause control; aria-hidden duplicate
- Regression test: n/a
- Verification: original reviewer only

### W4-7: Roles tabs are incomplete ARIA tabs
- Severity: Low. Status: CONFIRMED.
- Location: Landing.tsx:445-472
- Actor or affected: keyboard user
- Impact: Confusing navigation
- Minimal fix: Tabs pattern or plain buttons
- Regression test: n/a
- Verification: original reviewer only

### W4-9: Login and Onboarding lack main landmark; onboarding lacks h1; loading not announced
- Severity: Low. Status: CONFIRMED.
- Location: Login.tsx:108; Onboarding.tsx:197-302; App.tsx:30-37
- Actor or affected: screen-reader user
- Impact: Orientation
- Minimal fix: Landmarks and status
- Regression test: n/a
- Verification: original reviewer only

### W5-1: Onboarding academics step does not show college-owned or locked values
- Severity: Low. Status: CONFIRMED.
- Location: Onboarding.tsx:42,106-111; migration :604-645
- Actor or affected: student
- Impact: Refused or silently replaced edits
- Minimal fix: Read-only fields with the verified badge
- Regression test: Partial and full roster fixtures
- Verification: A01 narrowed to edit paths

### W5-10: Self-tracked company applications read like real applications and offers
- Severity: Low. Status: CONFIRMED.
- Location: store.tsx:234-246; Applications.tsx; Dashboard.tsx:108
- Actor or affected: student
- Impact: Inflated offer counts
- Minimal fix: Label as a personal tracker
- Regression test: Offers stat counts job_applications only
- Verification: original reviewer only

### W5-12: Predictions do not say their inputs are catalogue estimates; student and college readiness differ unexplained
- Severity: Low. Status: CONFIRMED.
- Location: predict.ts:12,46-61; Dashboard.tsx:27,109
- Actor or affected: student
- Impact: Explainability rule in CLAUDE.md not met
- Minimal fix: Info line and college-view score
- Regression test: n/a
- Verification: original reviewer only

### W5-13: New-drive notifications go to every student, repeatedly
- Severity: Low. Status: CONFIRMED.
- Location: 20261008:220-235
- Actor or affected: students
- Impact: Noise; retention
- Minimal fix: Filter by eligibility; notify once
- Regression test: n/a
- Verification: original reviewer only

### W5-15: Analytics history hides newest scores after 50 analyses
- Severity: Low. Status: CONFIRMED.
- Location: history.ts:33-34
- Actor or affected: student
- Impact: Wrong trend
- Minimal fix: Order newest first then reverse
- Regression test: n/a
- Verification: original reviewer only

### W5-16: Snapshot day and deadline display ignore India time
- Severity: Low. Status: CONFIRMED.
- Location: store.tsx:144; Jobs.tsx:139
- Actor or affected: student
- Impact: Off-by-one dates
- Minimal fix: IST helper
- Regression test: n/a
- Verification: original reviewer only

### W5-17: AI deadline covers only the model call; browser call has no timeout
- Severity: Low. Status: NEEDS_VALIDATION.
- Location: api/_lib.ts:203-212; src/lib/api.ts:8
- Actor or affected: student
- Impact: Function killed before refund; UI waits forever
- Minimal fix: One request deadline; AbortController
- Regression test: Slow-stub test
- Verification: original reviewer only

### W5-18: GitHub sync deletes repos before re-inserting
- Severity: Low. Status: CONFIRMED.
- Location: api/connect.ts:436-437
- Actor or affected: student
- Impact: Failure leaves zero repos
- Minimal fix: Upsert, then delete stale
- Regression test: n/a
- Verification: original reviewer only

### W5-19: Fallback model id qwen/qwen3.8-27b looks invalid
- Severity: Low. Status: NEEDS_VALIDATION.
- Location: api/_lib.ts:197
- Actor or affected: n/a
- Impact: Wasted fallback time
- Minimal fix: Verify model list
- Regression test: Health ping on staging
- Verification: Also W3-18

### W5-2: Edits to college, branch, batch, email and roll are silently reverted
- Severity: Low. Status: CONFIRMED.
- Location: Profile.tsx:23-25,88-90; Onboarding.tsx:36-38
- Actor or affected: student
- Impact: False success message
- Minimal fix: Read-only once rostered
- Regression test: UI refuses the edit
- Verification: original reviewer only

### W5-20: Malformed AI JSON returns a generic 500
- Severity: Low. Status: CONFIRMED.
- Location: api/_lib.ts:286-288
- Actor or affected: student
- Impact: Unclear error
- Minimal fix: Catch second parse
- Regression test: n/a
- Verification: original reviewer only

### W5-21: Chunk-load errors need a manual reload; no error reporting; health ignores Auth and Storage
- Severity: Low. Status: CONFIRMED.
- Location: ErrorBoundary.tsx:14-31; api/health.ts:20-22
- Actor or affected: all
- Impact: Outages found by users
- Minimal fix: Reload once on chunk error; reporting; wider probe
- Regression test: n/a
- Verification: original reviewer only

### W5-23: Staff sessions run the student data loader
- Severity: Low. Status: CONFIRMED.
- Location: Shell.tsx:185-191
- Actor or affected: staff
- Impact: Wasted queries
- Minimal fix: Mount only for students
- Regression test: n/a
- Verification: original reviewer only

### W5-3: Onboarding hides the ownership proof code and shows unproven evidence
- Severity: Low. Status: CONFIRMED.
- Location: Onboarding.tsx:68,124; connect.ts:439
- Actor or affected: student
- Impact: Accounts stay unproven without the student knowing
- Minimal fix: Show code; use provenIntegrations
- Regression test: Connect returning proven:false shows the code
- Verification: A01 lowered to Low

### W5-5: A 50-person login batch can time out and lose passwords
- Severity: Low. Status: NEEDS_VALIDATION.
- Location: api/admin.ts:50-65,149-184
- Actor or affected: placement cell
- Impact: Created logins without returned passwords
- Minimal fix: Read orgs once; smaller batches
- Regression test: Latency-stubbed batch
- Verification: Also W3-11

### W5-6: Deleting a drive with only fresh applications tells nobody
- Severity: Low. Status: CONFIRMED.
- Location: Admin.tsx:828-833; migration :888-899
- Actor or affected: placement cell
- Impact: Students lose applications silently
- Minimal fix: Notify or soft-delete
- Regression test: Applicants notified
- Verification: original reviewer only

### W5-7: Status dropdown offers moves the database refuses
- Severity: Low. Status: CONFIRMED.
- Location: Admin.tsx:910-912
- Actor or affected: placement cell, recruiter
- Impact: Error after click
- Minimal fix: Offer only valid next steps
- Regression test: Options for an offer row
- Verification: original reviewer only

### W5-8: A failed account deletion strands the student on the waiting screen
- Severity: Low. Status: CONFIRMED.
- Location: api/account.ts:33-47; App.tsx:99-114
- Actor or affected: student
- Impact: Half-deleted account with no way to retry
- Minimal fix: Delete the login before the roster row, or allow retry from the waiting screen
- Regression test: Stub auth DELETE 500
- Verification: A01 lowered to Low

### W5-9: Resume replace and remove can leave file, path and analysis out of step
- Severity: Low. Status: CONFIRMED.
- Location: resumeFlow.ts:22-31; api/resume.ts:228-230
- Actor or affected: student
- Impact: Analysis describes a different file
- Minimal fix: One server action, storage deleted last
- Regression test: Failure injection
- Verification: original reviewer only

### W6-10: esbuild used by tests but not declared
- Severity: Low. Status: CONFIRMED.
- Location: package.json:11
- Actor or affected: n/a
- Impact: Fragile test command
- Minimal fix: Declare it
- Regression test: n/a
- Verification: original reviewer only

### W6-2: Database test runner treats a NULL result as a pass
- Severity: Low. Status: CONFIRMED (reproduced).
- Location: scripts/test-db.sh:31,45; legacy_tests.sql; rls_tests.sql
- Actor or affected: n/a
- Impact: Green CI for broken access tests in two of three suites
- Minimal fix: Fail when passed != total or on empty results
- Regression test: A NULL test turns CI red
- Verification: A01 PARTLY: remediation suite immune; RUNTIME: Reproduced: a suite printing "0 | 1" left the runner exit code 0 (raw/nullpass.log).

### W6-3: 18 negative RLS tests pass on any error
- Severity: Low. Status: CONFIRMED.
- Location: docs/evaluation/rls_tests.sql e.g. :270,:275
- Actor or affected: n/a
- Impact: Tests may test nothing
- Minimal fix: Catch specific SQLSTATEs
- Regression test: n/a
- Verification: original reviewer only

### W6-4: Empty-database re-run failure does not fail the script
- Severity: Low. Status: CONFIRMED.
- Location: scripts/test-db.sh:26
- Actor or affected: n/a
- Impact: Missed idempotency failure
- Minimal fix: Explicit exit
- Regression test: n/a
- Verification: original reviewer only

### W6-5: Entry-chunk CI check cannot catch GSAP and misreads three
- Severity: Low. Status: CONFIRMED.
- Location: ci.yml:24; vite.config.ts:50-54
- Actor or affected: n/a
- Impact: Performance rule not enforced
- Minimal fix: Follow real entry imports
- Regression test: n/a
- Verification: original reviewer only

### W6-6: Actions pinned to tags, not SHAs
- Severity: Low. Status: CONFIRMED.
- Location: ci.yml:14,15,46,47,56,59
- Actor or affected: n/a
- Impact: Supply-chain risk (read-only token)
- Minimal fix: Pin SHAs; Dependabot
- Regression test: n/a
- Verification: Also W3-22

### W6-8: CI does not gate deploys
- Severity: Low. Status: CONFIRMED (repo); dashboard NEEDS_VALIDATION.
- Location: vercel.json; ci.yml
- Actor or affected: n/a
- Impact: Red main can ship
- Minimal fix: Branch protection; wait for checks
- Regression test: n/a
- Verification: original reviewer only

### W6-9: Migrations applied by hand with no ledger or tested rollback
- Severity: Low. Status: CONFIRMED.
- Location: RELEASE_RUNBOOK.md
- Actor or affected: n/a
- Impact: Schema drift and unrecoverable failures
- Minimal fix: Ledger or db push; restore drill
- Regression test: n/a
- Verification: original reviewer only

### W4-11: Error toasts vanish after 3.5 s
- Severity: —. Status: NEEDS_VALIDATION.
- Location: store.tsx:83-86
- Actor or affected: user
- Impact: WCAG 2.2.1
- Minimal fix: Persist errors
- Regression test: n/a
- Verification: original reviewer only

### W4-12: Manifesto text starts at 18% opacity
- Severity: —. Status: NEEDS_VALIDATION.
- Location: ScrollHighlight.tsx:17-20
- Actor or affected: user
- Impact: CLAUDE.md rule
- Minimal fix: Start readable
- Regression test: n/a
- Verification: original reviewer only

### W4-20: Landing mock-ups may read as real customers
- Severity: —. Status: NEEDS_VALIDATION.
- Location: Landing.tsx:422,494-498
- Actor or affected: public
- Impact: Possible misrepresentation
- Minimal fix: Label as illustration
- Regression test: Owner confirms
- Verification: original reviewer only

### W4-21: Pricing buttons lead colleges to a sign-in they cannot use when no sales email is set
- Severity: —. Status: NEEDS_VALIDATION.
- Location: Landing.tsx:69-78
- Actor or affected: college
- Impact: Dead end
- Minimal fix: Contact form or email
- Regression test: Owner confirms env
- Verification: original reviewer only

### W4-8: Single-key shortcuts G and S cannot be turned off
- Severity: —. Status: NEEDS_VALIDATION.
- Location: Landing.tsx:216-231
- Actor or affected: speech-input user
- Impact: WCAG 2.1.4
- Minimal fix: Modifier or toggle
- Regression test: Speech input test
- Verification: original reviewer only

### W6-11: CI database collation differs from local runs
- Severity: —. Status: NEEDS_VALIDATION.
- Location: scripts/test-db.sh:10
- Actor or affected: n/a
- Impact: Collation-dependent results
- Minimal fix: Set locale in CI
- Regression test: Actions log
- Verification: original reviewer only

### W6-7: Gitleaks action may lack pull-request permissions
- Severity: —. Status: NEEDS_VALIDATION.
- Location: ci.yml:7-8,59-61
- Actor or affected: n/a
- Impact: PR job may fail
- Minimal fix: pull-requests: read
- Regression test: PR log
- Verification: original reviewer only
