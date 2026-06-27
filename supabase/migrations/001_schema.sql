-- ============================================================
-- StayFlow HMS — Full schema migration
-- ============================================================

-- 0. Drop old tables from v1 (if they exist)
drop table if exists public.invitations cascade;
drop table if exists public.payments cascade;
drop table if exists public.charges cascade;
drop table if exists public.folios cascade;
drop table if exists public.reservations cascade;
drop table if exists public.guests cascade;
drop table if exists public.rooms cascade;
drop table if exists public.room_types cascade;
drop table if exists public.property_members cascade;
drop table if exists public.properties cascade;
drop table if exists public.profiles cascade;

drop type if exists public.user_role cascade;

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

create type public.facility_type as enum (
  'hotel','motel','apartment','guesthouse','hostel','resort','bnb','other'
);
create type public.facility_status as enum ('setup','active','suspended');
create type public.membership_role as enum (
  'owner','manager','front_desk','housekeeping','maintenance','accountant'
);
create type public.membership_status as enum ('active','disabled');
create type public.invitation_status as enum ('pending','accepted','revoked','expired');
create type public.room_status as enum ('available','occupied','dirty','clean','out_of_order');
create type public.reservation_status as enum (
  'confirmed','checked_in','checked_out','cancelled','no_show'
);
create type public.reservation_source as enum ('direct','walk_in','ota','phone');
create type public.invoice_status as enum ('draft','issued','paid','void');
create type public.payment_method as enum ('cash','card','transfer','pos','other');
create type public.hk_task_type as enum ('cleaning','turnover','inspection');
create type public.task_status as enum ('pending','in_progress','done');
create type public.priority_level as enum ('low','medium','high','urgent');
create type public.order_status as enum ('open','in_progress','resolved');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- profiles
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz default now()
);

-- organizations
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- facilities
create table public.facilities (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  slug            text not null unique,
  type            public.facility_type not null default 'hotel',
  status          public.facility_status not null default 'setup',
  currency        text not null default 'NGN',
  timezone        text not null default 'Africa/Lagos',
  check_in_time   time default '14:00',
  check_out_time  time default '11:00',
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  country         text default 'Nigeria',
  phone           text,
  email           text,
  logo_url        text,
  description     text,
  created_at      timestamptz default now()
);

-- memberships
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.membership_role not null default 'front_desk',
  status      public.membership_status not null default 'active',
  created_at  timestamptz default now(),
  unique (facility_id, user_id)
);

-- invitations
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  email       text not null,
  role        public.membership_role not null default 'front_desk',
  token       uuid not null unique default gen_random_uuid(),
  status      public.invitation_status not null default 'pending',
  invited_by  uuid not null references public.profiles(id),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz default now()
);

-- room_types
create table public.room_types (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  name          text not null,
  description   text,
  base_rate     numeric not null default 0,
  max_occupancy int not null default 2,
  total_units   int not null default 0,
  created_at    timestamptz default now()
);

-- rooms
create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  name         text not null,
  floor        text,
  status       public.room_status not null default 'available',
  created_at   timestamptz default now()
);

-- rate_plans
create table public.rate_plans (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  name         text not null,
  price        numeric not null default 0,
  conditions   jsonb default '{}',
  created_at   timestamptz default now()
);

-- guests
create table public.guests (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  full_name   text not null,
  email       text,
  phone       text,
  id_document text,
  nationality text,
  notes       text,
  created_at  timestamptz default now()
);

-- reservations
create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  guest_id     uuid not null references public.guests(id) on delete cascade,
  room_type_id uuid not null references public.room_types(id),
  room_id      uuid references public.rooms(id),
  check_in     date not null,
  check_out    date not null,
  status       public.reservation_status not null default 'confirmed',
  source       public.reservation_source not null default 'direct',
  adults       int not null default 1,
  children     int not null default 0,
  total_amount numeric not null default 0,
  notes        text,
  created_at   timestamptz default now()
);

-- invoices
create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references public.facilities(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  number         text not null,
  status         public.invoice_status not null default 'draft',
  subtotal       numeric not null default 0,
  tax            numeric not null default 0,
  total          numeric not null default 0,
  currency       text not null default 'NGN',
  created_at     timestamptz default now()
);

-- invoice_items
create table public.invoice_items (
  id         uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  qty         int not null default 1,
  unit_price  numeric not null default 0,
  amount      numeric not null default 0,
  created_at  timestamptz default now()
);

-- payments
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric not null default 0,
  method      public.payment_method not null default 'cash',
  reference   text,
  received_by uuid references public.profiles(id),
  created_at  timestamptz default now()
);

-- housekeeping_tasks
create table public.housekeeping_tasks (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  type        public.hk_task_type not null default 'cleaning',
  status      public.task_status not null default 'pending',
  notes       text,
  due_date    date,
  created_at  timestamptz default now()
);

-- maintenance_orders
create table public.maintenance_orders (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  room_id     uuid references public.rooms(id),
  reported_by uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  priority    public.priority_level not null default 'medium',
  status      public.order_status not null default 'open',
  description text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- 3. AUTH TRIGGER — auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. RLS HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_member(f_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from memberships m
    where m.facility_id = f_id and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.has_role(f_id uuid, roles text[])
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from memberships m
    where m.facility_id = f_id and m.user_id = auth.uid()
      and m.status = 'active' and m.role::text = any(roles)
  );
$$;

-- Grant execute to all roles
grant execute on function public.is_member(uuid) to authenticated, anon, public;
grant execute on function public.has_role(uuid, text[]) to authenticated, anon, public;

-- ============================================================
-- 5. ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.facilities enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.room_types enable row level security;
alter table public.rooms enable row level security;
alter table public.rate_plans enable row level security;
alter table public.guests enable row level security;
alter table public.reservations enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.housekeeping_tasks enable row level security;
alter table public.maintenance_orders enable row level security;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- ---- profiles ----
create policy "profiles select own"  on public.profiles for select using (id = auth.uid());
create policy "profiles update own"  on public.profiles for update using (id = auth.uid());

-- ---- organizations ----
create policy "orgs select own"  on public.organizations for select using (owner_id = auth.uid());
create policy "orgs update own"  on public.organizations for update using (owner_id = auth.uid());
create policy "orgs insert own" on public.organizations for insert with check (owner_id = auth.uid());

-- ---- facilities ----
create policy "facilities select member" on public.facilities for select using (is_member(id));
create policy "facilities update mgr"    on public.facilities for update using (has_role(id, array['owner','manager']));
create policy "facilities delete owner"  on public.facilities for delete using (has_role(id, array['owner']));
create policy "facilities insert auth"   on public.facilities for insert with check (auth.uid() is not null);

-- ---- memberships ----
create policy "memberships select member" on public.memberships for select using (is_member(facility_id));
create policy "memberships insert mgr"    on public.memberships for insert with check (has_role(facility_id, array['owner','manager']));
create policy "memberships update mgr"    on public.memberships for update using (has_role(facility_id, array['owner','manager']));
create policy "memberships delete mgr"    on public.memberships for delete using (has_role(facility_id, array['owner','manager']));
-- Allow self-insert for newly created facilities
create policy "memberships self insert"   on public.memberships for insert with check (user_id = auth.uid());

-- ---- invitations ----
create policy "invitations select member" on public.invitations for select using (is_member(facility_id));
create policy "invitations insert mgr"    on public.invitations for insert with check (has_role(facility_id, array['owner','manager']));
create policy "invitations update mgr"    on public.invitations for update using (has_role(facility_id, array['owner','manager']));
create policy "invitations delete mgr"    on public.invitations for delete using (has_role(facility_id, array['owner','manager']));
-- Allow reading own invitations by email
create policy "invitations select own email" on public.invitations for select
  using (lower(email) = lower((select email from auth.users where id = auth.uid())));

-- ---- operational tables: standard CRUD ----
-- room_types
create policy "room_types select" on public.room_types for select using (is_member(facility_id));
create policy "room_types insert" on public.room_types for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "room_types update" on public.room_types for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "room_types delete" on public.room_types for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- rooms
create policy "rooms select" on public.rooms for select using (is_member(facility_id));
create policy "rooms insert" on public.rooms for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "rooms update" on public.rooms for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "rooms delete" on public.rooms for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- rate_plans
create policy "rate_plans select" on public.rate_plans for select using (is_member(facility_id));
create policy "rate_plans insert" on public.rate_plans for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "rate_plans update" on public.rate_plans for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "rate_plans delete" on public.rate_plans for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- guests
create policy "guests select" on public.guests for select using (is_member(facility_id));
create policy "guests insert" on public.guests for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "guests update" on public.guests for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "guests delete" on public.guests for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- reservations
create policy "reservations select" on public.reservations for select using (is_member(facility_id));
create policy "reservations insert" on public.reservations for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "reservations update" on public.reservations for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "reservations delete" on public.reservations for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- invoices
create policy "invoices select" on public.invoices for select using (is_member(facility_id));
create policy "invoices insert" on public.invoices for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "invoices update" on public.invoices for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "invoices delete" on public.invoices for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- invoice_items
create policy "invoice_items select" on public.invoice_items for select using (is_member(facility_id));
create policy "invoice_items insert" on public.invoice_items for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "invoice_items update" on public.invoice_items for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "invoice_items delete" on public.invoice_items for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- payments
create policy "payments select" on public.payments for select using (is_member(facility_id));
create policy "payments insert" on public.payments for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "payments update" on public.payments for update using (has_role(facility_id, array['owner','manager','front_desk']));
create policy "payments delete" on public.payments for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- housekeeping_tasks — also allow 'housekeeping' to update
create policy "hk_tasks select" on public.housekeeping_tasks for select using (is_member(facility_id));
create policy "hk_tasks insert" on public.housekeeping_tasks for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "hk_tasks update" on public.housekeeping_tasks for update using (has_role(facility_id, array['owner','manager','front_desk','housekeeping']));
create policy "hk_tasks delete" on public.housekeeping_tasks for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- maintenance_orders — also allow 'maintenance' to update
create policy "maint_orders select" on public.maintenance_orders for select using (is_member(facility_id));
create policy "maint_orders insert" on public.maintenance_orders for insert with check (has_role(facility_id, array['owner','manager','front_desk']));
create policy "maint_orders update" on public.maintenance_orders for update using (has_role(facility_id, array['owner','manager','front_desk','maintenance']));
create policy "maint_orders delete" on public.maintenance_orders for delete using (has_role(facility_id, array['owner','manager','front_desk']));

-- ============================================================
-- 7. INDEXES
-- ============================================================

create index idx_memberships_user    on public.memberships(user_id);
create index idx_memberships_facility on public.memberships(facility_id);
create index idx_invitations_token   on public.invitations(token);
create index idx_invitations_email   on public.invitations(email);
create index idx_rooms_facility      on public.rooms(facility_id);
create index idx_reservations_facility on public.reservations(facility_id);
create index idx_reservations_guest  on public.reservations(guest_id);
create index idx_invoices_reservation on public.invoices(reservation_id);
create index idx_hk_tasks_room      on public.housekeeping_tasks(room_id);
