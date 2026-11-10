# API inventory

| Endpoint | Auth | Authorization | External | Rate limit | Findings |
|---|---|---|---|---|---|
| /api/chat | bearer | own, college required | Groq | consume_ai | W3-3, W3-9, W5-17 |
| /api/resume (analyze, match, clear) | bearer | own; job under RLS | Groq | consume_ai | W3-13, W5-9 |
| /api/connect (platforms, nptel, gate) | bearer | own, college required | 9 public services, Storage | connect_attempt | W3-1, 2, 4, 5, 6, 7, 8, 16, 17, 19 |
| /api/admin invite | bearer | super or org admin | Auth | none | W1-1, W3-11, W3-12, W5-4 |
| /api/signup | none | roster and roll | Auth invite | signup_attempt | W3-10, W1-8 |
| /api/password | bearer, verified | flag set | Auth admin | none | W1-7 |
| /api/account | bearer, verified | no roles | Storage, Auth admin | none | W1-12, W3-20, W5-8 |
| /api/health | optional | super for details | health_probe, Groq | none | W5-21 |
