-- Follow-ups from the 2026-11-10 audit (testing/SECURITY_RISK_REGISTER.md). One transaction, safe to run more than once.
-- Apply after 20261105000000_security_remediation.sql.
--   W1-1  A college cannot add an address on another college's email domain as its own admin.
--   W1-2  Refusals no longer say which college an email belongs to.
--   W1-3  Confirming an invite never fails because another college later listed the same email; the disputed role is
--         simply not granted.
--   W1-4, W2-1  Clearing a roster link works (deleting a linked login, and unlinking unconfirmed accounts).
--   W3-7, W2-5  Several students may submit the same certificate; only one can have it confirmed.

begin;

-- ---------------------------------------------------------------------------
-- W1-1
-- ---------------------------------------------------------------------------
create or replace function private.belongs_elsewhere(em text, target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.org_students s where s.email = em and s.org_id <> target_org)
      or exists (select 1 from public.org_recruiters c where c.email = em and c.org_id <> target_org)
      or exists (select 1 from public.organizations o where o.id <> target_org and em = any (o.admin_emails))
      -- An address on another college's domain is that college's person, even before it has an account.
      or exists (
        select 1 from public.organizations o
        where o.id <> target_org and split_part(em, '@', 2) = any (select ltrim(lower(x), '@') from unnest(o.email_domains) x)
      )
      or exists (select 1 from private.platform_admin_emails p where p.email = em)
      or exists (
        select 1 from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.user_roles r on r.user_id = u.id
        where lower(u.email) = em and (p.org_id <> target_org or r.org_id <> target_org or r.role = 'super_admin')
      );
$$;
revoke all on function private.belongs_elsewhere(text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- W1-2, W1-3: one answer for every "belongs elsewhere", and the same rule from both sides
-- ---------------------------------------------------------------------------
create or replace function private.check_roster_domain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d text := split_part(lower(new.email), '@', 2);
  own text[];
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select array(select ltrim(lower(x), '@') from unnest(o.email_domains) x) into own from public.organizations o where o.id = new.org_id;
  if cardinality(own) > 0 and not d = any (own) then
    raise exception 'ROSTER_DOMAIN: % is not one of this college''s email domains.', d using errcode = '23514';
  end if;
  -- Another college's domain, recruiter or admin. The same words whichever it is, so the answer reveals nothing.
  if exists (select 1 from public.organizations o where o.id <> new.org_id and (lower(new.email) = any (o.admin_emails) or d = any (select ltrim(lower(x), '@') from unnest(o.email_domains) x)))
     or exists (select 1 from public.org_recruiters c where c.email = lower(new.email) and c.org_id <> new.org_id) then
    raise exception 'ROSTER_DOMAIN: This email cannot be added here.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_roster_domain() from public, anon, authenticated;

create or replace function private.sync_recruiter_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  d text;
  linking boolean := tg_op = 'UPDATE' and new.email is not distinct from old.email;
begin
  if tg_op = 'DELETE' then
    delete from public.user_roles r where r.role = 'recruiter' and r.org_id = old.org_id
      and (r.user_id = old.user_id or r.user_id = (select u.id from auth.users u where lower(u.email) = old.email));
    return old;
  end if;
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    delete from public.user_roles r where r.role = 'recruiter' and r.org_id = old.org_id
      and (r.user_id = old.user_id or r.user_id = (select u.id from auth.users u where lower(u.email) = old.email));
  end if;
  select id into uid from auth.users where lower(email) = new.email;
  -- The checks below apply when a college adds or changes a recruiter. When the same row is only being linked to its
  -- account (an invite being accepted), refusing would abort the sign-in itself, so the account is simply not linked.
  d := split_part(new.email, '@', 2);
  if exists (select 1 from public.org_students s where s.email = new.email and s.org_id <> new.org_id)
     or exists (select 1 from public.organizations o where o.id <> new.org_id and (new.email = any (o.admin_emails) or d = any (select ltrim(lower(x), '@') from unnest(o.email_domains) x)))
     or (uid is not null and (
       exists (select 1 from public.user_roles r where r.user_id = uid and r.role <> 'recruiter')
       or exists (select 1 from public.profiles p where p.id = uid and p.org_id is not null and p.org_id <> new.org_id))) then
    if linking then
      new.user_id := null;
      return new;
    end if;
    raise exception 'ROSTER_DOMAIN: This email cannot be added here.' using errcode = '23514';
  end if;
  new.user_id := null;
  if uid is not null and (private.mailbox_proven(uid, new.org_id)
      or exists (select 1 from public.user_roles r where r.user_id = uid and r.role = 'recruiter' and r.org_id = new.org_id)) then
    new.user_id := uid;
    insert into public.user_roles (user_id, role, org_id) values (uid, 'recruiter', new.org_id) on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_recruiter_role() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- W1-4, W2-1: a link is kept on re-import, but can be cleared
-- ---------------------------------------------------------------------------
create or replace function private.link_roster_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  -- The linked account always comes from the email. A changed email is a different person, so the old one loses access.
  if tg_op = 'UPDATE' and new.email is distinct from old.email and old.user_id is not null then
    update public.profiles set org_id = null where id = old.user_id and org_id = old.org_id;
  end if;
  -- A re-import of the same email keeps its link. Setting the link to null (a deleted login, or an unlink) is honoured.
  if tg_op = 'UPDATE' and new.email is not distinct from old.email and old.user_id is not null
     and new.user_id is not distinct from old.user_id then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.email is not distinct from old.email and old.user_id is not null and new.user_id is null then
    return new;
  end if;
  new.user_id := null;
  select id into uid from auth.users where lower(email) = new.email;
  if uid is not null and private.may_link(uid, new.org_id) then
    new.user_id := uid;
    -- Accounts with a role (placement cell, recruiter, platform admin) are never pulled into a college as students.
    update public.profiles set org_id = new.org_id,
      roll_number = case when new.roll_number <> '' then new.roll_number else roll_number end
    where id = uid and (org_id is null or org_id = new.org_id)
      and not exists (select 1 from public.user_roles x where x.user_id = uid);
  end if;
  return new;
end;
$$;
revoke all on function private.link_roster_entry() from public, anon, authenticated;

create or replace function private.attach_user_to_org(uid uuid, user_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  em text := lower(coalesce(user_email, ''));
  r public.org_students%rowtype;
  -- An account a college created can only ever receive access in that college.
  prov uuid := (select case when u.raw_app_meta_data ->> 'provisioned_org' ~ '^[0-9a-f-]{36}$' then (u.raw_app_meta_data ->> 'provisioned_org')::uuid end from auth.users u where u.id = uid);
begin
  if em = '' then
    return;
  end if;
  if prov is null and exists (select 1 from private.platform_admin_emails p where p.email = em) then
    insert into public.user_roles (user_id, role, org_id) values (uid, 'super_admin', null) on conflict do nothing;
    return;
  end if;
  insert into public.user_roles (user_id, role, org_id)
  select uid, 'org_admin', o.id from public.organizations o where em = any (o.admin_emails) and (prov is null or o.id = prov)
  on conflict do nothing;
  if exists (select 1 from public.user_roles x where x.user_id = uid and x.role = 'org_admin') then
    return;
  end if;
  if exists (select 1 from public.org_recruiters rc where rc.email = em and (prov is null or rc.org_id = prov)) then
    update public.org_recruiters set user_id = uid where email = em and (prov is null or org_id = prov);
    -- Only where the link held: sync_recruiter_role leaves a disputed row unlinked instead of failing the sign-in.
    insert into public.user_roles (user_id, role, org_id)
    select uid, 'recruiter', rc.org_id from public.org_recruiters rc where rc.email = em and rc.user_id = uid
    on conflict do nothing;
    return;
  end if;
  select * into r from public.org_students s where s.email = em and (prov is null or s.org_id = prov) order by s.created_at limit 1;
  if found then
    update public.profiles p set
      org_id = r.org_id,
      roll_number = coalesce(nullif(r.roll_number, ''), nullif(p.roll_number, '')),
      full_name = case when coalesce(r.full_name, '') <> '' then r.full_name else p.full_name end,
      branch = case when coalesce(r.branch, '') <> '' then r.branch else p.branch end,
      batch = case when coalesce(r.batch, '') <> '' then r.batch else p.batch end,
      section = coalesce(r.section, ''),
      program = coalesce(nullif(r.program, ''), 'B.Tech'),
      college = (select o.name from public.organizations o where o.id = r.org_id)
    where p.id = uid;
    update public.org_students set user_id = uid where id = r.id;
  end if;
end;
$$;

revoke all on function private.attach_user_to_org(uuid, text) from public, anon, authenticated;

-- What 20261105 meant to do and could not, until the trigger above.
update public.org_students s set user_id = null from auth.users u where u.id = s.user_id and u.email_confirmed_at is null;

-- ---------------------------------------------------------------------------
-- W3-7, W2-5: uniqueness only for confirmed certificates
-- ---------------------------------------------------------------------------
drop index if exists public.credentials_one_owner;
do $$
begin
  if not exists (select kind, ref from public.credentials where status = 'verified' group by kind, ref having count(*) > 1) then
    create unique index if not exists credentials_one_owner on public.credentials (kind, ref) where status = 'verified';
  else
    raise exception 'The same certificate is confirmed for several students. Reject the wrong ones, then run this migration again.';
  end if;
end;
$$;

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
  -- One certificate belongs to one student: a second student's claim cannot be confirmed (pending claims may coexist).
  if approve and exists (select 1 from public.credentials x where x.kind = c.kind and x.ref = c.ref and x.status = 'verified' and x.id <> c.id) then
    raise exception 'CREDENTIAL_TAKEN: This certificate is already confirmed for another student.' using errcode = '23505';
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

commit;
