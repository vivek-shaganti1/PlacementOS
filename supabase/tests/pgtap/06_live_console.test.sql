-- pgTAP: live updates (20261115000000_live_console.sql).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(2);

select is(
  (select array_agg(tablename::text order by tablename) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public'),
  array['credentials', 'job_applications', 'job_postings', 'org_students'],
  'exactly the console tables are published for live updates'
);
-- Realtime decides who hears a change by the same policies as a read, so every published table must have RLS on.
select is(
  (select count(*)::int from pg_publication_tables p join pg_class c on c.relname = p.tablename and c.relnamespace = 'public'::regnamespace
    where p.pubname = 'supabase_realtime' and p.schemaname = 'public' and not c.relrowsecurity),
  0, 'every published table has row level security on'
);

select * from finish();
rollback;
