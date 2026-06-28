-- Create the facility-logos storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facility-logos',
  'facility-logos',
  true,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload logos for facilities they belong to
create policy "Members can upload facility logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
      join public.memberships m on m.facility_id = f.id
      where m.user_id = auth.uid()
    )
  );

-- Allow members to update/overwrite their facility logos
create policy "Members can update facility logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
      join public.memberships m on m.facility_id = f.id
      where m.user_id = auth.uid()
    )
  );

-- Allow members to delete their facility logos
create policy "Members can delete facility logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
      join public.memberships m on m.facility_id = f.id
      where m.user_id = auth.uid()
    )
  );

-- Anyone can view logos (public bucket)
create policy "Anyone can view facility logos"
  on storage.objects for select
  to public
  using (bucket_id = 'facility-logos');
