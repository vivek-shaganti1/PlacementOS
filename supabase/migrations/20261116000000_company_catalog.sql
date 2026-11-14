-- Live company data. One transaction, safe to run more than once. Apply after 20261115000000.
--
-- 1. public.company_catalog: verified details for the companies the app scores students against. The built-in list
--    (src/data/companies.ts, coreCompanies.ts) carries typical, unverified figures; a row here replaces them for one
--    company and records where the facts came from (source_url) and when someone last checked them (last_checked).
--    Every signed-in user can read it; only a platform admin with two-factor sign-in can change it, and every change
--    is written to the audit log. Optional ats/ats_board name the company's public job board (Greenhouse, Lever or
--    Ashby) so /api/company-roles can list its open roles.
-- 2. public.company_drive_stats(): what really happened in the caller's own college's drives, per company: drives,
--    applicants, shortlists, offers and the posted CTC range. Aggregates only, for rostered students and that college's
--    placement cell (not recruiters, who would otherwise see other companies' results). Applicant and offer counts are
--    withheld below 3 applicants, so no one can work out a single classmate's outcome.

begin;

create table if not exists public.company_catalog (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 120),
  about text not null default '' check (char_length(about) <= 1200),
  careers_url text not null default '' check (careers_url = '' or (char_length(careers_url) <= 300 and careers_url ~ '^https://[^[:space:]/]+\.[^[:space:]]+$')),
  ctc_min numeric(6, 1) check (ctc_min is null or ctc_min between 0 and 500),
  ctc_max numeric(6, 1) check (ctc_max is null or ctc_max between 0 and 500),
  ats text check (ats in ('greenhouse', 'lever', 'ashby')),
  ats_board text check (ats_board ~ '^[A-Za-z0-9._-]{1,80}$'),
  source_url text not null default '' check (source_url = '' or (char_length(source_url) <= 300 and source_url ~ '^https://[^[:space:]/]+\.[^[:space:]]+$')),
  last_checked date check (last_checked is null or last_checked <= current_date + 1),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint company_catalog_ctc_pair check ((ctc_min is null) = (ctc_max is null) and (ctc_min is null or ctc_min <= ctc_max)),
  constraint company_catalog_board_pair check ((ats is null) = (ats_board is null)),
  -- "Checked" means someone looked at a source: a date without one is refused.
  constraint company_catalog_checked_source check (last_checked is null or source_url <> '')
);
create index if not exists company_catalog_updated_by on public.company_catalog (updated_by);

alter table public.company_catalog enable row level security;
revoke all on public.company_catalog from public, anon, authenticated;
grant select, insert, update, delete on public.company_catalog to authenticated;

drop policy if exists "signed in read" on public.company_catalog;
create policy "signed in read" on public.company_catalog for select to authenticated using (true);
drop policy if exists "platform admins add" on public.company_catalog;
create policy "platform admins add" on public.company_catalog for insert to authenticated
  with check ((select private.is_super_admin()));
drop policy if exists "platform admins edit" on public.company_catalog;
create policy "platform admins edit" on public.company_catalog for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
drop policy if exists "platform admins remove" on public.company_catalog;
create policy "platform admins remove" on public.company_catalog for delete to authenticated
  using ((select private.is_super_admin()));
drop policy if exists "password change first" on public.company_catalog;
create policy "password change first" on public.company_catalog as restrictive for all to authenticated
  using (not (select private.password_pending()));

-- Who changed it and when are set by the database, never taken from the request.
create or replace function private.company_catalog_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.company_catalog_stamp() from public, anon, authenticated;
drop trigger if exists company_catalog_stamp on public.company_catalog;
create trigger company_catalog_stamp before insert or update on public.company_catalog
  for each row execute function private.company_catalog_stamp();

create or replace function private.audit_company_catalog()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor, org_id, action, target, detail)
  values ((select auth.uid()), null, lower('company_catalog.' || tg_op), coalesce(new.id, old.id),
          case when tg_op = 'UPDATE' then jsonb_build_object(
                 'from', jsonb_build_object('ctc_min', old.ctc_min, 'ctc_max', old.ctc_max, 'source_url', old.source_url, 'last_checked', old.last_checked, 'ats', old.ats, 'ats_board', old.ats_board),
                 'to', jsonb_build_object('ctc_min', new.ctc_min, 'ctc_max', new.ctc_max, 'source_url', new.source_url, 'last_checked', new.last_checked, 'ats', new.ats, 'ats_board', new.ats_board))
               else jsonb_build_object('name', coalesce(new.name, old.name)) end);
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_company_catalog() from public, anon, authenticated;
drop trigger if exists audit_company_catalog on public.company_catalog;
create trigger audit_company_catalog after insert or update or delete on public.company_catalog
  for each row execute function private.audit_company_catalog();

-- Drive statistics for the caller's own college. Security definer because a student may read only their own
-- applications; it returns aggregates only, and only for the one college the caller belongs to.
create or replace function public.company_drive_stats()
returns table (company text, drives int, applicants int, shortlisted int, offers int, ctc_min numeric, ctc_max numeric, last_drive date)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select s.org_id from public.org_students s where s.user_id = (select auth.uid()) and not private.password_pending()
    union
    select private.admin_org_ids()
  ),
  per as (
    select lower(trim(j.company)) as key, min(trim(j.company)) as company, count(distinct j.id)::int as drives,
           count(a.user_id)::int as applicants,
           count(a.user_id) filter (where a.status in ('shortlisted', 'interview', 'offer'))::int as shortlisted,
           count(a.user_id) filter (where a.status = 'offer')::int as offers,
           min(j.ctc_min) as ctc_min, max(j.ctc_max) as ctc_max, max(j.created_at)::date as last_drive
      from public.job_postings j
      left join public.job_applications a on a.job_id = j.id
     where j.org_id in (select org_id from mine) and j.status <> 'draft'
     group by lower(trim(j.company))
  )
  select company, drives,
         case when applicants >= 3 then applicants end,
         case when applicants >= 3 then shortlisted end,
         case when applicants >= 3 then offers end,
         ctc_min, ctc_max, last_drive
    from per;
$$;
revoke all on function public.company_drive_stats() from public, anon;
grant execute on function public.company_drive_stats() to authenticated;

commit;
