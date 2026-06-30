-- ============================================================
-- Facility subscriptions + admin action functions
-- ============================================================

-- 1. Subscriptions table
create table if not exists public.facility_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade unique,
  plan              text not null default 'free'
                    check (plan in ('free','starter','professional','enterprise')),
  status            text not null default 'active'
                    check (status in ('active','cancelled','expired','suspended')),
  billing_interval  text default 'monthly'
                    check (billing_interval in ('monthly','annual')),
  amount            numeric not null default 0,
  start_date        date not null default current_date,
  end_date          date,
  notes             text,
  suspended_reason  text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.facility_subscriptions enable row level security;

create policy "admin manage subscriptions"
  on public.facility_subscriptions for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

create index if not exists idx_facility_subscriptions_facility
  on public.facility_subscriptions(facility_id);

create index if not exists idx_facility_subscriptions_end_date
  on public.facility_subscriptions(end_date) where end_date is not null;

-- 2. Auto-suspend expired facilities
create or replace function public.admin_suspend_expired_facilities()
returns int language plpgsql security definer set search_path = 'public' as $$
declare
  cnt int;
begin
  if not is_platform_admin() then
    raise exception 'Access denied';
  end if;

  with expired as (
    update facility_subscriptions
    set status = 'expired', updated_at = now()
    where end_date < current_date
      and status = 'active'
      and plan != 'free'
    returning facility_id
  )
  update facilities
  set status = 'suspended'
  where id in (select facility_id from expired)
    and status = 'active';

  get diagnostics cnt = row_count;
  return cnt;
end;
$$;

grant execute on function public.admin_suspend_expired_facilities() to authenticated;

-- 3. Admin delete facility
create or replace function public.admin_delete_facility(p_facility_id uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
begin
  if not is_platform_admin() then
    raise exception 'Access denied';
  end if;
  delete from facilities where id = p_facility_id;
end;
$$;

grant execute on function public.admin_delete_facility(uuid) to authenticated;

-- 4. Admin delete user data (cascades profile → orgs → facilities → memberships)
create or replace function public.admin_delete_user_data(p_user_id uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
begin
  if not is_platform_admin() then
    raise exception 'Access denied';
  end if;
  delete from profiles where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user_data(uuid) to authenticated;
