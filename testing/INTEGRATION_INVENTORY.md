# Integration inventory

| Service | Credential | Data sent | Timeout | Failure |
|---|---|---|---|---|
| Supabase REST/RPC | user JWT; secret key for server writes | app data | 10 s | mapped errors |
| Supabase Auth | secret key | email, name, password, app_metadata | 10 s | mapped; raw text to admins (W3-12) |
| Supabase Storage | secret key | paths | 10 s | fail closed |
| Groq | GROQ_API_KEY | resume, JD, profile | 14 s per call, 24 s total | 502/504 then refund |
| GitHub | optional GITHUB_TOKEN | handle | 8 s | 404/429/502 |
| LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime, NPTEL | none | handle or id | 8-10 s | 404/422/502 |
