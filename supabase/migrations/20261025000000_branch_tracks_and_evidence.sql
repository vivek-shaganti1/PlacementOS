-- Every BTech branch, measured on objective evidence. Safe to run more than once.
--
-- 1. profiles.tracks: the career tracks a student is preparing for (e.g. ECE: 'vlsi', 'software'). Up to three.
-- 2. coding_profiles also stores Credly badges, Hugging Face and CTFtime, fetched by /api/connect (server-written).
-- 3. credentials: NPTEL certificates (verified against nptel.ac.in by the server) and GATE scorecards (parsed from the
--    official PDF, then confirmed by the placement cell, because GATE has no public verification service).
--    Students read and delete their own rows; only the server inserts; only the placement cell reviews.

-- ---------------------------------------------------------------------------
-- 1. Tracks
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists tracks text[] not null default '{}' check (cardinality(tracks) <= 3);

-- ---------------------------------------------------------------------------
-- 2. More evidence platforms
-- ---------------------------------------------------------------------------
alter table public.coding_profiles drop constraint if exists coding_profiles_platform_check;
alter table public.coding_profiles add constraint coding_profiles_platform_check
  check (platform in ('github', 'leetcode', 'codeforces', 'codechef', 'credly', 'huggingface', 'ctftime'));

-- ---------------------------------------------------------------------------
-- 3. Credentials
-- ---------------------------------------------------------------------------
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('nptel', 'gate')),
  ref text not null check (char_length(ref) between 3 and 80),
  title text not null default '' check (char_length(title) <= 200),
  skill text not null default '' check (char_length(skill) <= 80),
  score numeric check (score is null or (score >= 0 and score <= 1000)),
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('verified', 'pending', 'rejected')),
  verified_by text check (verified_by is null or verified_by in ('platform', 'college')),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, kind, ref)
);
create index if not exists credentials_user_idx on public.credentials (user_id);

alter table public.credentials enable row level security;
revoke all on public.credentials from anon, authenticated;
grant select, delete on public.credentials to authenticated;

drop policy if exists "own rows select" on public.credentials;
create policy "own rows select" on public.credentials for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own rows delete" on public.credentials;
create policy "own rows delete" on public.credentials for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "admins read" on public.credentials;
create policy "admins read" on public.credentials for select to authenticated using ((select private.can_view_user(user_id)));

-- The placement cell confirms (or rejects) a GATE scorecard after opening the uploaded PDF.
create or replace function public.review_credential(target uuid, approve boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.credentials%rowtype;
  org uuid;
begin
  select * into c from public.credentials where id = target;
  if not found then
    raise exception 'Credential not found.' using errcode = 'P0002';
  end if;
  select p.org_id into org from public.profiles p where p.id = c.user_id;
  if not ((select private.is_super_admin()) or (org is not null and (select private.can_admin_org(org)))) then
    raise exception 'Only this student''s placement cell can review it.' using errcode = '42501';
  end if;
  if c.kind <> 'gate' then
    raise exception 'Only GATE scorecards need a review; certificates are verified automatically.' using errcode = '22023';
  end if;
  update public.credentials set
    status = case when approve then 'verified' else 'rejected' end,
    verified_by = case when approve then 'college' else null end,
    reviewed_at = now()
  where id = target;
  return case when approve then 'verified' else 'rejected' end;
end;
$$;
revoke all on function public.review_credential(uuid, boolean) from public, anon;
grant execute on function public.review_credential(uuid, boolean) to authenticated;
