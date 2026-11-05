# API inventory

| Action | Authn/authz | Limits | DB | External | Throttle |
|---|---|---|---|---|---|
| chat | Bearer; RLS | 10 messages, 1500 chars | user token | Groq | consume_ai |
| resume analyze | Bearer | 40k stored, 14k sent | secret key + user token | Groq | consume_ai |
| resume match | Bearer; job read under RLS | 8k sent, 20k stored | secret key | Groq | consume_ai |
| connect (7 platforms) | Bearer | handle regex, encoded | secret key + user token | each site | 5 min, avoidable |
| connect nptel | Bearer | anchored ID regex | secret key | archive.nptel.ac.in | 20 s |
| connect gate | Bearer; cell review | field checks | secret key, pending | none | 20 s |
| admin invite | Bearer; super_admin or org_admin of org | 50 people | user token + secret key | Supabase Auth | none |
| signup | None; roster + roll | clipped, 8-72 password | secret key | Supabase Auth | 5/email, 20/IP per hour |
| health GET | Optional bearer + super_admin | none | user token | Groq /models | none |
