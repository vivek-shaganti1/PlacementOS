-- Access-control test suite for PlacementIQ (run inside one transaction that is rolled back; nothing persists).
-- psql "<connection>" -f docs/evaluation/rls_tests.sql
begin;

create temp table t_results (name text, pass boolean);
grant insert, select on t_results to authenticated;

-- ---------------------------------------------------------------- fixtures (as postgres)
insert into public.organizations (id, name, admin_emails, email_domains, plan)
values ('0b000000-0000-4000-8000-00000000000b', 'Beta Institute', array['tpo@beta.example'], array['beta.example'], 'basic');
update public.organizations set admin_emails = array_append(admin_emails, 'tpo@anurag.example') where name = 'Anurag University';
insert into public.org_students (org_id, email, full_name, roll_number) values
  ((select id from public.organizations where name = 'Anurag University'), 's.a@anurag.example', 'Student A', 'A1'),
  ('0b000000-0000-4000-8000-00000000000b', 's.b@beta.example', 'Student B', 'B1');
insert into public.org_recruiters (org_id, email, company)
values ((select id from public.organizations where name = 'Anurag University'), 'hr@acme.example', 'Acme');

insert into auth.users (id, email, instance_id, aud, role) values
  ('a1000000-0000-4000-8000-0000000000a1', 's.a@anurag.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b1000000-0000-4000-8000-0000000000b1', 's.b@beta.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('ad000000-0000-4000-8000-0000000000ad', 'tpo@anurag.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('cc000000-0000-4000-8000-0000000000cc', 'hr@acme.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status, recruiter_id)
values
  ('d1000000-0000-4000-8000-0000000000d1', (select id from public.organizations where name = 'Anurag University'), 'Acme', 'SDE', 'Hyderabad', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open', 'cc000000-0000-4000-8000-0000000000cc'),
  ('d2000000-0000-4000-8000-0000000000d2', '0b000000-0000-4000-8000-00000000000b', 'BetaCorp', 'SDE', 'Pune', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open', null);
insert into public.job_applications (job_id, user_id, status) values ('d1000000-0000-4000-8000-0000000000d1', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
update public.organizations set ai_monthly_limit = 2 where name = 'Anurag University';

insert into t_results values ('T01 allowlist: unregistered email cannot create an account', (
  select not exists (select 1 from auth.users where email = 'nobody@gmail.example')));
do $$ begin
  insert into auth.users (id, email, instance_id, aud, role) values ('ee000000-0000-4000-8000-0000000000ee', 'nobody@gmail.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  insert into t_results values ('T02 allowlist trigger rejects unregistered sign-up', false);
exception when others then insert into t_results values ('T02 allowlist trigger rejects unregistered sign-up', true);
end $$;
insert into t_results values ('T03 admin emails cannot self-register', (select public.signup_check('tpo@anurag.example', '') = 'admin'));
insert into t_results values ('T04 roll number must match roster', (select public.signup_check('s.a@anurag.example', 'WRONG') = 'roll_mismatch'));
insert into t_results values ('T05 roles assigned at sign-up', (
  select (select count(*) from public.user_roles where user_id = 'ad000000-0000-4000-8000-0000000000ad' and role = 'org_admin') = 1
     and (select count(*) from public.user_roles where user_id = 'cc000000-0000-4000-8000-0000000000cc' and role = 'recruiter') = 1
     and (select org_id from public.profiles where id = 'b1000000-0000-4000-8000-0000000000b1') = '0b000000-0000-4000-8000-00000000000b'));

-- ---------------------------------------------------------------- as Student A
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
insert into t_results values ('T06 student sees only own profile', (select count(*) = 1 from public.profiles));
insert into t_results values ('T07 student sees only own college drives', (select count(*) = 1 and bool_and(company = 'Acme') from public.job_postings));
insert into t_results values ('T08 student cannot read the roster', (select count(*) = 0 from public.org_students));
do $$ begin
  update public.profiles set org_id = '0b000000-0000-4000-8000-00000000000b' where id = 'a1000000-0000-4000-8000-0000000000a1';
  insert into t_results values ('T09 student cannot change own college', false);
exception when others then insert into t_results values ('T09 student cannot change own college', true);
end $$;
do $$ begin
  perform public.platform_admins();
  insert into t_results values ('T10 student cannot list platform admins', false);
exception when others then insert into t_results values ('T10 student cannot list platform admins', true);
end $$;
do $$ declare ok boolean := false; begin
  perform public.consume_ai('chat'); perform public.consume_ai('chat');
  begin perform public.consume_ai('chat'); exception when others then ok := true; end;
  insert into t_results values ('T11 AI quota refuses the action after the plan limit', ok);
end $$;
reset role;

-- ---------------------------------------------------------------- as Anurag placement cell
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-0000000000ad","role":"authenticated"}', true);
set local role authenticated;
insert into t_results values ('T12 placement cell sees its own students only', (
  select bool_and(org_id = (select id from public.organizations where name = 'Anurag University')) and count(*) >= 1 from public.profiles where id <> 'ad000000-0000-4000-8000-0000000000ad'));
insert into t_results values ('T13 placement cell cannot see another college''s drives', (select count(*) = 0 from public.job_postings where company = 'BetaCorp'));
do $$ begin
  insert into public.job_postings (org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status)
  values ('0b000000-0000-4000-8000-00000000000b', 'X', 'Y', 'Z', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open');
  insert into t_results values ('T14 placement cell cannot post for another college', false);
exception when others then insert into t_results values ('T14 placement cell cannot post for another college', true);
end $$;
do $$ begin
  perform public.add_org_admin('0b000000-0000-4000-8000-00000000000b', 'evil@x.example');
  insert into t_results values ('T15 placement cell cannot add admins to another college', false);
exception when others then insert into t_results values ('T15 placement cell cannot add admins to another college', true);
end $$;
reset role;

-- ---------------------------------------------------------------- as recruiter
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-4000-8000-0000000000cc","role":"authenticated"}', true);
set local role authenticated;
insert into t_results values ('T16 recruiter sees only own drives', (select count(*) = 1 and bool_and(company = 'Acme') from public.job_postings));
insert into t_results values ('T17 recruiter sees only applicants to own drives', (
  select count(*) = 1 from public.profiles where id <> 'cc000000-0000-4000-8000-0000000000cc'));
insert into t_results values ('T18 recruiter cannot read the roster', (select count(*) = 0 from public.org_students));
do $$ begin
  insert into public.job_postings (org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status, recruiter_id)
  values ((select org_id from public.org_recruiters limit 1), 'OtherCo', 'SDE', 'x', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open', 'cc000000-0000-4000-8000-0000000000cc');
  insert into t_results values ('T19 recruiter cannot post under another company', false);
exception when others then insert into t_results values ('T19 recruiter cannot post under another company', true);
end $$;
reset role;

select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
rollback;
