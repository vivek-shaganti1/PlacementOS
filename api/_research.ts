// Helpers for live company research (api/research.ts, api/research-worker.ts). Files starting with "_" are not routes.
//
// The rules this code keeps (docs/RESEARCH.md):
// - Only public https pages on public host names are read: no addresses, no local or internal names, no logins.
// - robots.txt is obeyed for our agent and for "*". The agent names itself and gives a contact link.
// - Pages are read for facts and thrown away. What is kept is the fact, a quote of at most 300 characters that contains
//   it, the link, and a hash of the page, so the source can be checked and credited without copying it.
// - Eligibility comes only from the company's own site or its public job board. Other results only help find those.
import { env, log, SUPABASE_URL, timeout } from './_lib'

export const AGENT = 'PlacementIQ-ResearchBot/1.0 (+https://placementiq-os.vercel.app/security#research; bot)'
export const AGENT_TOKEN = 'placementiq-researchbot'
const MAX_BYTES = 1_200_000
const MAX_TEXT = 60_000

/* ---------------------------------------------------------------- where we may go */

const BLOCKED_HOST = /^(localhost|.*\.local|.*\.localhost|.*\.internal|.*\.lan|.*\.home|.*\.corp|metadata\.google\.internal)$/i
// Sites whose terms forbid automated collection. Never read, even if a search result points there.
const FORBIDDEN = /(^|\.)(linkedin\.com|glassdoor\.[a-z.]+|naukri\.com|indeed\.[a-z.]+|ambitionbox\.com|instahyre\.com|foundit\.in|shine\.com|monsterindia\.com|google\.[a-z.]+|facebook\.com|instagram\.com|x\.com|twitter\.com)$/i

/** The URL, normalised, if it is a public https page we may fetch; otherwise null. */
export function safeUrl(input: string): URL | null {
  let u: URL
  try {
    u = new URL(input)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || u.username || u.password) return null
  if (u.port && u.port !== '443') return null
  const host = u.hostname.toLowerCase()
  if (!host.includes('.') || BLOCKED_HOST.test(host) || FORBIDDEN.test(host)) return null
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[') || host.includes(':')) return null
  u.hash = ''
  return u
}

const TWO_PART = /\.(co|ac|org|net|gov|edu|res|gen|firm|ind)\.(in|uk|jp|au|nz|za|sg)$|\.com\.(au|sg|br|my|cn)$/i
/** The registrable domain: careers.tcs.com → tcs.com, www.infosys.co.in → infosys.co.in. */
export function siteOf(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '')
  const parts = h.split('.')
  return parts.slice(TWO_PART.test(h) ? -3 : -2).join('.')
}

const BOARD_HOSTS: Record<string, 'greenhouse' | 'lever' | 'ashby'> = {
  'boards-api.greenhouse.io': 'greenhouse', 'boards.greenhouse.io': 'greenhouse', 'job-boards.greenhouse.io': 'greenhouse',
  'api.lever.co': 'lever', 'jobs.lever.co': 'lever', 'api.ashbyhq.com': 'ashby', 'jobs.ashbyhq.com': 'ashby',
}
/** Whether a page belongs to the company: its own site (any subdomain) or its public job board. */
export function sourceKind(url: string, website: string, board?: { ats: string | null; board: string | null }): 'official' | 'job_board' | null {
  const u = safeUrl(url)
  if (!u) return null
  const ats = BOARD_HOSTS[u.hostname]
  if (ats) return board?.ats === ats && board.board && u.pathname.toLowerCase().includes(`/${board.board.toLowerCase()}`) ? 'job_board' : null
  const w = safeUrl(website)
  return w && siteOf(u.hostname) === siteOf(w.hostname) ? 'official' : null
}

/* ---------------------------------------------------------------- robots.txt */

/**
 * Whether robots.txt lets our agent fetch `path`. Follows the common rules: the most specific group for our agent, else
 * "*"; the longest matching Allow or Disallow wins, Allow on a tie; "*" and "$" in paths. No group means allowed.
 */
export function robotsAllows(robots: string, path: string, agent = AGENT_TOKEN): boolean {
  type Group = { agents: string[]; rules: { allow: boolean; path: string }[] }
  const groups: Group[] = []
  let cur: Group | null = null
  let lastWasAgent = false
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const val = m[2].trim()
    if (key === 'user-agent') {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [] }))
      cur.agents.push(val.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val })
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.toLowerCase().includes(a)))
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'))
  if (!chosen.length) return true
  let best: { allow: boolean; len: number } | null = null
  for (const r of chosen.flatMap((g) => g.rules)) {
    if (!r.path) continue // "Disallow:" with nothing allows everything
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'))
    if (!re.test(path)) continue
    const len = r.path.length
    if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len }
  }
  return best ? best.allow : true
}

/* ---------------------------------------------------------------- reading a page */

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', bull: '•', middot: '·', hellip: '...' }
/** Visible text of an HTML page, one line per block. Scripts, styles, navigation chrome and comments are dropped. */
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/section|\/article|\/td|\/th)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e.toLowerCase()] ?? m)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n[\s\n]*/g, '\n')
    .trim()
    .slice(0, MAX_TEXT)
}

/** Pages that ask not to be used for AI or indexing are left alone. */
export const optedOut = (html: string, headers: Headers) =>
  /\b(noai|noindex|none)\b/i.test(headers.get('x-robots-tag') ?? '') ||
  /<meta[^>]+name=["']?(robots|placementiq-researchbot)["']?[^>]+content=["'][^"']*\b(noai|noindex|none)\b/i.test(html)

const sha = async (text: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('')

export type Page = { url: string; text: string; json: unknown | null; hash: string; links: string[] }

/** Reads one public page politely: robots.txt first, our agent named, redirects re-checked, size capped. */
export async function readPage(input: string, robotsCache: Map<string, string>, record?: (row: Record<string, unknown>) => Promise<void>): Promise<Page | null> {
  let u = safeUrl(input)
  for (let hop = 0; u && hop < 4; hop++) {
    const origin = u.origin
    if (!robotsCache.has(origin)) {
      const r = await fetch(`${origin}/robots.txt`, { signal: timeout(5_000), headers: { 'user-agent': AGENT }, redirect: 'follow' }).catch(() => null)
      // A missing robots.txt allows everything; a server error means "come back later", so we do not read the site.
      robotsCache.set(origin, r && r.ok ? (await r.text()).slice(0, 200_000) : r && r.status >= 400 && r.status < 500 ? '' : 'User-agent: *\nDisallow: /')
    }
    const allowed = robotsAllows(robotsCache.get(origin)!, u.pathname + u.search)
    if (!allowed) {
      await record?.({ url: u.href, host: u.hostname, allowed: false, status: null, content_hash: '' })
      return null
    }
    const res = await fetch(u.href, {
      signal: timeout(8_000),
      redirect: 'manual',
      headers: { 'user-agent': AGENT, accept: 'text/html,application/json;q=0.9', 'accept-language': 'en-IN,en;q=0.8' },
    }).catch(() => null)
    if (!res) return null
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      u = safeUrl(new URL(res.headers.get('location')!, u).href)
      continue
    }
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/text\/html|application\/json|text\/plain/.test(type) || Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) {
      await record?.({ url: u.href, host: u.hostname, allowed: true, status: res.status, content_hash: '' })
      return null
    }
    const body = (await res.text()).slice(0, MAX_BYTES)
    if (type.includes('text/html') && optedOut(body, res.headers)) {
      await record?.({ url: u.href, host: u.hostname, allowed: false, status: res.status, content_hash: '' })
      return null
    }
    const hash = await sha(body)
    await record?.({ url: u.href, host: u.hostname, allowed: true, status: res.status, content_hash: hash })
    let json: unknown = null
    if (type.includes('json')) {
      try {
        json = JSON.parse(body)
      } catch {
        /* not JSON after all */
      }
    }
    // Links on the page, absolute, so the worker can follow one to a campus or graduate page on the same site or a job board.
    const base = u
    const links = type.includes('html')
      ? [...body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], base).href } catch { return '' } }).filter((x) => x.startsWith('https://')).slice(0, 300)
      : []
    return { url: u.href, text: json ? '' : type.includes('html') ? htmlToText(body) : body.slice(0, MAX_TEXT), json, hash, links }
  }
  return null
}

/* ---------------------------------------------------------------- checking a fact against its page */

/** Lower case, unified quotes and dashes, single spaces: how a quote is compared with its page. */
export const norm = (s: string) =>
  s.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim()

/**
 * A finding survives only if its quote appears word for word on the page it names, and every number in its value also
 * appears in the quote (so "CGPA 7.5" cannot come from a quote that says 6.5). Quotes are 12 to 300 characters.
 */
export function checkFinding(f: { value: string; quote: string }, page: string): boolean {
  const quote = norm(f.quote)
  if (quote.length < 12 || quote.length > 300) return false
  if (!norm(page).includes(quote)) return false
  const numbers = f.value.match(/\d+(\.\d+)?/g) ?? []
  return numbers.every((n) => new RegExp(`(^|[^\\d.])${n.replace('.', '\\.')}($|[^\\d])`).test(quote))
}

/* ---------------------------------------------------------------- finding companies */

const wiki = (url: string) => fetch(url, { signal: timeout(9_000), headers: { 'user-agent': AGENT, accept: 'application/sparql-results+json, application/json' } })

/** Wikidata items whose label matches `text` (CC0 data, used only to find a company's official website). */
async function wikidataSearch(text: string, limit = 3): Promise<{ id: string; label: string }[]> {
  const res = await wiki(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbsearchentities', search: text, language: 'en', type: 'item', format: 'json', limit: String(limit) })}`).catch(() => null)
  if (!res?.ok) return []
  const data = (await res.json()) as { search?: { id: string; label: string }[] }
  return (data.search ?? []).filter((x) => /^Q\d+$/.test(x.id)).map((x) => ({ id: x.id, label: x.label }))
}

async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const res = await wiki(`https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: 'json' })}`).catch(() => null)
  if (!res?.ok) return []
  const data = (await res.json()) as { results?: { bindings?: Record<string, { value: string }>[] } }
  return data.results?.bindings ?? []
}

/** The official website Wikidata records for a company name (P856), if there is one. */
export async function websiteFor(name: string): Promise<string> {
  const hits = await wikidataSearch(name, 3)
  if (!hits.length) return ''
  const ids = hits.map((h) => `wd:${h.id}`).join(' ')
  // Prefer an item that is a business (instance of a subclass of Q4830453).
  const rows = await sparql(`SELECT ?c ?site WHERE { VALUES ?c { ${ids} } ?c wdt:P856 ?site . OPTIONAL { ?c wdt:P31/wdt:P279* wd:Q4830453 . BIND(1 AS ?biz) } } ORDER BY DESC(?biz) LIMIT 1`)
  return safeUrl(rows[0]?.site.value ?? '')?.href ?? ''
}

/** Companies in an industry that operate in India, with their official websites (Wikidata, CC0). */
export async function companiesInIndustry(industry: string, limit = 6): Promise<{ name: string; website: string }[]> {
  const inds = await wikidataSearch(industry, 2)
  if (!inds.length) return []
  const rows = await sparql(`SELECT DISTINCT ?c ?cLabel ?site WHERE {
    VALUES ?ind { ${inds.map((i) => `wd:${i.id}`).join(' ')} }
    ?c wdt:P452 ?ind ; wdt:P856 ?site .
    { ?c wdt:P17 wd:Q668 } UNION { ?c wdt:P159/wdt:P17 wd:Q668 }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } LIMIT ${limit * 2}`)
  const seen = new Set<string>()
  return rows
    .map((r) => ({ name: r.cLabel?.value ?? '', website: safeUrl(r.site?.value ?? '')?.href ?? '' }))
    .filter((r) => r.name && r.website && !/^Q\d+$/.test(r.name) && !seen.has(r.name) && (seen.add(r.name), true))
    .slice(0, limit)
}

export type SearchHit = { title: string; url: string; snippet: string }

/** Web search through whichever provider is configured: Tavily, then Brave. None configured: no results. */
export async function webSearch(query: string, opts: { domains?: string[]; max?: number } = {}): Promise<SearchHit[]> {
  const tavily = env('TAVILY_API_KEY')
  if (tavily) {
    const res = await fetch('https://api.tavily.com/search', {
      signal: timeout(9_000),
      method: 'POST',
      headers: { authorization: `Bearer ${tavily}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, max_results: opts.max ?? 5, search_depth: 'basic', ...(opts.domains?.length ? { include_domains: opts.domains } : {}) }),
    }).catch(() => null)
    if (res?.ok) {
      const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] }
      return (data.results ?? []).map((r) => ({ title: String(r.title ?? ''), url: String(r.url ?? ''), snippet: String(r.content ?? '').slice(0, 400) })).filter((r) => safeUrl(r.url))
    }
    log('warn', 'research search', { provider: 'tavily', status: res?.status ?? 0 })
  }
  const brave = env('BRAVE_SEARCH_API_KEY')
  if (brave) {
    const q = opts.domains?.length ? `${query} ${opts.domains.map((d) => `site:${d}`).join(' OR ')}` : query
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q, count: String(opts.max ?? 5), country: 'IN' })}`, {
      signal: timeout(9_000),
      headers: { 'x-subscription-token': brave, accept: 'application/json' },
    }).catch(() => null)
    if (res?.ok) {
      const data = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } }
      return (data.web?.results ?? []).map((r) => ({ title: String(r.title ?? ''), url: String(r.url ?? ''), snippet: String(r.description ?? '').replace(/<[^>]+>/g, '').slice(0, 400) })).filter((r) => safeUrl(r.url))
    }
    log('warn', 'research search', { provider: 'brave', status: res?.status ?? 0 })
  }
  return []
}

export const searchConfigured = () => !!(env('TAVILY_API_KEY') || env('BRAVE_SEARCH_API_KEY'))

/** Companies hiring for a role in India right now, from Adzuna's job API (needs ADZUNA_APP_ID and ADZUNA_APP_KEY). */
export async function adzunaHiring(what: string, where: string): Promise<{ company: string; title: string; location: string; url: string; salary: string | null }[]> {
  const id = env('ADZUNA_APP_ID')
  const key = env('ADZUNA_APP_KEY')
  if (!id || !key || !what) return []
  const params = new URLSearchParams({ app_id: id, app_key: key, results_per_page: '20', what, 'content-type': 'application/json' })
  if (where) params.set('where', where)
  const res = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`, { signal: timeout(8_000), headers: { accept: 'application/json' } }).catch(() => null)
  if (!res?.ok) return []
  const data = (await res.json()) as { results?: any[] }
  const lpa = (n: unknown) => (typeof n === 'number' && n > 0 ? Math.round(n / 10_000) / 10 : null)
  return (data.results ?? [])
    .map((j) => {
      const lo = lpa(j.salary_min)
      const hi = lpa(j.salary_max)
      return {
        company: String(j.company?.display_name ?? '').trim().slice(0, 160),
        title: String(j.title ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 200),
        location: String(j.location?.display_name ?? '').slice(0, 120),
        url: safeUrl(String(j.redirect_url ?? ''))?.href ?? '',
        salary: lo && hi && j.salary_is_predicted !== '1' ? `₹${lo}${hi !== lo ? `–${hi}` : ''} LPA` : null,
      }
    })
    .filter((j) => j.company && j.title && j.url)
}

/* ---------------------------------------------------------------- database, as the worker */

/** Calls Supabase REST with the secret key (the worker has no user session). */
export async function db(path: string, init: RequestInit = {}) {
  const key = env('SUPABASE_SECRET_KEY')
  if (!key) throw new Error('SUPABASE_SECRET_KEY is not set')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    signal: timeout(10_000),
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    log('error', 'research db', { status: res.status, path: path.split('?')[0] })
    throw new Error(`database ${res.status}`)
  }
  return res
}
