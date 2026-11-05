# Threat model (STRIDE, source-derived)

Actors: anonymous visitor; student; classmate; recruiter; org admin (insider or careless); platform admin; compromised dependency.

- Spoofing: account claim without mailbox proof (SEC-01), shared passwords (SEC-03), raw signup (NV-01), linked handles (SEC-04).
- Tampering: self-written ranking inputs (SEC-05), resume text (SEC-10), application status last-write-wins (DEF-05).
- Repudiation: no admin audit trail (REL-04).
- Information disclosure: recruiter JD text (SEC-12), org_admins identity (SEC-13), PII in repo (SEC-21).
- Denial of service: AI token inflation (SEC-14), signup lockout (SEC-18), proxy rate limits (NV-03), GitHub quota (SEC-17).
- Elevation: email squatting (SEC-02), retained admin (SEC-06, SEC-07), role grant on insert (NV-01).
