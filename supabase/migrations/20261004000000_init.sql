-- PlacementIQ initial schema
-- Every table is per-user and protected by RLS: a student can only see and change their own rows.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  meta text not null default 'CSE - 3rd Year',
  branch text not null default 'Computer Science & Engineering',
  batch text not null default '2027',
  college text not null default 'Institute of Engineering & Technology',
  cgpa numeric(4, 2) not null default 8.6 check (cgpa >= 0 and cgpa <= 10),
  backlogs integer not null default 0 check (backlogs >= 0),
  class_x numeric(5, 2) not null default 91 check (class_x >= 0 and class_x <= 100),
  class_xii numeric(5, 2) not null default 88 check (class_xii >= 0 and class_xii <= 100),
  avatar_url text,
  skills jsonb not null default '[
    {"name":"Data Structures & Algorithms","level":84},
    {"name":"System Design","level":62},
    {"name":"React / Frontend","level":88},
    {"name":"Node.js / Backend","level":79},
    {"name":"Databases (SQL + NoSQL)","level":74},
    {"name":"Machine Learning","level":58},
    {"name":"Cloud & DevOps","level":51},
    {"name":"Aptitude & Reasoning","level":81}
  ]'::jsonb,
  projects jsonb not null default '[
    "Real-time collaborative code editor (React, WebSocket, Redis)",
    "Campus placement analytics dashboard (Next.js, Postgres)",
    "ML-based resume ranking engine (Python, scikit-learn)"
  ]'::jsonb,
  internships jsonb not null default '[
    {"org":"Freshworks","role":"SDE Intern","period":"May 2025 - Jul 2025"},
    {"org":"Campus Startup Cell","role":"Full Stack Intern","period":"Dec 2024 - Feb 2025"}
  ]'::jsonb,
  notification_prefs jsonb not null default '{
    "Drive announcements": true,
    "Eligibility changes": true,
    "Alumni replies": false,
    "Weekly digest": true
  }'::jsonb,
  visibility text not null default 'college' check (visibility in ('college', 'recruiters', 'private')),
  resume_path text,
  resume_name text,
  resume_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- per-user activity tables
-- ---------------------------------------------------------------------------
create table if not exists public.saved_companies (
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table if not exists public.applications (
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id text not null,
  stage smallint not null default 0 check (stage between 0 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create table if not exists public.roadmap_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, item)
);

create table if not exists public.mock_bookings (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, slot_id)
);

create table if not exists public.cert_enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, cert_name)
);

create table if not exists public.practice_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  picked smallint not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists practice_attempts_user_idx on public.practice_attempts (user_id, created_at desc);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'bot')),
  text text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New user bootstrap: create the profile and a welcome set of notifications.
-- Lives in a private schema so it is not exposed through the Data API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  insert into public.notifications (user_id, text, link) values
    (new.id, 'Welcome to PlacementIQ! Complete your profile to sharpen your matches.', '/profile'),
    (new.id, 'Google SDE drive opens in 3 days', '/eligibility?company=google'),
    (new.id, 'Upload your resume to get an ATS score', '/resume'),
    (new.id, 'New mock interview slots are available', '/mock-interviews'),
    (new.id, 'Your 12-week learning roadmap is ready', '/roadmap');

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Data API grants + RLS
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.saved_companies, public.applications, public.roadmap_progress,
  public.mock_bookings, public.cert_enrollments, public.practice_attempts, public.chat_messages,
  public.notifications from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, delete on public.saved_companies to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, delete on public.roadmap_progress to authenticated;
grant select, insert, delete on public.mock_bookings to authenticated;
grant select, insert, delete on public.cert_enrollments to authenticated;
grant select, insert on public.practice_attempts to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
grant select, update, delete on public.notifications to authenticated;

alter table public.profiles enable row level security;
alter table public.saved_companies enable row level security;
alter table public.applications enable row level security;
alter table public.roadmap_progress enable row level security;
alter table public.mock_bookings enable row level security;
alter table public.cert_enrollments enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- profiles: keyed by id
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- generic owner policies for the user_id tables
do $$
declare
  t text;
begin
  foreach t in array array['saved_companies', 'applications', 'roadmap_progress', 'mock_bookings',
                           'cert_enrollments', 'practice_attempts', 'chat_messages', 'notifications']
  loop
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

-- Users must not be able to edit notification text, only mark read.
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- Users may advance their own application stage but not rewrite the key.
revoke update on public.applications from authenticated;
grant update (stage) on public.applications to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private resumes, public avatars. Files live under "<user id>/..."
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resumes', 'resumes', false, 5242880, array['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  b text;
begin
  foreach b in array array['resumes', 'avatars']
  loop
    execute format('drop policy if exists "%s own select" on storage.objects', b);
    execute format('create policy "%s own select" on storage.objects for select to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)', b, b);
    execute format('drop policy if exists "%s own insert" on storage.objects', b);
    execute format('create policy "%s own insert" on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)', b, b);
    execute format('drop policy if exists "%s own update" on storage.objects', b);
    execute format('create policy "%s own update" on storage.objects for update to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)', b, b, b);
    execute format('drop policy if exists "%s own delete" on storage.objects', b);
    execute format('create policy "%s own delete" on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)', b, b);
  end loop;
end;
$$;
