-- Regression tests for the 2026-11-10 audit follow-ups (migration 20261110000000). Synthetic data, rolled back.
begin;
create temp table t_results (name text, pass boolean);
grant insert, select on t_results to authenticated;
create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true); end $$;
create function pg_temp.owner() returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', '', true); end $$;
create function pg_temp.ok(n text, v boolean) returns void language sql as $$ insert into t_results values (n, coalesce(v, false)) $$;

insert into public.organizations (id, name, admin_emails, email_domains, plan) values
  ('0a000000-0000-4000-8000-00000000000a', 'Alpha', array['tpo@alpha.example'], array['alpha.example'], 'basic'),
  ('0b000000-0000-4000-8000-00000000000b', 'Beta', array['tpo@beta.example'], array['beta.example'], 'basic'),
  ('0c000000-0000-4000-8000-00000000000c', 'Gamma (no domains)', array['tpo@gamma.example'], '{}', 'basic');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values
  ('aa000000-0000-4000-8000-0000000000aa', 'tpo@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('ab000000-0000-4000-8000-0000000000ab', 'tpo@beta.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('ac000000-0000-4000-8000-0000000000ac', 'tpo@gamma.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());

-- W1-1
select pg_temp.as_user('ab000000-0000-4000-8000-0000000000ab'); set local role authenticated;
select pg_temp.ok('W1-1 a college cannot add an address on another college''s domain as its admin', public.add_org_admin('0b000000-0000-4000-8000-00000000000b', 'roll9@alpha.example') = 'refused');
reset role; select pg_temp.owner();
select pg_temp.ok('W1-1 the refused address is not on the list', not exists (select 1 from public.organizations where id = '0b000000-0000-4000-8000-00000000000b' and 'roll9@alpha.example' = any (admin_emails)));
select pg_temp.as_user('ab000000-0000-4000-8000-0000000000ab'); set local role authenticated;
select pg_temp.ok('W1-1 own-domain admins can still be added', public.add_org_admin('0b000000-0000-4000-8000-00000000000b', 'second@beta.example') = 'pending');
reset role; select pg_temp.owner();

-- W1-2: the same words whichever college the email belongs to
insert into public.org_recruiters (org_id, email, company) values ('0a000000-0000-4000-8000-00000000000a', 'hr@acme.example', 'Acme');
select pg_temp.as_user('ac000000-0000-4000-8000-0000000000ac'); set local role authenticated;
do $$ declare m1 text; m2 text; begin
  begin insert into public.org_students (org_id, email) values ('0c000000-0000-4000-8000-00000000000c', 'x@beta.example'); exception when check_violation then m1 := sqlerrm; end;
  begin insert into public.org_students (org_id, email) values ('0c000000-0000-4000-8000-00000000000c', 'hr@acme.example'); exception when check_violation then m2 := sqlerrm; end;
  perform pg_temp.ok('W1-2 roster refusals do not say which college', m1 is not null and m1 = m2 and m1 not like '%beta%');
end $$;
reset role; select pg_temp.owner();

-- W1-3: an invite is accepted even if another college later rosters the same email
insert into public.org_recruiters (org_id, email, company) values ('0a000000-0000-4000-8000-00000000000a', 'hr2@acme.example', 'Acme');
insert into public.org_students (org_id, email) values ('0c000000-0000-4000-8000-00000000000c', 'hr2@acme.example');
insert into auth.users (id, email, instance_id, aud, role) values ('c3000000-0000-4000-8000-0000000000c3', 'hr2@acme.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
update auth.users set invited_at = now() where id = 'c3000000-0000-4000-8000-0000000000c3';
do $$ begin
  update auth.users set email_confirmed_at = now() where id = 'c3000000-0000-4000-8000-0000000000c3';
  perform pg_temp.ok('W1-3 confirming the invite succeeds', true);
exception when others then perform pg_temp.ok('W1-3 confirming the invite succeeds', false);
end $$;
select pg_temp.ok('W1-3 and the disputed recruiter role is not granted', not exists (select 1 from public.user_roles where user_id = 'c3000000-0000-4000-8000-0000000000c3' and role = 'recruiter'));

-- W1-4 and W2-1
insert into public.org_students (org_id, email, roll_number) values ('0a000000-0000-4000-8000-00000000000a', 's2@alpha.example', 'R2');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values ('c2000000-0000-4000-8000-0000000000c2', 's2@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
update public.org_students set full_name = 'Re-import' where email = 's2@alpha.example';
select pg_temp.ok('W2-1 a re-import keeps the link', (select user_id = 'c2000000-0000-4000-8000-0000000000c2' from public.org_students where email = 's2@alpha.example'));
do $$ begin
  delete from auth.users where id = 'c2000000-0000-4000-8000-0000000000c2';
  perform pg_temp.ok('W1-4 a rostered login can be deleted', true);
exception when others then perform pg_temp.ok('W1-4 a rostered login can be deleted', false);
end $$;
select pg_temp.ok('W1-4 and its roster row is unlinked, not removed', (select user_id is null from public.org_students where email = 's2@alpha.example'));
insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'late@alpha.example');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values ('c4000000-0000-4000-8000-0000000000c4', 'late@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
update public.org_students set user_id = null where email = 'late@alpha.example' and user_id is not null;
update public.org_students set full_name = 'Imported again' where email = 'late@alpha.example';
select pg_temp.ok('W2-1 an explicit unlink holds through a later re-import', (select user_id is null from public.org_students where email = 'late@alpha.example'));
insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'fresh@alpha.example');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values ('c5000000-0000-4000-8000-0000000000c5', 'fresh@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
select pg_temp.ok('W2-1 a roster row still links when its account arrives', (select user_id = 'c5000000-0000-4000-8000-0000000000c5' from public.org_students where email = 'fresh@alpha.example'));

-- W3-7: two students may submit the same certificate; only one can have it confirmed
insert into public.org_students (org_id, email) values ('0a000000-0000-4000-8000-00000000000a', 'n1@alpha.example'), ('0a000000-0000-4000-8000-00000000000a', 'n2@alpha.example');
insert into auth.users (id, email, instance_id, aud, role, invited_at, email_confirmed_at) values
  ('e1000000-0000-4000-8000-0000000000e1', 'n1@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now()),
  ('e2000000-0000-4000-8000-0000000000e2', 'n2@alpha.example', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now());
insert into public.credentials (id, user_id, kind, ref, status) values
  ('ce100000-0000-4000-8000-0000000000c1', 'e1000000-0000-4000-8000-0000000000e1', 'nptel', 'NPTEL24CS01S10000001', 'pending'),
  ('ce200000-0000-4000-8000-0000000000c2', 'e2000000-0000-4000-8000-0000000000e2', 'nptel', 'NPTEL24CS01S10000001', 'pending');
select pg_temp.ok('W3-7 the real owner can submit a certificate someone else claimed first', (select count(*) = 2 from public.credentials where ref = 'NPTEL24CS01S10000001'));
select pg_temp.as_user('aa000000-0000-4000-8000-0000000000aa'); set local role authenticated;
select pg_temp.ok('W3-7 the placement cell confirms one', public.review_credential('ce200000-0000-4000-8000-0000000000c2', true) = 'verified');
do $$ begin
  perform public.review_credential('ce100000-0000-4000-8000-0000000000c1', true);
  perform pg_temp.ok('W3-7 a second confirmation of the same certificate is refused', false);
exception when unique_violation then perform pg_temp.ok('W3-7 a second confirmation of the same certificate is refused', sqlerrm like 'CREDENTIAL_TAKEN:%');
end $$;
reset role; select pg_temp.owner();

select name, pass from t_results order by name;
select count(*) filter (where pass) as passed, count(*) as total from t_results;
rollback;
