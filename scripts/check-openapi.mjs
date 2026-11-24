// docs/openapi.yaml must list exactly the functions in api/, with the methods each one accepts.
import { readdirSync, readFileSync } from 'node:fs'
const spec = readFileSync('docs/openapi.yaml', 'utf8')
const listed = Object.fromEntries([...spec.matchAll(/^  \/api\/([a-z-]+):\n((?:    .*\n|\n)*)/gm)].map((m) => [m[1], [...m[2].matchAll(/^    (get|post|put|patch|delete):/gm)].map((x) => x[1]).sort().join()]))
const real = Object.fromEntries(readdirSync('api').filter((f) => f.endsWith('.ts') && !f.startsWith('_')).map((f) => {
  const code = readFileSync(`api/${f}`, 'utf8')
  return [f.slice(0, -3), [...code.matchAll(/req\.method !== '([A-Z]+)'/g)].map((m) => m[1].toLowerCase()).sort().join()]
}))
const names = [...new Set([...Object.keys(listed), ...Object.keys(real)])]
const wrong = names.filter((n) => listed[n] !== real[n]).map((n) => `${n}: described "${listed[n] ?? 'missing'}", code "${real[n] ?? 'missing'}"`)
if (wrong.length) {
  console.error(`docs/openapi.yaml does not match api/:\n${wrong.join('\n')}`)
  process.exit(1)
}
console.log(`docs/openapi.yaml matches the ${names.length} functions in api/`)
