-- pgTAP: rules added by 20261112000000_review_followups.sql.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

insert into public.organizations (id, name, email_domains, plan, seat_limit, status)
values ('00000000-0000-4000-a000-0000000000c1', 'Tap College C', array['tapc.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number)
values ('00000000-0000-4000-a000-0000000000c1', 'c1@tapc.test', 'Cee One', 'TC1');

select is(
  (select count(*)::int from public.audit_log where action = 'org_students.insert' and org_id = '00000000-0000-4000-a000-0000000000c1'),
  1, 'adding a student to a roster is audited'
);

insert into public.org_recruiters (org_id, email, company) values ('00000000-0000-4000-a000-0000000000c1', 'hr@corp.test', 'Corp');
select is(
  (select count(*)::int from public.audit_log where action = 'org_recruiters.insert' and org_id = '00000000-0000-4000-a000-0000000000c1'),
  1, 'adding a recruiter is audited'
);

insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-b000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c1@tapc.test', now(), '{}', '{}', now(), now());
update auth.users set email_confirmed_at = now() where id = '00000000-0000-4000-b000-0000000000c1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000c1","role":"authenticated","aal":"aal2"}', true);

select throws_ok(
  $$update public.profiles set resume_path = '00000000-0000-4000-b000-0000000000c1/../00000000-0000-4000-b000-000000000002/cv.pdf' where id = '00000000-0000-4000-b000-0000000000c1'$$,
  '42501', null, 'a resume path cannot climb out of the student''s folder'
);
select throws_ok(
  $$update public.profiles set resume_path = '00000000-0000-4000-b000-0000000000c1/sub/cv.pdf' where id = '00000000-0000-4000-b000-0000000000c1'$$,
  '42501', null, 'a resume path cannot use a sub-folder'
);
select lives_ok(
  $$update public.profiles set resume_path = '00000000-0000-4000-b000-0000000000c1/1700000000-cv.pdf' where id = '00000000-0000-4000-b000-0000000000c1'$$,
  'a plain file in the own folder is accepted'
);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('resumes', '00000000-0000-4000-b000-0000000000c1/cv.pdf', '00000000-0000-4000-b000-0000000000c1')$$,
  'an existing account can upload to its own folder'
);

-- A token for an account that no longer exists.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000dd","role":"authenticated","aal":"aal2"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('resumes', '00000000-0000-4000-b000-0000000000dd/cv.pdf', '00000000-0000-4000-b000-0000000000dd')$$,
  '42501', null, 'a deleted account''s token cannot upload files'
);

reset role;
select * from finish();
rollback;
