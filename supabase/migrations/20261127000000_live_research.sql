-- Live company research, the Placement score's inputs, and two branch-name fixes. One transaction, safe to run twice.
-- Apply after 20261125000000_checklist_fixes.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Branch rule: the same patterns as src/data/engineering (scripts/branch-parity.mjs fails CI if they disagree).
--    Two fixes: "AI & Data Science" is now read as AIDS (it was DS), and "Electronics & Computer Engineering" as ECM
--    before CSE (it was CSE, because it also says "computer engineering"). Drive matching compares every code a name
--    matches, so only these two names gain a code.
-- ---------------------------------------------------------------------------
create or replace function private.branch_codes(s text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(array(select v.code from (values
    ('CSE-AIML', '\y(aiml|ai ?& ?ml|ai ?\/ ?ml|artificial intelligence( and| &)? machine learning)\y'),
    ('AIDS', '\y(ai ?& ?ds|aids|(ai|artificial intelligence)( and| &| ?& ?)? data science)\y'),
    ('DS', '\y(ds|data science)\y'),
    ('CSE-CS', '\y(cyber ?security|cse ?\(?cs\)?|cs ?& ?cs)\y'),
    ('CSE-IOT', '\y(cse ?\(?iot\)?|internet of things)\y'),
    ('CSBS', '\y(csbs|business systems)\y'),
    ('AI', '\y(artificial intelligence|ai)\y'),
    ('ECM', '\y(ecm|electronics( and| &)? computer)\y'),
    ('CSE', '\y(cse|computer science|cs|computer engineering)\y'),
    ('IT', '\y(it|information technology)\y'),
    ('VLSI', '\y(vlsi)\y'),
    ('EIN', '\y(electrical( and| &)? instrumentation)\y'),
    ('EIE', '\y(eie|e ?& ?i|electronics( and| &)? instrumentation|instrumentation)\y'),
    ('ETE', '\y(ete|extc|e ?& ?tc|telecommunication)\y'),
    ('ECE', '\y(ece|electronics( and| &)? communication)\y'),
    ('EEE', '\y(eee|electrical( and| &)? electronics)\y'),
    ('EE', '\y(ee|electrical)\y'),
    ('MECHATRONICS', '\y(mechatronics)\y'),
    ('ROBOTICS', '\y(robotics|automation)\y'),
    ('AUTO', '\y(automobile|automotive)\y'),
    ('AERO', '\y(aeronautical|aerospace|aero)\y'),
    ('PROD', '\y(production|industrial engineering|manufacturing)\y'),
    ('MARINE', '\y(marine|naval)\y'),
    ('MECH', '\y(mech|mechanical|me)\y'),
    ('CIVIL', '\y(civil|construction|environmental|transportation engineering)\y'),
    ('PETRO', '\y(petroleum|petrochemical)\y'),
    ('CHEM', '\y(chemical|polymer|food tech(nology)?)\y'),
    ('BIOTECH', '\y(biotech(nology)?|bio-?technology)\y'),
    ('BME', '\y(biomedical|bme)\y'),
    ('META', '\y(metallurg(y|ical)|materials)\y'),
    ('MINING', '\y(mining)\y'),
    ('TEXTILE', '\y(textile)\y'),
    ('AGRI', '\y(agricultur(e|al))\y')
    ) v(code, re) where s ~* v.re), '{}'::text[]),
    array[upper(trim(s))]
  );
$$;
revoke all on function private.branch_codes(text) from public, anon;
grant execute on function private.branch_codes(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Live company research. A student describes the companies or roles they want; a background worker
--    (/api/research-worker, woken every minute by pg_cron while there is work) finds companies, reads their official
--    pages and public job boards, and keeps only facts it can quote word for word from the page it read. Findings show at
--    once as "not verified yet"; a platform admin's approval makes them "verified" for everyone. Pages are never stored:
--    only the fact, a short quote and the link (docs/RESEARCH.md).
-- ---------------------------------------------------------------------------
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check check (kind in ('chat', 'resume', 'jd_match', 'research'));

create table if not exists public.research_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  query text not null check (char_length(btrim(query)) between 3 and 300),
  branch text not null default '' check (char_length(branch) <= 80),
  status text not null default 'queued' check (status in ('queued', 'working', 'done', 'failed')),
  stage text not null default 'queued' check (stage in ('queued', 'understanding', 'finding', 'reading', 'checking', 'done', 'failed')),
  progress smallint not null default 0 check (progress between 0 and 100),
  message text not null default '' check (char_length(message) <= 400),
  plan jsonb not null default '{}'::jsonb,
  attempts smallint not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists research_requests_user on public.research_requests (user_id, created_at desc);
create index if not exists research_requests_open on public.research_requests (created_at) where status in ('queued', 'working');

create table if not exists public.research_companies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.research_requests (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  website text not null default '' check (website = '' or website ~ '^https://'),
  ats text check (ats in ('greenhouse', 'lever', 'ashby')),
  ats_board text check (ats_board ~ '^[A-Za-z0-9._-]{1,80}$'),
  found_via text not null check (found_via in ('catalog', 'named', 'wikidata', 'adzuna', 'search')),
  state text not null default 'pending' check (state in ('pending', 'read', 'skipped')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists research_companies_request on public.research_companies (request_id);

create table if not exists public.research_findings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.research_requests (id) on delete cascade,
  company text not null check (char_length(company) between 1 and 160),
  kind text not null check (kind in ('role', 'eligibility', 'about', 'careers', 'salary', 'location', 'process')),
  field text not null default '' check (char_length(field) <= 60),
  value text not null check (char_length(value) between 1 and 300),
  quote text not null check (char_length(quote) between 3 and 320),
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 600),
  source_kind text not null check (source_kind in ('official', 'job_board', 'adzuna', 'wikidata')),
  fetched_at timestamptz not null default now(),
  review text not null default 'pending' check (review in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists research_findings_request on public.research_findings (request_id);
create index if not exists research_findings_company on public.research_findings (lower(company)) where review = 'approved';
create index if not exists research_findings_pending on public.research_findings (created_at) where review = 'pending';
create index if not exists research_findings_reviewer on public.research_findings (reviewed_by);

-- What was read, when, and whether robots.txt allowed it: an audit trail without keeping anyone's pages.
create table if not exists public.research_sources (
  url text primary key check (url ~ '^https://' and char_length(url) <= 600),
  host text not null,
  allowed boolean not null,
  status integer,
  content_hash text not null default '',
  fetched_at timestamptz not null default now()
);

alter table public.research_requests enable row level security;
alter table public.research_companies enable row level security;
alter table public.research_findings enable row level security;
alter table public.research_sources enable row level security;
revoke all on public.research_requests, public.research_companies, public.research_findings, public.research_sources from public, anon, authenticated;
grant select, insert on public.research_requests to authenticated;
grant select on public.research_companies to authenticated;
grant select, update on public.research_findings to authenticated;
grant select on public.research_sources to authenticated;

drop policy if exists "own requests" on public.research_requests;
create policy "own requests" on public.research_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
drop policy if exists "ask" on public.research_requests;
create policy "ask" on public.research_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'queued' and stage = 'queued' and progress = 0 and attempts = 0 and plan = '{}'::jsonb and message = '');
drop policy if exists "password change first" on public.research_requests;
create policy "password change first" on public.research_requests as restrictive for all to authenticated
  using (not (select private.password_pending())) with check (not (select private.password_pending()));

-- Every table: nothing works on a temporary password until the person chooses their own (SEC-03).
drop policy if exists "password change first" on public.research_companies;
create policy "password change first" on public.research_companies as restrictive for all to authenticated
  using (not (select private.password_pending())) with check (not (select private.password_pending()));
drop policy if exists "password change first" on public.research_findings;
create policy "password change first" on public.research_findings as restrictive for all to authenticated
  using (not (select private.password_pending())) with check (not (select private.password_pending()));
drop policy if exists "password change first" on public.research_sources;
create policy "password change first" on public.research_sources as restrictive for all to authenticated
  using (not (select private.password_pending())) with check (not (select private.password_pending()));

drop policy if exists "companies of own requests" on public.research_companies;
create policy "companies of own requests" on public.research_companies for select to authenticated
  using (exists (select 1 from public.research_requests r where r.id = request_id and (r.user_id = (select auth.uid()) or (select private.is_super_admin()))));

-- Approved findings are shared knowledge for every signed-in user; the rest only for whoever asked and platform admins.
drop policy if exists "findings" on public.research_findings;
create policy "findings" on public.research_findings for select to authenticated
  using (review = 'approved' or (select private.is_super_admin())
         or exists (select 1 from public.research_requests r where r.id = request_id and r.user_id = (select auth.uid())));
drop policy if exists "admins review" on public.research_findings;
create policy "admins review" on public.research_findings for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists "admins see sources" on public.research_sources;
create policy "admins see sources" on public.research_sources for select to authenticated using ((select private.is_super_admin()));

-- A review changes only the review: who and when are set here, and the fact itself cannot be edited.
create or replace function private.research_review_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if (new.request_id, new.company, new.kind, new.field, new.value, new.quote, new.source_url, new.source_kind, new.fetched_at)
       is distinct from (old.request_id, old.company, old.kind, old.field, old.value, old.quote, old.source_url, old.source_kind, old.fetched_at) then
      raise exception 'Only the review of a finding can change.' using errcode = '42501';
    end if;
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := case when new.review = 'pending' then null else now() end;
  end if;
  return new;
end;
$$;
revoke all on function private.research_review_stamp() from public, anon, authenticated;
drop trigger if exists research_review_stamp on public.research_findings;
create trigger research_review_stamp before update on public.research_findings for each row execute function private.research_review_stamp();

create or replace function private.audit_research_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.review is distinct from old.review then
    insert into public.audit_log (actor, org_id, action, target, detail)
    values ((select auth.uid()), null, 'research_finding.' || new.review, new.id::text,
            jsonb_build_object('company', new.company, 'kind', new.kind, 'field', new.field, 'source_url', new.source_url));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_research_review() from public, anon, authenticated;
drop trigger if exists audit_research_review on public.research_findings;
create trigger audit_research_review after update on public.research_findings for each row execute function private.audit_research_review();

-- Requests: the asker's college is recorded by the database; at most 3 an hour and 10 a day per person.
-- Runs with the asker's own rights (not security definer), so current_user is "authenticated" for a student and the
-- limits apply; the asker can read their own profile and requests, which is all it needs.
create or replace function private.research_request_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.org_id := (select p.org_id from public.profiles p where p.id = new.user_id);
  new.query := btrim(new.query);
  if current_user = 'authenticated' then
    perform pg_advisory_xact_lock(hashtextextended('research:' || new.user_id::text, 0));
    if (select count(*) from public.research_requests r where r.user_id = new.user_id and r.created_at > now() - interval '1 hour') >= 3 then
      raise exception 'RESEARCH_LIMIT: You can ask for 3 researches an hour. Try again later.' using errcode = 'P0001';
    end if;
    if (select count(*) from public.research_requests r where r.user_id = new.user_id and r.created_at > now() - interval '1 day') >= 10 then
      raise exception 'RESEARCH_LIMIT: You can ask for 10 researches a day. Try again tomorrow.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.research_request_guard() from public, anon, authenticated;
drop trigger if exists research_request_guard on public.research_requests;
create trigger research_request_guard before insert on public.research_requests for each row execute function private.research_request_guard();

-- The worker takes one request at a time, holding it for two and a half minutes (a run lasts at most about 90 seconds),
-- so two runs never work on the same one.
create or replace function public.research_claim()
returns setof public.research_requests language sql security definer set search_path = '' as $$
  update public.research_requests r
     set locked_until = now() + interval '150 seconds', status = 'working', attempts = r.attempts + 1, updated_at = now()
   where r.id = (
     select q.id from public.research_requests q
      where q.status in ('queued', 'working') and (q.locked_until is null or q.locked_until < now())
      order by q.created_at
      limit 1
      for update skip locked)
  returning r.*;
$$;
revoke all on function public.research_claim() from public, anon, authenticated;
grant execute on function public.research_claim() to service_role;

-- Live progress for the asker's page.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'research_requests') then
      alter publication supabase_realtime add table public.research_requests;
    end if;
  end if;
end;
$$;

-- Wake the worker every minute, only while a request is waiting. Needs pg_cron and pg_net, plus two Vault secrets set
-- once by the owner (docs/RESEARCH.md): research_worker_url and research_worker_secret.
do $$
begin
  create extension if not exists pg_net;
  create extension if not exists pg_cron;
  perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'piq-research';
  perform cron.schedule('piq-research', '* * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'research_worker_url'),
      body := '{}'::jsonb,
      headers := jsonb_build_object('content-type', 'application/json',
        'x-worker-key', (select decrypted_secret from vault.decrypted_secrets where name = 'research_worker_secret')),
      timeout_milliseconds := 100000)
    where exists (select 1 from public.research_requests where status in ('queued', 'working'))
      and exists (select 1 from vault.decrypted_secrets where name = 'research_worker_url');
  $job$);
exception when others then
  raise notice 'pg_cron or pg_net is not available here (%); run the research worker from another scheduler.', sqlerrm;
end;
$$;

commit;
