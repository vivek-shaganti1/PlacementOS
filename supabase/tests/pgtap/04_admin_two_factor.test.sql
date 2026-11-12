-- pgTAP: admin powers need a two-factor session (20261113000000_admin_two_factor.sql).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(10);

insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status)
values ('00000000-0000-4000-a000-0000000000f1', 'Two Factor College', array['tfc.test'], array['cell@tfc.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number) values ('00000000-0000-4000-a000-0000000000f1', 's@tfc.test', 'Ess', 'TF1');
insert into private.platform_admin_emails (email) values ('boss@piq2.test') on conflict do nothing;
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cell@tfc.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-4000-b000-0000000000f2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's@tfc.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-4000-b000-0000000000f3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'boss@piq2.test', now(), '{}', '{}', now(), now());
update auth.users set email_confirmed_at = now() where id in ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-b000-0000000000f2', '00000000-0000-4000-b000-0000000000f3');

set local role authenticated;

-- College admin, password only.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000f1","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.org_students where org_id = '00000000-0000-4000-a000-0000000000f1'), 0, 'a password-only placement cell session reads no roster');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-b000-0000000000f2'), 0, 'a password-only placement cell session reads no student profile');
select throws_ok($$insert into public.org_students (org_id, email, full_name) values ('00000000-0000-4000-a000-0000000000f1', 'x@tfc.test', 'X')$$, null, null, 'a password-only placement cell session cannot add students');
select is((select count(*)::int from public.user_roles where user_id = '00000000-0000-4000-b000-0000000000f1'), 1, 'it can still see its own role, so the app knows to ask for a code');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-b000-0000000000f1'), 1, 'and its own profile');

-- Same admin after the second factor.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000f1","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.org_students where org_id = '00000000-0000-4000-a000-0000000000f1'), 1, 'with the second factor the roster is readable');
select lives_ok($$insert into public.org_students (org_id, email, full_name) values ('00000000-0000-4000-a000-0000000000f1', 'y@tfc.test', 'Why')$$, 'and students can be added');

-- Platform admin.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000f3","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.organizations where id = '00000000-0000-4000-a000-0000000000f1'), 0, 'a password-only platform admin session sees no colleges');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000f3","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.organizations where id = '00000000-0000-4000-a000-0000000000f1'), 1, 'with the second factor it sees them');

-- Students are not asked for a second factor.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-0000000000f2","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-b000-0000000000f2'), 1, 'a student signs in with a password as before');

reset role;
select * from finish();
rollback;
