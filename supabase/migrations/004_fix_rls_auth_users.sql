-- Fix: invitations RLS policy was querying auth.users directly
-- PostgREST (authenticator role) does not have SELECT on auth.users
-- auth.email() is the correct way to get the session user's email

drop policy if exists "invitations select own email" on public.invitations;

create policy "invitations select own email"
  on public.invitations for select
  using (lower(email) = lower(coalesce(auth.email(), '')));
