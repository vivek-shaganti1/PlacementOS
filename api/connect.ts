// Connects an evidence account and caches its public, verifiable data (server-written; students cannot edit it).
// POST { platform: 'github' | 'leetcode' | 'codeforces' | 'codechef' | 'credly' | 'huggingface' | 'ctftime', username: string | null }
// POST { credential: 'nptel', ref, skill }                                   -> verified against nptel.ac.in
// POST { credential: 'gate', ref, paper, score, year, name, file_path }       -> pending until the placement cell confirms
import { FILE_SIGNALS, GATE_PAPERS, IGNORED_PATH, SKILL_BY_NAME, type FileSignal } from '../src/lib/branches'
import { bearer, deleteRows, env, handle, HttpError, insertVerified, json, loadProfile, rest, saveProfile, timeout } from './_lib'

export const config = { runtime: 'edge' }

const UA = 'Mozilla/5.0 (compatible; PlacementIQ/1.0; +https://placementiq-os.vercel.app)'
const now = () => new Date().toISOString()
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const MAX_BYTES = 5_000_000
const tooLarge = (res: Response) => Number(res.headers.get('content-length') ?? 0) > MAX_BYTES

async function getJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { signal: timeout(8000), ...init, headers: { 'user-agent': UA, ...(init.headers ?? {}) } })
  if (tooLarge(res)) throw new HttpError(502, 'That platform returned too much data. Try again later.')
  return { res, body: res.ok ? await res.json() : null }
}

export async function github(username: string) {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' }
  const token = env('GITHUB_TOKEN')
  if (token) headers.authorization = `Bearer ${token}`

  const { res, body: user } = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers })
  if (res.status === 404) throw new HttpError(404, `GitHub user "${username}" not found.`)
  if (res.status === 403 || res.status === 429) throw new HttpError(429, 'GitHub rate limit reached. Try again in a few minutes.')
  if (!user) throw new HttpError(502, 'Could not reach GitHub.')

  const { body: repos } = await getJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner&sort=pushed`, { headers })
  const own = ((repos ?? []) as any[]).filter((r) => !r.fork && !r.archived)
  const langCount: Record<string, number> = {}
  const topicSet = new Set<string>()
  for (const r of own) {
    if (r.language) langCount[r.language] = (langCount[r.language] ?? 0) + 1
    for (const t of r.topics ?? []) topicSet.add(String(t))
  }
  // Design work in the file trees of the most recently pushed repositories: Verilog and testbenches, KiCad boards,
  // CAD models, Simulink, PLC programs... Only the paths are read (one request per repository), never guessed.
  const scanned = [...own].sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at)).slice(0, 12)
  const trees = await Promise.all(
    scanned.map(async (r) => {
      try {
        const { body } = await getJson(`https://api.github.com/repos/${encodeURIComponent(r.owner?.login ?? username)}/${encodeURIComponent(r.name)}/git/trees/${encodeURIComponent(r.default_branch ?? 'HEAD')}?recursive=1`, { headers })
        return { repo: r.name as string, branch: (r.default_branch as string) ?? 'HEAD', paths: ((body?.tree ?? []) as { path: string; type: string }[]).filter((t) => t.type === 'blob').map((t) => t.path).filter((p) => !IGNORED_PATH.test(p)) }
      } catch {
        return { repo: r.name as string, branch: 'HEAD', paths: [] as string[] }
      }
    }),
  )
  const signals: Partial<Record<FileSignal, { repos: string[]; files: number }>> = {}
  for (const t of trees)
    for (const [sig, { re }] of Object.entries(FILE_SIGNALS) as [FileSignal, { re: RegExp }][]) {
      const n = t.paths.filter((p) => re.test(p)).length
      if (!n) continue
      const cur = (signals[sig] ??= { repos: [], files: 0 })
      cur.repos.push(t.repo)
      cur.files += n
    }
  // KiCad schematics: list the parts actually placed (lib_id entries), so "built an ESP32 board" is checkable.
  const schematics = trees.flatMap((t) => t.paths.filter((p) => /\.kicad_sch$/i.test(p)).map((p) => ({ repo: t.repo, branch: t.branch, path: p }))).slice(0, 3)
  const kicad = (
    await Promise.all(
      schematics.map(async (sc) => {
        try {
          const res = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(sc.repo)}/${encodeURIComponent(sc.branch)}/${sc.path.split('/').map(encodeURIComponent).join('/')}`, { signal: timeout(8000), headers: { 'user-agent': UA } })
          if (!res.ok || tooLarge(res)) return null
          const text = (await res.text()).slice(0, 2_000_000)
          // Placed symbols carry (lib_id "Library:Part"); definitions in lib_symbols do not. Power flags are not parts.
          const ids = [...text.matchAll(/\(lib_id\s+"([^"]+)"/g)].map((m) => m[1]).filter((id) => !/^power:/i.test(id))
          if (!ids.length) return null
          const names = [...new Set(ids.map((id) => id.split(':').pop()!))]
          return { repo: sc.repo, file: sc.path.slice(0, 200), parts: ids.length, components: names.slice(0, 24) }
        } catch {
          return null
        }
      }),
    )
  ).filter((k): k is NonNullable<typeof k> => !!k)

  const top = [...own]
    .sort((a, b) => b.stargazers_count - a.stargazers_count || Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, 8)
    .map((r) => ({
      name: r.name as string,
      description: (r.description as string | null) ?? null,
      language: (r.language as string | null) ?? null,
      stars: r.stargazers_count as number,
      url: r.html_url as string,
      topics: (r.topics ?? []) as string[],
      updated_at: r.pushed_at as string,
    }))

  const all = own.slice(0, 100).map((r) => ({
    name: r.name as string,
    description: ((r.description as string | null) ?? null)?.slice(0, 500) ?? null,
    language: (r.language as string | null) ?? null,
    stars: (r.stargazers_count as number) ?? 0,
    url: r.html_url as string,
    topics: ((r.topics ?? []) as string[]).slice(0, 20),
    pushed_at: (r.pushed_at as string) ?? null,
  }))

  return {
    all_repos: all,
    username: user.login,
    name: user.name ?? null,
    avatar_url: user.avatar_url,
    public_repos: user.public_repos ?? 0,
    original_repos: own.length,
    followers: user.followers ?? 0,
    stars: own.reduce((a, r) => a + (r.stargazers_count ?? 0), 0),
    languages: Object.entries(langCount).sort((a, b) => b[1] - a[1]).map(([name, repos]) => ({ name, repos })),
    topics: [...topicSet].slice(0, 40),
    top_repos: top,
    signals,
    kicad,
    synced_at: now(),
  }
}

/** Same person? Every word of the shorter name appears in the longer one (initials allowed), ignoring case and dots. */
export function sameName(a: string, b: string) {
  const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  const [x, y] = [words(a), words(b)].sort((p, q) => p.length - q.length)
  if (!x.length || !y.length) return false
  return x.every((w) => y.some((v) => v === w || (w.length === 1 && v.startsWith(w)) || (v.length === 1 && w.startsWith(v))))
}

// Verified badges (Cisco, IBM, AWS, Autodesk, NI, Ansys, ...). Only badges issued to this student's name count.
export async function credly(username: string, profileName = '') {
  const { res, body } = await getJson(`https://www.credly.com/users/${encodeURIComponent(username)}/badges.json`)
  if (res.status === 404 || !body) throw new HttpError(404, `Credly profile "${username}" not found, or it is private.`)
  const all = ((body.data ?? []) as any[]).filter((b) => b.state === 'accepted' && b.public !== false)
  const mine = profileName ? all.filter((b) => sameName(String(b.issued_to ?? ''), profileName)) : all
  if (all.length && !mine.length) throw new HttpError(422, `These badges are issued to "${all[0].issued_to}", not to the name on your profile.`)
  return {
    username,
    badges: mine.slice(0, 60).map((b) => ({
      name: String(b.badge_template?.name ?? '').slice(0, 160),
      issuer: String(b.issuer?.entities?.find((e: any) => e.primary)?.entity?.name ?? b.issuer?.summary ?? '').replace(/^issued by\s*/i, '').slice(0, 120),
      issued_at: b.issued_at_date ?? null,
      url: String(b.badge_template?.url ?? `https://www.credly.com/users/${username}`),
    })),
    solved: mine.length,
    synced_at: now(),
  }
}

export async function huggingface(username: string) {
  const { res, body: u } = await getJson(`https://huggingface.co/api/users/${encodeURIComponent(username)}/overview`)
  if (res.status === 404 || !u) throw new HttpError(404, `Hugging Face user "${username}" not found.`)
  const { body: models } = await getJson(`https://huggingface.co/api/models?author=${encodeURIComponent(username)}&sort=downloads&limit=20`)
  const list = ((models ?? []) as any[]).map((m) => ({ id: String(m.id), kind: 'model', downloads: Number(m.downloads ?? 0) }))
  return {
    username,
    models: Number(u.numModels ?? 0),
    datasets: Number(u.numDatasets ?? 0),
    spaces: Number(u.numSpaces ?? 0),
    likes: Number(u.numLikes ?? 0),
    downloads: list.reduce((a, m) => a + m.downloads, 0),
    top: list.slice(0, 5),
    solved: Number(u.numModels ?? 0),
    synced_at: now(),
  }
}

// Security competitions: a CTFtime team id (the number in the team's URL).
export async function ctftime(teamId: string) {
  if (!/^\d{1,7}$/.test(teamId)) throw new HttpError(400, 'Enter your CTFtime team id: the number in your team page URL.')
  const { res, body } = await getJson(`https://ctftime.org/api/v1/teams/${teamId}/`)
  if (res.status === 404 || !body) throw new HttpError(404, `CTFtime team ${teamId} not found.`)
  const years = Object.entries((body.rating ?? {}) as Record<string, { rating_points?: number; country_place?: number }>)
    .filter(([, v]) => typeof v.rating_points === 'number')
    .sort((a, b) => Number(b[0]) - Number(a[0]))
  const [year, latest] = years[0] ?? [String(new Date().getFullYear()), {}]
  return {
    username: teamId,
    team: String(body.name ?? `Team ${teamId}`).slice(0, 80),
    rating_points: Number(latest.rating_points ?? 0),
    country_place: latest.country_place ?? null,
    events: years.length,
    year: Number(year),
    rating: Math.round(Number(latest.rating_points ?? 0)),
    synced_at: now(),
  }
}

async function leetcode(username: string) {
  const query = `query($u: String!) {
    matchedUser(username: $u) { username submitStatsGlobal { acSubmissionNum { difficulty count } } profile { ranking } }
    userContestRanking(username: $u) { rating attendedContestsCount topPercentage }
  }`
  const { body } = await getJson('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: 'https://leetcode.com' },
    body: JSON.stringify({ query, variables: { u: username } }),
  })
  if (!body) throw new HttpError(502, 'Could not reach LeetCode.')
  const u = body.data?.matchedUser
  if (!u) throw new HttpError(404, `LeetCode user "${username}" not found.`)
  const by = (d: string) => (u.submitStatsGlobal.acSubmissionNum as { difficulty: string; count: number }[]).find((x) => x.difficulty === d)?.count ?? 0
  const c = body.data?.userContestRanking
  return {
    username: u.username,
    solved: by('All'),
    easy: by('Easy'),
    medium: by('Medium'),
    hard: by('Hard'),
    ranking: num(u.profile?.ranking),
    contest_rating: c?.rating ? Math.round(c.rating) : null,
    contests: c?.attendedContestsCount ?? 0,
    top_percentage: num(c?.topPercentage),
    synced_at: now(),
  }
}

async function codeforces(username: string) {
  const { body: info } = await getJson(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`)
  if (!info || info.status !== 'OK') throw new HttpError(404, `Codeforces handle "${username}" not found.`)
  const u = info.result[0]
  const [{ body: status }, { body: rating }] = await Promise.all([
    getJson(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=1&count=10000`),
    getJson(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(username)}`),
  ])
  const solved = new Set(
    ((status?.result ?? []) as any[]).filter((s) => s.verdict === 'OK').map((s) => `${s.problem.contestId}-${s.problem.index}`),
  ).size
  return {
    username: u.handle,
    rating: num(u.rating),
    max_rating: num(u.maxRating),
    rank: u.rank ?? null,
    solved,
    contests: (rating?.result ?? []).length,
    synced_at: now(),
  }
}

async function codechef(username: string) {
  const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, { signal: timeout(8000), headers: { 'user-agent': UA }, redirect: 'follow' })
  if (tooLarge(res)) throw new HttpError(502, 'CodeChef returned too much data. Try again later.')
  const html = res.ok ? (await res.text()).slice(0, MAX_BYTES) : ''
  if (!html.includes('rating-number') && !html.includes('Total Problems Solved')) throw new HttpError(404, `CodeChef user "${username}" not found.`)
  const rating = html.match(/<div class="rating-number">\s*(\d+)/)?.[1]
  const max = html.match(/Highest Rating\s*(\d+)/)?.[1]
  const solved = html.match(/Total Problems Solved:\s*(\d+)/)?.[1]
  const starBlock = html.match(/<div class="rating-star">([\s\S]*?)<\/div>/)?.[1] ?? ''
  const stars = (starBlock.match(/&#9733;|★/g) ?? []).length
  return {
    username,
    rating: rating ? Number(rating) : null,
    max_rating: max ? Number(max) : null,
    stars: stars || null,
    solved: solved ? Number(solved) : 0,
    synced_at: now(),
  }
}

const fetchers = { github, leetcode, codeforces, codechef, credly, huggingface, ctftime }
/** Platforms that also keep a username column on the profile (shown to the placement cell). */
const PROFILE_COLUMN = new Set(['github', 'leetcode', 'codeforces', 'codechef'])

/**
 * NPTEL: the certificate ID (printed on the certificate, e.g. NPTEL24EE42S12345678) is checked on nptel.ac.in, and its
 * discipline code (EE, ME, CE, CS, CH, ...) must fit the skill it is claimed for.
 */
async function nptelCredential(token: string, profileId: string, ref: string, skill: string) {
  const id = ref.trim().toUpperCase()
  const m = id.match(/^NPTEL(\d{2})([A-Z]{2})(\d{1,3})S(\d{5,12})$/)
  if (!m) throw new HttpError(422, 'Enter the certificate ID exactly as printed, for example NPTEL24EE42S12345678.')
  const rule = SKILL_BY_NAME.get(skill)
  if (!rule) throw new HttpError(422, 'Choose the skill this course is for.')
  const discipline = m[2]
  if (!(rule.nptel ?? []).includes(discipline)) throw new HttpError(422, `An NPTEL ${discipline} course cannot verify "${skill}". Pick a skill from that discipline.`)
  const res = await fetch(`https://archive.nptel.ac.in/noc/Ecertificate/?q=${encodeURIComponent(id)}`, { signal: timeout(10000), headers: { 'user-agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new HttpError(502, 'Could not reach NPTEL to verify the certificate. Try again later.')
  const type = res.headers.get('content-type') ?? ''
  const body = type.includes('pdf') ? '' : (await res.text()).slice(0, 200_000)
  if (/dont have a Certificate|don't have a certificate|not found/i.test(body)) throw new HttpError(404, 'NPTEL has no certificate with that ID.')
  const title = (body.match(/<title>([^<]{3,200})<\/title>/i)?.[1] ?? '').replace(/NPTEL Certificate/i, '').trim()
  await insertVerified(token, profileId, 'credentials', {
    kind: 'nptel', ref: id, skill, title: title.slice(0, 200), status: 'verified', verified_by: 'platform',
    data: { year: 2000 + Number(m[1]), discipline, course: Number(m[3]) },
  }, 'user_id,kind,ref')
  return { ok: true, discipline }
}

/**
 * GATE: the student uploads the official scorecard PDF (stored in their own folder) and the browser reads its fields.
 * GATE has no public verification service, so the row stays pending until the placement cell opens the PDF and confirms.
 */
async function gateCredential(token: string, profile: Record<string, any>, b: Record<string, unknown>) {
  const ref = String(b.ref ?? '').trim().toUpperCase()
  const paper = String(b.paper ?? '').trim().toUpperCase()
  const score = Number(b.score)
  const year = Number(b.year)
  const path = String(b.file_path ?? '')
  if (!/^[A-Z0-9]{8,20}$/.test(ref)) throw new HttpError(422, 'Could not read the registration number from the scorecard.')
  if (!GATE_PAPERS[paper]) throw new HttpError(422, 'Could not read the GATE paper code from the scorecard.')
  if (!Number.isFinite(score) || score < 0 || score > 1000) throw new HttpError(422, 'The GATE score must be between 0 and 1000.')
  if (!(year >= 2015 && year <= new Date().getFullYear() + 1)) throw new HttpError(422, 'Could not read the GATE year from the scorecard.')
  if (!path.startsWith(`${profile.id}/`) || !/\.pdf$/i.test(path)) throw new HttpError(422, 'Upload the scorecard PDF first.')
  if (b.name && profile.full_name && !sameName(String(b.name), String(profile.full_name)))
    throw new HttpError(422, `The scorecard is for "${b.name}", not the name on your profile.`)
  await insertVerified(token, profile.id, 'credentials', {
    kind: 'gate', ref, skill: '', title: `GATE ${year} · ${GATE_PAPERS[paper]}`, score, status: 'pending', verified_by: null, file_path: path,
    data: { paper, year, name: String(b.name ?? '').slice(0, 120), air: Number(b.air) || null },
  }, 'user_id,kind,ref')
  return { ok: true, status: 'pending' }
}
type Platform = keyof typeof fetchers

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  if (body.credential === 'nptel' || body.credential === 'gate') {
    const profile = await loadProfile(token)
    // One credential submission a minute per student keeps nptel.ac.in and the storage check unhammered.
    const [recent] = (await (await rest(token, `credentials?user_id=eq.${profile.id}&select=created_at&order=created_at.desc&limit=1`)).json().catch(() => [])) as { created_at: string }[]
    if (recent && Date.now() - Date.parse(recent.created_at) < 20_000) throw new HttpError(429, 'One moment: add the next certificate in a few seconds.')
    return json(body.credential === 'nptel' ? await nptelCredential(token, profile.id, String(body.ref ?? ''), String(body.skill ?? '')) : await gateCredential(token, profile, body))
  }
  const { platform, username } = body as { platform?: string; username?: string | null }
  if (!platform || !(platform in fetchers)) throw new HttpError(400, 'Unknown platform')
  const p = platform as Platform

  const profile = await loadProfile(token)

  if (!username) {
    await deleteRows(token, 'coding_profiles', `user_id=eq.${profile.id}&platform=eq.${p}`)
    if (p === 'github') await deleteRows(token, 'github_repos', `user_id=eq.${profile.id}`)
    if (PROFILE_COLUMN.has(p)) await saveProfile(token, profile.id, { [`${p}_username`]: null })
    return json({ ok: true, stats: null })
  }

  const raw = String(username).trim()
  // CTFtime is identified by the team number (also accept the team page URL); others by username or profile URL.
  const handleName = p === 'ctftime' ? (raw.match(/(\d{1,7})\/?$/)?.[1] ?? raw) : raw.replace(/^@/, '').replace(/^https?:\/\/[^/]+\/(u\/|users\/|profile\/)?/i, '').replace(/\/(badges)?\/?$/i, '').replace(/\/+$/, '')
  // Dots only as part of a name: "." or ".." would resolve to the platform's root path.
  if (!/^(?!\.+$)[A-Za-z0-9._-]{1,40}$/.test(handleName)) throw new HttpError(400, 'That does not look like a valid username.')

  // One sync per platform every 5 minutes per student, whatever the username, so nobody can burn the shared GitHub
  // token (or get the server rate-limited by the coding sites) by cycling through usernames.
  const [last] = (await (await rest(token, `coding_profiles?user_id=eq.${profile.id}&platform=eq.${p}&select=synced_at,username`)).json()) as { synced_at: string | null; username: string }[]
  if (last?.synced_at && Date.now() - Date.parse(last.synced_at) < 5 * 60_000)
    throw new HttpError(429, 'Synced a moment ago. You can sync this account again in a few minutes.')

  const fetched = p === 'credly' ? await credly(handleName, String(profile.full_name ?? '')) : await fetchers[p](handleName)
  const { all_repos, top_repos, ...stats } = fetched as typeof fetched & { all_repos?: unknown[]; top_repos?: unknown[] }
  void top_repos
  const s = stats as Record<string, any>
  // Written by the server only: these numbers are what "verified" skill levels and recruiters rely on.
  await insertVerified(
    token,
    profile.id,
    'coding_profiles',
    {
      platform: p,
      username: s.username,
      solved: p === 'github' ? s.original_repos : s.solved ?? null,
      rating: p === 'leetcode' ? s.contest_rating : p === 'github' ? null : s.rating ?? null,
      max_rating: s.max_rating ?? null,
      stats,
      synced_at: s.synced_at,
    },
    'user_id,platform',
  )
  if (p === 'github') {
    await deleteRows(token, 'github_repos', `user_id=eq.${profile.id}`)
    if (all_repos?.length) await insertVerified(token, profile.id, 'github_repos', all_repos as Record<string, unknown>[])
  }
  if (PROFILE_COLUMN.has(p)) await saveProfile(token, profile.id, { [`${p}_username`]: s.username })
  return json({ ok: true, stats })
})
