-- Academics and coding stats that colleges and recruiters can trust. Safe to run more than once.
--
-- 1. Academics (CGPA, active backlogs, Class X and XII) are entered by the student once, during onboarding, and then
--    locked: only the placement cell can change them. A college can also upload official academics on its roster;
--    those always win and mark the profile "verified by the college".
--    profiles.academics_source: 'default' (never entered), 'student' (self-reported, locked), 'college' (from the roster).
-- 2. Applying to a drive needs real academics, not the column defaults.
-- 3. Coding stats, GitHub repos, resume analyses and JD matches are written only by the server (/api/connect and
--    /api/resume, which fetch or compute them). Students can still read and delete their own rows.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.org_students
  add column if not exists cgpa numeric(4, 2) check (cgpa is null or (cgpa >= 0 and cgpa <= 10)),
  add column if not exists backlogs integer check (backlogs is null or backlogs >= 0),
  add column if not exists class_x numeric(5, 2) check (class_x is null or (class_x >= 0 and class_x <= 100)),
  add column if not exists class_xii numeric(5, 2) check (class_xii is null or (class_xii >= 0 and class_xii <= 100));

alter table public.profiles
  add column if not exists academics_source text not null default 'default'
  check (academics_source in ('default', 'student', 'college'));

-- Students who already finished onboarding entered their academics there.
update public.profiles set academics_source = 'student'
where academics_source = 'default' and onboarded_at is not null;

-- ---------------------------------------------------------------------------
-- 2. Students can set academics once; the placement cell owns them after that
-- ---------------------------------------------------------------------------
create or replace function private.pin_roster_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only edits made directly by a signed-in user are pinned; roster sync runs as the table owner and passes through.
  if current_user = 'authenticated' then
    if old.org_id is not null then
      new.roll_number := old.roll_number;
      new.email := old.email;
      new.college := old.college;
      if coalesce(old.branch, '') <> '' then new.branch := old.branch; end if;
      if coalesce(old.batch, '') <> '' then new.batch := old.batch; end if;
    end if;
    if (new.cgpa, new.backlogs, new.class_x, new.class_xii) is distinct from (old.cgpa, old.backlogs, old.class_x, old.class_xii) then
      if old.academics_source <> 'default' then
        raise exception 'ACADEMICS_LOCKED: Your academics are locked once saved. Ask your placement cell to correct them.'
          using errcode = '42501';
      end if;
      new.academics_source := 'student';
    else
      new.academics_source := old.academics_source;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.pin_roster_fields() from public, anon, authenticated;
drop trigger if exists profiles_pin_roster on public.profiles;
create trigger profiles_pin_roster before update on public.profiles
  for each row execute function private.pin_roster_fields();

-- Roster edits (including official academics) flow into the linked student's profile.
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
      roll_number = case when coalesce(new.roll_number, '') <> '' then new.roll_number else p.roll_number end,
      cgpa = coalesce(new.cgpa, p.cgpa),
      backlogs = coalesce(new.backlogs, p.backlogs),
      class_x = coalesce(new.class_x, p.class_x),
      class_xii = coalesce(new.class_xii, p.class_xii),
      academics_source = case
        when new.cgpa is not null or new.backlogs is not null or new.class_x is not null or new.class_xii is not null then 'college'
        else p.academics_source
      end
    where p.id = new.user_id and p.org_id = new.org_id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_roster_to_profile() from public, anon, authenticated;
drop trigger if exists org_students_sync_profile on public.org_students;
create trigger org_students_sync_profile after insert or update on public.org_students
  for each row execute function private.sync_roster_to_profile();

-- Apply official academics already on rosters to linked profiles.
update public.org_students set cgpa = cgpa
where user_id is not null and (cgpa is not null or backlogs is not null or class_x is not null or class_xii is not null);

-- ---------------------------------------------------------------------------
-- 3. Applying needs entered academics
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
      and p.academics_source <> 'default'
      and coalesce(p.cgpa, 0) >= j.min_cgpa
      and coalesce(p.backlogs, 0) <= j.max_backlogs
      and coalesce(p.class_x, 0) >= j.min_class_x
      and coalesce(p.class_xii, 0) >= j.min_class_xii
      and (cardinality(j.batches) = 0 or coalesce(p.batch, '') = any (j.batches))
  );
$$;
revoke all on function private.meets_job_minimums(uuid) from public, anon;
grant execute on function private.meets_job_minimums(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Verified stats are server-written
-- ---------------------------------------------------------------------------
revoke insert, update on public.coding_profiles, public.github_repos, public.resume_analyses, public.jd_matches from authenticated;
