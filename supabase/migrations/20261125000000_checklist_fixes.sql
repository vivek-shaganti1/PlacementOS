-- Fixes from the 23 Nov 2026 checklist review. One transaction, safe to run more than once. Apply after 20261116000000.
-- Each block names the checklist item it closes.

begin;

-- ---------------------------------------------------------------------------
-- D-13. Set-based visibility. private.can_view_user(user_id) ran once per row: 22 s for 5,000 students' skills, past the
-- 8 s statement timeout. The set is computed once per query instead. Same people, same two-factor rule.
-- ---------------------------------------------------------------------------
create or replace function private.viewable_user_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p where p.org_id in (select private.admin_org_ids())
  union
  select a.user_id
    from public.job_postings j
    join public.user_roles r on r.user_id = (select auth.uid()) and r.role = 'recruiter' and r.org_id = j.org_id
    join public.job_applications a on a.job_id = j.id
    join public.profiles p on p.id = a.user_id and p.org_id = j.org_id and p.visibility <> 'private'
   where j.recruiter_id = (select auth.uid());
$$;
revoke all on function private.viewable_user_ids() from public, anon;
grant execute on function private.viewable_user_ids() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['user_skills','projects','internships','certifications','achievements','coding_profiles','github_repos','resume_analyses','credentials'] loop
    execute format('drop policy if exists "admins read" on public.%I', t);
    execute format('create policy "admins read" on public.%I for select to authenticated using ((select private.is_super_admin()) or user_id in (select private.viewable_user_ids()))', t);
  end loop;
end;
$$;
drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select to authenticated
  using ((select private.is_super_admin()) or id in (select private.viewable_user_ids()));

-- ---------------------------------------------------------------------------
-- B-04. A removed recruiter already saw nothing (the drive itself is hidden from them). The rule is now stated in the
-- application policies too, so it does not depend on another table's policy.
-- ---------------------------------------------------------------------------
drop policy if exists "recruiters see applications to own jobs" on public.job_applications;
create policy "recruiters see applications to own jobs" on public.job_applications for select to authenticated
  using (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid()) and j.org_id in (select private.recruiter_org_ids())));
drop policy if exists "recruiters update applications to own jobs" on public.job_applications;
create policy "recruiters update applications to own jobs" on public.job_applications for update to authenticated
  using (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid()) and j.org_id in (select private.recruiter_org_ids())))
  with check (exists (select 1 from public.job_postings j where j.id = job_id and j.recruiter_id = (select auth.uid()) and j.org_id in (select private.recruiter_org_ids())));

-- ---------------------------------------------------------------------------
-- B-22. The helper answers only for the caller (its one use is the caller's own profile update).
-- ---------------------------------------------------------------------------
create or replace function private.roster_academics(uid uuid)
returns table (cgpa numeric, backlogs integer, class_x numeric, class_xii numeric)
language sql stable security definer set search_path = '' as $$
  select s.cgpa, s.backlogs, s.class_x, s.class_xii from public.org_students s where s.user_id = uid and uid = (select auth.uid()) limit 1;
$$;

-- ---------------------------------------------------------------------------
-- C-12. The per-address limit is serialized too, so parallel sign-ups with different emails cannot pass it together.
-- Lock order is always email, then address.
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
  perform pg_advisory_xact_lock(hashtextextended('signup:' || e, 0));
  if i <> '' then
    perform pg_advisory_xact_lock(hashtextextended('signupip:' || i, 0));
  end if;
  delete from private.signup_attempts where at < now() - interval '1 day';
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
-- C-19 and D-17. The AI month starts at midnight in India; a platform-wide daily cap bounds the bill; tokens are recorded.
-- ---------------------------------------------------------------------------
create or replace function private.ist_start(unit text)
returns timestamptz language sql stable set search_path = '' as $$
  select date_trunc(unit, now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
$$;
revoke all on function private.ist_start(text) from public, anon, authenticated;

create table if not exists private.platform_settings (
  key text primary key,
  value integer not null check (value >= 0)
);
insert into private.platform_settings (key, value) values ('ai_daily_cap', 5000) on conflict (key) do nothing;
revoke all on private.platform_settings from public, anon, authenticated;

alter table public.ai_usage add column if not exists tokens integer check (tokens is null or tokens >= 0);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at);

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
  since timestamptz := private.ist_start('month');
  cap integer;
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
  select count(*) into used from public.ai_usage u where u.user_id = uid and u.created_at >= since;
  if used >= lim then
    raise exception 'AI_QUOTA: You have used all % AI actions for this month. They reset on %.', lim, to_char((since at time zone 'Asia/Kolkata') + interval '1 month', 'DD Mon')
      using errcode = 'P0001';
  end if;
  -- The whole platform's ceiling for the day. Held to the end of this short transaction, so the cap is exact.
  select s.value into cap from private.platform_settings s where s.key = 'ai_daily_cap';
  if cap is not null then
    perform pg_advisory_xact_lock(hashtextextended('ai-platform-day', 0));
    if (select count(*) from public.ai_usage u where u.created_at >= private.ist_start('day')) >= cap then
      raise exception 'AI_QUOTA: AI is paused for today because PlacementIQ reached its daily limit. It resumes at midnight.' using errcode = 'P0001';
    end if;
  end if;
  insert into public.ai_usage (user_id, org_id, kind) values (uid, org, action);
  return lim - used - 1;
end;
$$;

create or replace function public.ai_quota()
returns table (used integer, quota integer, resets_on date)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.ai_usage u where u.user_id = auth.uid() and u.created_at >= private.ist_start('month')),
    coalesce((select private.plan_ai_limit(p.org_id) from public.profiles p where p.id = auth.uid()), 0),
    ((private.ist_start('month') at time zone 'Asia/Kolkata') + interval '1 month')::date;
$$;

-- What the model actually used, written by the server after a call (the user cannot set it).
create or replace function public.record_ai_tokens(target uuid, total integer)
returns void language sql security definer set search_path = '' as $$
  update public.ai_usage set tokens = coalesce(tokens, 0) + greatest(total, 0) where id = (
    select u.id from public.ai_usage u where u.user_id = target and u.created_at > now() - interval '2 minutes' order by u.created_at desc limit 1
  );
$$;
revoke all on function public.record_ai_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.record_ai_tokens(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- C-18. An active college cannot be deleted from the app: it would take its roster, drives and applications with it.
-- ---------------------------------------------------------------------------
create or replace function private.guard_org_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and old.status = 'active' then
    raise exception 'Suspend this college first. Deleting it also deletes its roster, drives and applications.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
revoke all on function private.guard_org_delete() from public, anon, authenticated;
drop trigger if exists guard_org_delete on public.organizations;
create trigger guard_org_delete before delete on public.organizations for each row execute function private.guard_org_delete();

-- ---------------------------------------------------------------------------
-- E-23. When an account goes, the audit log keeps who did what and when, but not that student's grades or outcomes.
-- ---------------------------------------------------------------------------
create or replace function private.pseudonymise_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.audit_log set detail = (detail - 'from' - 'to' - 'status') || '{"erased": true}'::jsonb
   where target = old.id::text
      or (tg_table_name = 'users' and target in (select s.id::text from public.org_students s where s.user_id = old.id));
  return old;
end;
$$;
revoke all on function private.pseudonymise_audit() from public, anon, authenticated;
drop trigger if exists pseudonymise_audit on auth.users;
create trigger pseudonymise_audit before delete on auth.users for each row execute function private.pseudonymise_audit();
create index if not exists audit_log_target on public.audit_log (target);

-- ---------------------------------------------------------------------------
-- C-10. Retention: AI usage 13 months, audit log 36 months, handled enquiries 24 months. Daily where pg_cron exists.
-- ---------------------------------------------------------------------------
create or replace function private.apply_retention()
returns void language sql security definer set search_path = '' as $$
  delete from public.ai_usage where created_at < now() - interval '13 months';
  delete from public.audit_log where at < now() - interval '36 months';
  delete from public.contact_enquiries where status = 'handled' and handled_at < now() - interval '24 months';
$$;
revoke all on function private.apply_retention() from public, anon, authenticated;
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('piq-retention', '40 21 * * *', 'select private.apply_retention()');
exception when others then
  raise notice 'pg_cron is not available here; run private.apply_retention() from another scheduler.';
end;
$$;

-- ---------------------------------------------------------------------------
-- E-24. Consent to the privacy notice: which version, when, and the person's own statement about their age.
-- ---------------------------------------------------------------------------
create table if not exists public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_version text not null check (notice_version ~ '^\d{4}-\d{2}-\d{2}$'),
  age text not null check (age in ('adult', 'guardian')),
  at timestamptz not null default now(),
  unique (user_id, notice_version)
);
alter table public.consents enable row level security;
revoke all on public.consents from public, anon, authenticated;
grant select on public.consents to authenticated;
grant insert (user_id, notice_version, age) on public.consents to authenticated;
drop policy if exists "own consent read" on public.consents;
create policy "own consent read" on public.consents for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own consent given" on public.consents;
create policy "own consent given" on public.consents for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "password change first" on public.consents;
create policy "password change first" on public.consents as restrictive for all to authenticated using (not (select private.password_pending()));

commit;
