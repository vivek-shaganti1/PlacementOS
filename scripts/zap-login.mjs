// Prints a student's access token from the LOCAL stack, for the signed-in ZAP scan. Refuses any other host.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
const A = JSON.parse(readFileSync('tests/e2e/accounts.json', 'utf8'))
const s = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(s.API_URL)) throw new Error('Not a local stack')
const r = await fetch(`${s.API_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: s.PUBLISHABLE_KEY || s.ANON_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email: A.student, password: A.password }) })
if (!r.ok) throw new Error(`sign in: ${r.status}`)
process.stdout.write((await r.json()).access_token)
