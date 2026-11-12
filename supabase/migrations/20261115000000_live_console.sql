-- Live updates for the placement cell, recruiter and platform consoles. Safe to run more than once.
-- Apply after 20261113000000 (it does not depend on 20261114000000).
--
-- Adds the tables a console shows to the Realtime publication, so a change to one of their rows is pushed to the
-- browsers that are allowed to read that row. Row level security is checked for every message, per listener: a
-- college hears only about its own roster, drives, applications and certificates. Nothing else changes: no table,
-- policy or grant is altered. Pages treat a message as a hint to re-read through the normal API.
--
-- Where there is no Realtime (plain Postgres in tests) this does nothing.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication not found; skipping';
    return;
  end if;
  foreach t in array array['job_applications', 'job_postings', 'org_students', 'credentials'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
