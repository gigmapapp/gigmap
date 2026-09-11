-- GigMap hire flow: artist categories + booking request/accept/decline
-- Apply in the Supabase SQL editor or via `supabase db push`.
-- Safe to re-run (idempotent).

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  bio text,
  genres text,
  is_musician boolean not null default false,
  artist_category text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  add column if not exists genres text;

alter table public.profiles
  add column if not exists is_musician boolean not null default false;

alter table public.profiles
  add column if not exists artist_category text;

alter table public.profiles
  drop constraint if exists profiles_artist_category_check;

alter table public.profiles
  add constraint profiles_artist_category_check
  check (artist_category is null or artist_category in ('solo', 'band', 'dj'));

-- Anyone with a hire category is treated as a musician.
update public.profiles
set is_musician = true
where artist_category is not null
  and is_musician is distinct from true;

create index if not exists profiles_artist_category_idx
  on public.profiles (artist_category);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  musician_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  event_type text,
  event_date date,
  location text,
  message text,
  budget text,
  created_at timestamptz not null default now(),
  constraint bookings_not_self check (requester_id <> musician_id)
);

alter table public.bookings
  add column if not exists requester_id uuid;

alter table public.bookings
  add column if not exists musician_id uuid;

alter table public.bookings
  add column if not exists status text;

alter table public.bookings
  add column if not exists event_type text;

alter table public.bookings
  add column if not exists event_date date;

alter table public.bookings
  add column if not exists location text;

alter table public.bookings
  add column if not exists message text;

alter table public.bookings
  add column if not exists budget text;

alter table public.bookings
  add column if not exists created_at timestamptz default now();

update public.bookings
set status = 'pending'
where status is null or status = '';

alter table public.bookings
  alter column status set default 'pending';

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'accepted', 'declined'));

create index if not exists bookings_requester_id_idx on public.bookings (requester_id);
create index if not exists bookings_musician_id_idx on public.bookings (musician_id);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

drop policy if exists gigmap_profiles_select_public on public.profiles;
create policy gigmap_profiles_select_public
  on public.profiles
  for select
  using (true);

drop policy if exists gigmap_profiles_insert_own on public.profiles;
create policy gigmap_profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists gigmap_profiles_update_own on public.profiles;
create policy gigmap_profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists gigmap_bookings_select_participants on public.bookings;
create policy gigmap_bookings_select_participants
  on public.bookings
  for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = musician_id);

drop policy if exists gigmap_bookings_insert_requester on public.bookings;
create policy gigmap_bookings_insert_requester
  on public.bookings
  for insert
  to authenticated
  with check (
    auth.uid() = requester_id
    and requester_id <> musician_id
  );

-- Musicians accept or decline incoming requests (app only updates status).
drop policy if exists gigmap_bookings_update_musician on public.bookings;
create policy gigmap_bookings_update_musician
  on public.bookings
  for update
  to authenticated
  using (auth.uid() = musician_id)
  with check (auth.uid() = musician_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;
