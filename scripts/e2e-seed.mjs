// Fills a throwaway LOCAL Supabase with synthetic data for the browser, security and performance tests.
//
//   node scripts/e2e-seed.mjs
//
// Reads the local stack's URL, keys and database URL from `supabase status`. Refuses anything that is not on
// 127.0.0.1/localhost, so it can never write to a hosted project. Accounts come from tests/e2e/accounts.json.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { totp } from './totp.mjs'

const A = JSON.parse(readFileSync('tests/e2e/accounts.json', 'utf8'))
const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
const api = status.API_URL
const db = status.DB_URL
const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY
for (const u of [api, db]) {
  if (!/^(https?|postgresql):\/\/([^@/]*@)?(127\.0\.0\.1|localhost):\d+/.test(u)) throw new Error(`Not a local stack: ${u}`)
}

const sql = (text) => execFileSync('psql', ['--quiet', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--dbname', db, '--command', text], { encoding: 'utf8' }).trim()
const q = (s) => `'${String(s).replace(/'/g, "''")}'`

// The same path a real person takes: an invite (which records invited_at), then accepting it and choosing a password
// (which confirms the mailbox). Only then does the database treat the account as ready and attach its role.
async function createUser(email) {
  const headers = { apikey: secret, authorization: `Bearer ${secret}`, 'content-type': 'application/json' }
  const invited = await fetch(`${api}/auth/v1/invite`, { method: 'POST', headers, body: JSON.stringify({ email }) })
  const user = await invited.json()
  if (!invited.ok) throw new Error(`invite ${email}: ${invited.status} ${JSON.stringify(user)}`)
  const accepted = await fetch(`${api}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT', headers, body: JSON.stringify({ password: A.password, email_confirm: true }),
  })
  if (!accepted.ok) throw new Error(`accept ${email}: ${accepted.status} ${await accepted.text()}`)
  return user.id
}

// 1. Colleges, the platform admin allowlist, rosters and a recruiter. Everything a login attaches to must exist first.
const branches = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT']
const first = ['Aarav', 'Diya', 'Kabir', 'Isha', 'Vivaan', 'Anaya', 'Arjun', 'Saanvi', 'Reyansh', 'Myra', 'Ishaan', 'Kiara']
const last = ['Sharma', 'Reddy', 'Nair', 'Iyer', 'Patel', 'Gupta', 'Das', 'Menon', 'Khan', 'Singh']
const roster = Array.from({ length: 40 }, (_, i) => {
  const name = `${first[i % first.length]} ${last[(i * 7) % last.length]}`
  return `(o.id, ${q(`student${String(i + 1).padStart(2, '0')}@${A.college.domain}`)}, ${q(name)}, ${q(`22TEC${String(i + 101)}`)}, ${q(branches[i % branches.length])}, '2026', ${(6 + (i % 40) / 10).toFixed(1)}, ${i % 9 === 0 ? 1 : 0}, ${70 + (i % 25)}, ${68 + (i % 28)})`
}).join(',\n')

sql(`
insert into private.platform_admin_emails (email) values (${q(A.super)}) on conflict do nothing;
insert into public.organizations (name, short_name, email_domains, admin_emails, plan, seat_limit, status, ai_monthly_limit)
values (${q(A.college.name)}, ${q(A.college.short_name)}, array[${q(A.college.domain)}], array[${q(A.admin)}], 'pro', 500, 'active', 50),
       (${q(A.otherCollege.name)}, 'OIT', array[${q(A.otherCollege.domain)}], array[${q(A.otherCollege.admin)}], 'basic', 100, 'active', 20);
with o as (select id from public.organizations where name = ${q(A.college.name)})
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa, backlogs, class_x, class_xii)
select o.id, v.* from o, (values
  (${q(A.student)}, 'Asha Rao', '22TEC001', 'CSE', '2026', 8.4, 0, 92, 90),
  (${q(A.newStudent)}, 'Ravi Kumar', '22TEC002', 'ECE', '2026', 7.1, 0, 85, 80),
  (${q(A.coreStudent)}, 'Kiran Reddy', '22TEC003', 'Civil Engineering', '2026', 8.0, 0, 88, 86)
) as v(email, full_name, roll_number, branch, batch, cgpa, backlogs, class_x, class_xii);
with o as (select id from public.organizations where name = ${q(A.college.name)})
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa, backlogs, class_x, class_xii)
select * from (values ${roster.replace(/\(o\.id, /g, '((select id from o), ')}) as v;
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa)
select id, ${q(A.otherCollege.student)}, 'Meera Iyer', '22OIT001', 'CSE', '2026', 9.1 from public.organizations where name = ${q(A.otherCollege.name)};
insert into public.org_recruiters (org_id, email, company, full_name)
select id, ${q(A.recruiter)}, 'Acme Systems', 'Priya Hiring' from public.organizations where name = ${q(A.college.name)};
`)

// 2. Logins. The database triggers attach each one to its role or roster row, exactly as in production.
const ids = {}
for (const [key, email] of Object.entries({ super: A.super, admin: A.admin, recruiter: A.recruiter, student: A.student, coreStudent: A.coreStudent, otherAdmin: A.otherCollege.admin, otherStudent: A.otherCollege.student })) {
  ids[key] = await createUser(email)
}

// 2b. Two-factor sign-in for the platform admin and the first college's placement cell, through the same Auth endpoints
// the app uses. The other college's admin is left without, so the browser tests can walk through first-time setup.
const anon = status.PUBLISHABLE_KEY || status.ANON_KEY
async function passwordToken(email) {
  const r = await fetch(`${api}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anon, 'content-type': 'application/json' }, body: JSON.stringify({ email, password: A.password }) })
  const b = await r.json()
  if (!r.ok) throw new Error(`sign in ${email}: ${r.status} ${JSON.stringify(b)}`)
  return b.access_token
}
const secrets = {}
for (const email of [A.super, A.admin]) {
  const token = await passwordToken(email)
  const h = { apikey: anon, authorization: `Bearer ${token}`, 'content-type': 'application/json' }
  const f = await (await fetch(`${api}/auth/v1/factors`, { method: 'POST', headers: h, body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Seeded authenticator' }) })).json()
  if (!f.id) throw new Error(`enroll ${email}: ${JSON.stringify(f)}`)
  const c = await (await fetch(`${api}/auth/v1/factors/${f.id}/challenge`, { method: 'POST', headers: h, body: '{}' })).json()
  const v = await fetch(`${api}/auth/v1/factors/${f.id}/verify`, { method: 'POST', headers: h, body: JSON.stringify({ challenge_id: c.id, code: totp(f.totp.secret) }) })
  if (!v.ok) throw new Error(`verify ${email}: ${v.status} ${await v.text()}`)
  secrets[email] = f.totp.secret
}
mkdirSync('tests/e2e/.state', { recursive: true })
writeFileSync('tests/e2e/.state/totp.json', JSON.stringify(secrets, null, 2))

// 3. A finished onboarding for the main student, drives and an application.
sql(`
update public.profiles set onboarded_at = now(), target_roles = 'Software Engineer', phone = '9000000001'
 where id in (${q(ids.student)}, ${q(ids.otherStudent)});
-- A civil engineering student, strong in three of the track's subjects and weak in one, for the core-branch journeys.
update public.profiles set onboarded_at = now(), target_roles = 'Structural Engineer' where id = ${q(ids.coreStudent)};
insert into public.user_skills (user_id, skill, level)
values (${q(ids.coreStudent)}, 'Structural Analysis & Design (IS codes)', 80), (${q(ids.coreStudent)}, 'Structural Software (STAAD / ETABS)', 30),
       (${q(ids.coreStudent)}, 'AutoCAD & BIM (Revit)', 75), (${q(ids.coreStudent)}, 'Geotechnical & Transportation', 70), (${q(ids.coreStudent)}, 'Aptitude & Reasoning', 80)
on conflict do nothing;
insert into public.user_skills (user_id, skill, level)
values (${q(ids.student)}, 'Python', 80), (${q(ids.student)}, 'React', 70), (${q(ids.student)}, 'SQL', 65), (${q(ids.student)}, 'Data Structures', 75)
on conflict do nothing;
with o as (select id from public.organizations where name = ${q(A.college.name)})
insert into public.job_postings (org_id, company, role, location, job_type, ctc_min, ctc_max, description, min_cgpa, max_backlogs, branches, batches, deadline, status, created_by, recruiter_id)
values
 ((select id from o), 'Acme Systems', 'Graduate Software Engineer', 'Hyderabad', 'Full-time', 8, 12, 'Build and test web services.', 7, 0, array['CSE','IT','ECE'], array['2026'], current_date + 30, 'open', ${q(ids.admin)}, ${q(ids.recruiter)}),
 ((select id from o), 'Northwind Analytics', 'Data Analyst', 'Bengaluru', 'Full-time', 6, 9, 'SQL, dashboards and reporting.', 6.5, 1, array['CSE','IT','ECE','EEE'], array['2026'], current_date + 20, 'open', ${q(ids.admin)}, null),
 ((select id from o), 'Globex', 'Embedded Engineer', 'Pune', 'Full-time', 7, 10, 'Firmware for sensors.', 8, 0, array['ECE','EEE'], array['2026'], current_date - 5, 'closed', ${q(ids.admin)}, null);
insert into public.job_postings (org_id, company, role, description, min_cgpa, status, created_by, deadline)
select id, 'Initech', 'Backend Intern', 'Other college only.', 6, 'open', ${q(ids.otherAdmin)}, current_date + 10
from public.organizations where name = ${q(A.otherCollege.name)};
`)

// Applying goes through the student's own session, so the eligibility trigger runs as it does in the app.
const login = { access_token: await passwordToken(A.student) }
const drive = sql(`select id from public.job_postings where company = 'Acme Systems'`)
const applied = await fetch(`${api}/rest/v1/job_applications`, {
  method: 'POST',
  headers: { apikey: status.PUBLISHABLE_KEY || status.ANON_KEY, authorization: `Bearer ${login.access_token}`, 'content-type': 'application/json', prefer: 'return=minimal' },
  body: JSON.stringify({ job_id: drive, user_id: ids.student }),
})
if (!applied.ok) throw new Error(`apply: ${applied.status} ${await applied.text()}`)

console.log(sql(`select format('factors=%s roles=%s students=%s linked=%s drives=%s applications=%s',
  (select count(*) from auth.mfa_factors where status = 'verified'), (select count(*) from public.user_roles), (select count(*) from public.org_students),
  (select count(*) from public.org_students where user_id is not null), (select count(*) from public.job_postings),
  (select count(*) from public.job_applications))`))
