// Runs after `vite build`. Writes real HTML for the public routes using only what the app already depends on
// (Vite's SSR build and react-dom/server). Nothing is hydrated: the browser app replaces this HTML when it loads.
//
//   dist/index.html            "/"        (a host serves this file for "/" before any rewrite, so it must be the landing page)
//   dist/{privacy,terms,security}/index.html
//   dist/app.html              the empty shell, served for app routes so they never paint the landing page first
//   dist/404.html              the same shell, served with status 404 for addresses that are not routes
import react from '@vitejs/plugin-react'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const dist = resolve('dist')
const out = resolve('dist-ssr')

// Public pages never talk to the backend. Stubbing the client means a build cannot reach any Supabase project.
const noBackend = {
  name: 'prerender-no-backend',
  enforce: 'pre',
  resolveId: (id) => (/\/lib\/supabase$/.test(id) ? '\0no-backend' : null),
  load: (id) => (id === '\0no-backend' ? 'export const supabase = null; export const supabaseConfigured = false; export const errMsg = () => ""' : null),
}

await build({
  configFile: false,
  logLevel: 'warn',
  plugins: [noBackend, react()],
  build: { ssr: 'src/prerender.tsx', outDir: out, emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'prerender.mjs' } } },
})

const { render, routes, routeMeta, SITE_URL } = await import(pathToFileURL(resolve(out, 'prerender.mjs')).href)

const escapeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** Motion renders the "before" state of every reveal; without JavaScript that would leave the content invisible. */
const showHiddenContent = (html) =>
  html.replace(/ style="([^"]*)"/g, (all, style) => {
    if (!/(^|;)opacity:0(;|$)/.test(style)) return all
    const kept = style.split(';').filter((rule) => !/^(opacity|transform|filter|clip-path):/.test(rule)).join(';')
    return kept ? ` style="${kept}"` : ''
  })

function setHead(shell, pattern, replacement) {
  if (!pattern.test(shell)) throw new Error(`prerender: index.html is missing ${pattern}`)
  return shell.replace(pattern, () => replacement)
}

const shell = readFileSync(resolve(dist, 'index.html'), 'utf8')

const page = (path) => {
  const meta = routeMeta(path)
  let html = shell
  html = setHead(html, /<title>.*?<\/title>/, `<title>${meta.documentTitle.replace(/&/g, '&amp;')}</title>`)
  html = setHead(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttr(meta.description)}" />`)
  html = setHead(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${meta.canonical}" />`)
  html = setHead(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(meta.documentTitle)}" />`)
  html = setHead(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(meta.description)}" />`)
  html = setHead(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${meta.canonical}" />`)
  html = setHead(html, /\s*<noscript>[\s\S]*?<\/noscript>/, '') // The page's own content takes its place.
  const body = showHiddenContent(render(path))
  if (body.length < 500) throw new Error(`prerender: ${path} rendered almost nothing`)
  html = setHead(html, /<div id="root"><\/div>/, `<div id="root" data-prerendered="${path}">${body}</div>`)
  return html
}

// The shell has no single canonical URL: RouteMeta sets the right tags per route.
let appShell = setHead(shell, /\s*<link rel="canonical" href="[^"]*" \/>/, '')
appShell = setHead(appShell, /\s*<meta property="og:url" content="[^"]*" \/>/, '')
writeFileSync(resolve(dist, 'app.html'), appShell)
// Unknown addresses get a real 404 status. The body is the app shell, so the app still shows its own not-found page.
writeFileSync(resolve(dist, '404.html'), appShell.replace('<meta name="theme-color"', '<meta name="robots" content="noindex" />\n    <meta name="theme-color"'))

for (const path of routes) {
  const file = resolve(dist, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page(path))
  console.log(`prerendered ${path}`)
}

rmSync(out, { recursive: true, force: true })
if (!SITE_URL) throw new Error('prerender: SITE_URL missing')
