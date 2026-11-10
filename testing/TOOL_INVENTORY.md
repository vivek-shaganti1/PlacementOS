# Tool inventory

| Tool | Status |
|---|---|
| gitleaks | Ran locally (history and tree), redacted |
| Semgrep 1.181.0 | Ran (approved): p/javascript, p/typescript, p/react, p/secrets, p/owasp-top-ten; 0 findings, 130 files |
| npm audit (npm 11.19.1) | Ran (approved): see raw/npm-audit.json |
| PostgreSQL 16.14 | Ran throwaway cluster on a private socket (approved, weaker isolation than the brief requires) |
| Playwright, axe, Lighthouse, k6 | BLOCKED (execution and staging) |
| Trivy, OSV-Scanner, CodeQL, Syft, TruffleHog | Not installed; installing needs approval |
