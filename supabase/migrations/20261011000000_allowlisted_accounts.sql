-- Only emails the platform knows about can have an account:
--   platform admin emails, college admin emails, and students on a college roster.
-- Enforced on auth.users itself, so every sign-up path (API, dashboard, invites) obeys it.

create or replace function private.registered_as(em text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from private.platform_admin_emails p where p.email = lower(em)) then 'platform_admin'
    when exists (select 1 from public.organizations o where lower(em) = any (o.admin_emails)) then 'org_admin'
    when exists (select 1 from public.org_students s where s.email = lower(em)) then 'student'
    else null
  end;
$$;
revoke all on function private.registered_as(text) from public, anon, authenticated;

create or replace function private.block_unregistered_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or private.registered_as(new.email) is null then
    raise exception 'This email is not registered with PlacementIQ. Ask your college placement cell to add it.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.block_unregistered_users() from public, anon, authenticated;
drop trigger if exists auth_users_allowlist on auth.users;
create trigger auth_users_allowlist before insert on auth.users
  for each row execute function private.block_unregistered_users();

-- Server-side check used by /api/signup (service role only, so emails cannot be enumerated).
create or replace function public.signup_check(target_email text, target_roll text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  em text := lower(trim(target_email));
  kind text := private.registered_as(em);
  roll text;
begin
  if kind is null then
    return 'unregistered';
  end if;
  -- Admin accounts are created by the platform admin, never self-registered.
  if kind <> 'student' then
    return 'admin';
  end if;
  select s.roll_number into roll from public.org_students s where s.email = em order by s.created_at limit 1;
  if coalesce(roll, '') = '' then
    return 'no_roll';
  end if;
  if lower(regexp_replace(roll, '\s', '', 'g')) <> lower(regexp_replace(coalesce(target_roll, ''), '\s', '', 'g')) then
    return 'roll_mismatch';
  end if;
  return 'ok';
end;
$$;
revoke all on function public.signup_check(text, text) from public, anon, authenticated;
grant execute on function public.signup_check(text, text) to service_role;
