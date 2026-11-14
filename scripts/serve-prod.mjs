// A local stand-in for the Vercel deployment, for Playwright, ZAP and Lighthouse in CI.
//
//   node scripts/serve-prod.mjs            (after `npm run build`; listens on PORT, default 4173)
//
// What it reproduces from vercel.json: every rewrite (SPA routes, the /supabase proxy), every header rule
// (CSP, frame and robots headers), 404.html with status 404, and the /api edge functions, bundled with esbuild and run
// on Node's built-in fetch/Request/Response. One deliberate difference: the production Supabase origin in the headers
// and the /supabase proxy target are replaced by SUPABASE_URL, so nothing here can reach the real project.
import { build } from 'esbuild'
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const PROD_SUPABASE = 'https://oewjimwozaksyigfyrkz.supabase.co'
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
if (!supabaseUrl || supabaseUrl.includes('supabase.co')) {
  console.error('Set SUPABASE_URL to a local Supabase (for example http://127.0.0.1:54321). This server never targets a hosted project.')
  process.exit(1)
}
const port = Number(process.env.PORT || 4173)
const host = process.env.HOST || '127.0.0.1'
const dist = resolve('dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing; run `npm run build` first.')
  process.exit(1)
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
// Vercel sources are path patterns with regex groups; anchor them and treat `:path*` as "the rest".
const pattern = (source) => new RegExp('^' + source.replace(/:(\w+)\*/g, '(?<$1>.*)') + '$')
// Served over plain http locally, so the CSP's upgrade-insecure-requests (right for production) is dropped here;
// otherwise WebKit rewrites every request to https and fails.
const local = (v) =>
  v
    .split(PROD_SUPABASE.replace('https:', 'wss:')).join(supabaseUrl.replace(/^http/, 'ws'))
    .split(PROD_SUPABASE).join(supabaseUrl)
    .replace(/;\s*upgrade-insecure-requests/, '')
const rewrites = vercel.rewrites.map((r) => ({ re: pattern(r.source), destination: r.destination }))
const headerRules = vercel.headers.map((h) => ({ re: pattern(h.source), headers: h.headers.map((x) => [x.key, local(x.value)]) }))

// Bundle each route in api/ (files starting with "_" are helpers, as on Vercel).
const apiOut = join(tmpdir(), `piq-api-${process.pid}`)
const routes = readdirSync('api').filter((f) => f.endsWith('.ts') && !f.startsWith('_')).map((f) => f.slice(0, -3))
await build({
  entryPoints: routes.map((r) => `api/${r}.ts`),
  outdir: apiOut,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})
const handlers = Object.fromEntries(
  await Promise.all(routes.map(async (r) => [r, (await import(pathToFileURL(join(apiOut, `${r}.js`)).href)).default])),
)

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.lottie': 'application/zip',
}

function fileFor(path) {
  const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '')
  const full = join(dist, clean)
  if (!full.startsWith(dist)) return null
  if (existsSync(full) && statSync(full).isFile()) return full
  if (existsSync(join(full, 'index.html'))) return join(full, 'index.html')
  return null
}

const readBody = async (req) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks)
}

async function send(res, response, extra) {
  const headers = {}
  response.headers.forEach((v, k) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) headers[k] = v
  })
  res.writeHead(response.status, { ...headers, ...extra })
  res.end(Buffer.from(await response.arrayBuffer()))
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const path = url.pathname
    const extra = {}
    for (const rule of headerRules) if (rule.re.test(path)) for (const [k, v] of rule.headers) extra[k] = v

    const api = path.match(/^\/api\/([a-z][a-z0-9-]*)\/?$/)
    if (api && handlers[api[1]]) {
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
      const request = new Request(url, { method: req.method, headers: req.headers, body })
      return await send(res, await handlers[api[1]](request), extra)
    }

    let target = path
    for (const r of rewrites) {
      const m = path.match(r.re)
      if (!m) continue
      if (r.destination.startsWith('https://')) {
        // The /supabase proxy, pointed at the local stack.
        const upstream = local(r.destination).replace(':path*', m.groups?.path ?? '') + url.search
        const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req)
        const headers = { ...req.headers }
        delete headers.host
        const response = await fetch(upstream, { method: req.method, headers, body, redirect: 'manual' })
        return await send(res, response, extra)
      }
      target = r.destination
      break
    }
    if (path === '/') target = '/index.html'

    const file = fileFor(target)
    const status = file ? 200 : 404
    const served = file ?? join(dist, '404.html')
    const type = types[extname(served)] ?? 'application/octet-stream'
    // Vercel compresses text responses; without this the performance numbers here would be far worse than production.
    const accepts = String(req.headers['accept-encoding'] ?? '')
    if (/^(text\/|application\/(json|xml))/.test(type) && /\b(br|gzip)\b/.test(accepts)) {
      const raw = readFileSync(served)
      const br = /\bbr\b/.test(accepts)
      const body = br ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }) : gzipSync(raw)
      res.writeHead(status, { 'content-type': type, 'content-encoding': br ? 'br' : 'gzip', vary: 'Accept-Encoding', ...extra })
      return res.end(req.method === 'HEAD' ? undefined : body)
    }
    res.writeHead(status, { 'content-type': type, ...extra })
    if (req.method === 'HEAD') return res.end()
    createReadStream(served).pipe(res)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' })
    res.end('Local server error')
  }
}).listen(port, host, () => console.log(`serving dist/ and /api on http://${host}:${port} (Supabase: ${supabaseUrl})`))
