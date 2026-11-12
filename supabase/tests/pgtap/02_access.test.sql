-- pgTAP: who can see and change what, with real roles and JWT claims. Self-contained: builds its own colleges,
-- roster and logins inside a transaction and rolls everything back.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(12);

-- Two colleges, one admin and two students each side.
insert into public.organizations (id, name, email_domains, admin_emails, plan, seat_limit, status)
values ('00000000-0000-4000-a000-000000000001', 'Tap College A', array['tapa.test'], array['admin@tapa.test'], 'pro', 50, 'active'),
       ('00000000-0000-4000-a000-000000000002', 'Tap College B', array['tapb.test'], array['admin@tapb.test'], 'pro', 50, 'active');
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, cgpa)
values ('00000000-0000-4000-a000-000000000001', 's1@tapa.test', 'Student One', 'TA1', 'CSE', '2026', 8.0),
       ('00000000-0000-4000-a000-000000000002', 's2@tapb.test', 'Student Two', 'TB1', 'CSE', '2026', 7.0);

-- Logins arrive the way GoTrue makes them: invited, then confirmed (which attaches the role or roster row).
insert into auth.users (id, instance_id, aud, role, email, invited_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@tapa.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-4000-b000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's1@tapa.test', now(), '{}', '{}', now(), now()),
       ('00000000-0000-4000-b000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's2@tapb.test', now(), '{}', '{}', now(), now());
update auth.users set email_confirmed_at = now() where email like '%@tap_.test';

select is(
  (select count(*)::int from public.user_roles where user_id = '00000000-0000-4000-b000-00000000000a' and role = 'org_admin'),
  1, 'a confirmed admin email receives the admin role for its college only'
);
select is(
  (select org_id from public.profiles where id = '00000000-0000-4000-b000-000000000001'),
  '00000000-0000-4000-a000-000000000001'::uuid, 'a confirmed student joins their roster college'
);

select throws_ok(
  $$insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-4000-b000-0000000000ff', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@nowhere.test', '{}', '{}', now(), now())$$,
  null, null, 'an email on no roster or allowlist cannot get a login'
);

-- As student one.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'a student sees exactly one profile: their own');
select is((select count(*)::int from public.org_students), 0, 'a student cannot read the roster');
select is((select count(*)::int from public.user_roles), 0, 'a student sees no role grants');
-- Refused changes are either rejected or silently pinned back by a trigger; both are checked after the fact.
update public.profiles set cgpa = 9.9 where id = '00000000-0000-4000-b000-000000000001';
update public.profiles set full_name = 'Hacked' where id = '00000000-0000-4000-b000-000000000002';
select throws_ok(
  $$insert into public.user_roles (user_id, role, org_id) values ('00000000-0000-4000-b000-000000000001', 'super_admin', null)$$,
  '42501', null, 'a student cannot grant themselves a role'
);

reset role;
select is((select cgpa from public.profiles where id = '00000000-0000-4000-b000-000000000001'), 8.0::numeric, 'a student cannot raise their own college-verified CGPA');
select is((select full_name from public.profiles where id = '00000000-0000-4000-b000-000000000002'), 'Student Two', 'a student cannot change another student''s profile');
set local role authenticated;

-- As college A's admin.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-b000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.org_students where email like '%@tap_.test'), 1, 'an admin reads only their own college''s roster');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-b000-000000000002'), 0, 'an admin cannot read another college''s student');
select throws_ok(
  $$insert into public.org_students (org_id, email, full_name) values ('00000000-0000-4000-a000-000000000002', 'x@tapb.test', 'X')$$,
  null, null, 'an admin cannot add students to another college'
);

reset role;
select * from finish();
rollback;
