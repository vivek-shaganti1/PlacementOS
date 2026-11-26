// The database enforces drive branch rules with a copy of the BRANCHES patterns. Prints SQL that fails if a spelling maps
// to different codes in src/lib/branches.ts and private.branch_codes.
// Reads the branches from the engineering tree itself (src/data/engineering), not by parsing source text.
import { buildSync } from 'esbuild'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const out = join(mkdtempSync(join(tmpdir(), 'parity-')), 'engineering.mjs')
buildSync({ entryPoints: [new URL('../src/data/engineering/index.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' })
const { BRANCHES } = await import(pathToFileURL(out).href)
const rows = BRANCHES.map((b) => ({ code: b.code, name: b.name, re: b.re }))
if (rows.length < 30) throw new Error(`branch parity: only ${rows.length} branches found`)
const samples = [...rows.flatMap((r) => [r.name, r.code]), 'CSE (AI & ML)', 'ECE', 'E&TC', 'Mech', 'Computer Science', 'B.Tech CSE', 'Cyber Security', 'AI & Data Science', 'Electronics & Computer Engineering', 'Unknown Branch']
const codes = (s) => { const c = rows.filter((r) => r.re.test(s)).map((r) => r.code); return c.length ? c : [s.trim().toUpperCase()] }
const q = (s) => `'${s.replace(/'/g, "''")}'`
console.log('create temp table t_results (name text, pass boolean);')
for (const s of new Set(samples)) console.log(`insert into t_results values (${q(`branch parity: ${s}`)}, private.branch_codes(${q(s)}) = array[${codes(s).map(q).join(',')}]::text[]);`)
console.log('select name, pass from t_results order by name;\nselect count(*) filter (where pass) as passed, count(*) as total from t_results;')
