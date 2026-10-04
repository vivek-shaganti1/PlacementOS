-- Access flow:
--   platform admin (super admin) creates colleges and names their admin emails (any address, e.g. admin1@gmail.com);
--   each college's admins add student emails to their roster; only rostered emails get student access.
-- Also: plan and pricing per college, seat limits, and a usage report for the platform admin.

-- ---------------------------------------------------------------------------
-- Plan and pricing
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists plan text not null default 'trial' check (plan in ('trial', 'basic', 'pro', 'enterprise')),
  add column if not exists seat_limit integer check (seat_limit is null or seat_limit >= 0),
  add column if not exists price_per_seat numeric(10, 2) not null default 0 check (price_per_seat >= 0),
  add column if not exists billing_cycle text not null default 'yearly' check (billing_cycle in ('monthly', 'yearly')),
  add column if not exists renews_on date,
  add column if not exists status text not null default 'active' check (status in ('active', 'suspended')),
  add column if not exists notes text not null default '';

-- Seat limit: a college cannot roster more students than it pays for.
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
  select seat_limit into lim from public.organizations where id = new.org_id;
  -- Re-saving a student who is already on the roster never uses a new seat.
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
create trigger org_students_seats before insert on public.org_students
  for each row execute function private.enforce_seat_limit();

-- ---------------------------------------------------------------------------
-- Roster is the only way in for students (no automatic joining by email domain)
-- ---------------------------------------------------------------------------
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
    update public.org_students set user_id = uid where id = r.id;
    update public.profiles p set
      org_id = r.org_id,
      roll_number = coalesce(nullif(p.roll_number, ''), nullif(r.roll_number, '')),
      full_name = case when coalesce(r.full_name, '') <> '' then r.full_name else p.full_name end,
      branch = case when p.branch = '' and coalesce(r.branch, '') <> '' then r.branch else p.branch end,
      batch = case when p.batch = '' and coalesce(r.batch, '') <> '' then r.batch else p.batch end,
      college = (select o.name from public.organizations o where o.id = r.org_id)
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
  return new;
end;
$$;
revoke all on function private.sync_org_members() from public, anon, authenticated;

-- Removing a student from the roster removes their access to the college.
create or replace function private.unlink_roster_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.user_id is not null then
    update public.profiles set org_id = null where id = old.user_id and org_id = old.org_id;
  end if;
  return old;
end;
$$;
revoke all on function private.unlink_roster_entry() from public, anon, authenticated;
drop trigger if exists org_students_unlink on public.org_students;
create trigger org_students_unlink after delete on public.org_students
  for each row execute function private.unlink_roster_entry();

-- Students who joined earlier by domain keep access: put them on their college's roster.
insert into public.org_students (org_id, email, full_name, roll_number, branch, batch, user_id)
select p.org_id, lower(u.email), coalesce(p.full_name, ''), coalesce(p.roll_number, ''), coalesce(p.branch, ''), coalesce(p.batch, ''), p.id
from public.profiles p join auth.users u on u.id = p.id
where p.org_id is not null
  and not exists (select 1 from public.user_roles x where x.user_id = p.id)
  and not exists (select 1 from public.org_students s where s.org_id = p.org_id and s.email = lower(u.email))
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Platform admin account
-- ---------------------------------------------------------------------------
insert into private.platform_admin_emails (email) values ('shagantivivekgoud@gmail.com') on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Usage report for the platform admin
-- ---------------------------------------------------------------------------
create or replace function public.org_usage()
returns table (
  org_id uuid,
  rostered bigint,
  joined bigint,
  onboarded bigint,
  active_7d bigint,
  active_30d bigint,
  last_active timestamptz,
  storage_bytes bigint,
  resumes bigint,
  resume_analyses bigint,
  jd_matches bigint,
  ai_messages bigint,
  coding_profiles bigint,
  drives bigint,
  applications bigint,
  admins bigint
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
    (select count(*) from public.user_roles r where r.org_id = o.id and r.role = 'org_admin')
  from public.organizations o;
end;
$$;
revoke all on function public.org_usage() from public, anon;
grant execute on function public.org_usage() to authenticated;
