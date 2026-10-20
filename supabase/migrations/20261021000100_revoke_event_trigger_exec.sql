-- rls_auto_enable is an event-trigger function (run by Postgres on DDL, never called by clients). It was listed in the
-- REST API because PUBLIC, anon and authenticated could EXECUTE it; revoking that changes nothing for the trigger.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- Notifications are created only by database triggers (new drive, status change). Students inserting their own could
-- fabricate an "offer" notification, so the client insert path is removed.
drop policy if exists "own rows insert" on public.notifications;
revoke insert on public.notifications from authenticated;
