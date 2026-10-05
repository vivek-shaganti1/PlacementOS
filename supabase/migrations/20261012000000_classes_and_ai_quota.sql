-- 1. Academic structure: program, branch, section (year of study is derived from the graduation batch).
-- 2. AI quota per student per month by plan, so AI cost per student has a hard ceiling.

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------
alter table public.org_students
  add column if not exists section text not null default '' check (char_length(section) <= 20),
  add column if not exists program text not null default 'B.Tech' check (char_length(program) <= 40);
alter table public.profiles
  add column if not exists section text not null default '' check (char_length(section) <= 20),
  add column if not exists program text not null default 'B.Tech' check (char_length(program) <= 40);
-- Section and program come from the college roster; students cannot edit them (no update grant).

create index if not exists org_students_class_idx on public.org_students (org_id, batch, branch, section);

-- Roster edits flow into the linked student's profile.
create or replace function private.sync_roster_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    update public.profiles p set
      section = new.section,
      program = coalesce(nullif(new.program, ''), p.program),
      branch = case when coalesce(new.branch, '') <> '' then new.branch else p.branch end,
      batch = case when coalesce(new.batch, '') <> '' then new.batch else p.batch end,
      roll_number = case when coalesce(new.roll_number, '') <> '' then new.roll_number else p.roll_number end
    where p.id = new.user_id and p.org_id = new.org_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_roster_to_profile() from public, anon, authenticated;
drop trigger if exists org_students_sync_profile on public.org_students;
create trigger org_students_sync_profile after insert or update on public.org_students
  for each row execute function private.sync_roster_to_profile();

-- Sign-up copies section and program from the roster too.
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

-- ---------------------------------------------------------------------------
-- AI quota
-- ---------------------------------------------------------------------------
alter table public.organizations add column if not exists ai_monthly_limit integer check (ai_monthly_limit is null or ai_monthly_limit >= 0);

-- Append-only log of AI actions (assistant replies, resume analyses, JD matches). Students can read their own rows only.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  kind text not null check (kind in ('chat', 'resume', 'jd_match')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_month_idx on public.ai_usage (user_id, created_at);
create index if not exists ai_usage_org_idx on public.ai_usage (org_id, created_at);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;
drop policy if exists "read own or administered usage" on public.ai_usage;
create policy "read own or administered usage" on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()) or (select private.can_admin_org(org_id)));

create or replace function private.plan_ai_limit(target_org uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(o.ai_monthly_limit,
    case o.plan when 'trial' then 15 when 'basic' then 40 when 'pro' then 100 else 200 end)
  from public.organizations o where o.id = target_org;
$$;
revoke all on function private.plan_ai_limit(uuid) from public, anon, authenticated;

-- Quota status for the signed-in student.
create or replace function public.ai_quota()
returns table (used integer, quota integer, resets_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::int from public.ai_usage u where u.user_id = auth.uid() and u.created_at >= date_trunc('month', now())),
    coalesce((select private.plan_ai_limit(p.org_id) from public.profiles p where p.id = auth.uid()), 0),
    (date_trunc('month', now()) + interval '1 month')::date;
$$;
revoke all on function public.ai_quota() from public, anon;
grant execute on function public.ai_quota() to authenticated;

-- Records one AI action, or refuses when this month's quota is used up. Called by the API before each model call.
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

-- Usage report gains this month's AI actions.
drop function if exists public.org_usage();
create or replace function public.org_usage()
returns table (
  org_id uuid, rostered bigint, joined bigint, onboarded bigint, active_7d bigint, active_30d bigint, last_active timestamptz,
  storage_bytes bigint, resumes bigint, resume_analyses bigint, jd_matches bigint, ai_messages bigint, coding_profiles bigint,
  drives bigint, applications bigint, admins bigint, ai_actions_month bigint, ai_actions_total bigint
)
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
  with members as (
    select p.id, p.org_id, p.onboarded_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id
    where p.org_id is not null
  )
  select o.id,
    (select count(*) from public.org_students s where s.org_id = o.id),
    (select count(*) from members m where m.org_id = o.id),
    (select count(*) from members m where m.org_id = o.id and m.onboarded_at is not null),
    (select count(*) from members m where m.org_id = o.id and m.last_sign_in_at > now() - interval '7 days'),
    (select count(*) from members m where m.org_id = o.id and m.last_sign_in_at > now() - interval '30 days'),
    (select max(m.last_sign_in_at) from members m where m.org_id = o.id),
    (select coalesce(sum((so.metadata ->> 'size')::bigint), 0)::bigint from storage.objects so
       join members m on m.id::text = split_part(so.name, '/', 1)
       where so.bucket_id in ('resumes', 'avatars') and m.org_id = o.id),
    (select count(*) from members m join public.profiles p on p.id = m.id where m.org_id = o.id and p.resume_path is not null),
    (select count(*) from public.resume_analyses x join members m on m.id = x.user_id where m.org_id = o.id),
    (select count(*) from public.jd_matches x join members m on m.id = x.user_id where m.org_id = o.id),
    (select count(*) from public.chat_messages x join members m on m.id = x.user_id where m.org_id = o.id),
    (select count(*) from public.coding_profiles x join members m on m.id = x.user_id where m.org_id = o.id),
    (select count(*) from public.job_postings j where j.org_id = o.id),
    (select count(*) from public.job_applications a join public.job_postings j on j.id = a.job_id where j.org_id = o.id),
    (select count(*) from public.user_roles r where r.org_id = o.id and r.role = 'org_admin'),
    (select count(*) from public.ai_usage a where a.org_id = o.id and a.created_at >= date_trunc('month', now())),
    (select count(*) from public.ai_usage a where a.org_id = o.id)
  from public.organizations o;
end;
$$;
revoke all on function public.org_usage() from public, anon;
grant execute on function public.org_usage() to authenticated;
