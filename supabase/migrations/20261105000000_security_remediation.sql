-- Remediation of the November 2026 audit (docs/security/). One transaction, safe to run more than once.
-- Run AFTER the matching site version is deployed; the site works before and after this runs.
--
-- Accounts
--   A1 Roles, roster links and college access attach only to accounts that came through an email invite or were created
--      by a college, never to an account that merely signed up (NV-01). Turn public sign-ups off in Auth as well.
--   A2 A role is granted to an existing account only if its mailbox was proven, and college admins cannot reach accounts
--      that belong to another college (SEC-02, SEC-13).
--   A3 Roster emails must fit the college's domains, in the database and not only in the browser (SEC-02).
--   A4 Removing a college admin removes the role, however it is done and whatever the account's email is now (SEC-06, SEC-07).
--   A5 Accounts tied to a college or a role cannot change their email (NV-02, part of SEC-20). Changing a roster row's email
--      unlinks the old account (SEC-16).
--   A6 Accounts with a temporary password can do nothing except choose a new one, enforced by RLS and in the admin checks
--      (SEC-03). Passwords issued before this release were shared, so those accounts must use a reset email.
--   A7 Sign-up attempts are limited per email and IP pair, and hold under concurrency (SEC-18, NV-04).
-- Evidence and tenancy
--   E1 NPTEL certificates need the placement cell's confirmation and one certificate belongs to one student (SEC-08).
--   E2 One proven owner per coding handle (SEC-04). Ownership proof itself is written by /api/connect.
--   E3 resume_text is server-written; resume_path must be in the student's own folder; match is never client-supplied
--      (SEC-10, SEC-19, SEC-20).
--   E4 Drive branch rules hold in the database (SEC-11). Recruiters do not read JD text, mock notes or history from other
--      drives (SEC-12).
-- Integrity and lifecycle
--   L1 Partial roster academics no longer block onboarding (DEF-01); audited corrections (DEF-04).
--   L2 Application status moves through valid steps with history (DEF-05); drives with outcomes cannot be deleted (DEF-07).
--   L3 Append-only audit log (REL-04).
--   L4 Length limits and a per-minute AI limit (SEC-14); connect attempts are limited (SEC-17); replace_rows is serialized (NV-05).

begin;

-- ---------------------------------------------------------------------------
-- A1, A2. Who may receive access
-- ---------------------------------------------------------------------------
create or replace function private.account_ready(confirmed timestamptz, invited timestamptz, app_meta jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select confirmed is not null and (invited is not null or coalesce(app_meta, '{}'::jsonb) ? 'provisioned_org');
$$;
revoke all on function private.account_ready(timestamptz, timestamptz, jsonb) from public, anon, authenticated;

-- The mailbox was proven by an invite link, or the account was created by this very college.
create or replace function private.mailbox_proven(uid uuid, target_org uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = uid and u.email_confirmed_at is not null
      and (u.invited_at is not null or (target_org is not null and u.raw_app_meta_data ->> 'provisioned_org' = target_org::text))
  );
$$;
revoke all on function private.mailbox_proven(uuid, uuid) from public, anon, authenticated;

-- When this release reached this database, so "from before this release" means the same on any re-run.
create table if not exists private.release_marks (name text primary key, at timestamptz not null default now());
insert into private.release_marks (name) values ('mailbox_proof') on conflict do nothing;

-- A roster row may link an account that proved its mailbox here. Accounts from before this release could not have, so they
-- pass unless a different college created them.
create or replace function private.may_link(uid uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.mailbox_proven(uid, target_org) or exists (
    select 1 from auth.users u
    where u.id = uid and u.email_confirmed_at is not null and u.created_at < (select m.at from private.release_marks m where m.name = 'mailbox_proof')
      and coalesce(u.raw_app_meta_data ->> 'provisioned_org', target_org::text) = target_org::text
  );
$$;
revoke all on function private.may_link(uuid, uuid) from public, anon, authenticated;

-- The email or its account already belongs to another college or to the platform.
create or replace function private.belongs_elsewhere(em text, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.org_students s where s.email = em and s.org_id <> target_org)
      or exists (select 1 from public.org_recruiters c where c.email = em and c.org_id <> target_org)
      or exists (select 1 from public.organizations o where o.id <> target_org and em = any (o.admin_emails))
      or exists (select 1 from private.platform_admin_emails p where p.email = em)
      or exists (
        select 1 from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.user_roles r on r.user_id = u.id
        where lower(u.email) = em and (p.org_id <> target_org or r.org_id <> target_org or r.role = 'super_admin')
      );
$$;
revoke all on function private.belongs_elsewhere(text, uuid) from public, anon, authenticated;

create or replace function private.attach_user_to_org(uid uuid, user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(coalesce(user_email, ''));
  r public.org_students%rowtype;
  -- An account a college created can only ever receive access in that college.
  prov uuid := (select case when u.raw_app_meta_data ->> 'provisioned_org' ~ '^[0-9a-f-]{36}$' then (u.raw_app_meta_data ->> 'provisioned_org')::uuid end from auth.users u where u.id = uid);
begin
  if em = '' then
    return;
  end if;
  if prov is null and exists (select 1 from private.platform_admin_emails p where p.email = em) then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return;
  end if;
  insert into public.user_roles (user_id, role, org_id)
  select uid, 'org_admin', o.id from public.organizations o where em = any (o.admin_emails) and (prov is null or o.id = prov)
  on conflict do nothing;
  if exists (select 1 from public.user_roles x where x.user_id = uid and x.role = 'org_admin') then
    return;
  end if;
  if exists (select 1 from public.org_recruiters rc where rc.email = em and (prov is null or rc.org_id = prov)) then
    update public.org_recruiters set user_id = uid where email = em and (prov is null or org_id = prov);
    insert into public.user_roles (user_id, role, org_id)
    select uid, 'recruiter', rc.org_id from public.org_recruiters rc where rc.email = em and (prov is null or rc.org_id = prov)
    on conflict do nothing;
    return;
  end if;
  select * into r from public.org_students s where s.email = em and (prov is null or s.org_id = prov) order by s.created_at limit 1;
  if found then
    update public.profiles p set
      org_id = r.org_id,
      roll_number = coalesce(nullif(r.roll_number, ''), nullif(p.roll_number, '')),
      full_name = case when coalesce(r.full_name, '') <> '' then r.full_name else p.full_name end,
      branch = case when coalesce(r.branch, '') <> '' then r.branch else p.branch end,
      batch = case when coalesce(r.batch, '') <> '' then r.batch else p.batch end,
      section = coalesce(r.section, ''),
      program = coalesce(nullif(r.program, ''), 'B.Tech'),
      college = (select o.name from public.organizations o where o.id = r.org_id)
    where p.id = uid;
    update public.org_students set user_id = uid where id = r.id;
  end if;
end;
$$;
revoke all on function private.attach_user_to_org(uuid, text) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), coalesce(new.email, ''))
  on conflict (id) do nothing;

  insert into public.notifications (user_id, text, link) values
    (new.id, 'Welcome to PlacementIQ. Complete your profile to sharpen your matches.', '/profile'),
    (new.id, 'Upload your resume to get an ATS score', '/resume'),
    (new.id, 'Your 12-week learning roadmap is ready', '/roadmap');

  if private.account_ready(new.email_confirmed_at, new.invited_at, new.raw_app_meta_data) then
    perform private.attach_user_to_org(new.id, new.email);
  end if;
  return new;
end;
$$;

-- Auth writes a new account in several steps, so access attaches at the moment it becomes ready.
create or replace function private.attach_when_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.account_ready(new.email_confirmed_at, new.invited_at, new.raw_app_meta_data)
     and not private.account_ready(old.email_confirmed_at, old.invited_at, old.raw_app_meta_data) then
    perform private.attach_user_to_org(new.id, new.email);
  end if;
  return new;
end;
$$;
revoke all on function private.attach_when_ready() from public, anon, authenticated;
drop trigger if exists auth_users_attach on auth.users;
create trigger auth_users_attach after update on auth.users for each row
  when (old.email_confirmed_at is distinct from new.email_confirmed_at or old.invited_at is distinct from new.invited_at
        or old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function private.attach_when_ready();

create or replace function public.add_org_admin(target_org uuid, target_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(target_email));
  uid uuid;
begin
  if not (select private.can_admin_org(target_org)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select id into uid from auth.users where lower(email) = em;
  if not (select private.is_super_admin()) and private.belongs_elsewhere(em, target_org) then
    return 'refused';
  end if;
  if uid is not null and not private.mailbox_proven(uid, target_org) then
    return 'refused';
  end if;
  update public.organizations set admin_emails = array(select distinct unnest(admin_emails || em)) where id = target_org;
  if uid is not null then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'org_admin', target_org) on conflict do nothing;
    return 'granted';
  end if;
  return 'pending';
end;
$$;

create or replace function public.add_platform_admin(target_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(target_email));
  uid uuid;
begin
  if not (select private.is_super_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select id into uid from auth.users where lower(email) = em;
  if uid is not null and not private.mailbox_proven(uid) then
    return 'refused';
  end if;
  insert into private.platform_admin_emails (email, added_by) values (em, auth.uid()) on conflict do nothing;
  if uid is not null then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return 'granted';
  end if;
  return 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- A3. Roster domains
-- ---------------------------------------------------------------------------
create or replace function private.check_roster_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d text := split_part(lower(new.email), '@', 2);
  own text[];
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if exists (
    select 1 from public.organizations o
    where o.id <> new.org_id and d = any (select ltrim(lower(x), '@') from unnest(o.email_domains) x)
  ) then
    raise exception 'ROSTER_DOMAIN: % belongs to another college.', d using errcode = '23514';
  end if;
  select array(select ltrim(lower(x), '@') from unnest(o.email_domains) x) into own from public.organizations o where o.id = new.org_id;
  if cardinality(own) > 0 and not d = any (own) then
    raise exception 'ROSTER_DOMAIN: % is not one of this college''s email domains.', d using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_roster_domain() from public, anon, authenticated;
drop trigger if exists org_students_domain on public.org_students;
create trigger org_students_domain before insert or update of email on public.org_students
  for each row execute function private.check_roster_domain();

-- ---------------------------------------------------------------------------
-- A4. Removing admins
-- ---------------------------------------------------------------------------
create or replace function private.sync_org_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role, org_id)
  select u.id, 'org_admin', new.id from auth.users u
  where lower(u.email) = any (new.admin_emails) and private.mailbox_proven(u.id, new.id)
  on conflict do nothing;
  -- The list is the source of truth: a role that is not on it does not stay.
  if tg_op = 'UPDATE' then
    delete from public.user_roles r using auth.users u
    where r.user_id = u.id and r.role = 'org_admin' and r.org_id = new.id and not lower(coalesce(u.email, '')) = any (new.admin_emails);
  end if;
  return new;
end;
$$;
revoke all on function private.sync_org_members() from public, anon, authenticated;

-- Admins already removed from the form, or whose email moved, lose the role they were left with.
delete from public.user_roles r using public.organizations o, auth.users u
where r.org_id = o.id and r.role = 'org_admin' and u.id = r.user_id and not lower(coalesce(u.email, '')) = any (o.admin_emails);

create or replace function public.remove_org_admin(target_org uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(target_email));
begin
  if not (select private.can_admin_org(target_org)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if em = (select lower(email) from auth.users where id = (select auth.uid())) and not (select private.is_super_admin()) then
    raise exception 'you cannot remove your own admin access' using errcode = '22023';
  end if;
  -- The organizations_sync trigger removes every role that is no longer on the list, by user id.
  update public.organizations set admin_emails = array_remove(admin_emails, em) where id = target_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- A5. Email changes
-- ---------------------------------------------------------------------------
create or replace function private.block_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.user_roles r where r.user_id = new.id)
     or exists (select 1 from public.org_students s where s.user_id = new.id)
     or exists (select 1 from public.org_recruiters c where c.user_id = new.id) then
    raise exception 'This email is managed by your college or the platform admin and cannot be changed here.' using errcode = '42501';
  end if;
  if new.email is null or private.registered_as(new.email) is null then
    raise exception 'This email is not registered with PlacementIQ. Ask your college placement cell to add it.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.block_email_change() from public, anon, authenticated;
drop trigger if exists auth_users_allowlist_email_change on auth.users;
create trigger auth_users_allowlist_email_change before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function private.block_email_change();

create or replace function private.link_roster_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  -- The linked account always comes from the email. A changed email is a different person, so the old one loses access.
  if tg_op = 'UPDATE' and new.email is distinct from old.email and old.user_id is not null then
    update public.profiles set org_id = null where id = old.user_id and org_id = old.org_id;
  end if;
  -- A re-import of the same email keeps its link.
  if tg_op = 'UPDATE' and new.email is not distinct from old.email and old.user_id is not null then
    new.user_id := old.user_id;
    return new;
  end if;
  new.user_id := null;
  select id into uid from auth.users where lower(email) = new.email;
  if uid is not null and private.may_link(uid, new.org_id) then
    new.user_id := uid;
    -- Accounts with a role (placement cell, recruiter, platform admin) are never pulled into a college as students.
    update public.profiles set org_id = new.org_id,
      roll_number = case when new.roll_number <> '' then new.roll_number else roll_number end
    where id = uid and (org_id is null or org_id = new.org_id)
      and not exists (select 1 from public.user_roles x where x.user_id = uid);
  end if;
  return new;
end;
$$;
revoke all on function private.link_roster_entry() from public, anon, authenticated;
drop trigger if exists org_students_link on public.org_students;
create trigger org_students_link before insert or update of email, user_id on public.org_students
  for each row execute function private.link_roster_entry();

create or replace function private.sync_recruiter_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  d text;
begin
  if tg_op = 'DELETE' then
    delete from public.user_roles r where r.role = 'recruiter' and r.org_id = old.org_id
      and (r.user_id = old.user_id or r.user_id = (select u.id from auth.users u where lower(u.email) = old.email));
    return old;
  end if;
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    delete from public.user_roles r where r.role = 'recruiter' and r.org_id = old.org_id
      and (r.user_id = old.user_id or r.user_id = (select u.id from auth.users u where lower(u.email) = old.email));
  end if;
  -- A recruiter is an outsider. Someone on another college's roster or domain is that college's person.
  d := split_part(new.email, '@', 2);
  if exists (select 1 from public.org_students s where s.email = new.email and s.org_id <> new.org_id)
     or exists (select 1 from public.organizations o where o.id <> new.org_id and (new.email = any (o.admin_emails) or d = any (select ltrim(lower(x), '@') from unnest(o.email_domains) x))) then
    raise exception 'ROSTER_DOMAIN: That email belongs to another college.' using errcode = '23514';
  end if;
  -- The linked account always comes from the email, never from a value the caller supplied.
  select id into uid from auth.users where lower(email) = new.email;
  if uid is not null and (
    exists (select 1 from public.user_roles r where r.user_id = uid and r.role <> 'recruiter')
    or exists (select 1 from public.profiles p where p.id = uid and p.org_id is not null and p.org_id <> new.org_id)
  ) then
    raise exception 'ROSTER_DOMAIN: That email already belongs to another account on PlacementIQ.' using errcode = '23514';
  end if;
  new.user_id := null;
  if uid is not null and (private.mailbox_proven(uid, new.org_id)
      or exists (select 1 from public.user_roles r where r.user_id = uid and r.role = 'recruiter' and r.org_id = new.org_id)) then
    new.user_id := uid;
    insert into public.user_roles (user_id, role, org_id) values (uid, 'recruiter', new.org_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_recruiter_role() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A6. Temporary passwords: the flag moves to app_metadata, which only the server can write
-- ---------------------------------------------------------------------------
update auth.users set raw_app_meta_data = raw_app_meta_data
    -- Already expired: these passwords were shared across a paste, so only a reset email can end them.
    || jsonb_build_object('must_change_password', true, 'temp_password_expires_at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
where raw_user_meta_data ->> 'must_change_password' = 'true' and not raw_app_meta_data ? 'must_change_password';

-- Accounts made with a temporary password never proved their mailbox. Mark which college made them, where that is known.
update auth.users u set raw_app_meta_data = u.raw_app_meta_data || jsonb_build_object('provisioned_org', o.org)
from (
  select x.id, coalesce((select p.org_id::text from public.profiles p where p.id = x.id),
                        (select r.org_id::text from public.user_roles r where r.user_id = x.id and r.org_id is not null limit 1)) as org
  from auth.users x where x.raw_user_meta_data ? 'must_change_password' and not x.raw_app_meta_data ? 'provisioned_org' and x.invited_at is null
) o
where o.id = u.id and o.org is not null;

-- Accounts the old trigger attached before their email was confirmed lose that until they confirm (it attaches again then).
delete from public.user_roles r using auth.users u where r.user_id = u.id and u.email_confirmed_at is null;
update public.profiles p set org_id = null from auth.users u where u.id = p.id and u.email_confirmed_at is null and p.org_id is not null;
update public.org_students s set user_id = null from auth.users u where u.id = s.user_id and u.email_confirmed_at is null;

create or replace function private.password_pending()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'must_change_password')::boolean, false);
$$;
revoke all on function private.password_pending() from public, anon;
grant execute on function private.password_pending() to authenticated;

-- Admin functions run with raised rights, so they check this themselves: a pending account holds no admin power.
create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select not private.password_pending()
    and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'super_admin');
$$;
create or replace function private.admin_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select org_id from public.user_roles where user_id = (select auth.uid()) and role = 'org_admin' and not private.password_pending();
$$;
create or replace function private.can_admin_org(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or (not private.password_pending() and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'org_admin' and org_id = target_org));
$$;

-- ---------------------------------------------------------------------------
-- A7. Sign-up limits
-- ---------------------------------------------------------------------------
create or replace function public.signup_attempt(target_email text, client_ip text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(trim(target_email));
  i text := coalesce(trim(client_ip), '');
begin
  -- Serialized per email: parallel calls cannot all read a count below the limit.
  perform pg_advisory_xact_lock(hashtextextended('signup:' || e, 0));
  delete from private.signup_attempts where at < now() - interval '1 day';
  -- Per email AND IP, so a stranger cannot lock a student out of sign-up from elsewhere. The wider per-email and per-IP
  -- limits still stop guessing a roll number from many addresses, or many emails from one address.
  if (select count(*) from private.signup_attempts where email = e and ip = i and at > now() - interval '1 hour') >= 5
     or (select count(*) from private.signup_attempts where email = e and at > now() - interval '1 hour') >= 30
     or (i <> '' and (select count(*) from private.signup_attempts where ip = i and at > now() - interval '1 hour') >= 20) then
    return false;
  end if;
  insert into private.signup_attempts (email, ip) values (e, i);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- E1. NPTEL: existence is checked at the source; the placement cell confirms it is this student's
-- ---------------------------------------------------------------------------
update public.credentials set status = 'pending', verified_by = null where kind = 'nptel' and status = 'verified' and verified_by = 'platform';

do $$
begin
  if not exists (select kind, ref from public.credentials where status <> 'rejected' group by kind, ref having count(*) > 1) then
    create unique index if not exists credentials_one_owner on public.credentials (kind, ref) where status <> 'rejected';
  else
    raise notice 'The same certificate is on several students; review those, then create credentials_one_owner.';
  end if;
end;
$$;

create or replace function public.review_credential(target uuid, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.credentials%rowtype;
  org uuid;
begin
  select * into c from public.credentials where id = target;
  if not found then
    raise exception 'Credential not found.' using errcode = 'P0002';
  end if;
  select p.org_id into org from public.profiles p where p.id = c.user_id;
  if not ((select private.is_super_admin()) or (org is not null and (select private.can_admin_org(org)))) then
    raise exception 'Only this student''s placement cell can review it.' using errcode = '42501';
  end if;
  update public.credentials set
    status = case when approve then 'verified' else 'rejected' end,
    verified_by = case when approve then 'college' else null end,
    reviewed_at = now()
  where id = target;
  return case when approve then 'verified' else 'rejected' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- E2. One proven owner per coding handle
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select platform, lower(username) from public.coding_profiles where (stats -> 'ownership' ->> 'proven') = 'true' and platform <> 'ctftime'
    group by 1, 2 having count(*) > 1
  ) then
    -- CTFtime handles are team numbers, which teammates share.
    create unique index if not exists coding_profiles_one_owner on public.coding_profiles (platform, lower(username))
      where (stats -> 'ownership' ->> 'proven') = 'true' and platform <> 'ctftime';
  else
    raise notice 'A handle has several proven owners; resolve those, then create coding_profiles_one_owner.';
  end if;
end;
$$;

-- A stored scorecard is not replaced in place after submission (SEC-20).
drop policy if exists "resumes own update" on storage.objects;

-- ---------------------------------------------------------------------------
-- E3. Server-owned fields
-- ---------------------------------------------------------------------------
revoke update (resume_text) on public.profiles from authenticated;

create or replace function private.roster_academics(uid uuid)
returns table (cgpa numeric, backlogs integer, class_x numeric, class_xii numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select s.cgpa, s.backlogs, s.class_x, s.class_xii from public.org_students s where s.user_id = uid limit 1;
$$;
revoke all on function private.roster_academics(uuid) from public, anon;
grant execute on function private.roster_academics(uuid) to authenticated;

create or replace function private.pin_roster_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
begin
  -- Only edits made directly by a signed-in user are pinned; roster sync runs as the table owner and passes through.
  if current_user = 'authenticated' then
    if old.org_id is not null then
      new.roll_number := old.roll_number;
      new.email := old.email;
      new.college := old.college;
      if coalesce(old.branch, '') <> '' then new.branch := old.branch; end if;
      if coalesce(old.batch, '') <> '' then new.batch := old.batch; end if;
    end if;
    if (new.full_name is distinct from old.full_name and char_length(new.full_name) > 160)
       or (new.phone is distinct from old.phone and char_length(new.phone) > 40)
       or (new.meta is distinct from old.meta and char_length(new.meta) > 200)
       or (new.target_roles is distinct from old.target_roles and char_length(new.target_roles) > 300) then
      raise exception 'That is too long.' using errcode = '23514';
    end if;
    if new.resume_path is distinct from old.resume_path and new.resume_path is not null and split_part(new.resume_path, '/', 1) <> old.id::text then
      raise exception 'A resume must be in your own folder.' using errcode = '42501';
    end if;
    if (new.cgpa, new.backlogs, new.class_x, new.class_xii) is distinct from (old.cgpa, old.backlogs, old.class_x, old.class_xii) then
      if old.academics_source <> 'default' then
        raise exception 'ACADEMICS_LOCKED: Your academics are locked once saved. Ask your placement cell to correct them.'
          using errcode = '42501';
      end if;
      -- Values the college uploaded stay; the student fills in only what is missing.
      select * into r from private.roster_academics(old.id);
      new.cgpa := coalesce(r.cgpa, new.cgpa);
      new.backlogs := coalesce(r.backlogs, new.backlogs);
      new.class_x := coalesce(r.class_x, new.class_x);
      new.class_xii := coalesce(r.class_xii, new.class_xii);
      new.academics_source := 'student';
    else
      new.academics_source := old.academics_source;
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.clear_client_match()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.match := null;
  end if;
  return new;
end;
$$;
revoke all on function private.clear_client_match() from public, anon, authenticated;
drop trigger if exists job_applications_clear_match on public.job_applications;
create trigger job_applications_clear_match before insert on public.job_applications
  for each row execute function private.clear_client_match();

-- ---------------------------------------------------------------------------
-- E4. Branch rule and recruiter reach
-- ---------------------------------------------------------------------------
-- Generated from BRANCHES in src/lib/branches.ts; scripts/branch-parity.mjs fails CI if the two disagree.
create or replace function private.branch_codes(s text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(array(select v.code from (values
    ('CSE-AIML', '\y(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence( and| &)? machine learning)\y'),
    ('AIDS', '\y(ai ?& ?ds|aids|artificial intelligence( and| &)? data science)\y'),
    ('DS', '\y(ds|data science)\y'),
    ('CSE-CS', '\y(cyber ?security|cse ?\(?cs\)?|cs ?& ?cs)\y'),
    ('CSE-IOT', '\y(cse ?\(?iot\)?|internet of things)\y'),
    ('CSBS', '\y(csbs|business systems)\y'),
    ('AI', '\y(artificial intelligence|ai)\y'),
    ('CSE', '\y(cse|computer science|cs|computer engineering)\y'),
    ('IT', '\y(it|information technology)\y'),
    ('VLSI', '\y(vlsi)\y'),
    ('ECM', '\y(ecm|electronics( and| &)? computer)\y'),
    ('EIN', '\y(electrical( and| &)? instrumentation)\y'),
    ('EIE', '\y(eie|e ?& ?i|electronics( and| &)? instrumentation|instrumentation)\y'),
    ('ETE', '\y(ete|extc|e ?& ?tc|telecommunication)\y'),
    ('ECE', '\y(ece|electronics( and| &)? communication)\y'),
    ('EEE', '\y(eee|electrical( and| &)? electronics)\y'),
    ('EE', '\y(ee|electrical)\y'),
    ('MECHATRONICS', '\y(mechatronics)\y'),
    ('ROBOTICS', '\y(robotics|automation)\y'),
    ('AUTO', '\y(automobile|automotive)\y'),
    ('AERO', '\y(aeronautical|aerospace|aero)\y'),
    ('PROD', '\y(production|industrial engineering|manufacturing)\y'),
    ('MARINE', '\y(marine|naval)\y'),
    ('MECH', '\y(mech|mechanical|me)\y'),
    ('CIVIL', '\y(civil|construction|environmental|transportation engineering)\y'),
    ('PETRO', '\y(petroleum|petrochemical)\y'),
    ('CHEM', '\y(chemical|polymer|food tech(nology)?)\y'),
    ('BIOTECH', '\y(biotech(nology)?|bio-?technology)\y'),
    ('BME', '\y(biomedical|bme)\y'),
    ('META', '\y(metallurg(y|ical)|materials)\y'),
    ('MINING', '\y(mining)\y'),
    ('TEXTILE', '\y(textile)\y'),
    ('AGRI', '\y(agricultur(e|al))\y')
    ) v(code, re) where s ~* v.re), '{}'::text[]),
    array[upper(trim(s))]
  );
$$;
revoke all on function private.branch_codes(text) from public, anon;
grant execute on function private.branch_codes(text) to authenticated;

create or replace function private.meets_job_minimums(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.job_postings j
    join public.profiles p on p.id = (select auth.uid())
    where j.id = target_job
      and p.academics_source <> 'default'
      and coalesce(p.cgpa, 0) >= j.min_cgpa
      and coalesce(p.backlogs, 0) <= j.max_backlogs
      and coalesce(p.class_x, 0) >= j.min_class_x
      and coalesce(p.class_xii, 0) >= j.min_class_xii
      and (cardinality(j.batches) = 0 or coalesce(p.batch, '') = any (j.batches))
      and (cardinality(j.branches) = 0 or (coalesce(p.branch, '') <> '' and exists (
        select 1 from unnest(j.branches) b where private.branch_codes(b) && private.branch_codes(p.branch)
      )))
  );
$$;

-- A deadline is a date in India, not in UTC: a drive closing today stayed open until 05:30 the next morning (NV-07).
drop policy if exists "students apply" on public.job_applications;
create policy "students apply" on public.job_applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'applied' and coalesce(admin_note, '') = '' and ai_fit is null
    and exists (
      select 1 from public.job_postings j
      where j.id = job_id and j.status = 'open' and (j.deadline is null or j.deadline >= (now() at time zone 'Asia/Kolkata')::date)
        and j.org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
    )
    and (select private.meets_job_minimums(job_id))
  );

-- The student's own college and the platform, not the recruiters of a drive.
create or replace function private.can_admin_user(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_super_admin())
      or exists (
        select 1 from public.profiles p
        join public.user_roles r on r.org_id = p.org_id and r.role = 'org_admin'
        where p.id = target and r.user_id = (select auth.uid())
      );
$$;
revoke all on function private.can_admin_user(uuid) from public, anon;
grant execute on function private.can_admin_user(uuid) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['jd_matches', 'mock_feedback', 'progress_snapshots']
  loop
    execute format('drop policy if exists "admins read" on public.%I', t);
    execute format('create policy "admins read" on public.%I for select to authenticated using ((select private.can_admin_user(user_id)))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- L1. Academics
-- ---------------------------------------------------------------------------
create or replace function private.sync_roster_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    update public.profiles p set
      section = new.section,
      program = coalesce(nullif(new.program, ''), p.program),
      branch = case when coalesce(new.branch, '') <> '' then new.branch else p.branch end,
      batch = case when coalesce(new.batch, '') <> '' then new.batch else p.batch end,
      roll_number = case when coalesce(new.roll_number, '') <> '' then new.roll_number else p.roll_number end,
      cgpa = coalesce(new.cgpa, p.cgpa),
      backlogs = coalesce(new.backlogs, p.backlogs),
      class_x = coalesce(new.class_x, p.class_x),
      class_xii = coalesce(new.class_xii, p.class_xii),
      -- Verified only when the college supplied all four; a partial upload leaves the rest for the student.
      academics_source = case
        when new.cgpa is not null and new.backlogs is not null and new.class_x is not null and new.class_xii is not null then 'college'
        else p.academics_source
      end
    where p.id = new.user_id and p.org_id = new.org_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_roster_to_profile() from public, anon, authenticated;

-- Students stuck in onboarding by a partial upload can finish.
update public.profiles p set academics_source = 'default'
from public.org_students s
where s.user_id = p.id and p.academics_source = 'college' and p.onboarded_at is null
  and (s.cgpa is null or s.backlogs is null or s.class_x is null or s.class_xii is null);

create or replace function public.correct_academics(target bigint, new_cgpa numeric, new_backlogs integer, new_class_x numeric, new_class_xii numeric, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.org_students%rowtype;
begin
  select * into r from public.org_students where id = target;
  if not found then
    raise exception 'Student not found.' using errcode = 'P0002';
  end if;
  if not (select private.can_admin_org(r.org_id)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(reason, ''))) < 3 then
    raise exception 'Give a reason for the correction.' using errcode = '22023';
  end if;
  perform set_config('app.audit_reason', left(reason, 300), true);
  update public.org_students set
    cgpa = coalesce(new_cgpa, cgpa), backlogs = coalesce(new_backlogs, backlogs),
    class_x = coalesce(new_class_x, class_x), class_xii = coalesce(new_class_xii, class_xii)
  where id = target;
end;
$$;
revoke all on function public.correct_academics(bigint, numeric, integer, numeric, numeric, text) from public, anon;
grant execute on function public.correct_academics(bigint, numeric, integer, numeric, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- L2. Application lifecycle
-- ---------------------------------------------------------------------------
create or replace function private.check_application_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  rank_of constant jsonb := '{"applied":0,"shortlisted":1,"interview":2,"offer":3}';
begin
  if new.status is distinct from old.status and (select auth.uid()) is not null then
    -- Forward through the pipeline; anyone can be rejected (an offer can be withdrawn); a rejected applicant can be
    -- reconsidered at shortlist or interview. Everything else, like offer to applied, loses a record.
    if not (
      new.status = 'rejected'
      or (old.status = 'rejected' and new.status in ('shortlisted', 'interview'))
      or (old.status <> 'rejected' and (rank_of ->> new.status)::int > (rank_of ->> old.status)::int)
    ) then
      raise exception 'APPLICATION_STEP: An application cannot move from % to %.', old.status, new.status using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.check_application_status() from public, anon, authenticated;
drop trigger if exists job_applications_status on public.job_applications;
create trigger job_applications_status before update of status on public.job_applications
  for each row execute function private.check_application_status();

-- Students withdraw only while nothing has happened yet; an offer or rejection is a record.
drop policy if exists "students withdraw" on public.job_applications;
create policy "students withdraw" on public.job_applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'applied');

create or replace function private.protect_drive_outcomes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A direct delete only: removing a whole college (a platform admin's decision) cascades past this.
  if pg_trigger_depth() = 1 and exists (select 1 from public.job_applications a where a.job_id = old.id and a.status <> 'applied') then
    raise exception 'DRIVE_HAS_OUTCOMES: This drive has shortlists, interviews or offers. Close it instead of deleting it.' using errcode = '23514';
  end if;
  return old;
end;
$$;
revoke all on function private.protect_drive_outcomes() from public, anon, authenticated;
drop trigger if exists job_postings_protect on public.job_postings;
create trigger job_postings_protect before delete on public.job_postings
  for each row execute function private.protect_drive_outcomes();

-- ---------------------------------------------------------------------------
-- L3. Audit log: written only by triggers, readable by the platform and the college, never editable
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  org_id uuid,
  action text not null,
  target text not null default '',
  detail jsonb not null default '{}'::jsonb
);
create index if not exists audit_log_org_at on public.audit_log (org_id, at desc);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists "college and platform read" on public.audit_log;
create policy "college and platform read" on public.audit_log for select to authenticated
  using ((select private.is_super_admin()) or org_id in (select private.admin_org_ids()));

create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org uuid;
  target text := '';
  detail jsonb := '{}'::jsonb;
  reason text := nullif(current_setting('app.audit_reason', true), '');
begin
  case tg_table_name
    when 'job_applications' then
      select j.org_id into org from public.job_postings j where j.id = coalesce(new.job_id, old.job_id);
      target := coalesce(new.user_id, old.user_id)::text;
      detail := case when tg_op = 'DELETE' then jsonb_build_object('job_id', old.job_id, 'status', old.status)
                     else jsonb_build_object('job_id', new.job_id, 'from', old.status, 'to', new.status) end;
    when 'org_students' then
      org := coalesce(new.org_id, old.org_id);
      target := coalesce(new.id, old.id)::text;
      if tg_op = 'UPDATE' then
        detail := jsonb_build_object('from', jsonb_build_object('cgpa', old.cgpa, 'backlogs', old.backlogs, 'class_x', old.class_x, 'class_xii', old.class_xii),
                                     'to', jsonb_build_object('cgpa', new.cgpa, 'backlogs', new.backlogs, 'class_x', new.class_x, 'class_xii', new.class_xii));
      end if;
    when 'user_roles' then
      org := coalesce(new.org_id, old.org_id);
      target := coalesce(new.user_id, old.user_id)::text;
      detail := jsonb_build_object('role', coalesce(new.role, old.role));
    when 'job_postings' then
      org := coalesce(new.org_id, old.org_id);
      target := coalesce(new.id, old.id)::text;
      detail := jsonb_build_object('company', coalesce(new.company, old.company), 'role', coalesce(new.role, old.role));
    when 'organizations' then
      org := coalesce(new.id, old.id);
      target := org::text;
      detail := jsonb_build_object('admins_before', cardinality(old.admin_emails), 'admins_after', cardinality(new.admin_emails),
                                   'seats_before', old.seat_limit, 'seats_after', new.seat_limit, 'plan_before', old.plan, 'plan_after', new.plan);
    when 'credentials' then
      select p.org_id into org from public.profiles p where p.id = coalesce(new.user_id, old.user_id);
      target := coalesce(new.user_id, old.user_id)::text;
      detail := jsonb_build_object('kind', new.kind, 'from', old.status, 'to', new.status);
  end case;
  if reason is not null then
    detail := detail || jsonb_build_object('reason', reason);
  end if;
  insert into public.audit_log (actor, org_id, action, target, detail)
  values ((select auth.uid()), org, lower(tg_table_name || '.' || tg_op), target, detail);
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_change() from public, anon, authenticated;

drop trigger if exists audit_applications on public.job_applications;
create trigger audit_applications after update of status on public.job_applications
  for each row when (old.status is distinct from new.status) execute function private.audit_change();
-- A removed account takes its applications with it; the outcome stays on record, keyed by an id that no longer resolves.
drop trigger if exists audit_applications_removed on public.job_applications;
create trigger audit_applications_removed after delete on public.job_applications
  for each row when (old.status <> 'applied') execute function private.audit_change();
drop trigger if exists audit_roster on public.org_students;
create trigger audit_roster after delete on public.org_students for each row execute function private.audit_change();
drop trigger if exists audit_roster_academics on public.org_students;
create trigger audit_roster_academics after update of cgpa, backlogs, class_x, class_xii on public.org_students
  for each row when ((old.cgpa, old.backlogs, old.class_x, old.class_xii) is distinct from (new.cgpa, new.backlogs, new.class_x, new.class_xii))
  execute function private.audit_change();
drop trigger if exists audit_roles on public.user_roles;
create trigger audit_roles after insert or delete on public.user_roles for each row execute function private.audit_change();
drop trigger if exists audit_drives on public.job_postings;
create trigger audit_drives after delete on public.job_postings for each row execute function private.audit_change();
drop trigger if exists audit_orgs on public.organizations;
create trigger audit_orgs after update of admin_emails, seat_limit, plan on public.organizations for each row execute function private.audit_change();
drop trigger if exists audit_credentials on public.credentials;
create trigger audit_credentials after update of status on public.credentials
  for each row when (old.status is distinct from new.status) execute function private.audit_change();

-- ---------------------------------------------------------------------------
-- L4. Resource limits
-- ---------------------------------------------------------------------------
-- A check on these columns would also fail roster updates of any old oversized row, so private.pin_roster_fields limits
-- what students write instead.
alter table public.profiles drop constraint if exists profiles_text_limits;

create or replace function public.consume_ai(action text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  org uuid;
  lim integer;
  used integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if private.password_pending() then
    raise exception 'AI_QUOTA: Choose your own password first.' using errcode = 'P0001';
  end if;
  select p.org_id into org from public.profiles p where p.id = uid;
  if org is null then
    raise exception 'Your college has not added you to PlacementIQ yet.' using errcode = '42501';
  end if;
  if coalesce((select o.status from public.organizations o where o.id = org), 'active') <> 'active' then
    raise exception 'AI_QUOTA: Your college''s PlacementIQ subscription is not active. Ask your placement cell.' using errcode = 'P0001';
  end if;
  lim := private.plan_ai_limit(org);
  -- Serialize per user so parallel requests cannot overshoot the quota.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  if (select count(*) from public.ai_usage u where u.user_id = uid and u.created_at > now() - interval '1 minute') >= 12 then
    raise exception 'AI_QUOTA: That is a lot of AI requests in a minute. Wait a moment and try again.' using errcode = 'P0001';
  end if;
  select count(*) into used from public.ai_usage u where u.user_id = uid and u.created_at >= date_trunc('month', now());
  if used >= lim then
    raise exception 'AI_QUOTA: You have used all % AI actions for this month. They reset on %.', lim, to_char(date_trunc('month', now()) + interval '1 month', 'DD Mon')
      using errcode = 'P0001';
  end if;
  insert into public.ai_usage (user_id, org_id, kind) values (uid, org, action);
  return lim - used - 1;
end;
$$;

-- A failed model call gives the action back (service role only).
create or replace function public.refund_ai(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ai_usage where id = (
    select u.id from public.ai_usage u where u.user_id = target and u.created_at > now() - interval '2 minutes' order by u.created_at desc limit 1
  );
$$;
revoke all on function public.refund_ai(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai(uuid) to service_role;

-- Liveness only: proves the API can reach the database and returns nothing about it.
create or replace function public.health_probe()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;
revoke all on function public.health_probe() from public;
grant execute on function public.health_probe() to anon, authenticated;

create table if not exists private.connect_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists connect_attempts_user on private.connect_attempts (user_id, at);

-- Recorded before any outbound request, so failures and disconnects count too.
create or replace function public.connect_attempt()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('connect:' || uid::text, 0));
  delete from private.connect_attempts where at < now() - interval '1 day';
  if (select count(*) from private.connect_attempts where user_id = uid and at > now() - interval '10 minutes') >= 12 then
    return false;
  end if;
  insert into private.connect_attempts (user_id) values (uid);
  return true;
end;
$$;
revoke all on function public.connect_attempt() from public, anon;
grant execute on function public.connect_attempt() to authenticated;

create or replace function public.replace_rows(target text, items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  -- Two tabs saving at once must not interleave their delete and insert.
  perform pg_advisory_xact_lock(hashtextextended('rows:' || uid::text, 0));
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 200 then
    raise exception 'items must be an array of at most 200 entries' using errcode = '22023';
  end if;

  case target
    when 'projects' then
      delete from public.projects where user_id = uid;
      insert into public.projects (user_id, title, tech, description, url, source, position)
      select uid, e.v ->> 'title', coalesce(e.v ->> 'tech', ''), coalesce(e.v ->> 'description', ''), nullif(e.v ->> 'url', ''),
             coalesce(e.v ->> 'source', 'manual'), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'internships' then
      delete from public.internships where user_id = uid;
      insert into public.internships (user_id, org, role, period, position)
      select uid, e.v ->> 'org', coalesce(e.v ->> 'role', ''), coalesce(e.v ->> 'period', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'certifications' then
      delete from public.certifications where user_id = uid;
      insert into public.certifications (user_id, name, issuer, issued_on, credential_url, position)
      select uid, e.v ->> 'name', coalesce(e.v ->> 'issuer', ''), coalesce(e.v ->> 'date', ''), nullif(e.v ->> 'credential_url', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'achievements' then
      delete from public.achievements where user_id = uid;
      insert into public.achievements (user_id, title, detail, date_text, position)
      select uid, e.v ->> 'title', coalesce(e.v ->> 'detail', ''), coalesce(e.v ->> 'date', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'mock_feedback' then
      delete from public.mock_feedback where user_id = uid;
      insert into public.mock_feedback (user_id, interview_type, score, note, taken_at)
      select uid, e.v ->> 'type', (e.v ->> 'score')::numeric, coalesce(e.v ->> 'note', ''), coalesce((e.v ->> 'date')::timestamptz, now())
      from jsonb_array_elements(items) e(v);
    when 'skills' then
      insert into public.user_skills (user_id, skill, level, updated_at)
      select uid, e.v ->> 'name', least(100, greatest(0, (e.v ->> 'level')::int)), now()
      from jsonb_array_elements(items) e(v)
      on conflict (user_id, skill) do update set level = excluded.level, updated_at = now();
    else
      raise exception 'unknown collection %', target using errcode = '22023';
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- A6, continued. Runs last so it covers every table above.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists "password change first" on public.%I', t);
    execute format('drop policy if exists "password change first w" on public.%I', t);
    execute format('drop policy if exists "password change first u" on public.%I', t);
    execute format('drop policy if exists "password change first d" on public.%I', t);
    if t in ('profiles', 'user_roles') then
      -- The app reads these two to show the password screen; nothing else is reachable and nothing can be changed.
      execute format('create policy "password change first" on public.%I as restrictive for select to authenticated using (%I = (select auth.uid()) or not (select private.password_pending()))', t, case t when 'profiles' then 'id' else 'user_id' end);
      execute format('create policy "password change first w" on public.%I as restrictive for insert to authenticated with check (not (select private.password_pending()))', t);
      execute format('create policy "password change first u" on public.%I as restrictive for update to authenticated using (not (select private.password_pending()))', t);
      execute format('create policy "password change first d" on public.%I as restrictive for delete to authenticated using (not (select private.password_pending()))', t);
    else
      execute format('create policy "password change first" on public.%I as restrictive for all to authenticated using (not (select private.password_pending()))', t);
    end if;
  end loop;
end;
$$;
drop policy if exists "password change first" on storage.objects;
create policy "password change first" on storage.objects as restrictive for all to authenticated using (not (select private.password_pending()));

commit;
