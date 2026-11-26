-- pgTAP: verified company catalogue and drive statistics (20261116000000_company_catalog.sql).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(16);

-- Two colleges. College A: a placement cell, three students and a recruiter. College B: one student.
insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status)
values ('00000000-0000-4000-a000-0000000000c1', 'Catalog College A', array['cata.test'], array['cell@cata.test'], 'pro', 50, 'active'),
       ('00000000-0000-4000-a000-0000000000c2', 'Catalog College B', array['catb.test'], array['cell@catb.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa)
values ('00000000-0000-4000-a000-0000000000c1', 's1@cata.test', 'One', 'CA1', 'CSE', '2026', 8.0),
       ('00000000-0000-4000-a000-0000000000c1', 's2@cata.test', 'Two', 'CA2', 'CSE', '2026', 8.0),
       ('00000000-0000-4000-a000-0000000000c1', 's3@cata.test', 'Three', 'CA3', 'CSE', '2026', 8.0),
       ('00000000-0000-4000-a000-0000000000c2', 's1@catb.test', 'Other', 'CB1', 'CSE', '2026', 8.0);
insert into public.org_recruiters (org_id, email, company, full_name)
values ('00000000-0000-4000-a000-0000000000c1', 'hr@catco.test', 'Catco', 'Recruiter');
insert into private.platform_admin_emails (email) values ('boss@cat-piq.test') on conflict do nothing;
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select ('00000000-0000-4000-b000-0000000000' || suffix)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, now(), '{}', '{}', now(), now()
from (values ('c1', 's1@cata.test'), ('c2', 's2@cata.test'), ('c3', 's3@cata.test'), ('c4', 's1@catb.test'),
             ('ca', 'cell@cata.test'), ('c5', 'hr@catco.test'), ('c6', 'boss@cat-piq.test')) as v(suffix, email);
update auth.users set email_confirmed_at = now() where email like '%cat%.test';

-- Two drives at college A (Catco with three applicants, one offer; Tiny Labs with one) and one at college B.
insert into public.job_postings (id, org_id, company, role, ctc_min, ctc_max, description, min_cgpa, status, deadline, created_by)
values ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-a000-0000000000c1', 'Catco', 'SDE', 9, 14, 'x', 6, 'open', current_date + 9, '00000000-0000-4000-b000-0000000000ca'),
       ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-a000-0000000000c1', 'Tiny Labs', 'SDE', 5, 6, 'x', 6, 'open', current_date + 9, '00000000-0000-4000-b000-0000000000ca'),
       ('00000000-0000-4000-c000-0000000000c3', '00000000-0000-4000-a000-0000000000c2', 'Elsewhere Inc', 'SDE', 7, 8, 'x', 6, 'open', current_date + 9, '00000000-0000-4000-b000-0000000000ca');
-- Seeding applications directly (the eligibility trigger is tested elsewhere).
set local session_replication_role = replica;
insert into public.job_applications (job_id, user_id, status)
values ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-b000-0000000000c1', 'offer'),
       ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-b000-0000000000c2', 'shortlisted'),
       ('00000000-0000-4000-c000-0000000000c1', '00000000-0000-4000-b000-0000000000c3', 'rejected'),
       ('00000000-0000-4000-c000-0000000000c2', '00000000-0000-4000-b000-0000000000c1', 'offer');
set local session_replication_role = origin;

insert into public.company_catalog (id, name, about, ctc_min, ctc_max, source_url, last_checked)
values ('catco', 'Catco', 'Makes cats.', 9, 14, 'https://catco.test/careers', current_date);

select ok(not has_table_privilege('anon', 'public.company_catalog', 'select'), 'signed-out visitors cannot read the catalogue');
select ok(not has_function_privilege('anon', 'public.company_drive_stats()', 'execute'), 'or the drive statistics');

-- As a student of college A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c1","role":"authenticated","aal":"aal1"}', true);
select is((select about from public.company_catalog where id = 'catco'), 'Makes cats.', 'a student reads the verified catalogue');
select throws_ok($$insert into public.company_catalog (id, name) values ('evil', 'Evil')$$, '42501', null, 'a student cannot add to it');
update public.company_catalog set about = 'Hacked' where id = 'catco';
select is((select about from public.company_catalog where id = 'catco'), 'Makes cats.', 'or change it');

select is((select array_agg(company order by company) from public.company_drive_stats()), array['Catco', 'Tiny Labs'], 'a student sees their own college''s drives only');
select results_eq($$select applicants, shortlisted, offers from public.company_drive_stats() where company = 'Catco'$$,
  $$values (3, 2, 1)$$, 'with applicants, shortlists (offers included) and offers counted');
select results_eq($$select applicants, offers from public.company_drive_stats() where company = 'Tiny Labs'$$,
  $$values (null::int, null::int)$$, 'and counts withheld below three applicants, so one classmate''s outcome is not revealed');

-- College B's student and college A's recruiter.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c4","role":"authenticated","aal":"aal1"}', true);
select is((select array_agg(company) from public.company_drive_stats()), array['Elsewhere Inc'], 'another college''s student sees only theirs');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c5","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.company_drive_stats()), 0, 'a recruiter sees no other company''s results');

-- College A's placement cell: only with two-factor sign-in.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000ca","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.company_drive_stats()), 2, 'the placement cell sees its college''s statistics');

-- The platform admin.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c6","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$insert into public.company_catalog (id, name) values ('newco', 'Newco')$$, '42501', null, 'a platform admin without a second factor cannot edit');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c6","role":"authenticated","aal":"aal2"}', true);
select lives_ok($$insert into public.company_catalog (id, name, about, updated_by) values ('newco', 'Newco', 'New.', '00000000-0000-4000-b000-0000000000c1')$$,
  'with one, they can add a company');
select throws_ok($$update public.company_catalog set last_checked = current_date, source_url = '' where id = 'newco'$$, '23514', null,
  'a "checked" date needs a source');

reset role;
select is((select updated_by from public.company_catalog where id = 'newco'), '00000000-0000-4000-b000-0000000000c6'::uuid,
  'who changed it is recorded by the database, not taken from the request');
select is((select count(*)::int from public.audit_log where action = 'company_catalog.insert' and target = 'newco'), 1, 'and the change is in the audit log');

select * from finish();
rollback;
