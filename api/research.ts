// Live company research, for signed-in users.
//
//   POST /api/research  { query, branch? }   Queues a request ("product companies hiring ECE freshers in Hyderabad",
//                                            "Zoho and Freshworks eligibility"). Costs one AI action from the plan quota,
//                                            and at most 3 an hour and 10 a day (the database enforces both). The answer
//                                            says how long it takes; progress and results are read from the database.
//   GET  /api/research?status                { search: boolean, adzuna: boolean }: which optional sources are set up.
//
// The work happens in /api/research-worker (see docs/RESEARCH.md for the sources and rules).
import { bearer, consumeAi, env, handle, HttpError, json, loadProfile, refundAi, rest, tokenSubject } from './_lib'
import { searchConfigured } from './_research'

export const config = { runtime: 'edge' }

export default handle(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
  const token = bearer(req)
  const url = new URL(req.url)
  if (req.method === 'GET') {
    if (!url.searchParams.has('status')) throw new HttpError(400, 'Ask for ?status')
    await rest(token, 'research_requests?select=id&limit=1') // proves the session
    return json({ search: searchConfigured(), adzuna: !!(env('ADZUNA_APP_ID') && env('ADZUNA_APP_KEY')) })
  }
  const body = (await req.json().catch(() => null)) as { query?: unknown; branch?: unknown } | null
  const query = String(body?.query ?? '').replace(/\s+/g, ' ').trim()
  if (query.length < 3) throw new HttpError(422, 'Tell us which companies, sector or role to look into.')
  if (query.length > 300) throw new HttpError(422, 'Keep the request under 300 characters.')
  const profile = await loadProfile(token)
  const branch = String(body?.branch ?? profile.branch ?? '').trim().slice(0, 80)

  await consumeAi(token, 'research')
  let row: { id: string }
  try {
    const res = await rest(token, 'research_requests?select=id', { method: 'POST', body: JSON.stringify({ query, branch }), headers: { prefer: 'return=representation' } })
    ;[row] = (await res.json()) as { id: string }[]
  } catch (e) {
    await refundAi(tokenSubject(token))
    throw e
  }
  return json({
    id: row.id,
    status: 'queued',
    message: "We're working on it. Research usually takes 2 to 10 minutes, depending on how many companies and pages there are to read. We'll notify you when it's ready.",
  }, 202)
})
