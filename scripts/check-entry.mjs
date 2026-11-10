// The entry chunk must not pull in three.js or GSAP (CLAUDE.md performance budget). Follows the real entry script from
// dist/index.html through its static imports, and fails if any of those files is a three or GSAP chunk or contains them.
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve(process.argv[2] ?? 'dist')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const entry = html.match(/<script[^>]+type="module"[^>]+src="\/?([^"]+)"/)?.[1]
if (!entry) throw new Error('No module entry in dist/index.html')

const seen = new Set()
const queue = [entry]
while (queue.length) {
  const rel = queue.shift()
  if (seen.has(rel)) continue
  seen.add(rel)
  const code = fs.readFileSync(path.join(dist, rel), 'utf8')
  // Static imports only (from"./x.js" or import"./x.js"); dynamic import("./x.js") is allowed, that is the point.
  for (const m of code.matchAll(/(?:from|import)\s*"(\.\/[^"]+\.js)"/g)) queue.push(path.posix.join(path.posix.dirname(rel), m[1]))
}
const bad = [...seen].filter((rel) => {
  if (/\/(three|scroll)-[^/]*\.js$/.test(rel)) return true
  const code = fs.readFileSync(path.join(dist, rel), 'utf8')
  return /GreenSock|ScrollTrigger|WebGLRenderer/.test(code)
})
console.log(`entry ${entry}: ${seen.size} statically loaded file(s)`)
if (bad.length) {
  console.error(`Entry path loads three.js or GSAP: ${bad.join(', ')}`)
  process.exit(1)
}
