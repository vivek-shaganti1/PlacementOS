# Live company research

Students ask for company research in plain words ("semiconductor companies hiring ECE freshers in Bengaluru", "Zoho and
Freshworks eligibility"). PlacementIQ finds the companies, reads their own pages and public job boards, keeps only the facts
it can quote word for word, and shows them within minutes, labelled **Not verified yet**. A platform admin's approval makes
a fact **Verified by PlacementIQ** and visible to every signed-in user.

## How a request runs

| Stage | What happens | Where |
|---|---|---|
| Asked | The student's request is stored; one AI action is charged; at most 3 an hour and 10 a day | `POST /api/research`, `public.research_requests` |
| Understanding | The AI turns the request into named companies, a sector, a role and a city. It may not add companies | `api/research-worker.ts` |
| Finding | Up to 5 companies: named ones, those hiring for the role now (Adzuna), those in the sector in India (Wikidata), then a web search if a key is set | `public.research_companies` |
| Reading | Per company: its public job board, its careers page, the best campus or graduate page, and official pages a web search finds on its own site | `public.research_sources` (what was read) |
| Checking | The AI proposes facts with quotes; each is kept only if the quote is on the page word for word and holds every number in the fact | `checkFinding` in `api/_research.ts` |
| Done | The student is notified; facts show as Not verified yet | `public.research_findings` |
| Review | A platform admin approves or rejects each fact; the database records who and when and writes the audit log | Research review page |

The database's scheduler (`pg_cron` + `pg_net`) wakes the worker every minute while requests are waiting. One run works for
up to about 90 seconds, so most requests finish within 2 to 5 minutes.

## Rules the code keeps

- **Sources.** Companies' own websites (any subdomain of their registered domain), their public Greenhouse, Lever or Ashby
  job boards, Wikidata (public domain data, used to find companies and official websites) and Adzuna's job API. A web search
  (Tavily or Brave) is used only to find pages on the company's own site. Eligibility is taken only from the company's own
  site or job board.
- **Never read:** LinkedIn, Naukri, Glassdoor, Indeed, AmbitionBox, Instahyre, foundit, Shine, Monster, search engines and
  social networks, whose terms forbid automated collection; anything behind a login; non-https pages; addresses, local or
  internal host names.
- **Polite reading.** robots.txt is read first and obeyed (our group `PlacementIQ-ResearchBot`, else `*`); a server error
  on robots.txt means the site is not read. Pages marked `noai` or `noindex` (meta tag or `X-Robots-Tag`) are skipped. Each
  request names the bot and links to the Security page; redirects are re-checked; pages are capped at about 1.2 MB.
- **No copies.** A page is read for facts and thrown away. What is kept: the fact, a quote of at most 300 characters that
  contains it, the link, when it was read and a hash of the page. Results link to the source.
- **Personal data.** Only the request text (no name or contact details) goes to the AI provider and the search provider.
  Requests and results stay with the student's account; approved facts are shown without who asked.
- **Honesty.** A fact that cannot be matched word for word is dropped, not shown. Unreviewed facts are labelled. Campus
  drives always use the criteria the college posts.

## Setting it up (owner)

1. Run `supabase/migrations/20261127000000_live_research.sql` in the Supabase SQL editor.
2. Pick a long random secret: `openssl rand -base64 32`.
3. In Vercel (Production), set `RESEARCH_WORKER_SECRET` to it, and optionally `TAVILY_API_KEY` (free: 1,000 searches a
   month) or `BRAVE_SEARCH_API_KEY`. `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` (free) add "companies hiring now".
4. In the Supabase SQL editor, store the same secret and the worker address in Vault (once):
   ```sql
   select vault.create_secret('<the secret>', 'research_worker_secret');
   select vault.create_secret('https://placementiq-os.vercel.app/api/research-worker', 'research_worker_url');
   ```
   To change the secret later: `select vault.update_secret((select id from vault.secrets where name = 'research_worker_secret'), '<new secret>');`
5. Check: `select jobname, schedule from cron.job where jobname = 'piq-research';` shows one row.

Without a search key, research still works for named companies, sectors Wikidata covers and (with Adzuna keys) companies
hiring now; it just finds fewer official pages.

## Costs

- AI: one action from the student's plan per request (the worker's calls count under it), plus the platform's daily cap.
- Tavily free tier: 1,000 credits a month. A request with 5 companies uses about 5 basic searches, so roughly 200 requests a
  month are free; after that about US$0.008 a credit.
- Wikidata and the companies' own pages: free. Adzuna: free tier.
