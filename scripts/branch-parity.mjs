// The database enforces drive branch rules with a copy of the BRANCHES patterns. Prints SQL that fails if a spelling maps
// to different codes in src/lib/branches.ts and private.branch_codes.
import fs from 'node:fs'
const src = fs.readFileSync(new URL('../src/lib/branches.ts', import.meta.url), 'utf8')
const rows = [...src.matchAll(/\{ code: '([^']+)', name: '([^\n]*?)', family: '[^']+', re: \/(.+?)\/i \}/g)].map((m) => ({ code: m[1], name: m[2].replace(/\\'/g, "'"), re: new RegExp(m[3], 'i') }))
const samples = [...rows.flatMap((r) => [r.name, r.code]), 'CSE (AI & ML)', 'ECE', 'E&TC', 'Mech', 'Computer Science', 'B.Tech CSE', 'Cyber Security', 'Unknown Branch']
const codes = (s) => { const c = rows.filter((r) => r.re.test(s)).map((r) => r.code); return c.length ? c : [s.trim().toUpperCase()] }
const q = (s) => `'${s.replace(/'/g, "''")}'`
console.log('create temp table t_results (name text, pass boolean);')
for (const s of new Set(samples)) console.log(`insert into t_results values (${q(`branch parity: ${s}`)}, private.branch_codes(${q(s)}) = array[${codes(s).map(q).join(',')}]::text[]);`)
console.log('select name, pass from t_results order by name;\nselect count(*) filter (where pass) as passed, count(*) as total from t_results;')
