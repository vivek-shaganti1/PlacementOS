-- Multi-college tenancy: organizations, a super admin, per-organization admins, official student rosters,
-- and organization-scoped access to student data and job drives.

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  short_name text not null default '' check (char_length(short_name) <= 40),
  official_code text check (official_code is null or char_length(official_code) between 1 and 40),
  city text not null default '',
  email_domains text[] not null default '{}',
  admin_emails text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists organizations_official_code_key on public.organizations (lower(official_code)) where official_code is not null;

drop trigger if exists organizations_touch on public.organizations;
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

-- Keep domains and admin emails lower-case and trimmed.
create or replace function private.normalize_org()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email_domains := coalesce((select array_agg(distinct lower(trim(leading '@' from trim(d)))) from unnest(new.email_domains) d where trim(d) <> ''), '{}');
  new.admin_emails := coalesce((select array_agg(distinct lower(trim(e))) from unnest(new.admin_emails) e where trim(e) <> ''), '{}');
  return new;
end;
$$;
drop trigger if exists organizations_normalize on public.organizations;
create trigger organizations_normalize before insert or update on public.organizations
  for each row execute function private.normalize_org();

alter table public.profiles add column if not exists org_id uuid references public.organizations (id) on delete set null;
alter table public.profiles add column if not exists roll_number text check (roll_number is null or char_length(roll_number) <= 40);
create index if not exists profiles_org_idx on public.profiles (org_id);

-- Students may edit their own profile but never move themselves between organizations.
revoke update on public.profiles from authenticated;
do $$
declare
  cols text;
begin
  select string_agg(quote_ident(column_name), ', ') into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name not in ('id', 'org_id', 'created_at', 'updated_at');
  execute format('grant update (%s) on public.profiles to authenticated', cols);
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles: super_admin (platform) and org_admin (one row per organization administered)
-- ---------------------------------------------------------------------------
alter table public.user_roles drop constraint if exists user_roles_pkey;
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add column if not exists id bigint generated always as identity;
alter table public.user_roles add column if not exists org_id uuid references public.organizations (id) on delete cascade;
update public.user_roles set role = 'super_admin' where role = 'admin';
alter table public.user_roles add constraint user_roles_pkey primary key (id);
alter table public.user_roles add constraint user_roles_role_check check (
  (role = 'super_admin' and org_id is null) or (role = 'org_admin' and org_id is not null)
);
create unique index if not exists user_roles_unique on public.user_roles (user_id, role, coalesce(org_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------------
-- Access helpers (private schema, SECURITY DEFINER, always answer about the caller)
-- ---------------------------------------------------------------------------
create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'super_admin');
$$;

create or replace function private.admin_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select org_id from public.user_roles where user_id = (select auth.uid()) and role = 'org_admin';
$$;

create or replace function private.can_admin_org(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'org_admin' and org_id = target_org);
$$;

-- True when the caller may see another user's data: super admin, or an admin of that user's organization.
create or replace function private.can_view_user(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or exists (
        select 1 from public.profiles p
        join public.user_roles r on r.org_id = p.org_id and r.role = 'org_admin'
        where p.id = target and r.user_id = (select auth.uid())
      );
$$;

-- Back-compat: "is any kind of admin".
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()));
$$;

revoke all on function private.is_super_admin(), private.admin_org_ids(), private.can_admin_org(uuid), private.can_view_user(uuid), private.is_admin() from public, anon;
grant execute on function private.is_super_admin(), private.admin_org_ids(), private.can_admin_org(uuid), private.can_view_user(uuid), private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Official student rosters
-- ---------------------------------------------------------------------------
create table if not exists public.org_students (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  full_name text not null default '' check (char_length(full_name) <= 160),
  roll_number text not null default '' check (char_length(roll_number) <= 40),
  branch text not null default '' check (char_length(branch) <= 120),
  batch text not null default '' check (char_length(batch) <= 10),
  user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
create unique index if not exists org_students_roll_key on public.org_students (org_id, lower(roll_number)) where roll_number <> '';

-- ---------------------------------------------------------------------------
-- Org-scoped jobs
-- ---------------------------------------------------------------------------
alter table public.job_postings add column if not exists org_id uuid references public.organizations (id) on delete cascade;
create index if not exists job_postings_org_idx on public.job_postings (org_id, status);

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.org_students enable row level security;
revoke all on public.organizations, public.org_students from anon;
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.org_students to authenticated;

drop policy if exists "orgs visible to members and admins" on public.organizations;
create policy "orgs visible to members and admins" on public.organizations for select to authenticated
  using (
    (select private.is_super_admin())
    or id in (select private.admin_org_ids())
    or id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
  );
drop policy if exists "super admin manages orgs" on public.organizations;
create policy "super admin manages orgs" on public.organizations for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
-- Only the super admin edits organizations (domains decide membership, so org admins must not change them).
drop policy if exists "org admins edit own org" on public.organizations;

drop policy if exists "org admins manage roster" on public.org_students;
create policy "org admins manage roster" on public.org_students for all to authenticated
  using ((select private.can_admin_org(org_id))) with check ((select private.can_admin_org(org_id)));

-- Roles: see your own, plus roles inside organizations you administer.
drop policy if exists "own role or admin" on public.user_roles;
drop policy if exists "roles visible to self and org admins" on public.user_roles;
create policy "roles visible to self and org admins" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()) or org_id in (select private.admin_org_ids()));

-- Student data: replace the old global admin policies with organization-scoped ones.
do $$
declare
  t text;
begin
  foreach t in array array['user_skills', 'projects', 'internships', 'certifications', 'achievements', 'coding_profiles',
                           'github_repos', 'resume_analyses', 'progress_snapshots', 'mock_feedback', 'jd_matches']
  loop
    execute format('drop policy if exists "admins read" on public.%I', t);
    execute format('create policy "admins read" on public.%I for select to authenticated using ((select private.can_view_user(user_id)))', t);
  end loop;
end;
$$;
drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated using ((select private.can_view_user(id)));

drop policy if exists "resumes admin read" on storage.objects;
create policy "resumes admin read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (select private.can_view_user(((storage.foldername(name))[1])::uuid)));

-- Jobs: students see their own organization's drives; admins manage their organization's drives.
drop policy if exists "students see open jobs" on public.job_postings;
create policy "students see open jobs" on public.job_postings for select to authenticated
  using (
    (status <> 'draft' and org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid())))
    or (select private.can_admin_org(org_id))
  );
drop policy if exists "admins manage jobs" on public.job_postings;
create policy "admins manage jobs" on public.job_postings for all to authenticated
  using ((select private.can_admin_org(org_id))) with check (org_id is not null and (select private.can_admin_org(org_id)));

drop policy if exists "own applications select" on public.job_applications;
create policy "own applications select" on public.job_applications for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.job_postings j where j.id = job_id and (select private.can_admin_org(j.org_id)))
  );
drop policy if exists "students apply" on public.job_applications;
create policy "students apply" on public.job_applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'applied'
    and exists (
      select 1 from public.job_postings j
      where j.id = job_id and j.status = 'open' and (j.deadline is null or j.deadline >= current_date)
        and j.org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
    )
  );
drop policy if exists "admins update applications" on public.job_applications;
create policy "admins update applications" on public.job_applications for update to authenticated
  using (exists (select 1 from public.job_postings j where j.id = job_id and (select private.can_admin_org(j.org_id))))
  with check (exists (select 1 from public.job_postings j where j.id = job_id and (select private.can_admin_org(j.org_id))));

-- New drive -> notify that organization's students only.
create or replace function private.notify_job_posted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    insert into public.notifications (user_id, text, link)
    select p.id, format('New drive: %s is hiring for %s', new.company, new.role), '/jobs?job=' || new.id
    from public.profiles p
    where p.org_id = new.org_id and p.id is distinct from new.created_by;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin management RPCs (replace the old global set_admin/remove_admin)
-- ---------------------------------------------------------------------------
drop function if exists public.set_admin(text, boolean);
drop function if exists public.remove_admin(uuid);

-- Adds an org admin by email. Existing accounts get the role now; new emails get it when they sign up.
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
  update public.organizations set admin_emails = array(select distinct unnest(admin_emails || em)) where id = target_org;
  select id into uid from auth.users where lower(email) = em;
  if uid is not null then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'org_admin', target_org) on conflict do nothing;
    return 'granted';
  end if;
  return 'pending';
end;
$$;

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
  update public.organizations set admin_emails = array_remove(admin_emails, em) where id = target_org;
  delete from public.user_roles r using auth.users u
  where r.user_id = u.id and lower(u.email) = em and r.role = 'org_admin' and r.org_id = target_org;
end;
$$;

-- Org admins list with their sign-in emails (auth.users is not readable directly).
create or replace function public.org_admins(target_org uuid)
returns table (email text, user_id uuid, full_name text, joined boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.can_admin_org(target_org)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select e.email, u.id, coalesce(p.full_name, ''), (r.id is not null)
    from public.organizations o
    cross join lateral unnest(o.admin_emails) e(email)
    left join auth.users u on lower(u.email) = e.email
    left join public.profiles p on p.id = u.id
    left join public.user_roles r on r.user_id = u.id and r.role = 'org_admin' and r.org_id = o.id
    where o.id = target_org
    order by e.email;
end;
$$;

revoke all on function public.add_org_admin(uuid, text), public.remove_org_admin(uuid, text), public.org_admins(uuid) from public, anon;
grant execute on function public.add_org_admin(uuid, text), public.remove_org_admin(uuid, text), public.org_admins(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up routing: email domain -> organization, admin list -> org_admin role, roster -> linked record
-- ---------------------------------------------------------------------------
create or replace function private.attach_user_to_org(uid uuid, user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(coalesce(user_email, ''));
  dom text := split_part(em, '@', 2);
  org uuid;
  r public.org_students%rowtype;
begin
  if em = '' then
    return;
  end if;
  -- Admin invitations take priority, then a roster entry, then the email domain.
  insert into public.user_roles (user_id, role, org_id)
  select uid, 'org_admin', o.id from public.organizations o where em = any (o.admin_emails)
  on conflict do nothing;

  select * into r from public.org_students s where s.email = em order by s.created_at limit 1;
  if found then
    org := r.org_id;
    update public.org_students set user_id = uid where id = r.id;
  else
    select o.id into org from public.organizations o where dom = any (o.email_domains) order by o.created_at limit 1;
  end if;

  if org is not null then
    update public.profiles p set
      org_id = org,
      roll_number = coalesce(nullif(p.roll_number, ''), nullif(r.roll_number, '')),
      full_name = case when coalesce(r.full_name, '') <> '' then r.full_name else p.full_name end,
      branch = case when p.branch = '' and coalesce(r.branch, '') <> '' then r.branch else p.branch end,
      batch = case when p.batch = '' and coalesce(r.batch, '') <> '' then r.batch else p.batch end,
      college = case when p.college = '' then (select o.name from public.organizations o where o.id = org) else p.college end
    where p.id = uid;
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

  perform private.attach_user_to_org(new.id, new.email);
  return new;
end;
$$;

-- When an organization is created or its domains/admins change, attach existing accounts that match.
create or replace function private.sync_org_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p set org_id = new.id,
         college = case when p.college = '' then new.name else p.college end
  from auth.users u
  where u.id = p.id and p.org_id is null and split_part(lower(u.email), '@', 2) = any (new.email_domains);

  insert into public.user_roles (user_id, role, org_id)
  select u.id, 'org_admin', new.id from auth.users u where lower(u.email) = any (new.admin_emails)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.sync_org_members() from public, anon, authenticated;
drop trigger if exists organizations_sync on public.organizations;
create trigger organizations_sync after insert or update of email_domains, admin_emails on public.organizations
  for each row execute function private.sync_org_members();

-- When a roster entry is added for an existing account, link it.
create or replace function private.link_roster_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = new.email;
  if uid is not null then
    new.user_id := uid;
    update public.profiles set org_id = new.org_id,
      roll_number = case when new.roll_number <> '' then new.roll_number else roll_number end
    where id = uid and (org_id is null or org_id = new.org_id);
  end if;
  return new;
end;
$$;
revoke all on function private.link_roster_entry() from public, anon, authenticated;
drop trigger if exists org_students_link on public.org_students;
create trigger org_students_link before insert or update of email on public.org_students
  for each row execute function private.link_roster_entry();

-- ---------------------------------------------------------------------------
-- First organization
-- ---------------------------------------------------------------------------
insert into public.organizations (name, short_name, city, email_domains, admin_emails)
select 'Anurag University', 'Anurag', 'Hyderabad', array['anurag.edu.in'], array['admin@anurag.edu.in']
where not exists (select 1 from public.organizations where 'anurag.edu.in' = any (email_domains));
