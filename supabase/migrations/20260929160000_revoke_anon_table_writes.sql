-- Block direct anon/authenticated/public writes on the v1 tables.
--
-- performers, videos, and gigs stay publicly readable. booking_requests stays
-- unreadable. Inserts, updates, and deletes go through the server with the
-- service role (lib/repo/supabase.ts and scripts/seed-supabase.ts). The browser
-- anon key is only used to PUT a clip to a signed upload URL.
--
-- This drops write policies (insert, update, delete, and FOR ALL) on those four
-- tables and revokes the matching privileges. It is safe to run after
-- 20260929150000_create_gigmap_tables.sql, including when that file never
-- created write policies. Select policies are left in place.
--
-- This file does not touch storage.objects. Bucket setup and any clip policies
-- are 20260929155000_create_clips_bucket.sql. DROP POLICY on storage.objects
-- needs the same rights as CREATE POLICY, so it stays in that file.

do $$
declare
  pol record;
begin
  for pol in
    select n.nspname as schema_name, c.relname as table_name, p.polname as policy_name
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('performers', 'videos', 'gigs', 'booking_requests')
      and p.polcmd in ('a', 'w', 'd', '*')
  loop
    execute format(
      'drop policy %I on %I.%I',
      pol.policy_name,
      pol.schema_name,
      pol.table_name
    );
  end loop;
end $$;

revoke all on table public.performers from public, anon, authenticated;
revoke all on table public.videos from public, anon, authenticated;
revoke all on table public.gigs from public, anon, authenticated;
revoke all on table public.booking_requests from public, anon, authenticated;

grant select on table public.performers to anon, authenticated;
grant select on table public.videos to anon, authenticated;
grant select on table public.gigs to anon, authenticated;

-- Named policies from earlier drafts of the create migration, if they were applied.
drop policy if exists performers_public_insert on public.performers;
drop policy if exists videos_public_insert on public.videos;
drop policy if exists gigs_public_insert on public.gigs;
drop policy if exists booking_requests_public_insert on public.booking_requests;
