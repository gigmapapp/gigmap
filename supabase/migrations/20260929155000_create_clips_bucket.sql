-- Public `clips` bucket and its storage.objects policies.
--
-- Kept separate from 20260929150000_create_gigmap_tables.sql. On hosted
-- Supabase, apply_migration runs as postgres and each migration is one
-- transaction. A failure in this file must not roll back the v1 tables.
--
-- Do not ALTER TABLE storage.objects (or any other storage-owned table).
-- storage.objects is owned by supabase_storage_admin. RLS is already enabled.
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY fails with
-- 42501: must be owner of table objects. The same applies to other ownership
-- changes (FORCE ROW LEVEL SECURITY, owner changes, grants that require
-- being the table owner).
--
-- What postgres can run today, per current Supabase docs:
--   https://supabase.com/docs/guides/storage/buckets/creating-buckets
--     insert into storage.buckets is the documented SQL for a new bucket.
--   https://supabase.com/docs/guides/storage/security/access-control
--     create policy on storage.objects is the documented SQL for access rules.
-- The SQL editor and apply_migration both use postgres. Creating policies
-- this way is the supported path; altering the table is not.
--
-- How to run:
--   1. Prefer this file, after the v1 table migration, via apply_migration
--      or by pasting it into the SQL editor.
--   2. If it fails (historically CREATE POLICY has also returned 42501 on
--      some projects), the tables from the previous migration stay. Create
--      the bucket in the dashboard instead:
--        Storage → New bucket
--        Name: clips
--        Public: on
--        File size limit: 10 MB
--        Allowed MIME types: video/mp4, video/webm, video/quicktime
--      Then add one policy on storage.objects (Storage → Policies, or the
--      SQL editor). Name clips_public_read, command SELECT, roles anon and
--      authenticated, USING (bucket_id = 'clips').
--   3. Do not add an INSERT policy for anon or authenticated. The browser
--      uploads with a signed URL minted by the service role.
--
-- clips_service_insert is intentionally absent. The service role bypasses
-- RLS, and the signed PUT checks the upload token and writes as superuser,
-- so an INSERT policy is not consulted. If createSignedUploadUrl later
-- fails an INSERT check, add this in the SQL editor (still no ALTER TABLE):
--
--   create policy clips_service_insert
--     on storage.objects
--     for insert
--     to service_role
--     with check (
--       bucket_id = 'clips'
--       and lower(storage.extension(name)) in ('mp4', 'webm', 'mov')
--     );
--
-- Idempotent: bucket upserts on id, policies are dropped before create.
-- `supabase db reset` applies this with the other migrations. Local Storage
-- already has RLS enabled on storage.objects, so this file does not enable it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clips',
  'clips',
  true,
  10485760,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No anon/authenticated insert. Drop draft names if a previous attempt created them.
drop policy if exists clips_anon_insert on storage.objects;
drop policy if exists clips_public_insert on storage.objects;
drop policy if exists clips_service_insert on storage.objects;

-- Public object URLs work because the bucket is public. This policy also lets
-- anon and authenticated read clip metadata for that bucket.
drop policy if exists clips_public_read on storage.objects;
create policy clips_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'clips');
