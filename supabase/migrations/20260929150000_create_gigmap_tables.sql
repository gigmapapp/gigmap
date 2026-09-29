-- Gig Map v1 tables and row level security.
-- Run 20260929140000_drop_legacy_empty_tables.sql first on the existing project.
-- That file removes the empty legacy profiles, gigs, and bookings tables so this
-- file can create public.gigs. On a fresh database the drop migration is a no-op.
--
-- This file does not touch the storage schema. The clips bucket is
-- 20260929155000_create_clips_bucket.sql, so a storage error cannot roll these
-- tables back. Do not add ALTER TABLE on storage.objects here: on hosted
-- Supabase that table is owned by supabase_storage_admin and RLS is already on.
--
-- Safe to re-run. Tables and indexes use IF NOT EXISTS. Policies are dropped
-- and recreated. Grants and RLS enablement are already idempotent.
--
-- Stub auth is an app cookie, not a Postgres user, so policies cannot key off auth.uid().
-- anon/authenticated may read performers, videos, and gigs.
-- They cannot read booking_requests. The server reads and writes every table with the
-- service role. 20260929160000_revoke_anon_table_writes.sql removes any direct write
-- grant or policy that this file, or default privileges, would otherwise leave behind.

create table if not exists public.performers (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  name text not null check (char_length(btrim(name)) > 0),
  category text not null check (category in ('solo', 'band', 'dj')),
  bio text not null default '',
  city text not null default 'Austin, TX',
  genres text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id text primary key check (char_length(id) > 0 and char_length(id) <= 80),
  performer_id text not null references public.performers (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  source_type text not null check (source_type in ('url', 'upload')),
  url text not null check (char_length(url) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.gigs (
  id text primary key check (char_length(id) > 0 and char_length(id) <= 80),
  performer_id text not null references public.performers (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text not null default '',
  category text not null check (category in ('solo', 'band', 'dj')),
  datetime timestamptz not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  label text not null check (char_length(btrim(label)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.booking_requests (
  id text primary key check (char_length(id) > 0 and char_length(id) <= 80),
  performer_id text not null references public.performers (id) on delete cascade,
  contact_name text not null check (char_length(btrim(contact_name)) > 0),
  contact_email text not null check (contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  event_details text not null check (char_length(btrim(event_details)) > 0),
  preferred_date text not null check (preferred_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  preferred_location text not null check (char_length(btrim(preferred_location)) > 0),
  message text not null default '',
  status text not null default 'pending' check (status = 'pending'),
  created_at timestamptz not null default now()
);

create index if not exists videos_performer_id_idx on public.videos (performer_id);
create index if not exists gigs_performer_id_idx on public.gigs (performer_id);
create index if not exists gigs_datetime_idx on public.gigs (datetime);
create index if not exists booking_requests_performer_id_idx on public.booking_requests (performer_id);

alter table public.performers enable row level security;
alter table public.videos enable row level security;
alter table public.gigs enable row level security;
alter table public.booking_requests enable row level security;

alter table public.performers force row level security;
alter table public.videos force row level security;
alter table public.gigs force row level security;
alter table public.booking_requests force row level security;

revoke all on table public.performers from public, anon, authenticated;
revoke all on table public.videos from public, anon, authenticated;
revoke all on table public.gigs from public, anon, authenticated;
revoke all on table public.booking_requests from public, anon, authenticated;

-- Read-only for the public Data API. No insert, update, or delete.
grant select on table public.performers to anon, authenticated;
grant select on table public.videos to anon, authenticated;
grant select on table public.gigs to anon, authenticated;

grant all on table public.performers to service_role;
grant all on table public.videos to service_role;
grant all on table public.gigs to service_role;
grant all on table public.booking_requests to service_role;

drop policy if exists performers_public_read on public.performers;
create policy performers_public_read
  on public.performers
  for select
  to anon, authenticated
  using (true);

drop policy if exists videos_public_read on public.videos;
create policy videos_public_read
  on public.videos
  for select
  to anon, authenticated
  using (true);

drop policy if exists gigs_public_read on public.gigs;
create policy gigs_public_read
  on public.gigs
  for select
  to anon, authenticated
  using (true);

comment on table public.booking_requests is
  'Private. anon and authenticated have no privileges. The service role reads and writes rows, and the app scopes reads to the stub-session performer.';
