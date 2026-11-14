// The website, the /api functions and the mobile app share one copy of the scoring logic (mobile/src/lib/shared.ts lists
// the entry points). Shared files must stay pure, because the phone has no DOM and no Vite: this fails the build if one
// of them, or anything it imports, touches the browser, build-tool globals, React or an npm package.
//   node scripts/check-shared.mjs
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const entry = readFileSync('mobile/src/lib/shared.ts', 'utf8')
const queue = [...entry.matchAll(/from '@shared\/([^']+)'/g)].map((m) => resolve('src', `${m[1]}.ts`))
const seen = new Set()
const problems = []
const banned = [
  [/\bimport\.meta\b/, 'import.meta (Vite only)'],
  [/\b(window|document|localStorage|sessionStorage|navigator)\s*[.[]/, 'a browser global'],
]
while (queue.length) {
  const file = queue.pop()
  if (seen.has(file)) continue
  seen.add(file)
  if (!existsSync(file)) {
    problems.push(`${relative('.', file)}: listed in shared.ts but missing`)
    continue
  }
  const code = readFileSync(file, 'utf8')
  const name = relative('.', file)
  for (const [re, what] of banned) if (re.test(code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) problems.push(`${name}: uses ${what}`)
  for (const m of code.matchAll(/^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+'([^']+)'/gm)) {
    const [, , typeOnly, spec] = m
    if (!spec.startsWith('.')) {
      if (!typeOnly) problems.push(`${name}: imports the package "${spec}" (shared files may only import other shared files)`)
      continue
    }
    const target = resolve(dirname(file), `${spec}.ts`)
    if (/\/lib\/supabase\.ts$/.test(target) && !typeOnly) problems.push(`${name}: imports the web Supabase client (use ./types for types)`)
    else if (!/\/lib\/supabase\.ts$/.test(target)) queue.push(target)
  }
}
if (problems.length) {
  console.error(`Shared code is no longer safe for the mobile app:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
console.log(`shared code is pure: ${seen.size} files (${[...seen].map((f) => relative('src', f)).sort().join(', ')})`)
