# Changelog

Semantic versioning; see `docs/ENGINEERING.md` for how releases are made.

## Unreleased

### Added
- **Placement score** on the dashboard: one number out of 100 covering academics, track skills, proven skills, projects,
  internships, resume, certifications, aptitude, interview practice and achievements. Each part shows its points, where
  its number comes from (college records, proven, self-reported) and the next step that would raise it
  (`placementScore` in `src/lib/predict.ts`). Readiness and rankings are unchanged.
- **The engineering tree.** Branches, career tracks, job roles and skills now live as a tree of files
  (`src/data/engineering/`: Engineering → family → branch → track → role → skills) with a generated map in its README.
  59 job roles were added across the 18 tracks. Nothing a student sees changes, apart from the two fixes below.
- **New landing page.** It opens with the question students ask and answers it by running the real eligibility engine in the
  visitor's browser: change a sample student's marks and skills, see which companies open, why, and the one change that
  moves the most. Then why it exists, what each kind of person sees, how it works in four moves, how a season runs, and plans with a
  price worked out for the college's size, in glass over the aurora. Behind it, one
  WebGL scene: a flowing gradient, glass that refracts it, and the mark in liquid metal (notices in
  `THIRD_PARTY_NOTICES.md`). Phones, reduced motion, weak or lost GPUs get the same page with a still backdrop, and the
  background can be paused.
- **Checklist review (23 Nov):** error reports through Sentry with personal data removed (off until a DSN is set), a
  15-minute uptime check and backup alerts as GitHub issues, consent and age at set-up, a platform-wide daily AI cap and
  off switch, token counts, data retention, an API description checked in CI, a local load test, a signed-in ZAP scan.
- **Live company data.**
  - Platform admins verify companies in a new Companies page: description, careers page, fresher CTC and the source
    they checked. Students see "CTC (verified)" with the check date and source. Unverified companies keep the typical
    figures with their warning.
  - Company pages show **what happened at the student's own college**: drives, applicants, shortlists and offers.
    Counts are withheld below three applicants.
  - Company pages list **open roles live** from the company's public Greenhouse, Lever or Ashby job board.
  - Campus Jobs has an **off-campus search** (Adzuna, India) once `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are set in Vercel.
  - Needs migration `20261116000000_company_catalog.sql`. Until it runs, the app behaves as before.
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
- **Motion that shows a change:** What-If numbers glide to their new value as a slider moves, the before/after bars
  slide, and companies that change category arrive and leave in the list. The jobs filter has a sliding pill and rows
  that enter and leave with the filter. "Show more" in the eligibility stacks grows the extra cards in. Nothing
  animates on load, and reduced motion swaps values instantly.
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
- **Branch names:** "AI & Data Science" was read as Data Science, and "Electronics & Computer Engineering" as CSE, so its
  students started on the software track instead of embedded. Fixed in the app and in the database's drive rule.
- **Landing claims that were not true or not checkable** are gone: "parsed in your browser" (it is on the server), a
  hard-coded test count, response times, "most chosen", a named college with a plan, recruiters posting drives, and a
  question box that only led to the sign-in page.
- **Landing page without WebGL:** where the browser cannot create a WebGL context (blocked GPU, old driver), the whole page
  was replaced by the error screen. It now asks first, and a 3D failure falls back to the static glow.
- **Admin console at scale:** reading 5,000 students' skills took 21.9 s (Postgres cancels at 8 s); it takes 33 ms.
- **Resume score** is computed from the stored file on the server; text sent by the browser is ignored.
- **Password reset:** a stolen session could mark itself as needing a new password and then set one.
- **College admins** can no longer be created with a password the creator knows.
- **Bulk logins** answer before the server's time limit and hand back whoever was not reached, so no password is lost.
- **AI actions** are given back when the prompt cannot be built or the result cannot be saved.
- **Previews** cannot reach the production database.
- An active college can no longer be deleted; audit entries lose grades when an account is deleted; AI months follow
  India time; parallel sign-ups cannot pass the per-address limit; our own bugs answer 500, not 502.
- Personal documents are no longer tracked in this public repository (history still holds them).
- Vite 5 → 6; `npm audit` reports nothing.
- **Company data honesty:** the catalogue's applicant, offer, selection-ratio and round counts were invented and have
  been removed. Company pages now say the CTC range is typical and unverified, the process is a template, and link to a
  careers search when no verified page is recorded. College drives are marked as the college's own data.
- **Expected CTC** is no longer claimed when no company is within reach; the dashboard and what-if say "Not yet".
- **What-If levers:** a student far below every requirement was told "Your skills already meet what your target
  companies ask for". It now says the gaps are still wide and to raise several skills together.
- **Admin averages:** the average resume score counts only students who have analysed a resume, and labels say what
  each number is measured against.
- **Sign-in page counts** come from the catalogue itself instead of fixed numbers.
- **Accessibility (axe, WCAG 2.2 AA, every page for every role):** amber and red text darkened to pass contrast,
  visible button text now matches the accessible name, class rows in the college console open from a real button,
  and the logo marquee no longer reads every name twice. A new `tests/e2e/a11y.spec.ts` keeps it that way.
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
