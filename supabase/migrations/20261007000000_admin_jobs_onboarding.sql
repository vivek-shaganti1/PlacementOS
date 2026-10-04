-- Roles (placement-cell admins), college job postings, job applications with a status pipeline,
-- onboarding state, and admin read access to student data.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

-- Role check used inside RLS policies. Lives in the private (unexposed) schema; SECURITY DEFINER so it
-- can read user_roles regardless of the caller's policies, and it only ever answers about the caller.
create schema if not exists private;
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "own role or admin" on public.user_roles;
create policy "own role or admin" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- Admins grant or revoke admin by the account's sign-in email.
create or replace function public.set_admin(target_email text, make_admin boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'only admins can change roles' using errcode = '42501';
  end if;
  select id into target from auth.users where lower(email) = lower(trim(target_email));
  if target is null then
    raise exception 'no account with that email' using errcode = 'P0002';
  end if;
  if make_admin then
    insert into public.user_roles (user_id, role, granted_by) values (target, 'admin', (select auth.uid()))
    on conflict (user_id) do nothing;
  else
    if target = (select auth.uid()) then
      raise exception 'you cannot remove your own admin role' using errcode = '22023';
    end if;
    delete from public.user_roles where user_id = target;
  end if;
  return target::text;
end;
$$;
revoke all on function public.set_admin(text, boolean) from public, anon;
grant execute on function public.set_admin(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists onboarded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Job postings (created by admins) and applications
-- ---------------------------------------------------------------------------
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(company) between 1 and 120),
  role text not null check (char_length(role) between 1 and 160),
  location text not null default '',
  job_type text not null default 'Full Time',
  ctc_min numeric(6, 2),
  ctc_max numeric(6, 2),
  description text not null default '' check (char_length(description) <= 20000),
  min_cgpa numeric(4, 2) not null default 0 check (min_cgpa between 0 and 10),
  max_backlogs integer not null default 0 check (max_backlogs >= 0),
  min_class_x numeric(5, 2) not null default 0,
  min_class_xii numeric(5, 2) not null default 0,
  min_internships integer not null default 0,
  min_projects integer not null default 0,
  branches text[] not null default '{}',
  batches text[] not null default '{}',
  skill_requirements jsonb not null default '{}'::jsonb,
  deadline date,
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists job_postings_status_idx on public.job_postings (status, deadline);

drop trigger if exists job_postings_touch on public.job_postings;
create trigger job_postings_touch before update on public.job_postings
  for each row execute function public.touch_updated_at();

create table if not exists public.job_applications (
  job_id uuid not null references public.job_postings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'interview', 'offer', 'rejected')),
  match smallint check (match between 0 and 100),
  ai_fit smallint check (ai_fit between 0 and 100),
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index if not exists job_applications_user_idx on public.job_applications (user_id);

drop trigger if exists job_applications_touch on public.job_applications;
create trigger job_applications_touch before update on public.job_applications
  for each row execute function public.touch_updated_at();

alter table public.jd_matches add column if not exists job_id uuid references public.job_postings (id) on delete set null;

alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;
revoke all on public.job_postings, public.job_applications from anon;
grant select, insert, update, delete on public.job_postings to authenticated;
grant select, insert, update, delete on public.job_applications to authenticated;

drop policy if exists "students see open jobs" on public.job_postings;
create policy "students see open jobs" on public.job_postings for select to authenticated
  using (status <> 'draft' or (select private.is_admin()));
drop policy if exists "admins manage jobs" on public.job_postings;
create policy "admins manage jobs" on public.job_postings for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "own applications select" on public.job_applications;
create policy "own applications select" on public.job_applications for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
-- Students may only apply to open jobs before the deadline, and always start in "applied".
drop policy if exists "students apply" on public.job_applications;
create policy "students apply" on public.job_applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'applied'
    and exists (select 1 from public.job_postings j where j.id = job_id and j.status = 'open' and (j.deadline is null or j.deadline >= current_date))
  );
drop policy if exists "students withdraw" on public.job_applications;
create policy "students withdraw" on public.job_applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'applied');
drop policy if exists "admins update applications" on public.job_applications;
create policy "admins update applications" on public.job_applications for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- Students can refresh their own AI fit score, but not their status.
drop policy if exists "students update own fit" on public.job_applications;
create policy "students update own fit" on public.job_applications for update to authenticated
  using (user_id = (select auth.uid()) and status = 'applied') with check (user_id = (select auth.uid()) and status = 'applied');

-- ---------------------------------------------------------------------------
-- Admin read access to student data (for rankings and student detail)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['user_skills', 'projects', 'internships', 'certifications', 'achievements', 'coding_profiles',
                           'github_repos', 'resume_analyses', 'progress_snapshots', 'mock_feedback', 'jd_matches']
  loop
    execute format('drop policy if exists "admins read" on public.%I', t);
    execute format('create policy "admins read" on public.%I for select to authenticated using ((select private.is_admin()))', t);
  end loop;
end;
$$;
drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated using ((select private.is_admin()));

drop policy if exists "resumes admin read" on storage.objects;
create policy "resumes admin read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Notifications: new job posted -> every student; application status change -> that student
-- ---------------------------------------------------------------------------
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
    where p.id is distinct from new.created_by;
  end if;
  return new;
end;
$$;
revoke all on function private.notify_job_posted() from public, anon, authenticated;
drop trigger if exists job_posted_notify on public.job_postings;
create trigger job_posted_notify after insert or update of status on public.job_postings
  for each row execute function private.notify_job_posted();

create or replace function private.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  j record;
begin
  if new.status is distinct from old.status then
    select company, role into j from public.job_postings where id = new.job_id;
    insert into public.notifications (user_id, text, link)
    values (
      new.user_id,
      case new.status
        when 'shortlisted' then format('You are shortlisted for %s — %s', j.company, j.role)
        when 'interview' then format('Interview scheduled: %s — %s', j.company, j.role)
        when 'offer' then format('Offer from %s for %s. Congratulations!', j.company, j.role)
        when 'rejected' then format('Update on %s — %s: not moving forward this time', j.company, j.role)
        else format('Your application to %s is now %s', j.company, new.status)
      end,
      '/jobs?job=' || new.job_id
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_application_status() from public, anon, authenticated;
drop trigger if exists application_status_notify on public.job_applications;
create trigger application_status_notify after update of status on public.job_applications
  for each row execute function private.notify_application_status();

-- Bootstrap: the project owner's account is the first placement-cell admin.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = '23eg105f59@anurag.edu.in'
on conflict (user_id) do nothing;

-- Remove an admin by account id (contact emails on profiles can differ from sign-in emails).
create or replace function public.remove_admin(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'only admins can change roles' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'you cannot remove your own admin role' using errcode = '22023';
  end if;
  delete from public.user_roles where user_id = target;
end;
$$;
revoke all on function public.remove_admin(uuid) from public, anon;
grant execute on function public.remove_admin(uuid) to authenticated;
