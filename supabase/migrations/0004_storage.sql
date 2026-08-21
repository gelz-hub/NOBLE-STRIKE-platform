-- NOBLE STRIKE — Storage buckets & policies
-- Path convention for user-owned buckets: <bucket>/<user_id>/<file>

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('team-logos', 'team-logos', true),
  ('team-banners', 'team-banners', true),
  ('tournament-banners', 'tournament-banners', true),
  ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Public read on every bucket
create policy "storage_public_read" on storage.objects
  for select using (
    bucket_id in ('avatars', 'team-logos', 'team-banners', 'tournament-banners', 'news-images')
  );

-- Owner-scoped write on the three user-uploaded buckets
create policy "storage_owner_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'team-logos', 'team-banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_update" on storage.objects
  for update using (
    bucket_id in ('avatars', 'team-logos', 'team-banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'team-logos', 'team-banners')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin-scoped write on tournament banners & news images
create policy "storage_admin_insert" on storage.objects
  for insert with check (
    bucket_id in ('tournament-banners', 'news-images') and public.is_admin()
  );

create policy "storage_admin_update" on storage.objects
  for update using (
    bucket_id in ('tournament-banners', 'news-images') and public.is_admin()
  );

create policy "storage_admin_delete" on storage.objects
  for delete using (
    bucket_id in ('tournament-banners', 'news-images') and public.is_admin()
  );
