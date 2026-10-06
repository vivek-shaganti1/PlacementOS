-- 1. Recruiter role: a company's recruiter, added by a college's placement cell, posts drives for that college and sees
--    only the students who applied to their own drives.
-- 2. Recommendation feedback: students rate recommendations (next step, roadmap, assistant, what-if); the placement cell
--    sees the results for its college.

-- ---------------------------------------------------------------------------
-- Recruiters
-- ---------------------------------------------------------------------------
create table if not exists public.org_recruiters (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company text not null check (char_length(company) between 1 and 120),
  full_name text not null default '' check (char_length(full_name) <= 160),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
alter table public.org_recruiters enable row level security;
revoke all on public.org_recruiters from anon, authenticated;
grant select, insert, update, delete on public.org_recruiters to authenticated;

alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (
  (role = 'super_admin' and org_id is null) or (role in ('org_admin', 'recruiter') and org_id is not null)
);

create or replace function private.recruiter_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.org_id from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'recruiter';
$$;
revoke all on function private.recruiter_org_ids() from public, anon;
grant execute on function private.recruiter_org_ids() to authenticated;

create or replace function private.recruiter_company(target_org uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.company from public.org_recruiters r where r.org_id = target_org and r.user_id = (select auth.uid()) limit 1;
$$;
revoke all on function private.recruiter_company(uuid) from public, anon;
grant execute on function private.recruiter_company(uuid) to authenticated;

drop policy if exists "placement cell manages recruiters" on public.org_recruiters;
create policy "placement cell manages recruiters" on public.org_recruiters for all to authenticated
  using ((select private.can_admin_org(org_id))) with check ((select private.can_admin_org(org_id)));
drop policy if exists "recruiter reads own record" on public.org_recruiters;
create policy "recruiter reads own record" on public.org_recruiters for select to authenticated
  using (user_id = (select auth.uid()));

-- Adding a recruiter whose account already exists grants the role now; removing the record revokes it.
create or replace function private.sync_recruiter_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  if tg_op = 'DELETE' then
    if old.user_id is not null then
      delete from public.user_roles where user_id = old.user_id and role = 'recruiter' and org_id = old.org_id;
    end if;
    return old;
  end if;
  select id into uid from auth.users where lower(email) = new.email;
  if uid is not null then
    new.user_id := uid;
    insert into public.user_roles (user_id, role, org_id) values (uid, 'recruiter', new.org_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_recruiter_role() from public, anon, authenticated;
drop trigger if exists org_recruiters_sync on public.org_recruiters;
create trigger org_recruiters_sync before insert or update of email on public.org_recruiters
  for each row execute function private.sync_recruiter_role();
drop trigger if exists org_recruiters_unsync on public.org_recruiters;
create trigger org_recruiters_unsync after delete on public.org_recruiters
  for each row execute function private.sync_recruiter_role();

-- Recruiters can be signed up (allowlist) but never self-register as students.
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
    when exists (select 1 from public.org_recruiters r where r.email = lower(em)) then 'recruiter'
    when exists (select 1 from public.org_students s where s.email = lower(em)) then 'student'
    else null
  end;
$$;
revoke all on function private.registered_as(text) from public, anon, authenticated;

create or replace function private.attach_user_to_org(uid uuid, user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(coalesce(user_email, ''));
  r public.org_students%rowtype;
begin
  if em = '' then
    return;
  end if;
  if exists (select 1 from private.platform_admin_emails p where p.email = em) then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return;
  end if;
  insert into public.user_roles (user_id, role, org_id)
  select uid, 'org_admin', o.id from public.organizations o where em = any (o.admin_emails)
  on conflict do nothing;
  if exists (select 1 from public.user_roles x where x.user_id = uid and x.role = 'org_admin') then
    return;
  end if;
  -- Recruiter accounts: one role per college that added them.
  if exists (select 1 from public.org_recruiters rc where rc.email = em) then
    update public.org_recruiters set user_id = uid where email = em;
    insert into public.user_roles (user_id, role, org_id)
    select uid, 'recruiter', rc.org_id from public.org_recruiters rc where rc.email = em
    on conflict do nothing;
    return;
  end if;
  select * into r from public.org_students s where s.email = em order by s.created_at limit 1;
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

-- Drives owned by a recruiter.
alter table public.job_postings add column if not exists recruiter_id uuid references auth.users (id) on delete set null;
create index if not exists job_postings_recruiter_idx on public.job_postings (recruiter_id);

drop policy if exists "recruiters manage own jobs" on public.job_postings;
create policy "recruiters manage own jobs" on public.job_postings for all to authenticated
  using (recruiter_id = (select auth.uid()) and org_id in (select private.recruiter_org_ids()))
  with check (
    recruiter_id = (select auth.uid())
    and org_id in (select private.recruiter_org_ids())
    and company = (select private.recruiter_company(org_id))
  );

drop policy if exists "recruiters see applications to own jobs" on public.job_applications;
create policy "recruiters see applications to own jobs" on public.job_applications for select to authenticated
  using (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid())));
drop policy if exists "recruiters update applications to own jobs" on public.job_applications;
create policy "recruiters update applications to own jobs" on public.job_applications for update to authenticated
  using (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid())))
  with check (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid())));

-- Recruiters may view exactly the students who applied to their drives.
create or replace function private.can_view_user(target uuid)
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
      )
      or exists (
        select 1 from public.job_applications a
        join public.job_postings j on j.id = a.job_id
        where a.user_id = target and j.recruiter_id = (select auth.uid())
      );
$$;

-- ---------------------------------------------------------------------------
-- Recommendation feedback
-- ---------------------------------------------------------------------------
create table if not exists public.recommendation_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  target text not null check (target in ('next_step', 'roadmap', 'assistant', 'what_if', 'eligibility', 'resume')),
  helpful boolean not null,
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists recommendation_feedback_org_idx on public.recommendation_feedback (org_id, created_at desc);
alter table public.recommendation_feedback enable row level security;
revoke all on public.recommendation_feedback from anon, authenticated;
grant select, insert on public.recommendation_feedback to authenticated;

create or replace function private.feedback_set_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.org_id := (select p.org_id from public.profiles p where p.id = auth.uid());
  return new;
end;
$$;
revoke all on function private.feedback_set_org() from public, anon, authenticated;
drop trigger if exists recommendation_feedback_org on public.recommendation_feedback;
create trigger recommendation_feedback_org before insert on public.recommendation_feedback
  for each row execute function private.feedback_set_org();

drop policy if exists "students give feedback" on public.recommendation_feedback;
create policy "students give feedback" on public.recommendation_feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "read own or college feedback" on public.recommendation_feedback;
create policy "read own or college feedback" on public.recommendation_feedback for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_admin_org(org_id)));
