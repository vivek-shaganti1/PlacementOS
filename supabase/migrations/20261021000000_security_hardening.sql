-- Security hardening from the October 2026 audit.
-- 1. Job applications: identity columns are immutable and only status/admin_note are editable (by the drive's admins
--    or recruiter). Rewriting user_id/job_id let a recruiter or placement cell gain read access to any student.
-- 2. can_view_user: the recruiter branch also requires the applicant to belong to the drive's college.
-- 3. Drives: recruiter_id must be a recruiter of the same college.
-- 4. Temporary-password provisioning only for emails that belong to the caller's college alone (can_provision).
-- 5. Roster linking never moves accounts that hold a role (admins, recruiters, platform admins) into a college, and an
--    email can be on only one college's roster.
-- 6. Profiles: roster-owned fields (roll number, email, college, and branch/batch once set) cannot be edited by students.
-- 7. Students see only their college's name, not pricing, notes or pending admin emails.
-- 8. Suspended colleges cannot spend AI actions.
-- 9. Sign-up attempt limits (per email and per IP), checked by /api/signup.
-- 10. Seat limits hold under concurrent inserts; recruiter account links come only from the email.
-- 11. Unused table privileges removed from the API roles.

-- ---------------------------------------------------------------------------
-- 1. Job applications
-- ---------------------------------------------------------------------------
drop policy if exists "students update own fit" on public.job_applications;
revoke update on public.job_applications from authenticated;
grant update (status, admin_note) on public.job_applications to authenticated;

create or replace function private.job_applications_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The service role (server functions) and database owner are not restricted here.
  if (select auth.uid()) is null then
    return new;
  end if;
  if new.job_id is distinct from old.job_id or new.user_id is distinct from old.user_id or new.created_at is distinct from old.created_at
     or new.match is distinct from old.match or new.ai_fit is distinct from old.ai_fit then
    raise exception 'Only the status and note of an application can be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.job_applications_guard() from public, anon, authenticated;
drop trigger if exists job_applications_guard on public.job_applications;
create trigger job_applications_guard before update on public.job_applications
  for each row execute function private.job_applications_guard();

-- A new application starts clean: no admin note and no AI fit (the server writes ai_fit).
drop policy if exists "students apply" on public.job_applications;
create policy "students apply" on public.job_applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'applied' and coalesce(admin_note, '') = '' and ai_fit is null
    and exists (
      select 1 from public.job_postings j
      where j.id = job_id and j.status = 'open' and (j.deadline is null or j.deadline >= current_date)
        and j.org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Who can view a user
-- ---------------------------------------------------------------------------
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
        join public.user_roles r on r.user_id = (select auth.uid()) and r.role = 'recruiter' and r.org_id = j.org_id
        join public.profiles p on p.id = a.user_id and p.org_id = j.org_id
        where a.user_id = target and j.recruiter_id = (select auth.uid())
      );
$$;

-- ---------------------------------------------------------------------------
-- 3. Drives: recruiter_id must be a recruiter of that college
-- ---------------------------------------------------------------------------
create or replace function private.is_org_recruiter(uid uuid, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = 'recruiter' and org_id = target_org);
$$;
revoke all on function private.is_org_recruiter(uuid, uuid) from public, anon;
grant execute on function private.is_org_recruiter(uuid, uuid) to authenticated;

drop policy if exists "admins manage jobs" on public.job_postings;
create policy "admins manage jobs" on public.job_postings for all to authenticated
  using ((select private.can_admin_org(org_id)))
  with check (
    org_id is not null and (select private.can_admin_org(org_id))
    and (recruiter_id is null or private.is_org_recruiter(recruiter_id, org_id))
  );

-- ---------------------------------------------------------------------------
-- 4. Provisioning with a temporary password
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
    and not exists (select 1 from public.org_recruiters r where r.org_id <> target_org and r.email = lower(target_email));
$$;
revoke all on function public.can_provision(uuid, text) from public, anon;
grant execute on function public.can_provision(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Roster linking
-- ---------------------------------------------------------------------------
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

-- One college per student email. Skipped (with a notice) if existing data already has duplicates to clean up first.
do $$
begin
  if not exists (select email from public.org_students group by email having count(*) > 1) then
    create unique index if not exists org_students_email_global on public.org_students (email);
  else
    raise notice 'org_students has the same email in several colleges; resolve duplicates, then create org_students_email_global.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Roster-owned profile fields
-- ---------------------------------------------------------------------------
create or replace function private.pin_roster_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only edits made directly by a signed-in user are pinned; roster sync runs as the table owner and passes through.
  if current_user = 'authenticated' and old.org_id is not null then
    new.roll_number := old.roll_number;
    new.email := old.email;
    new.college := old.college;
    if coalesce(old.branch, '') <> '' then new.branch := old.branch; end if;
    if coalesce(old.batch, '') <> '' then new.batch := old.batch; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.pin_roster_fields() from public, anon, authenticated;
drop trigger if exists profiles_pin_roster on public.profiles;
create trigger profiles_pin_roster before update on public.profiles
  for each row execute function private.pin_roster_fields();

-- ---------------------------------------------------------------------------
-- 7. Organizations visible to students: name only
-- ---------------------------------------------------------------------------
drop policy if exists "orgs visible to members and admins" on public.organizations;
create policy "orgs visible to admins" on public.organizations for select to authenticated
  using ((select private.is_super_admin()) or id in (select private.admin_org_ids()));

create or replace function public.my_org()
returns table (id uuid, name text, short_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name, o.short_name from public.organizations o
  where o.id = (select p.org_id from public.profiles p where p.id = (select auth.uid()));
$$;
revoke all on function public.my_org() from public, anon;
grant execute on function public.my_org() to authenticated;

-- ---------------------------------------------------------------------------
-- 8. AI quota respects suspended colleges
-- ---------------------------------------------------------------------------
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
  select count(*) into used from public.ai_usage u where u.user_id = uid and u.created_at >= date_trunc('month', now());
  if used >= lim then
    raise exception 'AI_QUOTA: You have used all % AI actions for this month. They reset on %.', lim, to_char(date_trunc('month', now()) + interval '1 month', 'DD Mon')
      using errcode = 'P0001';
  end if;
  insert into public.ai_usage (user_id, org_id, kind) values (uid, org, action);
  return lim - used - 1;
end;
$$;
revoke all on function public.consume_ai(text) from public, anon;
grant execute on function public.consume_ai(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Sign-up attempt limits
-- ---------------------------------------------------------------------------
create table if not exists private.signup_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null default '',
  at timestamptz not null default now()
);
create index if not exists signup_attempts_email on private.signup_attempts (email, at);
create index if not exists signup_attempts_ip on private.signup_attempts (ip, at);

-- Records an attempt and returns false once an email (5) or an IP (20) has tried too often in the last hour.
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
  delete from private.signup_attempts where at < now() - interval '1 day';
  if (select count(*) from private.signup_attempts where email = e and at > now() - interval '1 hour') >= 5
     or (i <> '' and (select count(*) from private.signup_attempts where ip = i and at > now() - interval '1 hour') >= 20) then
    return false;
  end if;
  insert into private.signup_attempts (email, ip) values (e, i);
  return true;
end;
$$;
revoke all on function public.signup_attempt(text, text) from public, anon, authenticated;
grant execute on function public.signup_attempt(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 10. Seat limit under concurrency; recruiter links only from the email
-- ---------------------------------------------------------------------------
create or replace function private.enforce_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  lim integer;
  used integer;
begin
  -- Lock the college row so two simultaneous imports cannot both take the last seat.
  select seat_limit into lim from public.organizations where id = new.org_id for update;
  if lim is not null and not exists (select 1 from public.org_students s where s.org_id = new.org_id and s.email = new.email) then
    select count(*) into used from public.org_students where org_id = new.org_id;
    if used >= lim then
      raise exception 'Seat limit reached (% students). Ask the platform admin to raise it.', lim using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_seat_limit() from public, anon, authenticated;
drop trigger if exists org_students_seats on public.org_students;
create trigger org_students_seats before insert or update of org_id on public.org_students
  for each row execute function private.enforce_seat_limit();

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
  -- The linked account always comes from the email, never from a value the caller supplied.
  select id into uid from auth.users where lower(email) = new.email;
  new.user_id := uid;
  if uid is not null then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'recruiter', new.org_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_recruiter_role() from public, anon, authenticated;
drop trigger if exists org_recruiters_sync on public.org_recruiters;
create trigger org_recruiters_sync before insert or update on public.org_recruiters
  for each row execute function private.sync_recruiter_role();

-- ---------------------------------------------------------------------------
-- 11. Privileges the API roles never need
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 12. Links must be web links. A "javascript:" URL in a profile, project, certificate or repo would run in the
--     placement cell's or recruiter's browser when they click it. Existing rows are checked by the app as well.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_link_scheme;
alter table public.profiles add constraint profiles_link_scheme check (
  (linkedin_url is null or linkedin_url = '' or linkedin_url ~* '^https?://')
  and (portfolio_url is null or portfolio_url = '' or portfolio_url ~* '^https?://')
  and (avatar_url is null or avatar_url = '' or avatar_url ~* '^https://')
) not valid;
alter table public.projects drop constraint if exists projects_url_scheme;
alter table public.projects add constraint projects_url_scheme check (url is null or url = '' or url ~* '^https?://') not valid;
alter table public.certifications drop constraint if exists certifications_url_scheme;
alter table public.certifications add constraint certifications_url_scheme check (credential_url is null or credential_url = '' or credential_url ~* '^https?://') not valid;
alter table public.github_repos drop constraint if exists github_repos_url_scheme;
alter table public.github_repos add constraint github_repos_url_scheme check (url ~* '^https://github\.com/') not valid;
do $$
begin
  alter table public.profiles validate constraint profiles_link_scheme;
  alter table public.projects validate constraint projects_url_scheme;
  alter table public.certifications validate constraint certifications_url_scheme;
  alter table public.github_repos validate constraint github_repos_url_scheme;
exception when check_violation then
  raise notice 'Some existing links are not http(s); new and edited rows are checked from now on.';
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Applying requires meeting the drive's academic minimums and batch (the Apply button was the only check).
-- ---------------------------------------------------------------------------
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
      and coalesce(p.cgpa, 0) >= j.min_cgpa
      and coalesce(p.backlogs, 0) <= j.max_backlogs
      and coalesce(p.class_x, 0) >= j.min_class_x
      and coalesce(p.class_xii, 0) >= j.min_class_xii
      and (cardinality(j.batches) = 0 or coalesce(p.batch, '') = any (j.batches))
  );
$$;
revoke all on function private.meets_job_minimums(uuid) from public, anon;
grant execute on function private.meets_job_minimums(uuid) to authenticated;

drop policy if exists "students apply" on public.job_applications;
create policy "students apply" on public.job_applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and status = 'applied' and coalesce(admin_note, '') = '' and ai_fit is null
    and exists (
      select 1 from public.job_postings j
      where j.id = job_id and j.status = 'open' and (j.deadline is null or j.deadline >= current_date)
        and j.org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
    )
    and (select private.meets_job_minimums(job_id))
  );

-- ---------------------------------------------------------------------------
-- 14. "Private" profiles are hidden from recruiters (the placement cell still sees its own students).
-- ---------------------------------------------------------------------------
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
        join public.user_roles r on r.user_id = (select auth.uid()) and r.role = 'recruiter' and r.org_id = j.org_id
        join public.profiles p on p.id = a.user_id and p.org_id = j.org_id and p.visibility <> 'private'
        where a.user_id = target and j.recruiter_id = (select auth.uid())
      );
$$;
