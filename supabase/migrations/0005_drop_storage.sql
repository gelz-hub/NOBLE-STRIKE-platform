-- NOBLE STRIKE — remove Supabase Storage policies from 0004_storage.sql
-- Image storage moved to Cloudinary; images are no longer stored in Supabase Storage.
-- Run this once, after 0001-0004 have already been applied.
--
-- Note: the buckets themselves (avatars, team-logos, team-banners,
-- tournament-banners, news-images) can't be dropped via raw SQL — Supabase
-- blocks direct deletes on storage tables. They're left empty and unused;
-- delete them manually via Dashboard -> Storage if you want them gone.

drop policy if exists "storage_public_read" on storage.objects;
drop policy if exists "storage_owner_insert" on storage.objects;
drop policy if exists "storage_owner_update" on storage.objects;
drop policy if exists "storage_owner_delete" on storage.objects;
drop policy if exists "storage_admin_insert" on storage.objects;
drop policy if exists "storage_admin_update" on storage.objects;
drop policy if exists "storage_admin_delete" on storage.objects;
