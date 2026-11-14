# Changelog

Semantic versioning; see `docs/ENGINEERING.md` for how releases are made.

## Unreleased

### Added
- **Download my data** (Settings, every role): one JSON file with everything stored about the account.
- **Activity log** for placement cells and platform admins: who changed the roster, access, drives and certificates,
  with a filter, search and CSV export.
- **Automatic sign-out** after 30 minutes without activity (15 for admins), with a one-minute warning.
- **Add deadline to calendar** on a drive: an `.ics` file with a reminder the day before.
- **Search for every role:** ⌘K also finds pages, and admins and recruiters now have the search box.
- **Contact us** replaces "Get started" on the landing page: a form for colleges, stored and rate-limited on the
  server, with an Enquiries page for platform admins. Students still register from the sign-in page.
- **Mobile app scaffold** (`mobile/`, Expo SDK 58) for iOS and Android: student sign-in, readiness, drives and account,
  using the website's own scoring code. Includes a release workflow for store builds and over-the-air updates. Not yet
  in the stores; see `docs/MOBILE.md`.
- **Live college console:** new applications, status changes, drive edits, students joining and certificate reviews
  appear by themselves for placement cells, recruiters and platform admins. A badge shows whether the page is live, a
  toast and a "New" tag mark arriving applications, and pages fall back to a 15-second refresh where the network
  blocks the live connection.
- Landing hero: the eligibility board now plays a live loop. The assistant names a fix, a scan sweeps the board and
  that company moves up a column while readiness and the resume score follow. It also has a cursor spotlight, a tilt
  sheen, depth layers and a turning halo. It pauses off-screen and stays still for reduced motion.
- **Two-factor sign-in for platform admins and placement cells** (authenticator app). It is enforced in the database, and
  a password-only session has no admin powers. Settings has a card for adding a backup app.
- **Settings for every role.** Admins and recruiters can now change their password in the app.
- **Full-stack CI** against a throwaway stack:
  - Playwright on every page for every role.
  - pgTAP access tests.
  - OWASP ZAP active scan with a reviewed gate.
  - Lighthouse budgets.
- A weekly read-only Lighthouse check of the live site.
- A post-deploy smoke check of production.
- Nightly encrypted database backups, each restored into a throwaway database to prove it works.
- Dependabot for GitHub Actions and npm packages.
- `docs/ENGINEERING.md`, a pull request template and this changelog.

### Changed
- Fonts are self-hosted (no requests to Google) and the main ones are preloaded.
- `@supabase/supabase-js` 2.117.2 → 2.119.0.
- Days count in India time for practice streaks and daily snapshots.
- The CSV export opens correctly in Excel.

### Fixed
- **Security (2026-11-14 audit):** react-router 6 → 7.18.5 removes the two production dependency advisories;
  notification links are limited to in-app paths; Dependabot waits 7 days before proposing a new release. Report:
  `testing/SECURITY_AUDIT_2026-11-14.md`.
- **Scrolling:** looping decorative animations (spinning borders, the trust grid, the footer wordmark, the hero halo)
  now pause while off-screen, the grid moves on the GPU, and the sidebar's border no longer spins in the app.
- **Roster paste:** a quoted name containing a comma ("Rao, Asha") no longer shifts the columns.
- **Scoring for non-software branches.** Each company category had one skill list for every student, so a robotics,
  EV, metallurgy, mining, textile or agricultural student scored 40% everywhere however strong they were, and a civil
  student could never pass "Can become". Students are now also scored on their own track's skills at each company, and
  the better result counts. The company page says which skills were used. Pure software branches score exactly as before;
  Cyber Security and IoT specialisations improve at the companies their second track covers.
- **Roadmap, practice sets and mock interview types** now follow the student's branch (they were software-only): core
  branches get a plan built from their own skill gaps, core-subject questions, and a core technical round.
- **Scorecard and resume paths:** a GATE scorecard or resume path could point into another student's folder.
- **File types:** uploads are now checked by their content, not only by the type the uploader declared.
- **Evidence:** a failed GitHub or Codeforces sync could erase proven evidence.
- **Batch logins:** one failure in a batch of "create logins" lost the other passwords.
- **Error codes:** timeouts and outages were reported as 500.
- **Deleted accounts:** a deleted account's open session could still upload files.
- **Database:** nine indexes were missing, and some admin actions were not in the audit log.
- **Landing page:** accessibility rose from 93 to 100.

## 0.1.0 — 2026-11-10

The first audited release: security remediation, roster and recruiter fixes, and full-stack test reports in `testing/`.
