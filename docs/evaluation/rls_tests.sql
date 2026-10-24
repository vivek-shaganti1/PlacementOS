-- Access-control test suite for PlacementIQ (run inside one transaction that is rolled back; nothing persists).
-- T40–T45 need migration 20261024000100_verified_academics_and_stats.sql.
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
insert into t_results values ('T07 student sees only own college drives', (
  select count(*) >= 1 and bool_and(org_id = (select org_id from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1')) from public.job_postings));
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


-- ---------------------------------------------------------------- October 2026 audit: exploit attempts must fail
insert into private.platform_admin_emails (email) values ('pending.boss@platform.example');
-- recruiter: rewrite an application's student to read someone else
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-4000-8000-0000000000cc","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  update public.job_applications set user_id = 'b1000000-0000-4000-8000-0000000000b1' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
  insert into t_results values ('T20 recruiter cannot rewrite an application to another student', false);
exception when others then insert into t_results values ('T20 recruiter cannot rewrite an application to another student', true);
end $$;
insert into t_results values ('T21 recruiter cannot see a student of another college', (select count(*) = 0 from public.profiles where id = 'b1000000-0000-4000-8000-0000000000b1'));
reset role;

-- placement cell: point a drive at itself as recruiter, and move an application
select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-0000000000ad","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  update public.job_postings set recruiter_id = 'ad000000-0000-4000-8000-0000000000ad' where id = 'd1000000-0000-4000-8000-0000000000d1';
  insert into t_results values ('T22 placement cell cannot make itself a drive recruiter', (select recruiter_id = 'cc000000-0000-4000-8000-0000000000cc' from public.job_postings where id = 'd1000000-0000-4000-8000-0000000000d1'));
exception when others then insert into t_results values ('T22 placement cell cannot make itself a drive recruiter', true);
end $$;
do $$ begin
  update public.job_applications set user_id = 'b1000000-0000-4000-8000-0000000000b1' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
  insert into t_results values ('T23 placement cell cannot move an application to another student', false);
exception when others then insert into t_results values ('T23 placement cell cannot move an application to another student', true);
end $$;
insert into t_results values ('T24 can_provision refuses a pending admin email of another college', (select not public.can_provision((select id from public.organizations where name = 'Anurag University'), 'tpo@beta.example')));
insert into t_results values ('T25 can_provision refuses a platform admin email', (select not public.can_provision((select id from public.organizations where name = 'Anurag University'), 'pending.boss@platform.example')));
insert into t_results values ('T26 can_provision allows a brand-new email for own college', (select public.can_provision((select id from public.organizations where name = 'Anurag University'), 'fresh.student@anurag.example')));
-- rostering the recruiter's email as a "student" must not pull that account into the college
insert into public.org_students (org_id, email, full_name) values ((select id from public.organizations where name = 'Anurag University'), 'hr@acme.example', 'Not a student');
reset role;
insert into t_results values ('T27 roster entry never moves an account that holds a role', (select org_id is null from public.profiles where id = 'cc000000-0000-4000-8000-0000000000cc'));

-- student: edit own application, forge links, change roster fields, read org pricing, apply below minimums
update public.job_postings set min_cgpa = 9.9 where id = 'd2000000-0000-4000-8000-0000000000d2';
insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status)
values ('d3000000-0000-4000-8000-0000000000d3', (select id from public.organizations where name = 'Anurag University'), 'HardCo', 'SDE', 'x', 'Full Time', 'x', 9.99, 0, 0, 0, 0, 0, '{}', '{}', '{}', 'open');
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  update public.job_applications set ai_fit = 100 where user_id = 'a1000000-0000-4000-8000-0000000000a1';
  insert into t_results values ('T28 student cannot set their own AI fit', (select coalesce(ai_fit, 0) <> 100 from public.job_applications where user_id = 'a1000000-0000-4000-8000-0000000000a1' limit 1));
exception when others then insert into t_results values ('T28 student cannot set their own AI fit', true);
end $$;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d3000000-0000-4000-8000-0000000000d3', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  insert into t_results values ('T29 student cannot apply below a drive''s minimum CGPA', false);
exception when others then insert into t_results values ('T29 student cannot apply below a drive''s minimum CGPA', true);
end $$;
do $$ begin
  update public.profiles set linkedin_url = 'javascript:alert(1)' where id = 'a1000000-0000-4000-8000-0000000000a1';
  insert into t_results values ('T30 javascript: links are rejected', false);
exception when others then insert into t_results values ('T30 javascript: links are rejected', true);
end $$;
update public.profiles set roll_number = 'HACKED' where id = 'a1000000-0000-4000-8000-0000000000a1';
insert into t_results values ('T31 student cannot change their roster roll number', (select roll_number <> 'HACKED' from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
insert into t_results values ('T32 student cannot read college pricing or admin emails', (select count(*) = 0 from public.organizations));
insert into t_results values ('T33 student still sees their college name', (select count(*) = 1 from public.my_org()));
reset role;

-- suspended college: AI refused
update public.organizations set status = 'suspended', ai_monthly_limit = 50 where name = 'Anurag University';
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  perform public.consume_ai('chat');
  insert into t_results values ('T34 suspended college cannot spend AI actions', false);
exception when others then insert into t_results values ('T34 suspended college cannot spend AI actions', true);
end $$;
do $$ begin
  perform public.signup_attempt('x@y.example', '1.2.3.4');
  insert into t_results values ('T35 signed-in users cannot call the sign-up limiter', false);
exception when others then insert into t_results values ('T35 signed-in users cannot call the sign-up limiter', true);
end $$;
reset role;
update public.organizations set status = 'active' where name = 'Anurag University';

-- private profile hidden from the drive's recruiter
update public.profiles set visibility = 'private' where id = 'a1000000-0000-4000-8000-0000000000a1';
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-4000-8000-0000000000cc","role":"authenticated"}', true);
set local role authenticated;
insert into t_results values ('T36 private profile hidden from the recruiter', (select count(*) = 0 from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
reset role;

-- sign-up limiter: 5 attempts per email per hour
insert into t_results values ('T37 sign-up limiter blocks the 6th attempt for one email', (
  select array_agg(public.signup_attempt('limit@test.example', '9.9.9.9')) = array[true, true, true, true, true, false]
  from generate_series(1, 6)));


-- notifications: real events still notify; students cannot fabricate one
update public.profiles set visibility = 'college' where id = 'a1000000-0000-4000-8000-0000000000a1';
select set_config('request.jwt.claims', '{"sub":"cc000000-0000-4000-8000-0000000000cc","role":"authenticated"}', true);
set local role authenticated;
update public.job_applications set status = 'shortlisted' where job_id = 'd1000000-0000-4000-8000-0000000000d1' and user_id = 'a1000000-0000-4000-8000-0000000000a1';
reset role;
insert into t_results values ('T38 a status change by the recruiter still notifies the student', (
  select count(*) >= 1 from public.notifications where user_id = 'a1000000-0000-4000-8000-0000000000a1' and created_at >= now() - interval '1 minute'));
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  insert into public.notifications (user_id, title, body) values ('a1000000-0000-4000-8000-0000000000a1', 'Offer!', 'fake');
  insert into t_results values ('T39 students cannot create their own notifications', false);
exception when others then insert into t_results values ('T39 students cannot create their own notifications', true);
end $$;
reset role;

-- verified academics and stats (migration 20261024000100)
-- Student A entered academics at onboarding: self-reported and locked. A drive with low minimums in their college.
update public.profiles set cgpa = 7.2, backlogs = 0, class_x = 80, class_xii = 78, academics_source = 'student' where id = 'a1000000-0000-4000-8000-0000000000a1';
insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status)
values ('d4000000-0000-4000-8000-0000000000d4', (select id from public.organizations where name = 'Anurag University'), 'EasyCo', 'SDE', 'x', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open');
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  update public.profiles set cgpa = 10 where id = 'a1000000-0000-4000-8000-0000000000a1';
  insert into t_results values ('T40 student cannot raise locked academics', (select cgpa = 7.2 from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
exception when others then insert into t_results values ('T40 student cannot raise locked academics', true);
end $$;
do $$ begin
  insert into public.coding_profiles (user_id, platform, username, solved, rating) values ('a1000000-0000-4000-8000-0000000000a1', 'codeforces', 'fake', 900, 2400);
  insert into t_results values ('T41 student cannot write their own coding stats', false);
exception when others then insert into t_results values ('T41 student cannot write their own coding stats', true);
end $$;
do $$ begin
  insert into public.resume_analyses (user_id, overall) values ('a1000000-0000-4000-8000-0000000000a1', 100);
  insert into t_results values ('T42 student cannot write their own resume score', false);
exception when others then insert into t_results values ('T42 student cannot write their own resume score', true);
end $$;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d4000000-0000-4000-8000-0000000000d4', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  insert into t_results values ('T43 student with entered academics can still apply', true);
exception when others then insert into t_results values ('T43 student with entered academics can still apply', false);
end $$;
reset role;
-- The college uploads official academics on the roster: they replace the student's and are marked verified.
update public.org_students set cgpa = 8.4, backlogs = 0 where email = 's.a@anurag.example';
insert into t_results values ('T44 roster academics override and are marked verified', (
  select cgpa = 8.4 and academics_source = 'college' from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
-- A student who never entered academics cannot apply on the placeholder values.
update public.profiles set academics_source = 'default' where id = 'a1000000-0000-4000-8000-0000000000a1';
delete from public.job_applications where job_id = 'd4000000-0000-4000-8000-0000000000d4';
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d4000000-0000-4000-8000-0000000000d4', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  insert into t_results values ('T45 no applying on placeholder academics', false);
exception when others then insert into t_results values ('T45 no applying on placeholder academics', true);
end $$;
reset role;

select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
rollback;
