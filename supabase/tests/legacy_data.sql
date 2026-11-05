-- Accounts as production holds them before the November 2026 migration. Synthetic. Loaded with the old schema in place.
insert into public.organizations (id, name, admin_emails, email_domains, plan) values
  ('0a000000-0000-4000-8000-00000000000a', 'Alpha', array['tpo@alpha.example', 'gone@alpha.example'], array['alpha.example'], 'basic');
insert into public.org_students (org_id, email, full_name, roll_number, cgpa) values
  ('0a000000-0000-4000-8000-00000000000a', 'old.direct@alpha.example', 'Old Direct', 'R1', null),
  ('0a000000-0000-4000-8000-00000000000a', 'old.temp@alpha.example', 'Old Temp', 'R2', null),
  ('0a000000-0000-4000-8000-00000000000a', 'unconfirmed@alpha.example', 'Unconfirmed', 'R3', null),
  ('0a000000-0000-4000-8000-00000000000a', 'partial@alpha.example', 'Partial', 'R4', 8.2);
insert into private.platform_admin_emails (email) values ('boss@platform.example') on conflict do nothing;
insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at, invited_at, raw_user_meta_data) values
  -- signed up through the old direct path: confirmed, never invited
  ('11000000-0000-4000-8000-000000000011', 'old.direct@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), null, '{}'),
  -- old temporary password, still unchanged
  ('12000000-0000-4000-8000-000000000012', 'old.temp@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), null, '{"must_change_password": true}'),
  -- platform admin made with a temporary password: no profile college and no college role
  ('13000000-0000-4000-8000-000000000013', 'boss@platform.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), null, '{"must_change_password": false}'),
  -- attached by the old trigger, never confirmed
  ('14000000-0000-4000-8000-000000000014', 'unconfirmed@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, null, '{}'),
  ('15000000-0000-4000-8000-000000000015', 'tpo@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), '{}'),
  ('16000000-0000-4000-8000-000000000016', 'gone@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), '{}'),
  ('17000000-0000-4000-8000-000000000017', 'partial@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), '{}');
-- removed from the form earlier: role kept, email gone from the list
update public.organizations set admin_emails = array['tpo@alpha.example'] where id = '0a000000-0000-4000-8000-00000000000a';
update public.profiles set academics_source = 'college' where id = '17000000-0000-4000-8000-000000000017';
-- an oversized old row must not stop later roster updates
update public.profiles set target_roles = repeat('x', 900) where id = '11000000-0000-4000-8000-000000000011';
insert into public.credentials (user_id, kind, ref, status, verified_by) values ('11000000-0000-4000-8000-000000000011', 'nptel', 'NPTEL24EE42S10000001', 'verified', 'platform');
