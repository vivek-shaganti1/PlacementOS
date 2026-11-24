// Live job openings, for signed-in users only.
//
//   GET /api/openings?company=<catalog id>       Open roles from the company's own public job board (Greenhouse, Lever or
//                                                 Ashby), named by a platform admin in public.company_catalog.
//   GET /api/openings?status                      { adzuna: true | false }: whether off-campus search is set up.
//   GET /api/openings?q=<role>&where=<city>       Off-campus openings in India from Adzuna. Needs ADZUNA_APP_ID and
//                                                 ADZUNA_APP_KEY in the server environment; without them it answers 503.
//
// Only fixed hosts are ever called, with a validated board name or a cleaned search, so this cannot be pointed at
// anything else. Answers are cached in memory for 30 minutes (job boards change slowly, and Adzuna's free tier is
// rate limited) and the browser may reuse one for 15.
import { bearer, env, handle, HttpError, json, log, rest, timeout, tokenSubject } from './_lib'

export const config = { runtime: 'edge' }

export type Opening = { title: string; company: string; location: string; url: string; team: string; posted: string | null; salary: string | null }

const TTL = 30 * 60_000
const cache = new Map<string, { at: number; body: unknown }>()
const remember = (key: string, body: unknown) => {
  if (cache.size > 200) cache.delete(cache.keys().next().value as string)
  cache.set(key, { at: Date.now(), body })
  return body
}

const BOARD = /^[A-Za-z0-9._-]{1,80}$/
const INDIA = /india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|remote/i
const text = (v: unknown, max = 160) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const https = (v: unknown) => {
  try {
    const u = new URL(String(v))
    return u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
}
const iso = (v: unknown) => {
  const d = new Date(typeof v === 'number' ? v : String(v ?? ''))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

async function upstream(url: string) {
  const res = await fetch(url, { signal: timeout(8_000), headers: { accept: 'application/json' } })
  if (res.status === 404) throw new HttpError(404, 'That job board was not found. A platform admin can correct it in Companies.')
  if (!res.ok) throw new HttpError(502, 'The job board is not answering right now. Try again shortly.')
  return res.json()
}

/** One company's public job board, normalised. India and remote roles first. */
async function board(ats: string, slug: string, company: string): Promise<Opening[]> {
  const b = encodeURIComponent(slug)
  let rows: Opening[] = []
  if (ats === 'greenhouse') {
    const data = (await upstream(`https://boards-api.greenhouse.io/v1/boards/${b}/jobs`)) as { jobs?: any[] }
    rows = (data.jobs ?? []).map((j) => ({ title: text(j.title), company, location: text(j.location?.name, 120), url: https(j.absolute_url), team: text(j.departments?.[0]?.name, 80), posted: iso(j.updated_at), salary: null }))
  } else if (ats === 'lever') {
    const data = (await upstream(`https://api.lever.co/v0/postings/${b}?mode=json`)) as any[]
    rows = (Array.isArray(data) ? data : []).map((j) => ({ title: text(j.text), company, location: text(j.categories?.location, 120), url: https(j.hostedUrl), team: text(j.categories?.team, 80), posted: iso(j.createdAt), salary: null }))
  } else if (ats === 'ashby') {
    const data = (await upstream(`https://api.ashbyhq.com/posting-api/job-board/${b}`)) as { jobs?: any[] }
    rows = (data.jobs ?? []).filter((j) => j.isListed !== false).map((j) => ({ title: text(j.title), company, location: text(j.location, 120), url: https(j.jobUrl), team: text(j.department, 80), posted: iso(j.publishedAt), salary: null }))
  } else throw new HttpError(400, 'Unknown job board')
  return rows.filter((r) => r.title && r.url).sort((a, b) => Number(INDIA.test(b.location)) - Number(INDIA.test(a.location)))
}

// Off-campus searches cost Adzuna quota: at most 20 per person per 10 minutes on each server instance.
const recent = new Map<string, number[]>()
function limit(who: string) {
  const now = Date.now()
  const hits = (recent.get(who) ?? []).filter((t) => now - t < 10 * 60_000)
  if (hits.length >= 20) throw new HttpError(429, 'Too many searches. Try again in a few minutes.')
  hits.push(now)
  recent.set(who, hits)
  if (recent.size > 5000) recent.delete(recent.keys().next().value as string)
}

async function adzuna(q: string, where: string): Promise<{ total: number; jobs: Opening[] }> {
  const id = env('ADZUNA_APP_ID')
  const key = env('ADZUNA_APP_KEY')
  if (!id || !key) throw new HttpError(503, 'Off-campus search is not set up yet.')
  const params = new URLSearchParams({ app_id: id, app_key: key, results_per_page: '20', what: q, 'content-type': 'application/json' })
  if (where) params.set('where', where)
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`, { signal: timeout(8_000), headers: { accept: 'application/json' } })
  if (res.status === 401 || res.status === 403) {
    log('error', 'adzuna', { status: res.status })
    throw new HttpError(503, 'Off-campus search is not available right now.')
  }
  if (!res.ok) throw new HttpError(502, 'The job search service is not answering right now. Try again shortly.')
  const data = (await res.json()) as { count?: number; results?: any[] }
  const lpa = (n: unknown) => (typeof n === 'number' && n > 0 ? Math.round(n / 10_000) / 10 : null)
  return {
    total: Number(data.count ?? 0),
    jobs: (data.results ?? [])
      .map((j) => {
        const lo = lpa(j.salary_min)
        const hi = lpa(j.salary_max)
        const salary = lo && hi ? `₹${lo}${hi !== lo ? `–${hi}` : ''} LPA${j.salary_is_predicted === '1' ? ' (estimated by Adzuna)' : ''}` : null
        return { title: text(j.title), company: text(j.company?.display_name, 120), location: text(j.location?.display_name, 120), url: https(j.redirect_url), team: text(j.category?.label, 80), posted: iso(j.created), salary }
      })
      .filter((r) => r.title && r.url),
  }
}

const reply = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=900' } })

export default handle(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const url = new URL(req.url)
  const company = url.searchParams.get('company')

  // Whether off-campus search is set up, so the app shows it only when it works. Costs no Adzuna quota.
  if (url.searchParams.has('status')) {
    await rest(token, 'company_catalog?select=id&limit=1')
    return json({ adzuna: !!(env('ADZUNA_APP_ID') && env('ADZUNA_APP_KEY')) })
  }

  if (company !== null) {
    if (!/^[a-z0-9-]{1,80}$/.test(company)) throw new HttpError(400, 'Unknown company')
    // Read as the signed-in user: this also proves the session is real (an invalid token is refused with 401).
    const res = await rest(token, `company_catalog?id=eq.${company}&select=name,ats,ats_board`)
    const [row] = (await res.json()) as { name: string; ats: string | null; ats_board: string | null }[]
    if (!row?.ats || !row.ats_board || !BOARD.test(row.ats_board)) return reply({ source: null, jobs: [] })
    const key = `b:${row.ats}:${row.ats_board}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return reply(hit.body)
    const jobs = await board(row.ats, row.ats_board, row.name)
    return reply(remember(key, { source: row.ats, total: jobs.length, jobs: jobs.slice(0, 25), fetched: new Date().toISOString() }))
  }

  const q = text(url.searchParams.get('q'), 80)
  const where = text(url.searchParams.get('where'), 60)
  if (q.length < 2) throw new HttpError(422, 'Type a role to search for.')
  // A cheap read as the user proves the session before any quota is spent.
  await rest(token, 'company_catalog?select=id&limit=1')
  const key = `a:${q.toLowerCase()}|${where.toLowerCase()}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return reply(hit.body)
  limit(tokenSubject(token))
  const found = await adzuna(q, where)
  return reply(remember(key, { source: 'adzuna', ...found, fetched: new Date().toISOString() }))
})
