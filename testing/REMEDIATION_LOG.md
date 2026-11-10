# Remediation plan (nothing has been fixed in this audit)

Repo vivek-shaganti1/PlacementOS | branch main | commit e1ee372 | dirty: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (preserved, out of scope) | audit date 2026-11-10 | Phase A, source-level only.

| Batch | Scope | Findings | Main files | DB change | Size |
|---|---|---|---|---|---|
| 0 | Read-only production checks | W1-10, W2-3, W2-10, W1-5, W1-6, W1-9, W3-14 | none | none | Small |
| 1 | Tenant and ownership | W1-1, W1-2, W1-3, W1-4, W2-1, W3-1, W3-7 | migration (new), api/connect.ts | Yes | Medium |
| 2 | Accessibility blocker and labels | W4-1, W4-2, W4-3, W4-4, W4-5, W4-9, W4-10 | Onboarding, ResumeAnalyzer, Profile, ProfileExtras, shared field styles | No | Medium |
| 3 | Data integrity | W5-4, W5-8, W5-9, W5-18, W2-8 | api/admin.ts, api/account.ts, resumeFlow.ts, connect.ts | No | Medium |
| 4 | Test runner and CI | W6-2, W6-3, W6-4, W6-5, W6-6, W6-10, W1-T | scripts/test-db.sh, tests, ci.yml, package.json | No | Small |
| 5 | Honest content | W5-11, W4-13, W4-14, W4-15, W4-16, W4-17, W4-22, W5-10, W5-12 | data/companies.ts, MockInterviews, Roadmap, Analytics, Legal, Trust, HowItWorks | No | Medium |
| 6 | Smaller security hardening | W1-7, W1-8, W1-12, W2-6, W2-7, W2-11, W3-2, W3-4, W3-5, W3-8, W3-10, W3-20 | api/*, migration | Yes | Medium |
| 7 | Environments and release | W6-1, W6-8, W6-9, W2-9 | vercel.json, supabase.ts, _lib.ts, process | Staging project | Medium |
| 8 | Performance | W5-22, W5-24, W5-25, W5-14, W5-23 | auth.tsx, store.tsx, admin.ts, jobs.ts | Optional RPCs | Large |
| 9 | Remaining functional Low items | W5-1, W5-2, W5-3, W5-6, W5-7, W5-13, W5-15, W5-16, W5-20, W5-21, W4-6, W4-7, W4-23, W4-24 | many | Small | Medium |

Regression plan: a test for every confirmed item that fails on the old behaviour; replay plus the three suites (with W6-2 fixed first so results are trustworthy); a legacy-data replay; a keyboard-only Playwright onboarding run; verifier re-check. Rollback: code by redeploy; database by forward-fix migration and a backup taken before applying.

## Status of earlier findings (by code review)
Closed: SEC-06, SEC-07 (new DB), SEC-10 (DB part), SEC-11, SEC-12 (tables), SEC-16, SEC-19, NV-05, NV-06, NV-07, DEF-03, DEF-05 (DB), DEF-07 (outcomes), REL-08 (main path), PERF-01 (code), SEO-01 (source).
Partly: SEC-01 (needs sign-up off), SEC-02, SEC-03 (needs migration), SEC-04, SEC-08, SEC-09, SEC-13, SEC-14, SEC-15, SEC-17, SEC-18, SEC-20, NV-01, NV-02, NV-04, DEF-01, DEF-02, DEF-04, DEF-06, DEF-09, DEF-13, DEF-16, REL-01, REL-03, REL-04, REL-05, REL-06, REL-07, ACC-01, ACC-02, ACC-03, SEO-02, UX-01.
Open: NV-11, DEF-11, PERF-02, REL-02 (manual applying).


## Remediation of batches 1 to 4 (approved 2026-11-10)

Approved by the owner in chat: "approve batches 1 to 4 and copy reports to testing and I want all the functionalities to be tested end to end". Not approved and not done: applying migrations to production, deploying, pushing, a local Supabase stack (Docker, Supabase CLI).

| Item | Change | Files | Tests | Result |
|---|---|---|---|---|
| W1-1 | Another college's email domain counts as "belongs elsewhere" | migration 20261110000000 | followup W1-1 x3; e2e J11 | Fixed |
| W1-2 | One neutral refusal message from roster and recruiter checks | migration; api/admin.ts | followup W1-2 | Fixed |
| W1-3 | Accepting an invite never raises; a disputed recruiter row is left unlinked and no role is granted | migration (sync_recruiter_role, attach_user_to_org) | followup W1-3 x2, F3 | Fixed |
| W1-4, W2-1 | A roster link can be cleared (deleted login, unconfirmed account, admin unlink, which also removes college access) and re-links on re-import | migration (link_roster_entry) | followup W1-4 x2, W2-1 x4; e2e J12 | Fixed |
| W3-7 | Several pending claims allowed; only one confirmed per certificate | migration (index, review_credential) | followup W3-7 x3; remediation SEC-08 | Fixed |
| W3-1 | Credly ownership needs the exact full roster name | api/connect.ts | api W3-1 | Fixed |
| W4-1 | File uploads reachable by keyboard with visible focus; onboarding upload disabled while busy | Onboarding, ResumeAnalyzer, Profile, ProfileExtras | browser checks | Fixed |
| W4-2 | Visible focus on every control (not on programmatic page containers) | index.css | browser check | Fixed |
| W4-3 | Names for unlabelled fields | AdminOrg, ProfileExtras, MockInterviews, Drives, SkillGap, Admin, Feedback | code review | Fixed |
| W4-4 | Small green text darkened to 5.7:1 | 17 files | code review | Fixed |
| W4-5 | Assistant replies in an announced log | AssistantDrawer | browser check | Fixed |
| W4-9 | Main landmarks on Login and Onboarding; one h1 per onboarding step; loading status | Login, Onboarding, App, Shell | browser check | Fixed |
| W4-10 | Menus return focus on Escape and close when focus leaves | Topbar | code review | Fixed |
| W5-4, W2-8 | Re-import writes only filled cells; impossible values reported per row; "NA" and dashes count as blank; a refused group is reported row by row | api/admin.ts | api W5-4 x2, F7 | Fixed |
| W5-8 | Login deleted before the roster row; old order only when the database refuses | api/account.ts | api W5-8 | Fixed |
| W5-9 | Server records the resume file with its text and analysis; path checked; removal clears references before the file | api/resume.ts, resumeFlow.ts, ResumeAnalyzer.tsx | api W5-9 x2; browser onboarding upload | Fixed |
| W5-18 | GitHub repos saved before stale ones are removed | api/connect.ts | api W5-18 | Fixed |
| W6-2, W6-4 | Runner fails on empty results, totals that do not add up and a non-re-runnable migration; legacy data now precedes the security migrations | scripts/test-db.sh | null-result check: exit 1 | Fixed |
| W6-3 | Each negative RLS test expects its exact refusal code | docs/evaluation/rls_tests.sql | 48/48 | Fixed |
| W6-5 | Entry check follows the real entry's static imports | scripts/check-entry.mjs, ci.yml | fails on a planted static import, passes on lazy | Fixed |
| W6-6, W6-7 | Actions pinned to commit SHAs; gitleaks permissions and comments; timeouts; weekly schedule; dev audit reported | ci.yml | not run in GitHub | Fixed in repo |
| W6-10 | esbuild declared | package.json | test:unit | Fixed |
| W1-T | Mislabelled tests now test their claim (SEC-16 email edit, NV-07 behaviour, SEC-02 messages, T27 role check, DEF-01 both results) | test files | suites | Fixed |

Regression evidence: the follow-up suite fails 10 of 15 checks on the schema before 20261110; the six Batch 3 API tests fail on the code before Batch 3. Independent review found no new vulnerability and eight issues in the first version of these changes (F1 to F8); all eight were fixed and re-tested.

Rollback: code by redeploying the previous build; the migration has no down script, and the functions it replaces are in 20261105000000.
