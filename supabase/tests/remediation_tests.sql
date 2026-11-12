-- Regression tests for the November 2026 audit. Each name carries the finding it guards. Runs in one transaction, rolled back.
begin;
create temp table t_results (name text, pass boolean);
grant insert, select on t_results to authenticated;

create function pg_temp.as_user(uid text, pending boolean default false) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2', 'app_metadata', json_build_object('must_change_password', pending))::text, true);
end $$;
create function pg_temp.ok(n text, v boolean) returns void language sql as $$ insert into t_results values (n, coalesce(v, false)) $$;

-- ---------------------------------------------------------------- fixtures: two colleges with domains
insert into public.organizations (id, name, admin_emails, email_domains, plan) values
  ('0a000000-0000-4000-8000-00000000000a', 'Alpha', array['tpo@alpha.example'], array['alpha.example'], 'basic'),
  ('0b000000-0000-4000-8000-00000000000b', 'Beta', array['tpo@beta.example'], array['beta.example'], 'basic');
insert into public.org_students (org_id, email, full_name, roll_number, branch) values
  ('0a000000-0000-4000-8000-00000000000a', 'stu.a@alpha.example', 'Stu A', 'A1', 'ECE'),
  ('0b000000-0000-4000-8000-00000000000b', 'stu.b@beta.example', 'Stu B', 'B1', 'CSE');
insert into public.org_recruiters (org_id, email, company) values ('0a000000-0000-4000-8000-00000000000a', 'hr@acme.example', 'Acme');
insert into private.platform_admin_emails (email) values ('boss@platform.example') on conflict do nothing;

-- invited and confirmed, as a real invite ends up
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values
  ('aa000000-0000-4000-8000-0000000000aa', 'tpo@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('ab000000-0000-4000-8000-0000000000ab', 'tpo@beta.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('a1000000-0000-4000-8000-0000000000a1', 'stu.a@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('b1000000-0000-4000-8000-0000000000b1', 'stu.b@beta.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('cc000000-0000-4000-8000-0000000000cc', 'hr@acme.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
update public.profiles set cgpa = 8, backlogs = 0, class_x = 80, class_xii = 80, academics_source = 'student', onboarded_at = now(), branch = 'ECE' where id = 'a1000000-0000-4000-8000-0000000000a1';

insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status, recruiter_id) values
  ('d1000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-00000000000a', 'Acme', 'SDE', 'x', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, '{}', '{}', '{}', 'open', 'cc000000-0000-4000-8000-0000000000cc'),
  ('d2000000-0000-4000-8000-0000000000d2', '0a000000-0000-4000-8000-00000000000a', 'CseOnly', 'SDE', 'x', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, array['CSE'], '{}', '{}', 'open', null),
  ('d3000000-0000-4000-8000-0000000000d3', '0a000000-0000-4000-8000-00000000000a', 'EceToo', 'SDE', 'x', 'Full Time', 'x', 6, 1, 50, 50, 0, 0, array['Electronics & Communication'], '{}', '{}', 'open', null);

-- ---------------------------------------------------------------- NV-01: signing up is not enough
-- Public sign-up of a rostered student, then of a pending platform admin, with confirmation off.
insert into public.org_students (org_id, email, full_name, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'pub.a@alpha.example', 'Pub', 'P1');
insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at) values
  ('e1000000-0000-4000-8000-0000000000e1', 'pub.a@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
  ('e2000000-0000-4000-8000-0000000000e2', 'boss@platform.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now());
select pg_temp.ok('NV-01 auto-confirmed public sign-up gets no platform admin role', not exists (select 1 from public.user_roles where user_id = 'e2000000-0000-4000-8000-0000000000e2'));
select pg_temp.ok('NV-01 auto-confirmed public sign-up is not attached to a college', (select org_id is null from public.profiles where id = 'e1000000-0000-4000-8000-0000000000e1'));
-- An invite that has been sent but not opened attaches nothing; opening it does.
insert into public.org_students (org_id, email, full_name, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'inv.a@alpha.example', 'Inv', 'I1');
insert into auth.users (id, email, instance_id, aud, role) values ('e3000000-0000-4000-8000-0000000000e3', 'inv.a@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
update auth.users set invited_at = now() where id = 'e3000000-0000-4000-8000-0000000000e3';
select pg_temp.ok('NV-01 an unopened invite attaches nothing', (select org_id is null from public.profiles where id = 'e3000000-0000-4000-8000-0000000000e3'));
update auth.users set email_confirmed_at = now() where id = 'e3000000-0000-4000-8000-0000000000e3';
select pg_temp.ok('NV-01 opening the invite attaches the student', (select org_id = '0a000000-0000-4000-8000-00000000000a' from public.profiles where id = 'e3000000-0000-4000-8000-0000000000e3'));
-- A login a college created, attached in the later write that Auth makes.
insert into public.org_students (org_id, email, full_name, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'made.a@alpha.example', 'Made', 'M1');
insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at) values ('e4000000-0000-4000-8000-0000000000e4', 'made.a@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now());
update auth.users set raw_app_meta_data = jsonb_build_object('provisioned_org', '0a000000-0000-4000-8000-00000000000a') where id = 'e4000000-0000-4000-8000-0000000000e4';
select pg_temp.ok('NV-01 a login created by the college attaches to that college', (select org_id = '0a000000-0000-4000-8000-00000000000a' from public.profiles where id = 'e4000000-0000-4000-8000-0000000000e4'));

-- ---------------------------------------------------------------- SEC-02, SEC-13: reach across colleges
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
do $$ begin
  insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'victim@beta.example');
  perform pg_temp.ok('SEC-02 roster refuses another college''s domain', false);
exception when check_violation then perform pg_temp.ok('SEC-02 roster refuses another college''s domain', sqlerrm like 'ROSTER_DOMAIN:%');
end $$;
do $$ begin
  insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'someone@gmail.example');
  perform pg_temp.ok('SEC-02 roster refuses an email outside the college''s own domains', false);
exception when check_violation then perform pg_temp.ok('SEC-02 roster refuses an email outside the college''s own domains', sqlerrm like 'ROSTER_DOMAIN:%');
end $$;
select pg_temp.ok('SEC-13 a college cannot make another college''s student its admin', public.add_org_admin('0a000000-0000-4000-8000-00000000000a', 'stu.b@beta.example') = 'refused');
select pg_temp.ok('SEC-13 a refused email is not added to the admin list', not exists (select 1 from public.org_admins('0a000000-0000-4000-8000-00000000000a') a where a.email = 'stu.b@beta.example'));
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('SEC-13 no role was granted', not exists (select 1 from public.user_roles where user_id = 'b1000000-0000-4000-8000-0000000000b1'));
-- A squatted account: created with a known password by Alpha for an address Beta later trusts.
insert into public.org_students (org_id, email, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'shared@neutral.example', 'S1');
insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at, raw_app_meta_data) values
  ('e5000000-0000-4000-8000-0000000000e5', 'shared@neutral.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), jsonb_build_object('provisioned_org', '0a000000-0000-4000-8000-00000000000a'));
delete from public.org_students where email = 'shared@neutral.example';
update public.organizations set email_domains = '{}' where id = '0b000000-0000-4000-8000-00000000000b';
insert into public.org_students (org_id, email, roll_number) values ('0b000000-0000-4000-8000-00000000000b', 'shared@neutral.example', 'S2');
select pg_temp.ok('SEC-02 Beta''s roster does not link an account Alpha created', (select user_id is null from public.org_students where email = 'shared@neutral.example'));
select pg_temp.as_user('ab000000-0000-4000-8000-0000000000ab');
set local role authenticated;
select pg_temp.ok('SEC-02 Beta cannot grant admin to an account Alpha created', public.add_org_admin('0b000000-0000-4000-8000-00000000000b', 'shared@neutral.example') = 'refused');
reset role; select set_config('request.jwt.claims', '', true);
update public.organizations set email_domains = array['beta.example'] where id = '0b000000-0000-4000-8000-00000000000b';
insert into public.user_roles (user_id, role) values ('cc000000-0000-4000-8000-0000000000cc', 'super_admin');
select pg_temp.as_user('cc000000-0000-4000-8000-0000000000cc');
set local role authenticated;
select pg_temp.ok('SEC-02 a platform admin cannot be granted to an unproven mailbox', public.add_platform_admin('shared@neutral.example') = 'refused');
reset role; select set_config('request.jwt.claims', '', true);
delete from public.user_roles where user_id = 'cc000000-0000-4000-8000-0000000000cc' and role = 'super_admin';

-- ---------------------------------------------------------------- SEC-06, SEC-07
update public.organizations set admin_emails = array['tpo@alpha.example', 'tpo2@alpha.example'] where id = '0a000000-0000-4000-8000-00000000000a';
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values ('a2000000-0000-4000-8000-0000000000a2', 'tpo2@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
select pg_temp.ok('SEC-06 fixture: second admin has the role', exists (select 1 from public.user_roles where user_id = 'a2000000-0000-4000-8000-0000000000a2' and role = 'org_admin'));
update public.organizations set admin_emails = array['tpo@alpha.example'] where id = '0a000000-0000-4000-8000-00000000000a';
select pg_temp.ok('SEC-06 editing the list removes the role', not exists (select 1 from public.user_roles where user_id = 'a2000000-0000-4000-8000-0000000000a2' and role = 'org_admin'));
do $$ begin
  update auth.users set email = 'moved@alpha.example' where id = 'aa000000-0000-4000-8000-0000000000aa';
  perform pg_temp.ok('SEC-07 an admin cannot move their account to another email', false);
exception when insufficient_privilege then perform pg_temp.ok('SEC-07 an admin cannot move their account to another email', true);
end $$;

-- ---------------------------------------------------------------- SEC-16, SEC-20
update public.org_students set email = 'stu.renamed@alpha.example' where email = 'stu.a@alpha.example';
select pg_temp.ok('SEC-16 changing a roster email takes the old account off the college', (select org_id is null from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
update public.org_students set email = 'stu.a@alpha.example' where email = 'stu.renamed@alpha.example';
select pg_temp.ok('SEC-16 restoring the email links the account again', (select org_id = '0a000000-0000-4000-8000-00000000000a' from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
update public.org_recruiters set email = 'hr2@acme.example' where email = 'hr@acme.example';
select pg_temp.ok('SEC-20 changing a recruiter email ends the old account''s role', not exists (select 1 from public.user_roles where user_id = 'cc000000-0000-4000-8000-0000000000cc' and role = 'recruiter'));
update public.org_recruiters set email = 'hr@acme.example' where email = 'hr2@acme.example';
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin
  update public.profiles set resume_path = 'b1000000-0000-4000-8000-0000000000b1/peer.pdf' where id = 'a1000000-0000-4000-8000-0000000000a1';
  perform pg_temp.ok('SEC-20 resume_path cannot point into another student''s folder', false);
exception when insufficient_privilege then perform pg_temp.ok('SEC-20 resume_path cannot point into another student''s folder', true);
end $$;

-- ---------------------------------------------------------------- SEC-03: temporary password means nothing else works
reset role; select set_config('request.jwt.claims', '', true);
insert into public.user_skills (user_id, skill, level) values ('a1000000-0000-4000-8000-0000000000a1', 'SQL', 50);
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1', true);
set local role authenticated;
select pg_temp.ok('SEC-03 pending password: own profile still loads for the password screen', (select count(*) = 1 from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
select pg_temp.ok('SEC-03 pending password: no other data is readable', (select count(*) = 0 from public.user_skills));
select pg_temp.ok('SEC-03 pending password: drives are not readable', (select count(*) = 0 from public.job_postings));
do $$ declare n int; begin
  update public.profiles set phone = '1' where id = 'a1000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  perform pg_temp.ok('SEC-03 pending password: nothing can be changed', n = 0);
end $$;
do $$ begin
  perform public.consume_ai('chat');
  perform pg_temp.ok('SEC-03 pending password: AI is refused', false);
exception when others then perform pg_temp.ok('SEC-03 pending password: AI is refused', sqlerrm like 'AI_QUOTA: Choose%');
end $$;
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1', false);
select pg_temp.ok('SEC-03 after the change everything works again', (select count(*) = 1 from public.user_skills));
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('SEC-03 every RLS table in public carries the restriction', not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polname like 'password change first%')));
select pg_temp.ok('SEC-03 every public table has RLS on', not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity));

-- A pending college admin holds no admin power either.
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa', true);
set local role authenticated;
select pg_temp.ok('SEC-03 pending admin: other people''s profiles are not readable', (select count(*) = 1 from public.profiles));
do $$ begin
  perform public.add_org_admin('0a000000-0000-4000-8000-00000000000a', 'x@alpha.example');
  perform pg_temp.ok('SEC-03 pending admin: admin functions refuse', false);
exception when insufficient_privilege then perform pg_temp.ok('SEC-03 pending admin: admin functions refuse', true);
end $$;
reset role; select set_config('request.jwt.claims', '', true);

-- NV-01: a roster re-import must not link an account that only signed up.
update public.org_students set full_name = 'Pub again' where email = 'pub.a@alpha.example';
insert into public.org_students (org_id, email, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'pub.a@alpha.example', 'P1')
  on conflict (org_id, email) do update set email = excluded.email;
select pg_temp.ok('NV-01 a roster re-import does not link a mere sign-up', (select user_id is null from public.org_students where email = 'pub.a@alpha.example'));
insert into public.org_students (org_id, email, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 'inv.a@alpha.example', 'I1')
  on conflict (org_id, email) do update set email = excluded.email;
select pg_temp.ok('NV-01 a roster re-import keeps a real link', (select user_id = 'e3000000-0000-4000-8000-0000000000e3' from public.org_students where email = 'inv.a@alpha.example'));

-- SEC-13: recruiters cannot be used to reach another college's people.
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
do $$ begin
  insert into public.org_recruiters (org_id, email, company) values ('0a000000-0000-4000-8000-00000000000a', 'stu.b@beta.example', 'X');
  perform pg_temp.ok('SEC-13 a college cannot make another college''s student its recruiter', false);
exception when check_violation then perform pg_temp.ok('SEC-13 a college cannot make another college''s student its recruiter', true);
end $$;
reset role; select set_config('request.jwt.claims', '', true);

-- SEC-07: an email moved before this release still loses the role.
alter table auth.users disable trigger auth_users_allowlist_email_change;
update public.organizations set admin_emails = array['tpo@alpha.example', 'tpo2@alpha.example'] where id = '0a000000-0000-4000-8000-00000000000a';
update auth.users set email = 'moved2@alpha.example' where id = 'a2000000-0000-4000-8000-0000000000a2';
alter table auth.users enable trigger auth_users_allowlist_email_change;
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
select public.remove_org_admin('0a000000-0000-4000-8000-00000000000a', 'tpo2@alpha.example');
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('SEC-07 removal works after an email change', not exists (select 1 from public.user_roles where user_id = 'a2000000-0000-4000-8000-0000000000a2' and role = 'org_admin'));

-- SEC-16: rotating one roster row through several emails must not let several accounts use one seat.
insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'rot1@alpha.example');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values
  ('f1000000-0000-4000-8000-0000000000f1', 'rot1@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
update public.org_students set email = 'rot2@alpha.example' where email = 'rot1@alpha.example';
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values
  ('f2000000-0000-4000-8000-0000000000f2', 'rot2@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
select pg_temp.ok('SEC-16 after an email edit only the new person has the seat', (select org_id is null from public.profiles where id = 'f1000000-0000-4000-8000-0000000000f1')
  and (select user_id = 'f2000000-0000-4000-8000-0000000000f2' from public.org_students where email = 'rot2@alpha.example'));
update public.organizations set seat_limit = (select count(*) from public.org_students where org_id = '0a000000-0000-4000-8000-00000000000a') where id = '0a000000-0000-4000-8000-00000000000a';
do $$ begin
  insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'over@alpha.example');
  perform pg_temp.ok('SEC-16 the seat limit holds', false);
exception when check_violation then perform pg_temp.ok('SEC-16 the seat limit holds', sqlerrm like 'Seat limit%');
end $$;
update public.organizations set seat_limit = null where id = '0a000000-0000-4000-8000-00000000000a';

-- ---------------------------------------------------------------- SEC-18, NV-04
select pg_temp.ok('SEC-18 five failures from one IP', (select array_agg(public.signup_attempt('t@x.example', '1.1.1.1')) = array[true, true, true, true, true, false] from generate_series(1, 6)));
select pg_temp.ok('SEC-18 the same email from elsewhere is not locked out', public.signup_attempt('t@x.example', '2.2.2.2'));

-- ---------------------------------------------------------------- SEC-08
insert into public.credentials (user_id, kind, ref, status) values ('a1000000-0000-4000-8000-0000000000a1', 'nptel', 'NPTEL24EE42S11111111', 'pending');
-- Since 20261110 several students may submit the same ID; only one can hold it confirmed (W3-7).
insert into public.credentials (user_id, kind, ref, status, verified_by) values ('b1000000-0000-4000-8000-0000000000b1', 'nptel', 'NPTEL24EE42S22222222', 'verified', 'college');
do $$ begin
  insert into public.credentials (user_id, kind, ref, status, verified_by) values ('a1000000-0000-4000-8000-0000000000a1', 'nptel', 'NPTEL24EE42S22222222', 'verified', 'college');
  perform pg_temp.ok('SEC-08 one certificate belongs to one student', false);
exception when unique_violation then perform pg_temp.ok('SEC-08 one certificate belongs to one student', true);
end $$;
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
select pg_temp.ok('SEC-08 the placement cell can confirm an NPTEL certificate', public.review_credential((select id from public.credentials where ref = 'NPTEL24EE42S11111111'), true) = 'verified');
reset role; select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- SEC-04
insert into public.coding_profiles (user_id, platform, username, stats) values ('a1000000-0000-4000-8000-0000000000a1', 'github', 'octo', '{"ownership":{"proven":true}}');
do $$ begin
  insert into public.coding_profiles (user_id, platform, username, stats) values ('b1000000-0000-4000-8000-0000000000b1', 'github', 'OCTO', '{"ownership":{"proven":true}}');
  perform pg_temp.ok('SEC-04 a handle has one proven owner', false);
exception when unique_violation then perform pg_temp.ok('SEC-04 a handle has one proven owner', true);
end $$;

-- ---------------------------------------------------------------- SEC-10, SEC-11, SEC-19
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin
  update public.profiles set resume_text = 'x' where id = 'a1000000-0000-4000-8000-0000000000a1';
  perform pg_temp.ok('SEC-10 a student cannot write resume_text', false);
exception when insufficient_privilege then perform pg_temp.ok('SEC-10 a student cannot write resume_text', true);
end $$;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d2000000-0000-4000-8000-0000000000d2', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  perform pg_temp.ok('SEC-11 an ECE student cannot apply to a CSE-only drive', false);
exception when insufficient_privilege then perform pg_temp.ok('SEC-11 an ECE student cannot apply to a CSE-only drive', true);
end $$;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d3000000-0000-4000-8000-0000000000d3', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  perform pg_temp.ok('SEC-11 ECE matches the spelling "Electronics & Communication"', true);
exception when others then perform pg_temp.ok('SEC-11 ECE matches the spelling "Electronics & Communication"', false);
end $$;
insert into public.job_applications (job_id, user_id, status, match) values ('d1000000-0000-4000-8000-0000000000d1', 'a1000000-0000-4000-8000-0000000000a1', 'applied', 100);
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('SEC-19 a forged match is not stored', (select match is null from public.job_applications where job_id = 'd1000000-0000-4000-8000-0000000000d1'));

-- ---------------------------------------------------------------- NV-07
-- A drive whose deadline is today in India is still open now, and one that ended yesterday in India is closed.
insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status, deadline) values
  ('d7000000-0000-4000-8000-0000000000d7', '0a000000-0000-4000-8000-00000000000a', 'TodayIST', 'SDE', 'x', 'Full Time', 'x', 0, 9, 0, 0, 0, 0, '{}', '{}', '{}', 'open', (now() at time zone 'Asia/Kolkata')::date),
  ('d8000000-0000-4000-8000-0000000000d8', '0a000000-0000-4000-8000-00000000000a', 'YesterdayIST', 'SDE', 'x', 'Full Time', 'x', 0, 9, 0, 0, 0, 0, '{}', '{}', '{}', 'open', (now() at time zone 'Asia/Kolkata')::date - 1);
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d7000000-0000-4000-8000-0000000000d7', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  perform pg_temp.ok('NV-07 a drive closing today in India accepts applications', true);
exception when others then perform pg_temp.ok('NV-07 a drive closing today in India accepts applications', false);
end $$;
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d8000000-0000-4000-8000-0000000000d8', 'a1000000-0000-4000-8000-0000000000a1', 'applied');
  perform pg_temp.ok('NV-07 a drive that closed yesterday in India refuses', false);
exception when insufficient_privilege then perform pg_temp.ok('NV-07 a drive that closed yesterday in India refuses', true);
end $$;
reset role; select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- SEC-12
insert into public.jd_matches (user_id, score, verdict, jd_title, jd_text) values ('a1000000-0000-4000-8000-0000000000a1', 50, 'x', 'Other drive', 'secret text');
select pg_temp.as_user('cc000000-0000-4000-8000-0000000000cc');
set local role authenticated;
select pg_temp.ok('SEC-12 fixture: the recruiter sees their applicant', (select count(*) = 1 from public.profiles where id = 'a1000000-0000-4000-8000-0000000000a1'));
select pg_temp.ok('SEC-12 the recruiter cannot read JD matches from other drives', (select count(*) = 0 from public.jd_matches));

-- ---------------------------------------------------------------- DEF-05
do $$ begin
  update public.job_applications set status = 'offer' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
  perform pg_temp.ok('DEF-05 forward steps work', true);
exception when others then perform pg_temp.ok('DEF-05 forward steps work', false);
end $$;
do $$ begin
  update public.job_applications set status = 'applied' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
  perform pg_temp.ok('DEF-05 an offer cannot go back to applied', false);
exception when check_violation then perform pg_temp.ok('DEF-05 an offer cannot go back to applied', true);
end $$;
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('REL-04 the status change is in the audit log with its actor', exists (
  select 1 from public.audit_log where action = 'job_applications.update' and actor = 'cc000000-0000-4000-8000-0000000000cc' and detail ->> 'to' = 'offer'));

-- ---------------------------------------------------------------- DEF-07
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
do $$ begin
  delete from public.job_postings where id = 'd1000000-0000-4000-8000-0000000000d1';
  perform pg_temp.ok('DEF-07 a drive with an offer cannot be deleted', false);
exception when check_violation then perform pg_temp.ok('DEF-07 a drive with an offer cannot be deleted', true);
end $$;
do $$ begin
  delete from public.job_postings where id = 'd3000000-0000-4000-8000-0000000000d3';
  perform pg_temp.ok('DEF-07 a drive with only fresh applications can be deleted', not exists (select 1 from public.job_postings where id = 'd3000000-0000-4000-8000-0000000000d3'));
exception when others then perform pg_temp.ok('DEF-07 a drive with only fresh applications can be deleted', false);
end $$;

-- ---------------------------------------------------------------- REL-04: nobody edits the log
select pg_temp.ok('REL-04 the college reads its own log', (select count(*) >= 1 from public.audit_log));
do $$ declare n int; begin
  begin
    update public.audit_log set action = 'x'; get diagnostics n = row_count;
    perform pg_temp.ok('REL-04 the log cannot be edited', false);
  exception when insufficient_privilege then perform pg_temp.ok('REL-04 the log cannot be edited', true);
  end;
end $$;
do $$ begin
  delete from public.audit_log;
  perform pg_temp.ok('REL-04 the log cannot be deleted', false);
exception when insufficient_privilege then perform pg_temp.ok('REL-04 the log cannot be deleted', true);
end $$;
reset role; select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------- DEF-01, DEF-04
insert into public.org_students (org_id, email, roll_number, cgpa) values ('0a000000-0000-4000-8000-00000000000a', 'part.a@alpha.example', 'P9', 8.1);
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values ('a9000000-0000-4000-8000-0000000000a9', 'part.a@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
update public.org_students set cgpa = cgpa + 0 where email = 'part.a@alpha.example';
select pg_temp.ok('DEF-01 a partial upload is not marked verified', (select academics_source = 'default' and cgpa = 8.1 from public.profiles where id = 'a9000000-0000-4000-8000-0000000000a9'));
select pg_temp.as_user('a9000000-0000-4000-8000-0000000000a9');
set local role authenticated;
do $$ begin
  update public.profiles set cgpa = 9.9, backlogs = 0, class_x = 90, class_xii = 90 where id = 'a9000000-0000-4000-8000-0000000000a9';
  perform pg_temp.ok('DEF-01 the student can complete the missing fields', (select class_x = 90 from public.profiles where id = 'a9000000-0000-4000-8000-0000000000a9'));
  perform pg_temp.ok('DEF-01 the college''s value still wins', (select cgpa = 8.1 from public.profiles where id = 'a9000000-0000-4000-8000-0000000000a9'));
exception when others then
  perform pg_temp.ok('DEF-01 the student can complete the missing fields', false);
  perform pg_temp.ok('DEF-01 the college''s value still wins', false);
end $$;
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa');
set local role authenticated;
select public.correct_academics((select id from public.org_students where email = 'part.a@alpha.example'), 8.5, null, null, null, 'Revaluation result');
reset role; select set_config('request.jwt.claims', '', true);
select pg_temp.ok('DEF-04 a correction changes only what was given', (select cgpa = 8.5 and backlogs is null from public.org_students where email = 'part.a@alpha.example'));
select pg_temp.ok('DEF-04 the correction is audited with its reason', exists (select 1 from public.audit_log where action = 'org_students.update' and detail ->> 'reason' = 'Revaluation result'));

-- ---------------------------------------------------------------- SEC-14, SEC-17
select pg_temp.as_user('a1000000-0000-4000-8000-0000000000a1');
set local role authenticated;
do $$ declare i int; begin
  for i in 1 .. 12 loop perform public.consume_ai('chat'); end loop;
  begin
    perform public.consume_ai('chat');
    perform pg_temp.ok('SEC-14 AI actions are limited per minute', false);
  exception when others then perform pg_temp.ok('SEC-14 AI actions are limited per minute', sqlerrm like 'AI_QUOTA: That is%');
  end;
exception when others then perform pg_temp.ok('SEC-14 AI actions are limited per minute', false);
end $$;
do $$ begin
  update public.profiles set target_roles = repeat('x', 5000) where id = 'a1000000-0000-4000-8000-0000000000a1';
  perform pg_temp.ok('SEC-14 oversized profile text is refused', false);
exception when check_violation then perform pg_temp.ok('SEC-14 oversized profile text is refused', true);
end $$;
select pg_temp.ok('SEC-17 connect attempts stop after the limit', (select count(*) filter (where public.connect_attempt()) = 12 from generate_series(1, 15)));
reset role; select set_config('request.jwt.claims', '', true);

select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
rollback;
