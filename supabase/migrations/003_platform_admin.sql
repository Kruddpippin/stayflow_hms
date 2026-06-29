-- ============================================================
-- Platform admin role for StayFlow super-admin panel
-- ============================================================

-- 1. Add platform_role to profiles
do $$ begin
  create type public.platform_role as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'user';

-- 2. Helper function to check platform admin
create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and platform_role = 'admin'
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- 3. Allow platform admins to read ALL profiles
create policy "admin read all profiles"
  on public.profiles for select
  to authenticated
  using (is_platform_admin());

-- 4. Allow platform admins to read ALL organizations
create policy "admin read all orgs"
  on public.organizations for select
  to authenticated
  using (is_platform_admin());

-- 5. Allow platform admins to read ALL facilities
create policy "admin read all facilities"
  on public.facilities for select
  to authenticated
  using (is_platform_admin());

-- 6. Allow platform admins to update facilities (suspend/activate)
create policy "admin update all facilities"
  on public.facilities for update
  to authenticated
  using (is_platform_admin());

-- 7. Allow platform admins to read ALL memberships
create policy "admin read all memberships"
  on public.memberships for select
  to authenticated
  using (is_platform_admin());

-- 8. Allow platform admins to read ALL reservations
create policy "admin read all reservations"
  on public.reservations for select
  to authenticated
  using (is_platform_admin());

-- 9. Allow platform admins to read ALL rooms
create policy "admin read all rooms"
  on public.rooms for select
  to authenticated
  using (is_platform_admin());

-- 10. Allow platform admins to read ALL room_types
create policy "admin read all room_types"
  on public.room_types for select
  to authenticated
  using (is_platform_admin());

-- 11. Allow platform admins to update profiles (set platform_role)
create policy "admin update all profiles"
  on public.profiles for update
  to authenticated
  using (is_platform_admin());

-- Index for quick admin lookups
create index if not exists idx_profiles_platform_role
  on public.profiles(platform_role) where platform_role = 'admin';
