-- pgTAP: live company research (20261127000000_live_research.sql).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(22);

insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status)
values ('00000000-0000-4000-a000-0000000000d1', 'Research College', array['res.test'], array['cell@res.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa)
values ('00000000-0000-4000-a000-0000000000d1', 's1@res.test', 'One', 'R1', 'CSE', '2026', 8.0),
       ('00000000-0000-4000-a000-0000000000d1', 's2@res.test', 'Two', 'R2', 'ECE', '2026', 8.0);
insert into private.platform_admin_emails (email) values ('boss@res-piq.test') on conflict do nothing;
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-b000-0000000000' || suffix)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, now(), '{}', '{}', now(), now()
from (values ('d1', 's1@res.test'), ('d2', 's2@res.test'), ('d9', 'boss@res-piq.test')) as v(suffix, email);
update auth.users set email_confirmed_at = now() where email like '%res%.test';

select ok(not has_table_privilege('anon', 'public.research_requests', 'select'), 'signed-out visitors cannot read requests');
select ok(not has_table_privilege('anon', 'public.research_findings', 'select'), 'or findings');
select ok(not has_function_privilege('authenticated', 'public.research_claim()', 'execute'), 'only the worker can claim work');

-- Student one asks.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$insert into public.research_requests (id, query, branch) values ('00000000-0000-4000-e000-0000000000d1', 'Acme campus hiring', 'CSE')$$, 'a student can ask');
select throws_ok($$insert into public.research_requests (query, status) values ('Pretend it is done', 'done')$$, '42501', null, 'but cannot write a finished request');
select throws_ok($$insert into public.research_requests (user_id, query) values ('00000000-0000-4000-b000-0000000000d2', 'As someone else')$$, '42501', null, 'or ask as someone else');
select is((select org_id from public.research_requests where id = '00000000-0000-4000-e000-0000000000d1'), '00000000-0000-4000-a000-0000000000d1'::uuid, 'the college is recorded by the database');
select lives_ok($$insert into public.research_requests (query) values ('Second'), ('Third')$$, 'three in an hour are fine');
select throws_ok($$insert into public.research_requests (query) values ('Fourth')$$, 'P0001', 'RESEARCH_LIMIT: You can ask for 3 researches an hour. Try again later.', 'a fourth in the hour is refused');
select throws_ok($$update public.research_requests set status = 'done' where id = '00000000-0000-4000-e000-0000000000d1'$$, '42501', null, 'a student cannot change a request''s progress');

-- The worker (service role) writes findings.
reset role;
insert into public.research_findings (id, request_id, company, kind, field, value, quote, source_url, source_kind)
values ('00000000-0000-4000-f000-0000000000d1', '00000000-0000-4000-e000-0000000000d1', 'Acme', 'eligibility', 'min_cgpa', 'CGPA 7.0', 'minimum CGPA of 7.0', 'https://www.acme.test/careers', 'official'),
       ('00000000-0000-4000-f000-0000000000d2', '00000000-0000-4000-e000-0000000000d1', 'Acme', 'role', '', 'Graduate engineer', 'Graduate engineer, Pune', 'https://www.acme.test/careers', 'official');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.research_findings), 2, 'the asker sees their findings before review');
update public.research_findings set review = 'approved' where id = '00000000-0000-4000-f000-0000000000d1';
select is((select review from public.research_findings where id = '00000000-0000-4000-f000-0000000000d1'), 'pending', 'and cannot approve them');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d2","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.research_findings), 0, 'another student sees nothing unreviewed');
select is((select count(*)::int from public.research_requests), 0, 'or anyone else''s requests');

-- The platform admin reviews, only with two-factor sign-in.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d9","role":"authenticated","aal":"aal1"}', true);
update public.research_findings set review = 'approved' where id = '00000000-0000-4000-f000-0000000000d1';
reset role;
select is((select review from public.research_findings where id = '00000000-0000-4000-f000-0000000000d1'), 'pending', 'a platform admin without a second factor cannot review');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d9","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$update public.research_findings set review = 'approved' where id = '00000000-0000-4000-f000-0000000000d1'$$, 'with one, they approve');
select throws_ok($$update public.research_findings set value = 'CGPA 6.0' where id = '00000000-0000-4000-f000-0000000000d2'$$, '42501', 'Only the review of a finding can change.', 'but cannot change the fact');

reset role;
select is((select reviewed_by from public.research_findings where id = '00000000-0000-4000-f000-0000000000d1'), '00000000-0000-4000-b000-0000000000d9'::uuid, 'who reviewed is recorded by the database');
select is((select count(*)::int from public.audit_log where action = 'research_finding.approved' and target = '00000000-0000-4000-f000-0000000000d1'), 1, 'and the review is in the audit log');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000d2","role":"authenticated","aal":"aal1"}', true);
select is((select array_agg(value) from public.research_findings), array['CGPA 7.0'], 'an approved fact is shared with every signed-in user');

reset role;
select ok(private.branch_codes('AI & Data Science') @> array['AIDS'], '"AI & Data Science" is read as AIDS');
select is((private.branch_codes('Electronics & Computer Engineering'))[1], 'ECM', '"Electronics & Computer Engineering" is ECM first');

select * from finish();
rollback;
