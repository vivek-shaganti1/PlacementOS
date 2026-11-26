// Works through live company research requests (public.research_requests). Not for browsers: pg_cron calls it every
// minute while requests are waiting, with the shared secret in "x-worker-key" (RESEARCH_WORKER_SECRET). It answers at once
// and keeps working while the answer streams, for up to about 90 seconds, so one run usually finishes a request.
//
// A request moves: understanding (what the student asked for) → finding (which companies) → reading (one company at a
// time: its official pages and public job board, facts kept only if quoted word for word) → done, with a notification.
// See docs/RESEARCH.md for the sources and the rules.
import { coreCatalog } from '../src/data/coreCompanies'
import { companyCatalog } from '../src/data/companies'
import { categoryLabel, requirementsFor } from '../src/lib/eligibility'
import { ROLES, TRACK_BY_ID } from '../src/lib/branches'
import type { Category } from '../src/data/types'
import { env, groq, log, STYLE_RULES } from './_lib'
import { adzunaHiring, boardFromLink, checkFinding, isHiringPlatform, companiesInIndustry, db, readPage, safeUrl, searchConfigured, siteOf, sourceKind, webSearch, websiteFor, type Page } from './_research'

export const config = { runtime: 'edge' }

const BUDGET_MS = 90_000
const MAX_COMPANIES = 5

type Job = { id: string; user_id: string; query: string; branch: string; stage: string; plan: Plan; attempts: number }
type Plan = { companies?: string[]; industry?: string; role?: string; location?: string; adzuna?: Hiring[] }
type Hiring = { company: string; title: string; location: string; url: string; salary: string | null }
type Company = { id: string; name: string; website: string; ats: string | null; ats_board: string | null; found_via: string }
type Finding = { company: string; kind: string; field?: string; value: string; quote: string; source_url: string; source_kind: string }

const json = (path: string, body: unknown, method = 'POST', prefer = 'return=minimal') => db(path, { method, body: JSON.stringify(body), headers: { prefer } })
const update = (id: string, patch: Record<string, unknown>) => json(`research_requests?id=eq.${id}`, { ...patch, updated_at: new Date().toISOString() }, 'PATCH')
const sameKey = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/* ---------------------------------------------------------------- 1. understanding */

async function understand(r: Job): Promise<Plan> {
  const out = await groq(
    [
      {
        role: 'system',
        content:
          'A student wants to research companies for campus or fresher hiring in India. Turn the request into a plan. Return only JSON: ' +
          '{"companies": [names of companies the request itself names, at most 5], "industry": "the sector asked about in 1 to 3 words, or empty", ' +
          '"role": "the job role asked about, or empty", "location": "an Indian city named in the request, or empty"}. ' +
          'Use only what the request says. Never add a company the request does not name.',
      },
      { role: 'user', content: `Request: ${r.query.slice(0, 300)}\nStudent's branch: ${r.branch.slice(0, 80) || 'not given'}` },
    ],
    { json: true, maxTokens: 300, temperature: 0, user: r.user_id },
  )
  const p = JSON.parse(out) as Plan
  const clean = (v: unknown, n: number) => String(v ?? '').replace(/[^\p{L}\p{N} &.,()'/+-]/gu, '').trim().slice(0, n)
  return {
    companies: (Array.isArray(p.companies) ? p.companies : []).map((c) => clean(c, 120)).filter(Boolean).slice(0, MAX_COMPANIES),
    industry: clean(p.industry, 60),
    role: clean(p.role, 80),
    location: clean(p.location, 60),
  }
}

/* ---------------------------------------------------------------- 2. finding companies */

// Words a student might use for each kind of company in the built-in list (src/data/companies.ts, coreCompanies.ts).
const SECTOR: [RegExp, Category[]][] = [
  [/semi ?conductor|vlsi|chip|silicon|asic|fpga/i, ['semiconductor', 'hardware']],
  [/embedded|iot|firmware|electronics/i, ['embedded', 'semiconductor']],
  [/telecom|wireless|\brf\b|5g|network(ing)? equipment/i, ['telecom']],
  [/power|energy|utility|utilities|renewable|solar|grid/i, ['energy', 'electrical']],
  [/electrical/i, ['electrical']],
  [/automation|plc|instrumentation|robotic/i, ['automation']],
  [/automo|vehicle|\bev\b|electric vehicle|car|mobility/i, ['automotive']],
  [/manufactur|steel|metal|production|industrial/i, ['manufacturing']],
  [/engineering services|design services|cad|cae/i, ['engineering_services']],
  [/construction|civil|infrastructure|real estate|structural/i, ['construction']],
  [/chemical|process|petro|refin|oil|gas|fmcg/i, ['process']],
  [/bio|pharma|life science|health ?care/i, ['biotech']],
  [/cyber|security/i, ['security']],
  [/quant|trading|hft/i, ['quant']],
  [/\bai\b|machine learning|\bml\b|data science|deep tech/i, ['ai']],
  [/bank|fintech|finance|payments?/i, ['fintech']],
  [/consult/i, ['consulting']],
  [/it services|service compan|outsourc/i, ['service']],
  [/startup|start-up/i, ['startup']],
  [/product compan|saas|software product/i, ['product', 'top']],
  [/cloud|infra|database|devops/i, ['infra']],
]
/** The kinds of company that hire for a job role, from the engineering tree (Data Analyst → the AI and data track). */
export function categoriesForRole(role: string): Category[] {
  const words = role.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !['engineer', 'engineering', 'developer', 'fresher', 'freshers', 'role', 'roles', 'job', 'jobs', 'and', 'the', 'for'].includes(w))
  if (!words.length) return []
  const best = ROLES.map((r) => ({ r, hits: words.filter((w) => r.title.toLowerCase().includes(w)).length })).sort((a, b) => b.hits - a.hits)[0]
  return best?.hits ? ((TRACK_BY_ID.get(best.r.track)?.categories ?? []) as Category[]) : []
}

/** Companies of a kind from the built-in list, most relevant category first. A sector wins; a role is the fallback. */
export function catalogInSector(industry: string, limit: number, role = ''): string[] {
  const text = industry
  const cats = [...new Set(text ? SECTOR.filter(([re]) => re.test(text)).flatMap(([, c]) => c) : categoriesForRole(role))]
  if (!cats.length && text) {
    const byLabel = (Object.entries(categoryLabel) as [Category, string][]).filter(([, l]) => l.toLowerCase().split(/[^a-z]+/).some((w) => w.length > 3 && text.toLowerCase().includes(w)))
    cats.push(...byLabel.map(([c]) => c))
  }
  const names = [...coreCatalog.filter((c) => cats.includes(c.category)).sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category)).map((c) => c.name),
    ...companyCatalog.filter((c) => cats.includes(requirementsFor(c).category)).map((c) => c.name)]
  return [...new Set(names)].slice(0, limit)
}

async function find(r: Job, plan: Plan): Promise<{ companies: Omit<Company, 'id'>[]; plan: Plan }> {
  const out: Omit<Company, 'id'>[] = []
  const add = (c: Omit<Company, 'id'>) => {
    if (out.length < MAX_COMPANIES && !out.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) out.push(c)
  }
  // Companies a platform admin already checked come with their careers page and job board.
  const catalog = (await (await db('company_catalog?select=id,name,careers_url,ats,ats_board')).json()) as { name: string; careers_url: string; ats: string | null; ats_board: string | null }[]
  const fromCatalog = (name: string) => catalog.find((c) => c.name.toLowerCase() === name.toLowerCase())
  for (const name of plan.companies ?? []) {
    const known = fromCatalog(name)
    const website = known?.careers_url || (await websiteFor(name))
    add({ name: known?.name ?? name, website, ats: known?.ats ?? null, ats_board: known?.ats_board ?? null, found_via: known ? 'catalog' : 'named' })
  }
  // A student who named companies gets those companies, not others like them.
  if ((plan.companies ?? []).length) return { companies: out, plan: { ...plan, adzuna: [] } }
  // A kind of company: who is hiring for the role now (Adzuna), and which companies in the sector operate in India (Wikidata).
  let hiring: Hiring[] = []
  if (out.length < MAX_COMPANIES && (plan.role || plan.industry)) {
    hiring = await adzunaHiring([plan.role, plan.industry].filter(Boolean).join(' '), plan.location ?? '')
    for (const h of hiring) {
      if (out.length >= MAX_COMPANIES) break
      if (out.some((c) => c.name.toLowerCase() === h.company.toLowerCase())) continue
      const known = fromCatalog(h.company)
      add({ name: known?.name ?? h.company, website: known?.careers_url || (await websiteFor(h.company)), ats: known?.ats ?? null, ats_board: known?.ats_board ?? null, found_via: 'adzuna' })
    }
  }
  // The built-in list knows which companies are semiconductor, automotive, construction and so on (Wikidata's India
  // filter misses companies with a head office abroad, which is most of them).
  if (out.length < MAX_COMPANIES && (plan.industry || plan.role)) {
    for (const name of catalogInSector(plan.industry ?? '', MAX_COMPANIES - out.length, plan.role ?? '')) {
      const known = fromCatalog(name)
      add({ name, website: known?.careers_url || (await websiteFor(name)), ats: known?.ats ?? null, ats_board: known?.ats_board ?? null, found_via: 'catalog' })
    }
  }
  if (out.length < MAX_COMPANIES && plan.industry) {
    for (const c of await companiesInIndustry(plan.industry, MAX_COMPANIES)) {
      const known = fromCatalog(c.name)
      add({ name: known?.name ?? c.name, website: known?.careers_url || c.website, ats: known?.ats ?? null, ats_board: known?.ats_board ?? null, found_via: known ? 'catalog' : 'wikidata' })
    }
  }
  // Last, a web search (when a provider key is set) for a sector Wikidata does not cover.
  if (out.length === 0 && searchConfigured()) {
    const hits = await webSearch(`${r.query} companies hiring freshers India careers`, { max: 8 })
    for (const h of hits) {
      const name = h.title.split(/[|\-–:]/)[0].trim().slice(0, 120)
      if (name.length >= 2) add({ name, website: safeUrl(h.url) ? new URL(h.url).origin + '/' : '', ats: null, ats_board: null, found_via: 'search' })
    }
  }
  return { companies: out, plan: { ...plan, adzuna: hiring.slice(0, 20) } }
}

/* ---------------------------------------------------------------- 3. reading one company */

const CAMPUS = /campus|graduate|university|fresher|student|early[-_ ]?career|intern|entry[-_ ]?level|new[-_ ]?grad|young[-_ ]?professional/i
/** The distinctive words of a company name: "Tata Consultancy Services" → tata, consultancy. */
const tokensOf = (name: string) =>
  name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !/^(ltd|limited|pvt|private|inc|corp|corporation|technologies|technology|tech|solutions|services|india|group|the|and|company|systems|labs)$/.test(t))
const BOARD_LINK = /greenhouse\.io|lever\.co|ashbyhq\.com/i
const INDIA = /india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|remote/i

/** Roles from a public job board's JSON: structured facts, so the role title itself is the quote. */
function boardRoles(company: Company, page: Page): Finding[] {
  const data = page.json as any
  const rows: { title: string; location: string; url: string }[] =
    company.ats === 'greenhouse' ? (data?.jobs ?? []).map((j: any) => ({ title: j.title, location: j.location?.name ?? '', url: j.absolute_url }))
    : company.ats === 'lever' ? (Array.isArray(data) ? data : []).map((j: any) => ({ title: j.text, location: j.categories?.location ?? '', url: j.hostedUrl }))
    : company.ats === 'ashby' ? (data?.jobs ?? []).filter((j: any) => j.isListed !== false).map((j: any) => ({ title: j.title, location: j.location ?? '', url: j.jobUrl }))
    : []
  return rows
    .map((j) => ({ title: String(j.title ?? '').trim().slice(0, 200), location: String(j.location ?? '').slice(0, 100), url: safeUrl(String(j.url ?? ''))?.href ?? '' }))
    .filter((j) => j.title && j.url)
    .sort((a, b) => Number(CAMPUS.test(b.title)) - Number(CAMPUS.test(a.title)) || Number(INDIA.test(b.location)) - Number(INDIA.test(a.location)))
    .slice(0, 8)
    .map((j) => ({ company: company.name, kind: 'role', field: j.location.slice(0, 60), value: j.title, quote: `${j.title}${j.location ? `, ${j.location}` : ''}`.slice(0, 300).padEnd(3, ' '), source_url: page.url, source_kind: 'job_board' }))
}

const boardUrl = (c: Company) =>
  c.ats === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.ats_board!)}/jobs`
  : c.ats === 'lever' ? `https://api.lever.co/v0/postings/${encodeURIComponent(c.ats_board!)}?mode=json`
  : c.ats === 'ashby' ? `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(c.ats_board!)}`
  : ''

async function read(r: Job, c: Company, robots: Map<string, string>, plan: Plan): Promise<{ findings: Finding[]; note: string }> {
  const record = (row: Record<string, unknown>) => json('research_sources?on_conflict=url', { ...row, fetched_at: new Date().toISOString() }, 'POST', 'resolution=merge-duplicates,return=minimal').then(() => undefined, () => undefined)
  const findings: Finding[] = []
  // Job listings Adzuna returned for this company: title, place and pay as Adzuna lists them, linked to the listing.
  for (const h of (plan.adzuna ?? []).filter((x) => x.company.toLowerCase() === c.name.toLowerCase()).slice(0, 5)) {
    findings.push({ company: c.name, kind: 'role', field: h.location.slice(0, 60), value: h.title, quote: `${h.title}, ${h.location}`.slice(0, 300), source_url: h.url, source_kind: 'adzuna' })
    if (h.salary) findings.push({ company: c.name, kind: 'salary', field: h.title.slice(0, 60), value: h.salary, quote: `${h.title}: ${h.salary} (as listed on Adzuna)`.slice(0, 300), source_url: h.url, source_kind: 'adzuna' })
  }
  if (!c.website && !c.ats) return { findings, note: 'No official website found in Wikidata or the checked company list.' }

  // Pages to read, in rounds. First: the job board, the site's front page, its /careers page and the usual careers
  // subdomains (careers., jobs.), plus official pages a web search finds when a search key is set.
  const sites = c.website ? [c.website] : []
  const urls = new Set<string>()
  const site = c.website ? safeUrl(c.website) : null
  if (c.ats && c.ats_board) urls.add(boardUrl(c))
  if (site) {
    const root = siteOf(site.hostname)
    urls.add(site.href)
    if (!/career|job/i.test(site.pathname)) urls.add(new URL('/careers', site).href)
    urls.add(`https://careers.${root}/`)
    urls.add(`https://jobs.${root}/`)
    if (searchConfigured()) {
      for (const h of await webSearch(`${c.name} campus hiring graduate freshers eligibility criteria careers`, { domains: [root], max: 4 })) {
        if (sourceKind(h.url, sites) === 'official') urls.add(h.url)
      }
    }
  }
  const pages = (await Promise.all([...urls].slice(0, 6).map((u) => readPage(u, robots, record)))).filter((p): p is Page => !!p)
  // Second round: what the company's own pages link to. A careers or campus page, even on another domain the company
  // uses for careers, and a public job board it names.
  const links = pages.filter((p) => sourceKind(p.url, sites)).flatMap((p) => p.links)
  const careersLink = /career|jobs?\b|join[-_ ]?us|work[-_ ]?with[-_ ]?us|life[-_ ]?at/i
  const board = links.map(boardFromLink).find(Boolean)
  if (board && !c.ats) Object.assign(c, { ats: board.ats, ats_board: board.board })
  const follow = [
    ...(board ? [boardUrl(c)] : []),
    links.find((l) => CAMPUS.test(l) && safeUrl(l) && !urls.has(l)),
    links.find((l) => careersLink.test(new URL(l).pathname + new URL(l).hostname) && safeUrl(l) && !urls.has(l) && !BOARD_LINK.test(l)),
  ].filter((l): l is string => !!l)
  // A hiring platform the company's own page links to (SmartRecruiters, Workday, Darwinbox, ...) is its job board.
  const platform = links.find((l) => isHiringPlatform(l) && tokensOf(c.name).some((t) => l.toLowerCase().includes(t)))
  if (platform && !follow.includes(platform)) follow.unshift(platform)
  // Another domain counts as the company's own only if it carries the company's name (zoho.com for Zoho), so a link to
  // a recruitment agency never becomes a source of eligibility.
  const tokens = tokensOf(c.name)
  for (const l of [...follow]) {
    const host = safeUrl(l)
    if (!host || sourceKind(l, sites) || BOARD_LINK.test(l) || isHiringPlatform(l)) continue
    if (tokens.some((t) => siteOf(host.hostname).replace(/[^a-z0-9]/g, '').includes(t))) sites.push(host.origin + '/')
    else follow.splice(follow.indexOf(l), 1)
  }
  for (const p of await Promise.all(follow.slice(0, 3).map((u) => readPage(u, robots, record)))) if (p) pages.push(p)
  // Third: a campus page linked from the careers page just read.
  const more = pages.slice(-2).filter((p) => sourceKind(p.url, sites)).flatMap((p) => p.links).find((l) => CAMPUS.test(l) && !pages.some((p) => p.url === l) && sourceKind(l, sites) === 'official')
  if (more) {
    const p = await readPage(more, robots, record)
    if (p) pages.push(p)
  }
  for (const p of pages) if (p.json && c.ats) findings.push(...boardRoles(c, p))
  const platformPage = (url: string) => !!platform && url.split('?')[0].startsWith(platform.split('?')[0].replace(/\/$/, ''))
  const kindOf = (url: string) => sourceKind(url, sites, { ats: c.ats, board: c.ats_board }) ?? (platformPage(url) ? 'job_board' : null)
  const text = pages.filter((p) => !p.json && p.text && kindOf(p.url))
  if (!text.length) return { findings, note: pages.some((p) => p.json) ? 'Read the job board.' : 'The site asks bots not to read it (robots.txt), refused us, or has no public careers page. We respect that.' }

  // Facts from the official pages, each with the exact words it came from.
  const out = await groq(
    [
      {
        role: 'system',
        content:
          `You extract facts about hiring at ${c.name} from its own web pages, for students in India. ${STYLE_RULES} Return only JSON: ` +
          '{"roles":[{"value":"job title","quote":"","url":""}],' +
          '"eligibility":[{"field":"min_cgpa|min_percentage|backlogs|branches|batch|degree|other","value":"short fact","quote":"","url":""}],' +
          '"about":{"value":"one sentence","quote":"","url":""},"process":[{"value":"selection step","quote":"","url":""}],' +
          '"careers":{"value":"how to apply","quote":"","url":""}}. ' +
          'Rules: every "quote" is copied exactly, character for character, from the page text given, 12 to 280 characters, and it must contain the fact. ' +
          '"url" is the page the quote comes from. Eligibility means stated requirements for freshers, graduates, campus hires or interns only; a page saying a requirement does not apply (for example that degrees or marks are not required) is also eligibility, with field "other". ' +
          'Leave a list empty or a value "" when the pages do not say it. Never guess, never use outside knowledge.',
      },
      { role: 'user', content: text.map((p) => `PAGE ${p.url}\n${p.text.slice(0, 9_000)}`).join('\n\n').slice(0, 28_000) + `\n\nThe student asked: ${r.query.slice(0, 200)}` },
    ],
    { json: true, maxTokens: 1400, temperature: 0, user: r.user_id },
  ).catch((e) => {
    log('warn', 'research extract', { message: e instanceof Error ? e.message : String(e) })
    return '{}'
  })
  let x: any = {}
  try {
    x = JSON.parse(out)
  } catch {
    /* treated as nothing found */
  }
  const candidates: Finding[] = [
    ...(Array.isArray(x.roles) ? x.roles : []).slice(0, 8).map((f: any) => ({ kind: 'role', field: '', ...f })),
    ...(Array.isArray(x.eligibility) ? x.eligibility : []).slice(0, 10).map((f: any) => ({ kind: 'eligibility', ...f })),
    ...(x.about?.value ? [{ kind: 'about', field: '', ...x.about }] : []),
    ...(Array.isArray(x.process) ? x.process : []).slice(0, 6).map((f: any) => ({ kind: 'process', field: '', ...f })),
    ...(x.careers?.value ? [{ kind: 'careers', field: '', ...x.careers }] : []),
  ].map((f: any) => ({ company: c.name, kind: f.kind, field: String(f.field ?? '').slice(0, 60), value: String(f.value ?? '').trim().slice(0, 300), quote: String(f.quote ?? '').trim(), source_url: String(f.url ?? ''), source_kind: 'official' }))
  let dropped = 0
  for (const f of candidates) {
    const page = text.find((p) => p.url === f.source_url) ?? text.find((p) => checkFinding(f, p.text))
    const kind = page ? kindOf(page.url) : null
    if (!page || !kind || !f.value || !checkFinding(f, page.text)) {
      dropped++
      continue
    }
    findings.push({ ...f, quote: f.quote.slice(0, 300), source_url: page.url, source_kind: kind })
  }
  return { findings, note: `Read ${pages.length} page${pages.length === 1 ? '' : 's'}; kept ${findings.length} fact${findings.length === 1 ? '' : 's'}${dropped ? `, dropped ${dropped} that could not be matched word for word` : ''}.` }
}

/* ---------------------------------------------------------------- one step of one request */

async function step(r: Job, robots: Map<string, string>): Promise<'more' | 'done'> {
  const result = await advance(r, robots)
  if (result === 'done') r.stage = 'done'
  return result
}

async function advance(r: Job, robots: Map<string, string>): Promise<'more' | 'done'> {
  if (r.stage === 'queued' || r.stage === 'understanding') {
    await update(r.id, { stage: 'understanding', progress: 5, message: 'Understanding what you asked for.' })
    const plan = await understand(r)
    if (!plan.companies?.length && !plan.industry && !plan.role) {
      await update(r.id, { status: 'done', stage: 'done', progress: 100, plan, message: 'We could not tell which companies or roles to look for. Name a company, a sector or a role and ask again.', finished_at: new Date().toISOString(), locked_until: null })
      await notify(r, 'Your company research needs a clearer request.')
      return 'done'
    }
    await update(r.id, { stage: 'finding', progress: 15, plan, message: 'Finding companies that match.' })
    r.stage = 'finding'
    r.plan = plan
    return 'more'
  }
  if (r.stage === 'finding') {
    const { companies, plan } = await find(r, r.plan)
    if (!companies.length) {
      await update(r.id, { status: 'done', stage: 'done', progress: 100, plan, message: 'No matching companies were found in the sources we may use. Try naming a company.', finished_at: new Date().toISOString(), locked_until: null })
      await notify(r, 'Your company research found no matching companies.')
      return 'done'
    }
    await json('research_companies', companies.map((c) => ({ ...c, request_id: r.id })))
    await update(r.id, { stage: 'reading', progress: 25, plan, message: `Found ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}. Reading their official pages.` })
    r.stage = 'reading'
    r.plan = plan
    return 'more'
  }
  // reading: one company per step.
  const all = (await (await db(`research_companies?request_id=eq.${r.id}&select=id,name,website,ats,ats_board,found_via,state&order=created_at`)).json()) as (Company & { state: string })[]
  const next = all.find((c) => c.state === 'pending')
  if (next) {
    const { findings, note } = await read(r, next, robots, r.plan)
    if (findings.length) await json('research_findings', findings.map((f) => ({ ...f, request_id: r.id })))
    await json(`research_companies?id=eq.${next.id}`, { state: findings.length ? 'read' : 'skipped', note: note.slice(0, 300) }, 'PATCH')
    const done = all.filter((c) => c.state !== 'pending').length + 1
    await update(r.id, { progress: Math.min(95, 25 + Math.round((70 * done) / all.length)), message: `Read ${done} of ${all.length}: ${next.name}.` })
    if (done < all.length) return 'more'
  }
  const count = (await (await db(`research_findings?request_id=eq.${r.id}&select=id`, { headers: { prefer: 'count=exact', range: '0-0' } })).headers.get('content-range'))?.split('/')[1] ?? '0'
  await update(r.id, {
    status: 'done', stage: 'done', progress: 100, finished_at: new Date().toISOString(), locked_until: null,
    message: Number(count) ? `Done: ${count} facts from ${all.length} compan${all.length === 1 ? 'y' : 'ies'}, each quoted from its source. Not verified by PlacementIQ yet.` : 'Done, but none of the pages we may read stated facts we could quote. Try another company or role.',
  })
  await notify(r, Number(count) ? `Your company research is ready: ${count} facts found.` : 'Your company research finished without facts we could quote.')
  return 'done'
}

async function notify(r: Job, text: string) {
  await json('notifications', { user_id: r.user_id, text, link: `/research?id=${r.id}` }).catch(() => undefined)
}

async function fail(r: Job, e: unknown) {
  log('error', 'research step', { id: r.id, stage: r.stage, message: e instanceof Error ? e.message : String(e) })
  if (r.attempts >= 4) {
    await update(r.id, { status: 'failed', stage: 'failed', message: 'This research could not be finished. Try again later, or ask in a different way.', finished_at: new Date().toISOString(), locked_until: null }).catch(() => undefined)
    await notify(r, 'Your company research could not be finished.')
  } else {
    // Let the next run try again in a minute.
    await update(r.id, { locked_until: null, message: 'Taking a little longer than usual. Still working on it.' }).catch(() => undefined)
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!sameKey(env('RESEARCH_WORKER_SECRET') ?? '', req.headers.get('x-worker-key') ?? '')) return new Response('Forbidden', { status: 403 })
  const started = Date.now()
  const enc = new TextEncoder()
  // Answer at once and keep working while the body streams (an edge function may stream for up to 300 seconds).
  const body = new ReadableStream({
    async start(ctrl) {
      const say = (s: string) => ctrl.enqueue(enc.encode(s + '\n'))
      const robots = new Map<string, string>()
      say('working')
      let handled = 0
      while (Date.now() - started < BUDGET_MS - 25_000) {
        const claimed = (await (await db('rpc/research_claim', { method: 'POST', body: '{}' })).json().catch(() => [])) as Job[]
        const r = claimed[0]
        if (!r) break
        handled++
        try {
          while ((await step(r, robots)) === 'more' && Date.now() - started < BUDGET_MS - 25_000) {
            /* next step of the same request */
          }
          // Out of time with steps left: release it for the next run.
          if (r.stage !== 'done') await update(r.id, { locked_until: null }).catch(() => undefined)
        } catch (e) {
          await fail(r, e)
        }
      }
      say(`handled ${handled}`)
      ctrl.close()
    },
  })
  return new Response(body, { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } })
}
