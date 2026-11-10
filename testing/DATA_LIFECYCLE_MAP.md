# Data lifecycle map

| Data | Stored | Readers | Deletion | Gaps |
|---|---|---|---|---|
| Account email, password | auth.users | user, service | /api/account (students) | staff cannot self-delete; Auth logs |
| Profile incl. academics, resume_text, legacy JSON | profiles | student, college, recruiters (applied), super | cascade | legacy JSON exposed (W2-7); profile survives org deletion |
| Roster PII | org_students | college, super | college or /api/account | stale links (W2-1, W1-4) |
| Files | storage resumes, avatars | owner, college, recruiters (whole folder, W2-6) | /api/account (1,000 cap, W3-20) | files of removed students stay |
| Evidence | credentials, coding_profiles, github_repos, analyses | owner, college, some to recruiters | cascade | none |
| Applications | job_applications | student, drive admin, recruiter | cascade | org deletion removes offers |
| Audit trail | audit_log | college, super | none | no retention (W2-11) |
| Abuse counters | private tables | none | lazy pruning | retained until next call |

Legal conclusions (DPDP) are out of scope; engineering gaps only.
