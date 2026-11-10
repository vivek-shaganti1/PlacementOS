# Final report: second audit

Repo vivek-shaganti1/PlacementOS | branch main | commit e1ee372 | dirty: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (preserved, out of scope) | audit date 2026-11-10 | Phase A, source-level only.

**Release decision: NOT READY.** Not because of a confirmed Critical, but because the release gates cannot be shown to pass: the security migration and the Auth sign-up setting on production are unverified (W1-10), two of three database test suites can pass on missing results (W6-2), there is no working staging (W6-1), and a confirmed High accessibility blocker (W4-1) stops keyboard-only students entering the app.

## Scope and method
Six specialist agents read the code at e1ee372 in parallel (auth and tenancy; database; API and integrations; frontend, accessibility and SEO; business workflows and performance; CI/CD and architecture). An independent verifier re-checked the 15 most important claims from source: none rejected, six lowered in severity. No target code, tests, browsers or databases were run: the isolation gate in the brief is not met on this machine. Semgrep and npm audit need network approval. gitleaks ran locally.

## Results
- Security: 0 Critical, 0 High, 3 Medium, 18 Low confirmed; 1 conditional High (W1-10); 11 need validation.
- Defects: 1 High, 12 Medium, 35 Low confirmed; 10 need validation.
- Highest items: W4-1 (High, accessibility), W1-10 (conditional High), W1-1, W3-1, W6-1 (Medium security), W5-4, W5-11, W4-13, W4-16 (Medium defects).
- The previous remediation largely holds by code review. Regressions: none found. Residual gaps are listed per earlier ID in REMEDIATION_LOG.md.

## What would let this be released
1. Confirm on production (read-only): migration applied, sign-ups off, conditional indexes present, no rows violating old NOT VALID constraints.
2. Fix W4-1, W1-1, W3-1, W5-4 and the test-runner gaps (W6-2, W6-3, W1-T).
3. A staging project so runtime, Auth flows and load can be tested off production.

## Runtime evidence added (approved 2026-11-10)
- Local throwaway database: 19 migrations replay; suites 48/48, 63/63, 13/13; branch parity 72/72; API tests 28/28; build passes.
- Semgrep (5 rulesets, 130 files): 0 findings. npm audit: production 0 High, 2 Moderate (react-router); development 2 High (Vite, source-map-js), 2 Moderate.
- Reproduced at runtime: W1-1, W1-3, W2-1, W2-6, W2-7, W5-4, W6-2, W4-1. W1-4 was corrected by runtime: deleting a linked login fails with a foreign key error rather than leaving a dangling link.
- The passing suites do not change the decision: W6-2 shows the runner can report success with missing results, and the suites did not cover the reproduced defects.

## Residual risk
Everything runtime: real GoTrue write order, Storage policies, live schema, bucket headers, Groq and GitHub behaviour, capacity. Absence of a finding is not proof of absence.
