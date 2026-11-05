# CI/CD audit

No .github, no tests on merge, no branch-protection evidence. vercel.json has CSP and security headers; no explicit HSTS or immutable asset rule.

Plan: 1 protect main. 2 PR: npm ci, build, chunk budget. 3 PR: replay migrations on a throwaway DB, run fixed rls_tests.sql. 4 grant test for student-writable columns. 5 staging project and per-environment proxy; previews get no production keys. 6 tracked migrations before app deploy. 7 npm audit, gitleaks, licence check, Dependabot. 8 post-deploy smoke test, error reporting, rollback runbook.
