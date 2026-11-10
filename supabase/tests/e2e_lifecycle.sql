-- End-to-end journeys through the real schema, policies and triggers, one role at a time, the way the app calls them.
-- Synthetic data only; rolled back. Covers: college set-up, admin invite, roster, student invite and onboarding, evidence,
-- credential review, drives, applying, recruiter pipeline, notifications, audit, AI quota, corrections, admin removal,
-- recruiter and tenant limits, withdrawal, and account deletion.
begin;
create temp table t_results (name text, pass boolean);
grant insert, select on t_results to authenticated;
create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
create function pg_temp.owner() returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', '', true); end $$;
create function pg_temp.ok(n text, v boolean) returns void language sql as $$ insert into t_results values (n, coalesce(v, false)) $$;
-- What Supabase Auth does when someone opens an invite: create, mark invited, confirm.
create function pg_temp.accept_invite(uid uuid, em text) returns void language plpgsql as $$
begin
  insert into auth.users (id, email, instance_id, aud, role) values (uid, em, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  update auth.users set invited_at = now() where id = uid;
  update auth.users set email_confirmed_at = now() where id = uid;
end $$;

-- ===================================================================== J1 platform admin sets up a college
insert into private.platform_admin_emails (email) values ('boss@platform.example');
select pg_temp.accept_invite('5a000000-0000-4000-8000-00000000005a', 'boss@platform.example');
select pg_temp.ok('J1 platform admin gets the role on accepting the invite', exists (select 1 from public.user_roles where user_id = '5a000000-0000-4000-8000-00000000005a' and role = 'super_admin'));
select pg_temp.as_user('5a000000-0000-4000-8000-00000000005a'); set local role authenticated;
insert into public.organizations (id, name, admin_emails, email_domains, plan) values ('0e000000-0000-4000-8000-00000000000e', 'E2E College', array['tpo@e2e.example'], array['e2e.example'], 'basic');
insert into public.organizations (id, name, admin_emails, email_domains, plan) values ('0f000000-0000-4000-8000-00000000000f', 'Other College', array['tpo@other.example'], array['other.example'], 'basic');
select pg_temp.ok('J1 platform admin creates colleges', (select count(*) = 2 from public.organizations where id in ('0e000000-0000-4000-8000-00000000000e', '0f000000-0000-4000-8000-00000000000f')));
reset role; select pg_temp.owner();

-- ===================================================================== J2 placement cell admin accepts the invite
select pg_temp.accept_invite('ad000000-0000-4000-8000-0000000000ad', 'tpo@e2e.example');
select pg_temp.accept_invite('af000000-0000-4000-8000-0000000000af', 'tpo@other.example');
select pg_temp.ok('J2 college admin gets the role for their college only', (select array_agg(org_id) = array['0e000000-0000-4000-8000-00000000000e'::uuid] from public.user_roles where user_id = 'ad000000-0000-4000-8000-0000000000ad'));

-- ===================================================================== J3 roster, recruiter and a second admin
select pg_temp.as_user('ad000000-0000-4000-8000-0000000000ad'); set local role authenticated;
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, section) values
  ('0e000000-0000-4000-8000-00000000000e', 'asha@e2e.example', 'Asha Rao', 'E1', 'CSE', '2027', 'A'),
  ('0e000000-0000-4000-8000-00000000000e', 'ravi@e2e.example', 'Ravi Kumar', 'E2', 'ECE', '2027', 'B');
insert into public.org_recruiters (org_id, email, company, full_name) values ('0e000000-0000-4000-8000-00000000000e', 'hr@acme.example', 'Acme', 'Hiring Lead');
select pg_temp.ok('J3 admin sees their roster', (select count(*) = 2 from public.org_students));
select pg_temp.ok('J3 admin adds a second admin on their own domain', public.add_org_admin('0e000000-0000-4000-8000-00000000000e', 'tpo2@e2e.example') = 'pending');
reset role; select pg_temp.owner();
select pg_temp.accept_invite('a2000000-0000-4000-8000-0000000000a2', 'tpo2@e2e.example');
select pg_temp.accept_invite('cc000000-0000-4000-8000-0000000000cc', 'hr@acme.example');
select pg_temp.ok('J3 second admin and recruiter get their roles on accepting', (select count(*) = 2 from public.user_roles where user_id in ('a2000000-0000-4000-8000-0000000000a2', 'cc000000-0000-4000-8000-0000000000cc') and org_id = '0e000000-0000-4000-8000-00000000000e'));

-- ===================================================================== J4 student registers (signup check, invite, link)
select pg_temp.ok('J4 sign-up check accepts the matching roll number', public.signup_check('asha@e2e.example', 'E1') = 'ok');
select pg_temp.ok('J4 sign-up check refuses a wrong roll number', public.signup_check('asha@e2e.example', 'X9') <> 'ok');
select pg_temp.ok('J4 sign-up attempts are counted', public.signup_attempt('asha@e2e.example', '10.0.0.1'));
select pg_temp.accept_invite('51000000-0000-4000-8000-000000000051', 'asha@e2e.example');
select pg_temp.accept_invite('52000000-0000-4000-8000-000000000052', 'ravi@e2e.example');
select pg_temp.ok('J4 the student joins their college with roster details', (select org_id = '0e000000-0000-4000-8000-00000000000e' and roll_number = 'E1' and branch = 'CSE' and full_name = 'Asha Rao' from public.profiles where id = '51000000-0000-4000-8000-000000000051'));
select pg_temp.ok('J4 the roster shows them as joined', (select user_id = '51000000-0000-4000-8000-000000000051' from public.org_students where email = 'asha@e2e.example'));

-- ===================================================================== J5 onboarding
select pg_temp.as_user('51000000-0000-4000-8000-000000000051'); set local role authenticated;
update public.profiles set phone = '9000000001', target_roles = 'SDE', tracks = array['software'] where id = '51000000-0000-4000-8000-000000000051';
update public.profiles set cgpa = 8.4, backlogs = 0, class_x = 91, class_xii = 88 where id = '51000000-0000-4000-8000-000000000051';
select public.replace_rows('skills', '[{"name":"Data Structures & Algorithms","level":60},{"name":"System Design","level":40}]'::jsonb);
select public.replace_rows('projects', '[{"title":"Compiler","tech":"C++","description":"A compiler","source":"manual"}]'::jsonb);
update public.profiles set onboarded_at = now() where id = '51000000-0000-4000-8000-000000000051';
select pg_temp.ok('J5 onboarding saves profile, academics (locked as the student''s) and collections', (select academics_source = 'student' and onboarded_at is not null and phone = '9000000001' from public.profiles where id = '51000000-0000-4000-8000-000000000051')
  and (select count(*) = 2 from public.user_skills) and (select count(*) = 1 from public.projects));
do $$ begin
  update public.profiles set cgpa = 9.9 where id = '51000000-0000-4000-8000-000000000051';
  perform pg_temp.ok('J5 academics cannot be raised after onboarding', false);
exception when insufficient_privilege then perform pg_temp.ok('J5 academics cannot be raised after onboarding', sqlerrm like 'ACADEMICS_LOCKED%');
end $$;
select pg_temp.ok('J5 the student sees only their own profile', (select count(*) = 1 from public.profiles));
select pg_temp.ok('J5 the student cannot read the roster', (select count(*) = 0 from public.org_students));
reset role; select pg_temp.owner();

-- ===================================================================== J6 evidence written by the server, certificate review
insert into public.coding_profiles (user_id, platform, username, solved, rating, stats, synced_at) values
  ('51000000-0000-4000-8000-000000000051', 'leetcode', 'asha', 250, 1600, '{"ownership":{"proven":true}}', now());
insert into public.credentials (id, user_id, kind, ref, skill, status) values ('ce000000-0000-4000-8000-0000000000ce', '51000000-0000-4000-8000-000000000051', 'nptel', 'NPTEL24CS01S20000001', 'Data Structures & Algorithms', 'pending');
select pg_temp.as_user('51000000-0000-4000-8000-000000000051'); set local role authenticated;
select pg_temp.ok('J6 the student reads their own evidence', (select count(*) = 1 from public.coding_profiles) and (select count(*) = 1 from public.credentials));
do $$ begin
  update public.credentials set status = 'verified' where id = 'ce000000-0000-4000-8000-0000000000ce';
  perform pg_temp.ok('J6 the student cannot confirm their own certificate', (select status = 'pending' from public.credentials where id = 'ce000000-0000-4000-8000-0000000000ce'));
exception when insufficient_privilege then perform pg_temp.ok('J6 the student cannot confirm their own certificate', true);
end $$;
reset role; select pg_temp.owner();
select pg_temp.as_user('ad000000-0000-4000-8000-0000000000ad'); set local role authenticated;
select pg_temp.ok('J6 the placement cell confirms the certificate', public.review_credential('ce000000-0000-4000-8000-0000000000ce', true) = 'verified');
select pg_temp.ok('J6 the placement cell sees the student''s evidence', (select count(*) = 1 from public.coding_profiles where user_id = '51000000-0000-4000-8000-000000000051'));
reset role; select pg_temp.owner();

-- ===================================================================== J7 drives and applying
select pg_temp.as_user('ad000000-0000-4000-8000-0000000000ad'); set local role authenticated;
insert into public.job_postings (id, org_id, company, role, location, job_type, description, min_cgpa, max_backlogs, min_class_x, min_class_xii, min_internships, min_projects, branches, batches, skill_requirements, status, recruiter_id, deadline) values
  ('d1000000-0000-4000-8000-0000000000d1', '0e000000-0000-4000-8000-00000000000e', 'Acme', 'SDE', 'Hyderabad', 'Full Time', 'Build things', 7, 0, 60, 60, 0, 0, array['CSE'], array['2027'], '{}', 'open', 'cc000000-0000-4000-8000-0000000000cc', (now() at time zone 'Asia/Kolkata')::date + 7),
  ('d2000000-0000-4000-8000-0000000000d2', '0e000000-0000-4000-8000-00000000000e', 'Beta Corp', 'Analyst', 'Pune', 'Full Time', 'Analyse', 9.5, 0, 60, 60, 0, 0, '{}', '{}', '{}', 'open', null, null),
  ('d3000000-0000-4000-8000-0000000000d3', '0e000000-0000-4000-8000-00000000000e', 'Gamma', 'Intern', 'Remote', 'Internship', 'Learn', 6, 2, 0, 0, 0, 0, '{}', '{}', '{}', 'open', null, null);
reset role; select pg_temp.owner();
select pg_temp.ok('J7 opening drives notifies the college''s students', (select count(*) = 3 from public.notifications where user_id = '51000000-0000-4000-8000-000000000051' and text like 'New drive:%'));
select pg_temp.as_user('51000000-0000-4000-8000-000000000051'); set local role authenticated;
select pg_temp.ok('J7 the student sees their college''s drives', (select count(*) = 3 from public.job_postings));
insert into public.job_applications (job_id, user_id, status, match) values ('d1000000-0000-4000-8000-0000000000d1', '51000000-0000-4000-8000-000000000051', 'applied', 99);
insert into public.job_applications (job_id, user_id, status) values ('d3000000-0000-4000-8000-0000000000d3', '51000000-0000-4000-8000-000000000051', 'applied');
select pg_temp.ok('J7 eligible applications are accepted (match is never client-set)', (select count(*) = 2 and bool_and(match is null) from public.job_applications));
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d2000000-0000-4000-8000-0000000000d2', '51000000-0000-4000-8000-000000000051', 'applied');
  perform pg_temp.ok('J7 a drive above the student''s CGPA refuses', false);
exception when insufficient_privilege then perform pg_temp.ok('J7 a drive above the student''s CGPA refuses', true);
end $$;
reset role; select pg_temp.owner();
select pg_temp.as_user('52000000-0000-4000-8000-000000000052'); set local role authenticated;
update public.profiles set cgpa = 8, backlogs = 0, class_x = 80, class_xii = 80 where id = '52000000-0000-4000-8000-000000000052';
do $$ begin
  insert into public.job_applications (job_id, user_id, status) values ('d1000000-0000-4000-8000-0000000000d1', '52000000-0000-4000-8000-000000000052', 'applied');
  perform pg_temp.ok('J7 an ECE student cannot apply to a CSE-only drive', false);
exception when insufficient_privilege then perform pg_temp.ok('J7 an ECE student cannot apply to a CSE-only drive', true);
end $$;
reset role; select pg_temp.owner();

-- ===================================================================== J8 recruiter pipeline
select pg_temp.as_user('cc000000-0000-4000-8000-0000000000cc'); set local role authenticated;
select pg_temp.ok('J8 the recruiter sees only applicants to their own drive', (select count(*) = 1 and bool_and(job_id = 'd1000000-0000-4000-8000-0000000000d1') from public.job_applications));
select pg_temp.ok('J8 the recruiter sees the applicant''s profile', (select count(*) = 1 from public.profiles where id = '51000000-0000-4000-8000-000000000051'));
select pg_temp.ok('J8 the recruiter cannot read the roster or other students', (select count(*) = 0 from public.org_students) and (select count(*) = 0 from public.profiles where id = '52000000-0000-4000-8000-000000000052'));
update public.job_applications set status = 'shortlisted' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
update public.job_applications set status = 'interview' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
update public.job_applications set status = 'offer', admin_note = 'Welcome aboard' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
select pg_temp.ok('J8 the recruiter moves the applicant to an offer', (select status = 'offer' from public.job_applications where job_id = 'd1000000-0000-4000-8000-0000000000d1'));
do $$ begin
  update public.job_applications set status = 'applied' where job_id = 'd1000000-0000-4000-8000-0000000000d1';
  perform pg_temp.ok('J8 an offer cannot be quietly undone', false);
exception when check_violation then perform pg_temp.ok('J8 an offer cannot be quietly undone', true);
end $$;
reset role; select pg_temp.owner();
select pg_temp.ok('J8 each status change notified the student', (select count(*) >= 3 from public.notifications where user_id = '51000000-0000-4000-8000-000000000051' and (text ilike '%shortlist%' or text ilike '%interview%' or text ilike '%offer%')));
select pg_temp.ok('J8 each status change is in the audit log with the recruiter as actor', (select count(*) = 3 from public.audit_log where action = 'job_applications.update' and actor = 'cc000000-0000-4000-8000-0000000000cc'));

-- ===================================================================== J9 withdrawal and drive lifecycle
select pg_temp.as_user('51000000-0000-4000-8000-000000000051'); set local role authenticated;
delete from public.job_applications where job_id = 'd1000000-0000-4000-8000-0000000000d1';
select pg_temp.ok('J9 an offer cannot be withdrawn by the student', exists (select 1 from public.job_applications where job_id = 'd1000000-0000-4000-8000-0000000000d1'));
delete from public.job_applications where job_id = 'd3000000-0000-4000-8000-0000000000d3';
select pg_temp.ok('J9 a fresh application can be withdrawn', not exists (select 1 from public.job_applications where job_id = 'd3000000-0000-4000-8000-0000000000d3'));
reset role; select pg_temp.owner();
select pg_temp.as_user('ad000000-0000-4000-8000-0000000000ad'); set local role authenticated;
do $$ begin
  delete from public.job_postings where id = 'd1000000-0000-4000-8000-0000000000d1';
  perform pg_temp.ok('J9 a drive with an offer cannot be deleted', false);
exception when check_violation then perform pg_temp.ok('J9 a drive with an offer cannot be deleted', true);
end $$;
update public.job_postings set status = 'closed' where id = 'd1000000-0000-4000-8000-0000000000d1';
select pg_temp.ok('J9 it can be closed instead', (select status = 'closed' from public.job_postings where id = 'd1000000-0000-4000-8000-0000000000d1'));
delete from public.job_postings where id = 'd3000000-0000-4000-8000-0000000000d3';
select pg_temp.ok('J9 a drive with no outcomes can be deleted', not exists (select 1 from public.job_postings where id = 'd3000000-0000-4000-8000-0000000000d3'));
reset role; select pg_temp.owner();

-- ===================================================================== J10 AI quota and refunds
select pg_temp.as_user('51000000-0000-4000-8000-000000000051'); set local role authenticated;
do $$ declare left1 int; left2 int; begin
  left1 := public.consume_ai('chat');
  left2 := public.consume_ai('resume');
  perform pg_temp.ok('J10 each AI action uses one from the monthly quota', left2 = left1 - 1);
end $$;
reset role; select pg_temp.owner();
select public.refund_ai('51000000-0000-4000-8000-000000000051');
select pg_temp.ok('J10 a failed model call gives the action back', (select count(*) = 1 from public.ai_usage where user_id = '51000000-0000-4000-8000-000000000051'));

-- ===================================================================== J11 corrections, admin removal, tenant limits
select pg_temp.as_user('ad000000-0000-4000-8000-0000000000ad'); set local role authenticated;
select public.correct_academics((select id from public.org_students where email = 'asha@e2e.example'), 8.6, 0, 91, 88, 'Re-evaluation result');
select pg_temp.ok('J11 the placement cell cannot see another college''s roster', (select count(*) = 0 from public.org_students where org_id = '0f000000-0000-4000-8000-00000000000f'));
select public.remove_org_admin('0e000000-0000-4000-8000-00000000000e', 'tpo2@e2e.example');
reset role; select pg_temp.owner();
select pg_temp.ok('J11 a correction reaches the profile as verified by the college', (select cgpa = 8.6 and academics_source = 'college' from public.profiles where id = '51000000-0000-4000-8000-000000000051'));
select pg_temp.ok('J11 the correction is audited with its reason', exists (select 1 from public.audit_log where detail ->> 'reason' = 'Re-evaluation result'));
select pg_temp.ok('J11 a removed admin loses access', not exists (select 1 from public.user_roles where user_id = 'a2000000-0000-4000-8000-0000000000a2'));
select pg_temp.as_user('af000000-0000-4000-8000-0000000000af'); set local role authenticated;
select pg_temp.ok('J11 another college''s admin sees none of this college''s students or applications', (select count(*) = 0 from public.profiles where org_id = '0e000000-0000-4000-8000-00000000000e') and (select count(*) = 0 from public.job_applications));
select pg_temp.ok('J11 and cannot claim this college''s students as admins', public.add_org_admin('0f000000-0000-4000-8000-00000000000f', 'new@e2e.example') = 'refused');
reset role; select pg_temp.owner();

-- ===================================================================== J12 account deletion
delete from auth.users where id = '52000000-0000-4000-8000-000000000052';
select pg_temp.ok('J12 deleting a student removes their profile and data', not exists (select 1 from public.profiles where id = '52000000-0000-4000-8000-000000000052'));
select pg_temp.ok('J12 and unlinks their roster row', (select user_id is null from public.org_students where email = 'ravi@e2e.example'));

select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
rollback;
