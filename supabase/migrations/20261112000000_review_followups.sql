-- Follow-ups from the 2026-11-12 review (testing/REVIEW_2026-11-12.md). One transaction, safe to run more than once.
-- Apply after 20261110000000_audit_followups.sql.
--   A2  A resume path must be one file in the student's own folder (no "..", no sub-folders).
--   A1  A GATE scorecard path must be one PDF in the student's own folder (checked in the API too).
--   B5  A deleted account's still-valid token cannot upload files into the erased folder.
--   D3  Indexes for foreign keys and policy columns that had none.
--   E   Audit log also records roster additions, recruiter changes and colleges being created or removed.

begin;

-- ---------------------------------------------------------------------------
-- A2
-- ---------------------------------------------------------------------------
create or replace function private.pin_roster_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
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
    if (new.full_name is distinct from old.full_name and char_length(new.full_name) > 160)
       or (new.phone is distinct from old.phone and char_length(new.phone) > 40)
       or (new.meta is distinct from old.meta and char_length(new.meta) > 200)
       or (new.target_roles is distinct from old.target_roles and char_length(new.target_roles) > 300) then
      raise exception 'That is too long.' using errcode = '23514';
    end if;
    -- One file directly in the student's own folder. Checking only the first segment let "own/../other/file" through,
    -- which a reviewer's browser resolves to another student's resume.
    if new.resume_path is distinct from old.resume_path and new.resume_path is not null
       and (new.resume_path !~ ('^' || old.id::text || '/[A-Za-z0-9_.-]+$') or new.resume_path ~ '\.\.') then
      raise exception 'A resume must be in your own folder.' using errcode = '42501';
    end if;
    if (new.cgpa, new.backlogs, new.class_x, new.class_xii) is distinct from (old.cgpa, old.backlogs, old.class_x, old.class_xii) then
      if old.academics_source <> 'default' then
        raise exception 'ACADEMICS_LOCKED: Your academics are locked once saved. Ask your placement cell to correct them.'
          using errcode = '42501';
      end if;
      -- Values the college uploaded stay; the student fills in only what is missing.
      select * into r from private.roster_academics(old.id);
      new.cgpa := coalesce(r.cgpa, new.cgpa);
      new.backlogs := coalesce(r.backlogs, new.backlogs);
      new.class_x := coalesce(r.class_x, new.class_x);
      new.class_xii := coalesce(r.class_xii, new.class_xii);
      new.academics_source := 'student';
    else
      new.academics_source := old.academics_source;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- A1: enforced for new and changed rows. Existing rows are not re-checked (NOT VALID), so this cannot fail on old data;
-- the runbook has the query that lists any old row breaking the rule before running VALIDATE CONSTRAINT.
-- ---------------------------------------------------------------------------
alter table public.credentials drop constraint if exists credentials_file_in_own_folder;
alter table public.credentials add constraint credentials_file_in_own_folder check (
  file_path is null
  or (file_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]+$' and file_path !~ '\.\.' and split_part(file_path, '/', 1) = user_id::text)
) not valid;

-- ---------------------------------------------------------------------------
-- B5
-- ---------------------------------------------------------------------------
create or replace function private.account_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = (select auth.uid()));
$$;
revoke all on function private.account_exists() from public, anon;
grant execute on function private.account_exists() to authenticated;

drop policy if exists "resumes own insert" on storage.objects;
create policy "resumes own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.account_exists()));
drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.account_exists()));

-- ---------------------------------------------------------------------------
-- D3
-- ---------------------------------------------------------------------------
create index if not exists org_students_user_id on public.org_students (user_id);
create index if not exists org_recruiters_user_id on public.org_recruiters (user_id);
create index if not exists jd_matches_job_id on public.jd_matches (job_id);
create index if not exists job_postings_created_by on public.job_postings (created_by);
create index if not exists user_roles_org_id on public.user_roles (org_id);
create index if not exists user_roles_granted_by on public.user_roles (granted_by);
create index if not exists organizations_created_by on public.organizations (created_by);
create index if not exists recommendation_feedback_user_id on public.recommendation_feedback (user_id);
create index if not exists platform_admin_emails_added_by on private.platform_admin_emails (added_by);

-- ---------------------------------------------------------------------------
-- E: more of what admins do lands in the audit log.
-- ---------------------------------------------------------------------------
drop trigger if exists audit_roster_added on public.org_students;
create trigger audit_roster_added after insert on public.org_students for each row execute function private.audit_change();
drop trigger if exists audit_orgs_lifecycle on public.organizations;
create trigger audit_orgs_lifecycle after insert or delete on public.organizations for each row execute function private.audit_change();

create or replace function private.audit_recruiter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor, org_id, action, target, detail)
  values ((select auth.uid()), coalesce(new.org_id, old.org_id), lower('org_recruiters.' || tg_op), coalesce(new.id, old.id)::text,
          jsonb_build_object('company', coalesce(new.company, old.company)));
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_recruiter() from public, anon, authenticated;
drop trigger if exists audit_recruiters on public.org_recruiters;
create trigger audit_recruiters after insert or delete or update of company, email on public.org_recruiters
  for each row execute function private.audit_recruiter();

commit;
