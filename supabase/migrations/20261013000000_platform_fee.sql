-- Pricing model: a yearly platform fee per college on top of per-student seats, and plan AI caps
-- matching src/lib/pricing.ts (trial 15, basic 40, pro 80, enterprise 150 AI actions per student per month).
alter table public.organizations
  add column if not exists platform_fee numeric(12, 2) not null default 0 check (platform_fee >= 0);

create or replace function private.plan_ai_limit(target_org uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(o.ai_monthly_limit,
    case o.plan when 'trial' then 15 when 'basic' then 40 when 'pro' then 80 else 150 end)
  from public.organizations o where o.id = target_org;
$$;
revoke all on function private.plan_ai_limit(uuid) from public, anon, authenticated;
