# Capacity for 1,000 students (measured 2026-11-07)

Local measurements on a throwaway Postgres 16 with the real migrations and access rules, plus the app's own ranking code. No load was sent to production. The live plan sizes of Supabase, Vercel and Groq are not known, so concurrency limits below are reasoned, not measured.

## Measured

| What | Result |
|---|---|
| 1,000 synthetic students, 25,000 related rows | Seeded in 1 s |
| One student's own queries under RLS | About 16 ms |
| Placement cell list, 1,000 rows per page under RLS | 30 to 300 ms per page; the slowest is GitHub repos (10 pages) |
| Ranking all 1,000 students in the browser code | About 0.18 s on a recent Mac |
| Students page download, before | About 15.8 MB uncompressed JSON |
| Students page download, after narrowing the columns | About 6.9 MB |
| Rows drawn at once on the Students and Roster pages | 100, with Show more (was all, twice on the Students page) |

## Not measured: limits that decide whether 1,000 people can act at the same moment

1. **Sign-in rate limits.** Supabase limits sign-ins per IP address. A whole campus behind one network address, or traffic arriving through the Vercel proxy, can look like one IP. Raise the limits under Authentication, Rate limits before a placement-day rush, and test on staging.
2. **Email.** 1,000 self-registrations means 1,000 emails. Custom SMTP is required.
3. **AI.** Groq limits requests and tokens per minute. Hundreds of AI requests in the same minute will mostly get "the AI is at its usage limit, try again in a minute". The app fails politely and refunds the action, but this is a hard ceiling.
4. **Database size.** Each student page load makes about 23 requests. 1,000 students opening the app within a minute is roughly 23,000 small queries, fine for a paid Supabase instance and tight on the smallest free one.
5. **GitHub.** A sync makes up to about 14 GitHub calls. With `GITHUB_TOKEN` the limit is 5,000 an hour, so about 350 syncs an hour across all students.
