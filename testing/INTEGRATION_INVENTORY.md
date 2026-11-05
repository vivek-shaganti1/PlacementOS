# Integrations

| Provider | Auth | Timeout | Retry | Failure | Personal data |
|---|---|---|---|---|---|
| Groq | secret key | 20 s | 3 models, one 429 wait | 502/500, no refund | resume text, name, marks |
| GitHub | optional shared token | 8 s | none | 404/429/502 | handle |
| LeetCode, Codeforces, CodeChef, Hugging Face, CTFtime, Credly | none | 8 s | none | 404/422/502 | handle |
| NPTEL | none | 10 s | none | 502; unknown pages pass | certificate ID |
| Supabase | user token or secret key | 10 s | none | mapped errors | all app data |
| Google Fonts, pravatar | none | n/a | n/a | n/a | viewer IP |

No webhooks, queues, payments, SMS or analytics found.
