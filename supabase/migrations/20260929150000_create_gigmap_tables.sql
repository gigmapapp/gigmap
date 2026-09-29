-- Gig Map v1 tables, storage bucket, and row level security.
-- Run 20260929140000_drop_legacy_empty_tables.sql first on the existing project.
-- That file removes the empty legacy profiles, gigs, and bookings tables so this
-- file can create public.gigs. On a fresh database the drop migration is a no-op.
-- Do not edit applied history; add a new migration instead.
--
-- Stub auth is an app cookie, not a Postgres user, so policies cannot key off auth.uid().
-- anon/authenticated may read the public catalog and insert rows.
-- They cannot read booking_requests. The server reads that table with the service role
-- and only returns rows for the performer id in the stub session.

create table public.performers (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 80),
  name text not null check (char_length(btrim(name)) > 0),
  category text not null check (category in ('solo', 'band', 'dj')),
  bio text not null default '',
  city text not null default 'Austin, TX',
  genres text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.videos (
  id text primary key check (char_length(id) > 0 and char_length(id) <= 80),
  performer_id text not null references public.performers (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  source_type text not null check (source_type in ('url', 'upload')),
  url text not null check (char_length(url) > 0),
  created_at timestamptz not null default now()
);

create table public.gigs (
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

create table public.booking_requests (
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

create index videos_performer_id_idx on public.videos (performer_id);
create index gigs_performer_id_idx on public.gigs (performer_id);
create index gigs_datetime_idx on public.gigs (datetime);
create index booking_requests_performer_id_idx on public.booking_requests (performer_id);

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

grant select, insert on table public.performers to anon, authenticated;
grant select, insert on table public.videos to anon, authenticated;
grant select, insert on table public.gigs to anon, authenticated;
-- Inserts only. No select, update, or delete for the public Data API.
grant insert on table public.booking_requests to anon, authenticated;

grant all on table public.performers to service_role;
grant all on table public.videos to service_role;
grant all on table public.gigs to service_role;
grant all on table public.booking_requests to service_role;

create policy performers_public_read
  on public.performers
  for select
  to anon, authenticated
  using (true);

create policy performers_public_insert
  on public.performers
  for insert
  to anon, authenticated
  with check (true);

create policy videos_public_read
  on public.videos
  for select
  to anon, authenticated
  using (true);

create policy videos_public_insert
  on public.videos
  for insert
  to anon, authenticated
  with check (true);

create policy gigs_public_read
  on public.gigs
  for select
  to anon, authenticated
  using (true);

create policy gigs_public_insert
  on public.gigs
  for insert
  to anon, authenticated
  with check (true);

create policy booking_requests_public_insert
  on public.booking_requests
  for insert
  to anon, authenticated
  with check (true);

comment on table public.booking_requests is
  'Private. anon and authenticated have insert only. Inbox reads use the service role and are scoped in the app to the stub-session performer.';

-- Public clip bucket. 10 MB matches the in-app cap and stays clear of Vercel's request body limit
-- because the browser uploads with a signed URL instead of posting the file to Next.js.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clips',
  'clips',
  true,
  10485760,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

-- Public URLs work because the bucket is public. This policy also allows listing and
-- authenticated reads of clip metadata. Filenames are not secret.
create policy clips_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'clips');

-- Signed upload URLs are minted with the service role after the stub session check.
-- The browser PUT verifies that token and writes as superuser, so anon does not need INSERT.
-- Leaving anon without INSERT means the public key cannot upload on its own.
create policy clips_service_insert
  on storage.objects
  for insert
  to service_role
  with check (
    bucket_id = 'clips'
    and lower(storage.extension(name)) in ('mp4', 'webm', 'mov')
  );
