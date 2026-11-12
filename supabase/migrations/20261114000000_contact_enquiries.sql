-- "Contact us" on the landing page. One transaction, safe to run more than once. Apply after 20261113000000.
--
-- Enquiries from colleges are stored here and read by platform admins in the console (/super/enquiries). Visitors are
-- signed out, so nothing is granted to them: the only way in is public.contact_submit, callable by the server
-- (service_role) alone, which rate-limits per network address and per email before it stores anything.

begin;

create table if not exists public.contact_enquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  college text not null check (char_length(college) between 2 and 160),
  email text not null check (char_length(email) between 5 and 200),
  phone text not null default '' check (char_length(phone) <= 30),
  topic text not null default '' check (char_length(topic) <= 60),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz
);
create index if not exists contact_enquiries_recent on public.contact_enquiries (created_at desc);
create index if not exists contact_enquiries_handled_by on public.contact_enquiries (handled_by);

alter table public.contact_enquiries enable row level security;
revoke all on public.contact_enquiries from public, anon, authenticated;
grant select on public.contact_enquiries to authenticated;
grant update (status, handled_by, handled_at) on public.contact_enquiries to authenticated;

drop policy if exists "platform admins read" on public.contact_enquiries;
create policy "platform admins read" on public.contact_enquiries for select to authenticated
  using ((select private.is_super_admin()));
drop policy if exists "platform admins mark handled" on public.contact_enquiries;
create policy "platform admins mark handled" on public.contact_enquiries for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()) and (handled_by is null or handled_by = (select auth.uid())));
drop policy if exists "password change first" on public.contact_enquiries;
create policy "password change first" on public.contact_enquiries as restrictive for all to authenticated
  using (not (select private.password_pending()));

-- Attempts are counted separately from stored enquiries, so refused ones count too.
create table if not exists private.contact_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null default '',
  at timestamptz not null default now()
);
create index if not exists contact_attempts_recent on private.contact_attempts (at);

create or replace function public.contact_submit(p_name text, p_college text, p_email text, p_phone text, p_topic text, p_message text, client_ip text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(trim(p_email));
  i text := coalesce(trim(client_ip), '');
begin
  -- Serialized, so parallel requests cannot all read a count below the limit.
  perform pg_advisory_xact_lock(hashtextextended('contact', 0));
  delete from private.contact_attempts where at < now() - interval '1 day';
  if (select count(*) from private.contact_attempts where email = e and at > now() - interval '1 day') >= 3
     or (i <> '' and (select count(*) from private.contact_attempts where ip = i and at > now() - interval '1 hour') >= 5)
     or (select count(*) from private.contact_attempts where at > now() - interval '1 hour') >= 60 then
    return 'limited';
  end if;
  insert into private.contact_attempts (email, ip) values (e, i);
  insert into public.contact_enquiries (name, college, email, phone, topic, message)
  values (trim(p_name), trim(p_college), e, coalesce(trim(p_phone), ''), coalesce(trim(p_topic), ''), trim(p_message));
  return 'ok';
end;
$$;
revoke all on function public.contact_submit(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.contact_submit(text, text, text, text, text, text, text) to service_role;

commit;
