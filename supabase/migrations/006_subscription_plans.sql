-- ============================================================
-- Subscription plans — single source of truth for pricing/limits
-- Admin-editable; read by the billing page and enforcement hooks
-- ============================================================

create table if not exists public.subscription_plans (
  code              text primary key,
  name              text not null,
  description       text,
  monthly_price     numeric not null default 0,
  annual_price      numeric not null default 0,
  max_facilities    int,  -- null = unlimited
  max_rooms         int,  -- null = unlimited
  max_staff         int,  -- null = unlimited
  feature_online_payments boolean not null default false,
  feature_ota_sync        boolean not null default false,
  feature_advanced_reports boolean not null default false,
  feature_custom_branding  boolean not null default false,
  feature_guest_messaging  boolean not null default false,
  display_order     int not null default 0,
  highlight         boolean not null default false,
  is_active         boolean not null default true,
  updated_at        timestamptz default now()
);

alter table public.subscription_plans enable row level security;

create policy "anyone read active plans"
  on public.subscription_plans for select
  to authenticated, anon
  using (is_active = true);

create policy "admin manage plans"
  on public.subscription_plans for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

insert into public.subscription_plans
  (code, name, description, monthly_price, annual_price, max_facilities, max_rooms, max_staff,
   feature_online_payments, feature_ota_sync, feature_advanced_reports, feature_custom_branding, feature_guest_messaging,
   display_order, highlight)
values
  ('free', 'Free', 'Get started with the basics.', 0, 0, 1, 10, 3,
   false, false, false, false, false, 1, false),
  ('starter', 'Starter', 'For growing properties.', 15000, 150000, 3, 50, 10,
   true, false, false, false, true, 2, false),
  ('professional', 'Professional', 'For established hotel operations.', 35000, 350000, 10, 200, null,
   true, true, true, false, true, 3, true),
  ('enterprise', 'Enterprise', 'For large groups and chains.', 80000, 800000, null, null, null,
   true, true, true, true, true, 4, false)
on conflict (code) do nothing;

create index if not exists idx_subscription_plans_active on public.subscription_plans(is_active, display_order);
