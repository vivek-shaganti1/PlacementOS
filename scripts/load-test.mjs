// Load test against the LOCAL stack only. Signs in, lists students as a college admin, reads a student's dashboard data.
//   node scripts/load-test.mjs [users=200] [seconds=20]
// The numbers describe this machine, not production; they show which requests get slow as data and users grow.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { totp } from './totp.mjs'
const A = JSON.parse(readFileSync('tests/e2e/accounts.json', 'utf8'))
const s = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(s.API_URL)) throw new Error('Not a local stack')
const key = s.PUBLISHABLE_KEY || s.ANON_KEY
const users = Number(process.argv[2] ?? 200)
const seconds = Number(process.argv[3] ?? 20)
const sql = (t) => execFileSync('psql', ['-Atq', '-v', 'ON_ERROR_STOP=1', '--dbname', s.DB_URL, '--command', t], { encoding: 'utf8' }).trim()
const auth = async (path, body, token) => (await fetch(`${s.API_URL}/auth/v1/${path}`, { method: 'POST', headers: { apikey: key, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })).json()
const student = (await auth('token?grant_type=password', { email: A.student, password: A.password })).access_token
let admin = await auth('token?grant_type=password', { email: A.admin, password: A.password })
const factor = admin.user.factors[0].id
const challenge = await auth(`factors/${factor}/challenge`, {}, admin.access_token)
admin = (await auth(`factors/${factor}/verify`, { challenge_id: challenge.id, code: totp(JSON.parse(readFileSync('tests/e2e/.state/totp.json', 'utf8'))[A.admin]) }, admin.access_token)).access_token
// 5,000 more students in this college, with eight skills each.
sql(`set session_replication_role = replica;
insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) select gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated','load'||g||'@load.test','{}','{}',now(),now() from generate_series(1,5000) g;
insert into public.profiles(id,email,full_name,org_id) select id,email,email,(select id from public.organizations where name='${A.college.name}') from auth.users where email like 'load%@load.test' on conflict (id) do update set org_id=excluded.org_id;
insert into public.user_skills(user_id,skill,level) select p.id,'Skill '||k,50 from public.profiles p, generate_series(1,8) k where p.email like 'load%@load.test';
analyze public.profiles; analyze public.user_skills;`)
const uid = JSON.parse(Buffer.from(student.split('.')[1], 'base64url')).sub
const jobs = {
  'student dashboard': () => fetch(`${s.API_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers: { apikey: key, authorization: `Bearer ${student}` } }),
  'student skills': () => fetch(`${s.API_URL}/rest/v1/user_skills?user_id=eq.${uid}&select=*`, { headers: { apikey: key, authorization: `Bearer ${student}` } }),
  'open drives': () => fetch(`${s.API_URL}/rest/v1/job_postings?select=*&status=eq.open`, { headers: { apikey: key, authorization: `Bearer ${student}` } }),
  'admin: 1,000 profiles': () => fetch(`${s.API_URL}/rest/v1/profiles?select=id,full_name,email,branch,cgpa&limit=1000`, { headers: { apikey: key, authorization: `Bearer ${admin}` } }),
  'admin: 1,000 skills': () => fetch(`${s.API_URL}/rest/v1/user_skills?select=user_id,skill,level&limit=1000`, { headers: { apikey: key, authorization: `Bearer ${admin}` } }),
}
try {
  for (const [name, fn] of Object.entries(jobs)) {
    const times = []
    let bad = 0
    const end = Date.now() + (seconds * 1000) / Object.keys(jobs).length
    await Promise.all(Array.from({ length: users }, async () => {
      while (Date.now() < end) {
        const t = performance.now()
        try {
          const r = await fn()
          await r.arrayBuffer()
          if (!r.ok) bad++
        } catch { bad++ }
        times.push(performance.now() - t)
      }
    }))
    times.sort((a, b) => a - b)
    const p = (q) => Math.round(times[Math.floor(times.length * q)] ?? 0)
    console.log(`${name.padEnd(24)} ${String(times.length).padStart(6)} requests  p50 ${p(0.5)} ms  p95 ${p(0.95)} ms  p99 ${p(0.99)} ms  failed ${bad}`)
  }
} finally {
  sql(`set session_replication_role = replica; delete from public.user_skills where user_id in (select id from auth.users where email like 'load%@load.test'); delete from public.profiles where email like 'load%@load.test'; delete from auth.users where email like 'load%@load.test';`)
}
