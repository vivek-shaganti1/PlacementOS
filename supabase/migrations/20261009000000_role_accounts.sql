-- Role-based accounts: super admin, placement-cell (org) admin and student are separate accounts.
-- Platform (super) admins are granted by email: listed emails get the role when they sign up.
-- Admin accounts are never attached to a college as students.

create table if not exists private.platform_admin_emails (
  email text primary key check (email = lower(email)),
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
revoke all on private.platform_admin_emails from public, anon, authenticated;

-- Existing super admins are listed so the page shows them.
insert into private.platform_admin_emails (email)
select lower(u.email) from public.user_roles r join auth.users u on u.id = r.user_id where r.role = 'super_admin'
on conflict do nothing;

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

  -- Platform admin account: no college membership.
  if exists (select 1 from private.platform_admin_emails p where p.email = em) then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return;
  end if;

  -- Placement-cell account: admin of the college, not one of its students.
  insert into public.user_roles (user_id, role, org_id)
  select uid, 'org_admin', o.id from public.organizations o where em = any (o.admin_emails)
  on conflict do nothing;
  if exists (select 1 from public.user_roles x where x.user_id = uid and x.role = 'org_admin') then
    return;
  end if;

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

create or replace function private.sync_org_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_roles (user_id, role, org_id)
  select u.id, 'org_admin', new.id from auth.users u where lower(u.email) = any (new.admin_emails)
  on conflict do nothing;

  update public.profiles p set org_id = new.id,
         college = case when p.college = '' then new.name else p.college end
  from auth.users u
  where u.id = p.id and p.org_id is null and split_part(lower(u.email), '@', 2) = any (new.email_domains)
    and not exists (select 1 from public.user_roles x where x.user_id = p.id);
  return new;
end;
$$;
revoke all on function private.sync_org_members() from public, anon, authenticated;

-- Admin accounts that were attached as students by domain are detached.
update public.profiles p set org_id = null
where p.org_id is not null
  and exists (select 1 from public.user_roles x where x.user_id = p.id and x.role = 'org_admin')
  and not exists (select 1 from public.org_students s where s.user_id = p.id);

-- Platform admin management (super admins only).
create or replace function public.platform_admins()
returns table (email text, user_id uuid, full_name text, active boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_super_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select e.email, u.id, p.full_name,
           exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'super_admin')
    from private.platform_admin_emails e
    left join auth.users u on lower(u.email) = e.email
    left join public.profiles p on p.id = u.id
    order by e.created_at;
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
  insert into private.platform_admin_emails (email, added_by) values (em, auth.uid()) on conflict do nothing;
  select id into uid from auth.users where lower(email) = em;
  if uid is not null then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return 'granted';
  end if;
  return 'pending';
end;
$$;

create or replace function public.remove_platform_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(target_email));
begin
  if not (select private.is_super_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- Never leave the platform without an active super admin.
  if not exists (
    select 1 from public.user_roles r join auth.users u on u.id = r.user_id
    where r.role = 'super_admin' and lower(u.email) <> em
  ) then
    raise exception 'Add and activate another platform admin first.' using errcode = '42501';
  end if;
  delete from private.platform_admin_emails where email = em;
  delete from public.user_roles r using auth.users u
  where u.id = r.user_id and r.role = 'super_admin' and lower(u.email) = em;
end;
$$;

revoke all on function public.platform_admins(), public.add_platform_admin(text), public.remove_platform_admin(text) from public, anon;
grant execute on function public.platform_admins(), public.add_platform_admin(text), public.remove_platform_admin(text) to authenticated;
