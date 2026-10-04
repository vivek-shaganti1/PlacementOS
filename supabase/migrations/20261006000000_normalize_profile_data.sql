-- Move per-student collections out of jsonb columns on profiles into proper tables,
-- add history tables for resume analyses / JD matches, and daily progress snapshots for analytics.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.user_skills (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null check (char_length(skill) between 1 and 80),
  level smallint not null default 0 check (level between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  tech text not null default '' check (char_length(tech) <= 300),
  description text not null default '' check (char_length(description) <= 1000),
  url text check (url is null or char_length(url) <= 500),
  source text not null default 'manual' check (source in ('manual', 'resume', 'github')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id, position);

create table if not exists public.internships (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  org text not null check (char_length(org) between 1 and 200),
  role text not null default '' check (char_length(role) <= 200),
  period text not null default '' check (char_length(period) <= 100),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists internships_user_idx on public.internships (user_id, position);

create table if not exists public.certifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 300),
  issuer text not null default '' check (char_length(issuer) <= 200),
  issued_on text not null default '' check (char_length(issued_on) <= 60),
  credential_url text check (credential_url is null or char_length(credential_url) <= 500),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists certifications_user_idx on public.certifications (user_id, position);

create table if not exists public.achievements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  detail text not null default '' check (char_length(detail) <= 1000),
  date_text text not null default '' check (char_length(date_text) <= 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists achievements_user_idx on public.achievements (user_id, position);

create table if not exists public.mock_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  interview_type text not null check (char_length(interview_type) between 1 and 80),
  score numeric(3, 1) not null check (score between 0 and 10),
  note text not null default '' check (char_length(note) <= 2000),
  taken_at timestamptz not null default now()
);
create index if not exists mock_feedback_user_idx on public.mock_feedback (user_id, taken_at desc);

create table if not exists public.coding_profiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('github', 'leetcode', 'codeforces', 'codechef')),
  username text not null check (char_length(username) between 1 and 60),
  solved integer,
  rating integer,
  max_rating integer,
  stats jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, platform)
);

create table if not exists public.github_repos (
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  language text,
  stars integer not null default 0,
  url text not null,
  topics text[] not null default '{}',
  pushed_at timestamptz,
  primary key (user_id, name)
);

create table if not exists public.resume_analyses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text,
  overall smallint not null check (overall between 0 and 100),
  summary text not null default '',
  checks jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  rewrites jsonb not null default '[]'::jsonb,
  extracted jsonb not null default '{}'::jsonb,
  skill_levels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists resume_analyses_user_idx on public.resume_analyses (user_id, created_at desc);

create table if not exists public.jd_matches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  jd_title text not null default '',
  jd_text text not null check (char_length(jd_text) <= 20000),
  score smallint not null check (score between 0 and 100),
  verdict text not null default '',
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  missing_keywords text[] not null default '{}',
  suggestions text[] not null default '{}',
  tailored_bullets text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists jd_matches_user_idx on public.jd_matches (user_id, created_at desc);

create table if not exists public.progress_snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  readiness smallint not null default 0,
  eligible smallint not null default 0,
  nearly smallint not null default 0,
  can_become smallint not null default 0,
  not_eligible smallint not null default 0,
  avg_skill smallint not null default 0,
  problems_solved integer not null default 0,
  resume_score smallint,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Copy existing jsonb data into the tables (idempotent: only for users with no rows yet)
-- ---------------------------------------------------------------------------
insert into public.user_skills (user_id, skill, level)
select p.id, s ->> 'name', least(100, greatest(0, coalesce((s ->> 'level')::int, 0)))
from public.profiles p, jsonb_array_elements(p.skills) s
where s ->> 'name' is not null
on conflict do nothing;

insert into public.projects (user_id, title, tech, position)
select p.id,
       trim(regexp_replace(e.v #>> '{}', '\s*\((.*)\)\s*$', '')),
       coalesce(substring(e.v #>> '{}' from '\(([^()]*)\)\s*$'), ''),
       (e.ord - 1)::int
from public.profiles p, jsonb_array_elements(p.projects) with ordinality e(v, ord)
where jsonb_typeof(e.v) = 'string'
  and not exists (select 1 from public.projects x where x.user_id = p.id);

insert into public.internships (user_id, org, role, period, position)
select p.id, e.v ->> 'org', coalesce(e.v ->> 'role', ''), coalesce(e.v ->> 'period', ''), (e.ord - 1)::int
from public.profiles p, jsonb_array_elements(p.internships) with ordinality e(v, ord)
where e.v ->> 'org' is not null
  and not exists (select 1 from public.internships x where x.user_id = p.id);

insert into public.certifications (user_id, name, issuer, issued_on, credential_url, position)
select p.id, e.v ->> 'name', coalesce(e.v ->> 'issuer', ''), coalesce(e.v ->> 'date', ''), e.v ->> 'credential_url', (e.ord - 1)::int
from public.profiles p, jsonb_array_elements(p.certifications) with ordinality e(v, ord)
where e.v ->> 'name' is not null
  and not exists (select 1 from public.certifications x where x.user_id = p.id);

insert into public.achievements (user_id, title, detail, date_text, position)
select p.id, e.v ->> 'title', coalesce(e.v ->> 'detail', ''), coalesce(e.v ->> 'date', ''), (e.ord - 1)::int
from public.profiles p, jsonb_array_elements(p.achievements) with ordinality e(v, ord)
where e.v ->> 'title' is not null
  and not exists (select 1 from public.achievements x where x.user_id = p.id);

insert into public.mock_feedback (user_id, interview_type, score, note, taken_at)
select p.id, e.v ->> 'type', (e.v ->> 'score')::numeric, coalesce(e.v ->> 'note', ''), coalesce((e.v ->> 'date')::timestamptz, now())
from public.profiles p, jsonb_array_elements(p.mock_feedback) e(v)
where e.v ->> 'type' is not null
  and not exists (select 1 from public.mock_feedback x where x.user_id = p.id);

insert into public.coding_profiles (user_id, platform, username, solved, rating, max_rating, stats, synced_at)
select p.id, k.key, k.value ->> 'username',
       coalesce((k.value ->> 'solved')::int, (k.value ->> 'original_repos')::int),
       coalesce((k.value ->> 'rating')::int, (k.value ->> 'contest_rating')::int),
       (k.value ->> 'max_rating')::int,
       k.value - 'top_repos',
       coalesce((k.value ->> 'synced_at')::timestamptz, now())
from public.profiles p, jsonb_each(p.integrations) k
where k.key in ('github', 'leetcode', 'codeforces', 'codechef') and k.value ->> 'username' is not null
on conflict do nothing;

insert into public.github_repos (user_id, name, description, language, stars, url, topics, pushed_at)
select p.id, r ->> 'name', r ->> 'description', r ->> 'language', coalesce((r ->> 'stars')::int, 0), r ->> 'url',
       coalesce(array(select jsonb_array_elements_text(r -> 'topics')), '{}'), (r ->> 'updated_at')::timestamptz
from public.profiles p, jsonb_array_elements(coalesce(p.integrations #> '{github,top_repos}', '[]'::jsonb)) r
on conflict do nothing;

insert into public.resume_analyses (user_id, file_name, overall, summary, checks, stats, strengths, improvements, rewrites, extracted, skill_levels, created_at)
select p.id, a ->> 'file_name', (a ->> 'overall')::smallint, coalesce(a ->> 'summary', ''), coalesce(a -> 'checks', '[]'), coalesce(a -> 'stats', '{}'),
       coalesce(array(select jsonb_array_elements_text(a -> 'strengths')), '{}'),
       coalesce(array(select jsonb_array_elements_text(a -> 'improvements')), '{}'),
       coalesce(a -> 'rewrites', '[]'), coalesce(a -> 'extracted', '{}'), coalesce(a -> 'skill_levels', '{}'),
       coalesce((a ->> 'analyzed_at')::timestamptz, now())
from public.profiles p, lateral (select p.resume_analysis a) x
where p.resume_analysis is not null
  and not exists (select 1 from public.resume_analyses r where r.user_id = p.id);

-- The jsonb columns stay readable for the previous app version until it is redeployed;
-- the current app reads and writes only the tables above.
comment on column public.profiles.skills is 'DEPRECATED: use public.user_skills';
comment on column public.profiles.projects is 'DEPRECATED: use public.projects';
comment on column public.profiles.internships is 'DEPRECATED: use public.internships';
comment on column public.profiles.certifications is 'DEPRECATED: use public.certifications';
comment on column public.profiles.achievements is 'DEPRECATED: use public.achievements';
comment on column public.profiles.mock_feedback is 'DEPRECATED: use public.mock_feedback';
comment on column public.profiles.integrations is 'DEPRECATED: use public.coding_profiles / public.github_repos';
comment on column public.profiles.resume_analysis is 'DEPRECATED: use public.resume_analyses';
comment on column public.profiles.jd_match is 'DEPRECATED: use public.jd_matches';

-- ---------------------------------------------------------------------------
-- Grants + RLS (owner-only on every table)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['user_skills', 'projects', 'internships', 'certifications', 'achievements', 'mock_feedback',
                           'coding_profiles', 'github_repos', 'resume_analyses', 'jd_matches', 'progress_snapshots']
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows select" on public.%I', t);
    execute format('create policy "own rows select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "own rows insert" on public.%I', t);
    execute format('create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "own rows update" on public.%I', t);
    execute format('create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('drop policy if exists "own rows delete" on public.%I', t);
    execute format('create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- replace_rows: atomically replace one of the caller's ordered collections.
-- SECURITY INVOKER, so RLS still applies; every row is written for auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.replace_rows(target text, items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 200 then
    raise exception 'items must be an array of at most 200 entries' using errcode = '22023';
  end if;

  case target
    when 'projects' then
      delete from public.projects where user_id = uid;
      insert into public.projects (user_id, title, tech, description, url, source, position)
      select uid, e.v ->> 'title', coalesce(e.v ->> 'tech', ''), coalesce(e.v ->> 'description', ''), nullif(e.v ->> 'url', ''),
             coalesce(e.v ->> 'source', 'manual'), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'internships' then
      delete from public.internships where user_id = uid;
      insert into public.internships (user_id, org, role, period, position)
      select uid, e.v ->> 'org', coalesce(e.v ->> 'role', ''), coalesce(e.v ->> 'period', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'certifications' then
      delete from public.certifications where user_id = uid;
      insert into public.certifications (user_id, name, issuer, issued_on, credential_url, position)
      select uid, e.v ->> 'name', coalesce(e.v ->> 'issuer', ''), coalesce(e.v ->> 'date', ''), nullif(e.v ->> 'credential_url', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'achievements' then
      delete from public.achievements where user_id = uid;
      insert into public.achievements (user_id, title, detail, date_text, position)
      select uid, e.v ->> 'title', coalesce(e.v ->> 'detail', ''), coalesce(e.v ->> 'date', ''), (e.ord - 1)::int
      from jsonb_array_elements(items) with ordinality e(v, ord);
    when 'mock_feedback' then
      delete from public.mock_feedback where user_id = uid;
      insert into public.mock_feedback (user_id, interview_type, score, note, taken_at)
      select uid, e.v ->> 'type', (e.v ->> 'score')::numeric, coalesce(e.v ->> 'note', ''), coalesce((e.v ->> 'date')::timestamptz, now())
      from jsonb_array_elements(items) e(v);
    when 'skills' then
      insert into public.user_skills (user_id, skill, level, updated_at)
      select uid, e.v ->> 'name', least(100, greatest(0, (e.v ->> 'level')::int)), now()
      from jsonb_array_elements(items) e(v)
      on conflict (user_id, skill) do update set level = excluded.level, updated_at = now();
    else
      raise exception 'unknown collection %', target using errcode = '22023';
  end case;
end;
$$;

revoke all on function public.replace_rows(text, jsonb) from public, anon;
grant execute on function public.replace_rows(text, jsonb) to authenticated;
