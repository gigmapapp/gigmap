-- Replace the Austin sample with the Mystic public listings.
-- Apply after 20260930182000_gigs_public_listing.sql so source_url and
-- source_kind exist, and after 20260930181000_gigs_timezone_not_null.sql.
--
-- Apply PR #10 (20260930120600_performer_auth_ownership.sql) before this file
-- when that migration is in use. The claim guard below reads performers.user_id
-- only when the column exists. If this file runs first, nobody can have claimed
-- a profile yet, and PR #10 later adds user_id NULL.
--
-- Never re-run 20260929160000_revoke_anon_table_writes.sql after the PR #10
-- ownership migration. That revoke drops the owner write policies.
--
-- Deletes only the performer, video, and gig ids listed below, plus the live
-- Milestone gig 1139b90f-1953-4ace-bc83-5296df2a2f5d (performer bassline-society, Connecticut).
-- Aborts, and deletes nothing, when:
--   * one of those performers has a non-null user_id (claimed)
--   * booking_requests reference one of them (requests are not deleted;
--     the table is empty today, and a request is not sample data)
--   * a video or gig for one of them is outside the id lists (owner-created;
--     deleting the performer would cascade it)
-- Dependent rows are deleted in FK order: videos, gigs, then performers.
-- Does not touch storage.objects. Clips are scripts/remove-austin-clips.ts.
--
-- Then upserts the 8 listings. ON CONFLICT updates public fields and does not
-- set user_id, so a later claim survives a re-run. CSV notes are not stored.
-- No videos rows are inserted. Safe to re-run.
-- Generated from lib/seed/fixtures/mystic-seed-final.csv.
-- Re-render with: npx tsx scripts/render-seed-sql.ts

do $$
declare
  performer_ids text[] := array['maya-chen', 'broken-strings', 'dj-nova', 'elijah-brooks', 'velvet-static', 'luna-park', 'nightbirds', 'harper-quinn', 'bassline-society', 'copper-notes']::text[];
  video_ids text[] := array['maya-v1', 'maya-v2', 'maya-v3', 'broken-v1', 'broken-v2', 'nova-v1', 'nova-v2', 'elijah-v1', 'velvet-v1', 'velvet-v2', 'luna-v1', 'rio-v1', 'rio-v2', 'harper-v1', 'harper-v2', 'bass-v1', 'copper-v1', 'copper-v2']::text[];
  gig_ids text[] := array['gig-antones-maya', 'gig-stubbs-rio', 'gig-mohawk-velvet', 'gig-empire-nova', 'gig-continental-broken', 'gig-cboy-elijah', 'gig-saxon-harper', 'gig-whitehorse-copper', 'gig-parish-bassline', 'gig-hotelvegas-maya', 'gig-cheerup-luna', 'gig-acl-velvet', '1139b90f-1953-4ace-bc83-5296df2a2f5d']::text[];
  claimed integer;
  bookings integer;
  extra_videos integer;
  extra_gigs integer;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'performers'
      and column_name = 'user_id'
  ) then
    execute
      'select count(*) from public.performers where id = any ($1) and user_id is not null'
      into claimed
      using performer_ids;
    if claimed > 0 then
      raise exception 'Refusing to delete Austin seed performers that have been claimed (non-null user_id). Nothing was deleted.';
    end if;
  end if;

  select count(*) into bookings
  from public.booking_requests
  where performer_id = any (performer_ids);
  if bookings > 0 then
    raise exception 'Refusing to delete Austin seed performers that have booking_requests. Those requests were not deleted. Nothing was deleted.';
  end if;

  select count(*) into extra_videos
  from public.videos
  where performer_id = any (performer_ids)
    and id <> all (video_ids);
  if extra_videos > 0 then
    raise exception 'Refusing to delete Austin seed performers that have videos outside the seed id list. Nothing was deleted.';
  end if;

  select count(*) into extra_gigs
  from public.gigs
  where performer_id = any (performer_ids)
    and id <> all (gig_ids);
  if extra_gigs > 0 then
    raise exception 'Refusing to delete Austin seed performers that have gigs outside the seed id list. Nothing was deleted.';
  end if;

  delete from public.videos where id = any (video_ids);
  delete from public.gigs where id = any (gig_ids);
  delete from public.performers where id = any (performer_ids);
end
$$;

insert into public.performers (id, name, category, bio, city, genres, created_at)
values
  ('a-j-croce', 'A.J. Croce', 'solo', 'Performs ''Croce Plays Croce'', his father Jim Croce''s songs alongside his own catalog (per Garde calendar).', 'New London, CT', array[]::text[], now()),
  ('hubby-jenkins', 'Hubby Jenkins', 'solo', 'Multi-instrumentalist and former Carolina Chocolate Drops member playing American roots music (per Garde calendar).', 'New London, CT', array[]::text[], now()),
  ('monophonics', 'Monophonics', 'band', 'Psychedelic soul band (per United Theatre event page).', 'Westerly, RI', array[]::text[], now()),
  ('dj-blade-mon', 'DJ Blade Mon', 'dj', 'Reggae/dance DJ; an older 2025 listing (riblogger) had him spinning Reggae Thursdays at Surf Cantina, Westerly.', 'Mystic, CT', array[]::text[], now()),
  ('ramblin-dan-stevens', 'Ramblin'' Dan Stevens', 'solo', 'Acoustic fingerstyle blues and slide guitarist, full-time pro since 1991 and International Blues Challenge finalist (danstevens.net).', 'Mystic, CT', array[]::text[], now()),
  ('the-cartells', 'The Cartells', 'band', 'Mystic-based seven-piece party band (jazz, swing, Motown, R&B, rock), inducted into the Wolf Den Hall of Fame in 2024 (thecartells.com; findingconnecticut.com).', 'Mystic, CT', array[]::text[], now()),
  ('violet-theory', 'Violet Theory', 'band', 'Country-influenced project of Victoria White and Chris Cofoni, formed in 2025 (violettheorymusic.com).', 'Stonington, CT', array[]::text[], now()),
  ('a-vibe-the-encore-2000s-party', 'A VIBE – The Encore (2000s party)', 'dj', '30+, no-phones 2000s dance party with classic reggaeton, dancehall, R&B and hip hop; organized by Frank Colmenares (Eventbrite).', 'New London, CT', array[]::text[], now())
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  bio = excluded.bio,
  city = excluded.city,
  genres = excluded.genres;

insert into public.gigs (
  id, performer_id, title, description, category, datetime, lat, lng, label, timezone, source_url, source_kind, created_at
)
values
  ('a-j-croce-2026-10-25', 'a-j-croce', 'A.J. Croce', '', 'solo', '2026-10-25T23:00:00.000Z'::timestamptz, 41.35543, -72.099024, 'Garde Arts Center, 325 State St, New London, CT 06320', 'America/New_York', 'https://www.gardearts.org/events', 'public_info', now()),
  ('hubby-jenkins-2026-11-14', 'hubby-jenkins', 'Hubby Jenkins', '', 'solo', '2026-11-15T01:00:00.000Z'::timestamptz, 41.35543, -72.099024, 'Garde Arts Center (Oasis Room), 325 State St, New London, CT 06320', 'America/New_York', 'https://www.gardearts.org/events', 'public_info', now()),
  ('monophonics-2026-10-03', 'monophonics', 'Monophonics', '', 'band', '2026-10-04T00:00:00.000Z'::timestamptz, 41.381507, -71.828466, 'Knick Music Lab (Knickerbocker Music Center), 35 Railroad Ave, Westerly, RI 02891', 'America/New_York', 'https://unitedtheatre.org/shows/monophonics/', 'public_info', now()),
  ('dj-blade-mon-2026-10-23', 'dj-blade-mon', 'DJ Blade Mon', '', 'dj', '2026-10-24T01:30:00.000Z'::timestamptz, 41.351009, -71.97215, 'Captain Daniel Packer Inne, 32 Water St, Mystic, CT 06355', 'America/New_York', 'https://danielpacker.com/music/', 'public_info', now()),
  ('ramblin-dan-stevens-2026-10-19', 'ramblin-dan-stevens', 'Ramblin'' Dan Stevens', '', 'solo', '2026-10-19T23:00:00.000Z'::timestamptz, 41.351009, -71.97215, 'Captain Daniel Packer Inne, 32 Water St, Mystic, CT 06355', 'America/New_York', 'https://danielpacker.com/music/', 'public_info', now()),
  ('the-cartells-2026-10-03', 'the-cartells', 'The Cartells', '', 'band', '2026-10-03T22:00:00.000Z'::timestamptz, 41.349417, -71.95806, 'Rocks 21, 3 Williams Ave, Mystic, CT 06355', 'America/New_York', 'https://www.rocks21.com/livemusic', 'public_info', now()),
  ('violet-theory-2026-10-25', 'violet-theory', 'Violet Theory', '', 'band', '2026-10-25T19:00:00.000Z'::timestamptz, 41.34868, -71.888693, 'Saltwater Farm Vineyard, 349 Elm St, Stonington, CT 06378', 'America/New_York', 'https://www.saltwaterfarmvineyard.com/music', 'public_info', now()),
  ('a-vibe-the-encore-2000s-party-2026-10-03', 'a-vibe-the-encore-2000s-party', 'A VIBE – The Encore (2000s party)', '', 'dj', '2026-10-04T01:00:00.000Z'::timestamptz, 41.351932, -72.096157, 'Mambo Bar & Restaurant, 200 Bank St, New London, CT 06320', 'America/New_York', 'https://www.eventbrite.com/e/a-vibe-the-encore-remember-those-2000s-parties-yeah-that-tickets-1997973199624', 'public_info', now())
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  datetime = excluded.datetime,
  lat = excluded.lat,
  lng = excluded.lng,
  label = excluded.label,
  timezone = excluded.timezone,
  source_url = excluded.source_url,
  source_kind = excluded.source_kind;
