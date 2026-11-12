-- Two-factor sign-in for admins. One transaction, safe to run more than once. Apply after 20261112000000.
--
-- Platform admins and college placement cells hold every student's records, so their powers now count only in a session
-- that has passed a second factor (an authenticator app code): the JWT's "aal" claim is "aal2". A password-only session
-- (aal1) still signs in, sees its own profile and can enroll a factor, but every admin check below answers "no".
-- Students and recruiters are unchanged. The app sends admins to set up or enter a code (src/pages/TwoFactor.tsx).
--
-- Before running this in production: Authentication > Multi-Factor must have TOTP enabled (the default), and each admin
-- should know they will be asked to set up an authenticator app at their next sign-in. A lost device is reset by the
-- project owner in the Supabase dashboard (Authentication > Users > the user > remove MFA factor).

begin;

create or replace function private.second_factor()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke all on function private.second_factor() from public, anon;
grant execute on function private.second_factor() to authenticated;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select not private.password_pending()
    and private.second_factor()
    and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'super_admin');
$$;

create or replace function private.admin_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select org_id from public.user_roles
   where user_id = (select auth.uid()) and role = 'org_admin' and not private.password_pending() and private.second_factor();
$$;

create or replace function private.can_admin_org(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or (not private.password_pending() and private.second_factor()
          and exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'org_admin' and org_id = target_org));
$$;

create or replace function private.can_admin_user(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or (private.second_factor() and exists (
        select 1 from public.profiles p
        join public.user_roles r on r.org_id = p.org_id and r.role = 'org_admin'
        where p.id = target and r.user_id = (select auth.uid())
      ));
$$;

-- Recruiters keep password sign-in; only the placement-cell branch needs the second factor.
create or replace function private.can_view_user(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select private.is_super_admin())
      or (private.second_factor() and exists (
        select 1 from public.profiles p
        join public.user_roles r on r.org_id = p.org_id and r.role = 'org_admin'
        where p.id = target and r.user_id = (select auth.uid())
      ))
      or exists (
        select 1 from public.job_applications a
        join public.job_postings j on j.id = a.job_id
        join public.user_roles r on r.user_id = (select auth.uid()) and r.role = 'recruiter' and r.org_id = j.org_id
        join public.profiles p on p.id = a.user_id and p.org_id = j.org_id and p.visibility <> 'private'
        where a.user_id = target and j.recruiter_id = (select auth.uid())
      );
$$;

commit;
