# Defect register

Repo vivek-shaganti1/PlacementOS | branch main | commit 261d422 (261d42271b226f3186aca85d29b408e48fd4ed38) | working tree dirty: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (preserved, not part of the audited code) | audit date 2026-11-05

Source-level only. No application code, migration or test was executed; nothing was run against production.

### DEF-01: Partial college academics block onboarding
- Category: Functional. Severity: High. Component: Onboarding
- Location: 20261024000100:46-51,83-86; Onboarding.tsx:107-111; App.tsx:271
- Scenario: Roster with CGPA only; source becomes college, class_x 0; step 1 needs >0; saving raises ACADEMICS_LOCKED
- Impact: Student cannot enter the app until the cell uploads the rest
- Suggested fix: Set college only when all four exist, or lock per field
- Regression test: Partial upload completes onboarding
- Verification: Verifier C17 CONFIRMED

### DEF-02: Roster paste past 50 silently dropped
- Category: Functional. Severity: Medium. Component: Roster
- Location: api/admin.ts:99; AdminOrg.tsx:152-155,219
- Scenario: Paste 200 rows; 50 processed; box cleared
- Impact: Students cannot register and nobody is told
- Suggested fix: Chunk on the client; 422 on overflow
- Regression test: 200 rows all saved
- Verification: Verifier C16 CONFIRMED

### DEF-03: Fabricated alumni shown as your college's alumni
- Category: Functional. Severity: Medium. Component: AlumniNetwork
- Location: companies.ts:26-47; AlumniNetwork.tsx:9,20
- Scenario: Open Alumni
- Impact: False representation; AI drafts to invented people
- Suggested fix: Remove the page or use real data
- Regression test: No generated people shown
- Verification: Verifier C19 CONFIRMED

### DEF-04: Academic correction path is hazardous
- Category: Data integrity. Severity: Medium. Component: Roster
- Location: AdminOrg.tsx:60; api/admin.ts:14-18,146; 20261024000100:74
- Scenario: Short re-paste upserts blanks over roster fields
- Impact: Fixes damage roster data; no per-student editor
- Suggested fix: Audited correct_academics RPC with UI
- Regression test: Correction leaves other fields intact
- Verification: Original review

### DEF-05: No application state machine
- Category: Data integrity. Severity: Medium. Component: Applications
- Location: 20261021:23-44; Admin.tsx:800,892
- Scenario: offer to applied allowed; last write wins
- Impact: Offers vanish without audit
- Suggested fix: Transition check and history table
- Regression test: Invalid transition refused
- Verification: Original review

### DEF-06: updateProfile is non-atomic
- Category: Data integrity. Severity: Medium. Component: Profile
- Location: auth.tsx:137-141; Onboarding.tsx:139
- Scenario: skills fails while onboarded_at commits
- Impact: Onboarded with no skills
- Suggested fix: Single RPC; write onboarded_at last
- Regression test: Failure leaves not onboarded
- Verification: Original review

### DEF-07: Drive delete destroys offers
- Category: Data integrity. Severity: Medium. Component: Drives
- Location: Admin.tsx:812; 20261007:108; 20261014:163
- Scenario: Delete a drive with offers
- Impact: Placement records lost; no one told
- Suggested fix: Soft-delete; block when non-applied rows exist
- Regression test: Delete refused
- Verification: Original review

### DEF-08: Students are not told of status changes until reload; settings toggles do nothing
- Category: Functional. Severity: Medium. Component: Notifications
- Location: store.tsx:101; Admin.tsx:802; Settings.tsx:7-11; jobs.ts:49-62
- Scenario: Change status; student sees nothing; toggles unread; stale Withdraw deletes 0 rows silently
- Impact: Missed shortlists
- Suggested fix: Poll or subscribe; check affected rows; honour or remove toggles
- Regression test: Refetch shows the update
- Verification: Original review

### DEF-09: Resume pipeline partial failure
- Category: Reliability. Severity: Medium. Component: Resume
- Location: resumeFlow.ts:20-25; api/resume.ts:219-225
- Scenario: Unreadable upload replaces the good file; analysis stale; quota spent; jd_matches deleted
- Impact: Fit scored on the wrong resume
- Suggested fix: Analyse first, swap last; refund on model failure
- Regression test: Failed upload keeps old file
- Verification: Verifier C20 PARTLY (Low for the delete itself)

### DEF-10: Software terms in universal scores
- Category: Functional. Severity: Medium. Component: Scoring
- Location: predict.ts:79-81; admin.ts:23,72
- Scenario: Civil student has D=Z=0; I caps at 55, Score at 80
- Impact: Cross-branch rankings biased
- Suggested fix: Track-mapped skills
- Regression test: Non-software score can reach the maximum
- Verification: Original review

### DEF-11: Plan lifecycle unenforced
- Category: Functional. Severity: Medium. Component: Billing
- Location: pricing.ts:26; 20261021:230; AdminOrg.tsx:738,806
- Scenario: Trial never ends; suspension blocks only AI
- Impact: Revenue and contract terms unenforced
- Suggested fix: Expiry and suspension gates
- Regression test: Expired org blocked
- Verification: Original review

### DEF-12: Help placeholder and contradictions
- Category: Functional. Severity: Medium. Component: Help
- Location: Help.tsx:10,41
- Scenario: placements@college.edu is a placeholder
- Impact: Support dead-end
- Suggested fix: Real contact; correct FAQ
- Regression test: Contact valid
- Verification: Original review

### DEF-13: Unpaged roster, recruiters and applications
- Category: Performance. Severity: Medium. Component: Admin lists
- Location: admin.ts:33-62; AdminOrg.tsx:123,310; jobs.ts:51-52
- Scenario: Past max-rows, rows go missing; useStudents loads resume_text and JD history
- Impact: Silent missing rows; heavy pages at scale
- Suggested fix: Paginate; server-side summary RPC
- Regression test: 1,001 seeded rows all shown
- Verification: Verifier C18 PARTLY

### DEF-14: Software-heavy What-If and salary oddities
- Category: Functional. Severity: Low. Component: What-If
- Location: WhatIf.tsx:34; predict.ts:42
- Scenario: Orphaned skills can shift deltas; raising aptitude can lower expected salary
- Impact: Misleading simulation
- Suggested fix: Simulate over profile.skills; explain or change the metric
- Regression test: Delta is zero with no change
- Verification: Original review; first part NEEDS_VALIDATION

### DEF-15: Documentation mismatches
- Category: Documentation. Severity: Low. Component: Docs
- Location: README.md; docs/paper; .env.example; eligibility.ts:146,152,189
- Scenario: Paper says 66 recruiters in ten categories; code has 66 plus 50 core across 23; four platforms vs seven; undocumented rules; 7 env vars undocumented
- Impact: Readers misled; paper needs correcting before publication
- Suggested fix: Update docs and paper
- Regression test: Docs match code
- Verification: Original review

### DEF-16: RLS test suite has vacuous tests and large gaps
- Category: Test quality. Severity: Medium. Component: docs/evaluation/rls_tests.sql
- Location: rls_tests.sql:32,151,202,207
- Scenario: T01, T29, T38, T39 pass for the wrong reason; storage, anon, seats, cross-college roster untested
- Impact: Published "19 of 19" and "39 tests" over-state assurance
- Suggested fix: Fix and extend; run in CI
- Regression test: Tests fail on the defect
- Verification: Verifier C22 CONFIRMED

### REL-01: No gate to production
- Category: Delivery. Severity: High. Component: CI/CD
- Location: vercel.json; no .github
- Scenario: No CI, no tests on merge; push-to-deploy unconfirmed
- Impact: A push can break production unnoticed
- Suggested fix: See CI plan
- Regression test: Failing check blocks merge
- Verification: Original review

### REL-02: Migrations applied by hand; drift caused an outage
- Category: Delivery. Severity: High. Component: Database
- Location: 20261031000000; rls_tests.sql
- Scenario: tracks shipped 25 Oct, grant 31 Oct; every onboarding save failed in between
- Impact: Production schema unknowable from source
- Suggested fix: Tracked migrations; replay on clean DB; grant test
- Regression test: Clean replay passes
- Verification: Original review; incident observed in this session

### REL-03: No staging; previews would reach production
- Category: Delivery. Severity: Medium. Component: Environments
- Location: supabase.ts:9-10; vercel.json:5,18; api/_lib.ts:7
- Scenario: Non-localhost builds always use the production rewrite
- Impact: Previews touch real student data
- Suggested fix: Per-environment proxy; staging project
- Regression test: Preview hits staging
- Verification: Verifier C23 CONFIRMED

### REL-04: No admin audit trail
- Category: Reliability. Severity: Medium. Component: Accountability
- Location: AdminOrg.tsx:175,416; Admin.tsx:152,800
- Scenario: Roster deletes and status changes unrecorded
- Impact: Placement disputes cannot be resolved
- Suggested fix: Append-only audit table
- Regression test: Actions recorded
- Verification: Original review

### REL-05: No observability; health check skips the database
- Category: Reliability. Severity: Medium. Component: Monitoring
- Location: ErrorBoundary.tsx:15; api/health.ts
- Scenario: Only console output
- Impact: Students find outages first
- Suggested fix: Error reporting; DB probe
- Regression test: Probe fails when DB is down
- Verification: Original review

### REL-06: AI timeouts exceed platform limits and skip fallbacks
- Category: Reliability. Severity: Medium. Component: AI functions
- Location: api/_lib.ts:167; api/chat.ts; api/connect.ts:18
- Scenario: Timeout throws past fallback; chat can reach 40 s; quota spent
- Impact: 504s and lost quota
- Suggested fix: Catch per model; total budget
- Regression test: Fallback used on timeout
- Verification: Original review; platform limit NEEDS_VALIDATION

### REL-07: GitHub sync quota and silent empty evidence
- Category: Reliability. Severity: Medium. Component: api/connect.ts
- Location: api/connect.ts:25
- Scenario: 14+ calls per sync; token optional; failed tree fetch returns empty
- Impact: Understated evidence
- Suggested fix: Require token; surface failures
- Regression test: Failure is shown
- Verification: Original review

### REL-08: No account deletion; storage orphaned
- Category: Data lifecycle. Severity: Medium. Component: Privacy
- Location: Legal.tsx:22; AdminOrg.tsx:283; migrations
- Scenario: Deleting a user leaves roster PII, admin emails and storage objects
- Impact: Promise unmet; DPDP assessment needed (legal review)
- Suggested fix: Deletion flow covering rows and storage
- Regression test: Synthetic delete removes all
- Verification: Original review

### ACC-01: Keyboard and name gaps
- Category: Accessibility. Severity: Medium. Component: UI
- Location: AdminOrg.tsx:1054; AlumniNetwork.tsx:37; CompanyPanel.tsx:220; Certifications.tsx:85; Profile.tsx:256,288
- Scenario: Mouse-only rows, unnamed links, placeholder-only fields
- Impact: WCAG 2.1.1, 3.3.2, 4.1.2
- Suggested fix: Buttons, aria-label, labels
- Regression test: Keyboard and axe pass
- Verification: Source only

### ACC-02: Charts, route changes and status messages not announced
- Category: Accessibility. Severity: Medium. Component: UI
- Location: charts.tsx:51; PageTransition.tsx:36; Login.tsx:199; Onboarding.tsx:316
- Scenario: No alternatives, document.title never set, info alerts lack a role
- Impact: WCAG 1.1.1, 2.4.2, 4.1.3
- Suggested fix: role=img with summary, title hook, role=status
- Regression test: Screen reader pass
- Verification: Source only

### ACC-03: Reduced motion and structure gaps
- Category: Accessibility. Severity: Low. Component: UI
- Location: App.tsx:52; Login.tsx:109,117,212; Page.tsx:65; Settings.tsx:74
- Scenario: No MotionConfig; h2 before h1; no skip link
- Impact: Breaks a CLAUDE.md rule
- Suggested fix: MotionConfig reducedMotion=user; headings; skip link
- Regression test: Manual check
- Verification: Source only

### SEO-01: Crawlers get an empty shell
- Category: SEO. Severity: High. Component: index.html
- Location: index.html:6
- Scenario: One title for all routes, no OG, canonical, JSON-LD or noscript
- Impact: Public pages, including legal, invisible without JS
- Suggested fix: Prerender public routes; add metadata
- Regression test: curl shows content
- Verification: Source only

### SEO-02: No robots or sitemap; soft 404s; app routes indexable
- Category: SEO. Severity: Medium. Component: vercel.json
- Location: vercel.json:8,21
- Scenario: Rewrite returns index.html with 200; no noindex
- Impact: Crawl waste; shell only, no user data
- Suggested fix: Add files; real 404s; X-Robots-Tag
- Regression test: curl shows 404
- Verification: curl NEEDS_VALIDATION

### PERF-01: Heavy entry path
- Category: Performance. Severity: Medium. Component: App.tsx
- Location: App.tsx:15-27; Landing.tsx:99
- Scenario: Eleven or twelve eager pages (agents differ); initial 868 KB raw from an existing dist; intro hides the hero about 2.9 s
- Impact: Slow on campus networks
- Suggested fix: Lazy routes; remove or shorten the intro
- Regression test: Bundle budget
- Verification: dist predates HEAD; rebuild to measure

### PERF-02: Student load fan-out
- Category: Performance. Severity: Medium. Component: auth.tsx, store.tsx
- Location: auth.tsx:84,141; store.tsx:94
- Scenario: 23 requests per load; each updateProfile repeats 13
- Impact: Proxy and DB load at scale
- Suggested fix: One RPC
- Regression test: Request count
- Verification: Source only

### UX-01: Recommendations
- Category: UX. Severity: Low. Component: UI
- Location: Login.tsx:209; Landing.tsx:525; Admin.tsx:165,234; auth.tsx:84; supabase.ts:19
- Scenario: No sign-out on forced-password screen; college CTAs reach student signup; blocked pop-ups silent; roles reload only on user change; no idle timeout
- Impact: Friction; shared-computer risk
- Suggested fix: Per item
- Regression test: Per item
- Verification: Source only; recommendations, not defects
