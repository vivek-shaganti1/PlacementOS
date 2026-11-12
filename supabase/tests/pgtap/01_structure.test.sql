-- pgTAP: structural guarantees of the schema. Run with `supabase test db supabase/tests/pgtap` on a local stack.
-- Each check fails loudly if a later migration weakens one of these rules.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

select is(
  (select coalesce(string_agg(c.relname, ', ' order by c.relname), '')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  '',
  'every table in the public schema has row level security on'
);

select is(
  (select coalesce(string_agg(c.relname, ', '), '')
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce('security_invoker=true' = any (c.reloptions), false)),
  '',
  'no view in public bypasses row level security'
);

select is(
  (select coalesce(string_agg(p.proname, ', '), '')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')),
  '',
  'signed-out visitors cannot call any security definer function'
);

select is(
  (select coalesce(string_agg(p.proname, ', '), '')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private') and p.prosecdef
      and not coalesce(exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'), false)),
  '',
  'every security definer function pins its search_path'
);

select is(
  (select coalesce(string_agg(format('%s.%s', tablename, policyname), ', '), '')
     from pg_policies
    where schemaname = 'public' and cmd in ('UPDATE', 'ALL') and permissive = 'PERMISSIVE'
      and qual is not null and with_check is null and cmd = 'UPDATE'),
  '',
  'every permissive update policy also checks the new row'
);

select is(
  (select coalesce(string_agg(format('%s.%s', tablename, policyname), ', '), '')
     from pg_policies
    where schemaname = 'public' and roles @> array['anon']::name[] and cmd <> 'SELECT'),
  '',
  'no policy lets signed-out visitors write'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'signed-out visitors cannot read profiles at all'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'resume_text', 'update'),
  'extracted resume text can only be written by the server'
);

select ok(
  exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'auth_users_allowlist'),
  'sign-ups are checked against the roster and allowlists'
);

select * from finish();
rollback;
