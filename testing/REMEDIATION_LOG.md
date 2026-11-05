# Remediation log

Baseline `261d422`, audit 2026-11-05. Approved by the owner in chat ("all are approved ... push it"), which answered: batches 1 to 7, Docker and scanners, copying reports into the repo, and pushing. It did not cover running migrations on production, which the brief forbids from here, so the owner applies the migration.

**Decision taken for the owner (Batch 2):** the approval did not answer "should self-entered skills count in rankings?". The stricter option was taken, matching the owner's goal and the rule in `docs/EVIDENCE.md`: they do not count, and they are labelled self-rated. Reversing it means changing `src/lib/trust.ts`.

**Status meaning.** Fixed: code and tests are in, and tests pass on a local stand-in. Partly: the main path is closed, with the remainder stated. Not done: stated with the reason. Nothing here has run on the real Supabase Auth, the live database or Vercel: see `RELEASE_RUNBOOK.md`.

## Security

| ID | Root cause | Correction | Tests | Status |
|---|---|---|---|---|
| SEC-01 | Sign-up created confirmed accounts unless an env flag was set | Direct path removed; always the emailed link | API | Fixed, needs custom SMTP |
| SEC-02 | Domain rule only in the browser; roles attached to any account with the email | Domain trigger; roles need a proven mailbox; a college-made account stays in that college | DB | Fixed for new accounts. Squats from before the release cannot be told apart from real accounts |
| SEC-03 | One password per paste; flag in user-writable metadata | Random password per person, flag in `app_metadata`, 7-day expiry, RLS restrictive policies, admin functions refuse, `/api/password`, old passwords need a reset email | DB, API | Fixed |
| SEC-04 | No ownership proof | HMAC code on the public profile; one proven owner per handle; unproven stats excluded from rankings and recruiter views | DB, API | Fixed. Upstream field names are unverified against the live sites |
| SEC-05 | Rankings read typed levels, projects and internships | `lib/trust.ts` ranks on proven evidence, confirmed credentials and academics only | API | Fixed. Academics may be the student's own entry, locked at onboarding |
| SEC-06 | Form never removed the role | Trigger reconciles roles to the list; form calls the RPC; existing leftovers removed | DB, legacy | Fixed |
| SEC-07 | Removal joined on current email | Reconcile by user id; role holders cannot change email | DB | Fixed |
| SEC-08 | Fail-open lookup, not tied to the holder | Never self-verifies; placement cell confirms; one certificate one student; existing ones re-queued | DB, API, legacy | Fixed |
| SEC-09 | Compared editable `full_name` | Compares the roster name, fails closed | API | Fixed |
| SEC-10 | Scores from client text | `resume_text` server-written; AI fit advisory and out of sort; resume out of composite; prompts treat the resume as data | DB | Partly: analysis still reads browser-extracted text. A resume is the student's own document, so the score stays advisory |
| SEC-11 | Branches missing in the RLS check | `private.branch_codes` generated from `branches.ts`, parity tested | DB, parity | Fixed |
| SEC-12 | Recruiter predicate too wide | Admin-only predicate on three tables | DB | Fixed |
| SEC-13 | Grants ignored other colleges | `add_org_admin` and recruiter trigger refuse | DB | Fixed |
| SEC-14 | Fields unclipped | Clipping, 16 kB prompt ceiling, per-minute limit, length limits on writes | DB | Fixed |
| SEC-15 | Public text drifted from code | Legal, Help, Trust, Landing rewritten | Reviewed | Fixed, needs a real grievance contact and legal review |
| SEC-16 | Email edits kept stale links | Unlink on change | DB | Fixed |
| SEC-17 | Limiter read deletable rows | `connect_attempt` written before fetching | DB, API | Fixed |
| SEC-18 | Count per email only | Per email and IP pair, wider caps, serialized | DB | Fixed |
| SEC-19 | Client value kept | Trigger clears it | DB | Fixed |
| SEC-20 | Small gaps | Recruiter email change, removed students, resume path, scorecard fingerprint fixed | DB, API | Partly: admins can still learn whether an email has an account (accepted, low) |
| SEC-21 | Personal data in tracked files | README, capture script, portrait replaced or removed | Reviewed | Partly: historic emails remain in applied migrations 20261007, 20261008, 20261010 and in git history. History was not rewritten |

## Needs-validation items

| ID | Result |
|---|---|
| NV-01 | Reproduced on the old schema (a sign-up got the platform admin role). Fixed in the database. Turn public sign-up off as well |
| NV-02 | Fixed: role holders and rostered accounts cannot change email |
| NV-03 | Not tested: needs staging |
| NV-04, NV-05 | Fixed with advisory locks; parallel load not run |
| NV-06 | Header added, tested |
| NV-07 | Fixed: deadlines use India time in the policy and the UI |
| NV-08 | Unverified. The backup promise was removed from the landing page |
| NV-09 | `npm audit`: 0 high, 2 moderate, both react-router. Not exploitable here: one needs server rendering, the other an attacker-controlled path, and `notifications.link` is trigger-written. Fixing needs a major upgrade. Accepted |
| NV-10 | Contrast fixed; 375 px checked on two pages; no axe or screen-reader run |
| NV-11 | Open: no live schema comparison was possible |

## Defects

| ID | Status |
|---|---|
| DEF-01, 02, 03, 04, 05, 07, 09, 12, 14, 15, 16 | Fixed |
| DEF-06 | Partly: finished is written last, no single transaction |
| DEF-08 | Fixed: 60 s refresh while visible, dead toggles removed, stale Withdraw reported |
| DEF-10 | Fixed: track-based readiness and lead skill |
| DEF-11 | **Not done.** Needs your rules: grace period and what an expired college loses |
| DEF-13 | Partly: all lists paged; the student list still loads everything for each admin |
| REL-01 | Fixed in the repo. Blocks only after branch protection is on |
| REL-02 | Fixed: replay on empty and on old-style data in CI. Applying is still manual |
| REL-03 | Partly: `VITE_SUPABASE_DIRECT` added. No staging project exists |
| REL-04 | Fixed |
| REL-05 | Partly: health checks the database. No external error reporting, which needs an account |
| REL-06, 07, 08 | Fixed |
| ACC-01, 02, 03 | Fixed in code; Shell skip link and reduced motion not runtime-tested |
| SEO-01 | Fixed: public pages prerendered |
| SEO-02 | Partly: robots, sitemap, noindex and a not-found page are in. Unknown URLs still return HTTP 200 |
| PERF-01 | Fixed: entry JS 399 kB to 178 kB raw |
| PERF-02 | **Not done:** still 23 requests per load |
| UX-01 | Partly: sign-out on the password screen added |

## Found during remediation

- The migration, as first written, aborted on realistic data. Found by the independent verifier; `legacy_data.sql` now tests it.
- A typed project with `source: "github"` reached rankings. Fixed.
- Expiry timestamps were local time labelled UTC. Found by the new legacy test. Fixed.
- Not fixed, out of scope: company statistics such as "Applicants last drive" are generated by formula, and mock interview slots are hard-coded.
- The research paper no longer matches the product (test counts, recruiter and platform counts, equations 6 and 7). It was not edited.
- Audit correction: there are 50 core recruiters, not 53.
