-- Follow-ups from the 2026-10-24 security audit. Safe to run more than once.
--
-- 1. The sign-up allowlist also applies when an account changes its email (it ran on insert only, so a registered
--    account could switch to an unregistered address and keep its access).
-- 2. Temporary-password provisioning (can_provision) is refused for an email on another college's domain, and for a
--    student email outside this college's domains when the college has set any. /api/admin.ts enforces the same rule;
--    this keeps the database authoritative if the function is called directly.

-- ---------------------------------------------------------------------------
-- 1. Allowlist on email change
-- ---------------------------------------------------------------------------
drop trigger if exists auth_users_allowlist_email_change on auth.users;
create trigger auth_users_allowlist_email_change before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function private.block_unregistered_users();

-- ---------------------------------------------------------------------------
-- 2. Provisioning stays inside the college's own domains
-- ---------------------------------------------------------------------------
create or replace function public.can_provision(target_org uuid, target_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.can_admin_org(target_org))
    and not exists (select 1 from auth.users u where lower(u.email) = lower(target_email))
    and not exists (select 1 from private.platform_admin_emails p where lower(p.email) = lower(target_email))
    and not exists (select 1 from public.organizations o where o.id <> target_org and lower(target_email) = any (o.admin_emails))
    and not exists (select 1 from public.org_students s where s.org_id <> target_org and s.email = lower(target_email))
    and not exists (select 1 from public.org_recruiters r where r.org_id <> target_org and r.email = lower(target_email))
    -- never an address on another college's domain
    and not exists (
      select 1 from public.organizations o
      where o.id <> target_org
        and split_part(lower(target_email), '@', 2) = any (select ltrim(lower(d), '@') from unnest(o.email_domains) d)
    );
$$;
revoke all on function public.can_provision(uuid, text) from public, anon;
grant execute on function public.can_provision(uuid, text) to authenticated;
