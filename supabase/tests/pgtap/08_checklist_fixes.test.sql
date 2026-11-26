-- pgTAP: 20261125000000_checklist_fixes.sql. Self-contained; rolls everything back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(25);
\set org '''00000000-0000-4000-a000-0000000000d1'''
insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status) values
 ('00000000-0000-4000-a000-0000000000d1', 'Fix College', array['fix.test'], array['cell@fix.test'], 'pro', 50, 'active'),
 ('00000000-0000-4000-a000-0000000000d2', 'Other College', array['fixo.test'], array['cell@fixo.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa) values
 ('00000000-0000-4000-a000-0000000000d1', 's1@fix.test', 'One', 'F1', 'CSE', '2026', 8.0),
 ('00000000-0000-4000-a000-0000000000d1', 's2@fix.test', 'Two', 'F2', 'CSE', '2026', 7.0),
 ('00000000-0000-4000-a000-0000000000d2', 's3@fixo.test', 'Three', 'F3', 'CSE', '2026', 7.5);
insert into public.org_recruiters (org_id, email, company, full_name) values ('00000000-0000-4000-a000-0000000000d1', 'hr@fixco.test', 'Fixco', 'R');
insert into private.platform_admin_emails (email) values ('boss@fix-piq.test') on conflict do nothing;
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-b000-0000000000' || s)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', e, now(), '{}', '{}', now(), now()
from (values ('d1','s1@fix.test'),('d2','s2@fix.test'),('d3','s3@fixo.test'),('da','cell@fix.test'),('d5','hr@fixco.test'),('d6','boss@fix-piq.test')) v(s,e);
update auth.users set email_confirmed_at = now() where id::text like '00000000-0000-4000-b000-0000000000d%';
insert into public.user_skills (user_id, skill, level) values ('00000000-0000-4000-b000-0000000000d1','Zeta',5),('00000000-0000-4000-b000-0000000000d2','Zeta',5),('00000000-0000-4000-b000-0000000000d3','Zeta',5);
insert into public.job_postings (id, org_id, company, role, description, min_cgpa, status, deadline, created_by, recruiter_id)
values ('00000000-0000-4000-c000-0000000000d1','00000000-0000-4000-a000-0000000000d1','Fixco','SDE','x',6,'open',current_date+9,'00000000-0000-4000-b000-0000000000da','00000000-0000-4000-b000-0000000000d5');
set local session_replication_role = replica;
insert into public.job_applications (job_id, user_id, status) values ('00000000-0000-4000-c000-0000000000d1','00000000-0000-4000-b000-0000000000d1','applied');
set local session_replication_role = origin;
create function pg_temp.act(suffix text, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', format('{"sub":"00000000-0000-4000-b000-0000000000%s","role":"authenticated","aal":"%s"}', suffix, aal), true);
$$;
grant execute on function pg_temp.act(text, text) to authenticated;

-- D-13: the set-based policies show exactly the same people.
set local role authenticated;
select pg_temp.act('da','aal2');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 2, 'a placement cell reads its own college''s students');
select pg_temp.act('da','aal1');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 0, 'not without the second factor');
select pg_temp.act('d5','aal1');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 1, 'a recruiter reads applicants to their own drive only');
select is((select count(*)::int from public.job_applications), 1, 'and their application');
select pg_temp.act('d1','aal1');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 1, 'a student reads only their own');
select pg_temp.act('d6','aal2');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 3, 'a platform admin reads every college');
reset role;
update public.profiles set visibility='private' where id='00000000-0000-4000-b000-0000000000d1';
set local role authenticated;
select pg_temp.act('d5','aal1');
select is((select count(*)::int from public.user_skills where skill='Zeta'), 0, 'a private profile is hidden from the recruiter');

-- B-04.
reset role;
delete from public.org_recruiters where email='hr@fixco.test';
set local role authenticated;
select pg_temp.act('d5','aal1');
select is((select count(*)::int from public.job_applications), 0, 'a removed recruiter reads no applications');
update public.job_applications set status='offer' where job_id='00000000-0000-4000-c000-0000000000d1';
reset role;
select is((select status from public.job_applications where job_id='00000000-0000-4000-c000-0000000000d1'), 'applied', 'and changes none');

-- B-22.
set local role authenticated;
select pg_temp.act('d1','aal1');
reset role;
select is((select count(*)::int from private.roster_academics('00000000-0000-4000-b000-0000000000d2')), 0, 'roster academics answer only for the caller');
select is((select cgpa from private.roster_academics('00000000-0000-4000-b000-0000000000d1')), 8.0::numeric, 'and do answer for the caller');

-- C-12.
select is((select count(*)::int from generate_series(1,25) g where public.signup_attempt('p'||g||'@x.test','198.51.100.7')), 20, 'one address gets 20 sign-up attempts an hour across emails');

-- C-19, D-17.
select is(private.ist_start('month') at time zone 'Asia/Kolkata', date_trunc('month', now() at time zone 'Asia/Kolkata'), 'the AI month starts at midnight in India');
set local role authenticated;
select pg_temp.act('d1','aal1');
select ok(public.consume_ai('chat') >= 0, 'a student can use AI');
reset role;
select public.record_ai_tokens('00000000-0000-4000-b000-0000000000d1', 321);
select is((select tokens from public.ai_usage where user_id='00000000-0000-4000-b000-0000000000d1'), 321, 'the tokens used are recorded');
select ok(not has_function_privilege('authenticated','public.record_ai_tokens(uuid,integer)','execute'), 'users cannot record tokens');
update private.platform_settings set value = 1 where key='ai_daily_cap';
set local role authenticated;
select throws_like($$select public.consume_ai('chat')$$, '%AI is paused for today%', 'the platform daily cap pauses AI');

-- C-18.
select pg_temp.act('d6','aal2');
select throws_like($$delete from public.organizations where id='00000000-0000-4000-a000-0000000000d2'$$, '%Suspend this college first%', 'an active college cannot be deleted');
update public.organizations set status='suspended' where id='00000000-0000-4000-a000-0000000000d2';
select lives_ok($$delete from public.organizations where id='00000000-0000-4000-a000-0000000000d2'$$, 'a suspended one can');

-- E-24.
select pg_temp.act('d1','aal1');
select lives_ok($$insert into public.consents (user_id, notice_version, age) values ('00000000-0000-4000-b000-0000000000d1','2026-11-25','adult')$$, 'a student records their own consent');
select throws_ok($$insert into public.consents (user_id, notice_version, age) values ('00000000-0000-4000-b000-0000000000d2','2026-11-25','adult')$$, '42501', null, 'not anyone else''s');

-- E-23.
reset role;
update public.org_students set cgpa = 8.5 where email='s1@fix.test';
select ok((select count(*) from public.audit_log where detail::text like '%8.5%' and org_id='00000000-0000-4000-a000-0000000000d1') > 0, 'a grade change is audited');
delete from auth.users where id='00000000-0000-4000-b000-0000000000d1';
select is((select count(*)::int from public.audit_log where detail::text like '%8.5%' and org_id='00000000-0000-4000-a000-0000000000d1'), 0, 'deleting the account removes the grades from the audit log');

-- C-10.
insert into public.ai_usage (user_id, kind, created_at) values ('00000000-0000-4000-b000-0000000000d2','chat', now() - interval '14 months');
select private.apply_retention();
select is((select count(*)::int from public.ai_usage where created_at < now() - interval '13 months'), 0, 'old AI usage is removed');
select ok(public.health_probe(), 'the health probe answers');
select * from finish();
rollback;
