// Connects a coding / code-hosting account: fetches public stats and caches them on the profile.
// POST { platform: 'github' | 'leetcode' | 'codeforces' | 'codechef', username: string | null }
import { env, handle, HttpError, json, bearer, loadProfile, saveProfile } from './_lib'

export const config = { runtime: 'edge' }

const UA = 'Mozilla/5.0 (compatible; PlacementIQ/1.0; +https://placementiq-os.vercel.app)'
const now = () => new Date().toISOString()
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

async function getJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { 'user-agent': UA, ...(init.headers ?? {}) } })
  return { res, body: res.ok ? await res.json() : null }
}

async function github(username: string) {
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

  return {
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
  const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(username)}`, { headers: { 'user-agent': UA }, redirect: 'follow' })
  const html = res.ok ? await res.text() : ''
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

const fetchers = { github, leetcode, codeforces, codechef }
type Platform = keyof typeof fetchers

export default handle(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const { platform, username } = (await req.json().catch(() => ({}))) as { platform?: string; username?: string | null }
  if (!platform || !(platform in fetchers)) throw new HttpError(400, 'Unknown platform')
  const p = platform as Platform

  const profile = await loadProfile(token)
  const integrations = { ...(profile.integrations ?? {}) }

  if (!username) {
    delete integrations[p]
    await saveProfile(token, profile.id, { [`${p}_username`]: null, integrations })
    return json({ ok: true, stats: null })
  }

  const handleName = String(username).trim().replace(/^@/, '').replace(/^https?:\/\/[^/]+\/(u\/|users\/|profile\/)?/i, '').replace(/\/+$/, '')
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(handleName)) throw new HttpError(400, 'That does not look like a valid username.')

  const stats = await fetchers[p](handleName)
  integrations[p] = stats
  await saveProfile(token, profile.id, { [`${p}_username`]: stats.username, integrations })
  return json({ ok: true, stats })
})
