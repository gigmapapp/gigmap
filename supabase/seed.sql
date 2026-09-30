-- Austin seed for Gig Map. Safe to re-run: seeded ids are upserted, booking_requests are not modified.
-- performers.user_id is omitted so these rows stay unclaimed (NULL). A re-run does not clear user_id.
-- Apply supabase/migrations in filename order first. On a fresh database
-- (supabase db reset) the legacy drop and the rls_auto_enable revoke are
-- no-ops, and the clips bucket migration creates the storage.buckets row named clips.
-- This file then fills the v1 tables.
-- Gig times are America/Chicago wall-clock times, from tomorrow through about six weeks after this runs.
-- Generated from lib/seed/austin.ts. Edit the seed data there, then re-render this file
-- with: npx tsx scripts/render-seed-sql.ts

insert into public.performers (id, name, category, bio, city, genres, created_at)
values
  ('maya-chen', 'Maya Chen', 'solo', 'Austin singer-songwriter with a hushed folk voice and looping guitar. Friday nights on the East Side, Sunday afternoons in coffeehouses.', 'Austin, TX', array['indie folk', 'singer-songwriter']::text[], now()),
  ('broken-strings', 'The Broken Strings', 'band', 'Four-piece garage rock from South Austin. Loud choruses, cheap amps, and a standing date with the Continental Club.', 'Austin, TX', array['garage rock', 'indie']::text[], now()),
  ('dj-nova', 'DJ Nova', 'dj', 'Warehouse house and disco edits. Resident energy at Empire and after-hours on East 6th.', 'Austin, TX', array['house', 'disco']::text[], now()),
  ('elijah-brooks', 'Elijah Brooks', 'solo', 'Jazz guitar, standards, and original ballads. Think hotel lobby at midnight, but warmer.', 'Austin, TX', array['jazz', 'standards']::text[], now()),
  ('velvet-static', 'Velvet Static', 'band', 'Dream-pop five-piece. Pedalboards, fog, and choruses that hang in the rafters at Mohawk.', 'Austin, TX', array['dream pop', 'shoegaze']::text[], now()),
  ('luna-park', 'Luna Park', 'dj', 'Hypnotic techno and late-night warehouse sets. Peak time starts after 1am.', 'Austin, TX', array['techno', 'minimal']::text[], now()),
  ('nightbirds', 'Rio & the Nightbirds', 'band', 'Latin soul, cumbia, and Saturday-night horns. The dance floor fills before the second chorus.', 'Austin, TX', array['latin soul', 'cumbia']::text[], now()),
  ('harper-quinn', 'Harper Quinn', 'solo', 'Alto, nylon-string guitar, and stories from the Drag. Quiet rooms only.', 'Austin, TX', array['folk', 'americana']::text[], now()),
  ('bassline-society', 'Bassline Society', 'dj', 'Hip-hop, bounce, and dirty south classics. Wedding-safe until midnight, then the crate flips.', 'Austin, TX', array['hip-hop', 'bounce']::text[], now()),
  ('copper-notes', 'The Copper Notes', 'band', 'Pedal steel, two-part harmony, and honky-tonk heartbreak. White Horse regulars.', 'Austin, TX', array['americana', 'honky-tonk']::text[], now())
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  bio = excluded.bio,
  city = excluded.city,
  genres = excluded.genres;

insert into public.videos (id, performer_id, title, source_type, url, created_at)
values
  ('maya-v1', 'maya-chen', 'Hotel Vegas late set', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', now() + interval '0 milliseconds'),
  ('maya-v2', 'maya-chen', 'Living-room rehearsal', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', now() + interval '1 milliseconds'),
  ('maya-v3', 'maya-chen', 'YouTube clip (URL embed)', 'url', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', now() + interval '2 milliseconds'),
  ('broken-v1', 'broken-strings', 'Continental Club clip', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', now() + interval '3 milliseconds'),
  ('broken-v2', 'broken-strings', 'Practice space take', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', now() + interval '4 milliseconds'),
  ('nova-v1', 'dj-nova', 'Empire Control Room', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', now() + interval '5 milliseconds'),
  ('nova-v2', 'dj-nova', 'Sunset mix excerpt', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', now() + interval '6 milliseconds'),
  ('elijah-v1', 'elijah-brooks', 'C-Boy''s trio night', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', now() + interval '7 milliseconds'),
  ('velvet-v1', 'velvet-static', 'Mohawk indoor', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', now() + interval '8 milliseconds'),
  ('velvet-v2', 'velvet-static', 'Demo reel', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', now() + interval '9 milliseconds'),
  ('luna-v1', 'luna-park', 'Warehouse peak-time', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', now() + interval '10 milliseconds'),
  ('rio-v1', 'nightbirds', 'Stubb''s patio', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', now() + interval '11 milliseconds'),
  ('rio-v2', 'nightbirds', 'Horn section close-up', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', now() + interval '12 milliseconds'),
  ('harper-v1', 'harper-quinn', 'Saxon Pub open mic', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', now() + interval '13 milliseconds'),
  ('harper-v2', 'harper-quinn', 'Porch take', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', now() + interval '14 milliseconds'),
  ('bass-v1', 'bassline-society', 'Parish club set', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', now() + interval '15 milliseconds'),
  ('copper-v1', 'copper-notes', 'White Horse two-step', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', now() + interval '16 milliseconds'),
  ('copper-v2', 'copper-notes', 'Steel guitar feature', 'url', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', now() + interval '17 milliseconds')
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  source_type = excluded.source_type,
  url = excluded.url,
  created_at = excluded.created_at;

insert into public.gigs (
  id, performer_id, title, description, category, datetime, lat, lng, label, created_at
)
values
  ('gig-antones-maya', 'maya-chen', 'Late set at Antone''s', 'Solo looping set in the front room. Come early if you want a seat along the bar.', 'solo', ((timezone('America/Chicago', now()))::date + 1 + time '21:30') at time zone 'America/Chicago', 30.2661, -97.7396, 'Antone''s Nightclub, 305 E 5th St', now()),
  ('gig-stubbs-rio', 'nightbirds', 'Patio dance night', 'Rio & the Nightbirds bring the horns outside. Food trucks stay open late.', 'band', ((timezone('America/Chicago', now()))::date + 2 + time '20:00') at time zone 'America/Chicago', 30.2685, -97.7362, 'Stubb''s BBQ, 801 Red River St', now()),
  ('gig-mohawk-velvet', 'velvet-static', 'Indoor / indoor', 'Full band, fog, and the Mohawk indoor PA. Support TBA.', 'band', ((timezone('America/Chicago', now()))::date + 4 + time '22:00') at time zone 'America/Chicago', 30.27, -97.736, 'Mohawk Austin, 912 Red River St', now()),
  ('gig-empire-nova', 'dj-nova', 'Disco edits until close', 'Nova on the booth from 11 to 2. No guest list, just show up.', 'dj', ((timezone('America/Chicago', now()))::date + 11 + time '23:00') at time zone 'America/Chicago', 30.2674, -97.7366, 'Empire Control Room, 606 E 7th St', now()),
  ('gig-continental-broken', 'broken-strings', 'Continental Club residency', 'Monthly loud night. Earplugs at the merch table.', 'band', ((timezone('America/Chicago', now()))::date + 12 + time '21:00') at time zone 'America/Chicago', 30.2478, -97.7505, 'Continental Club, 1315 S Congress Ave', now()),
  ('gig-cboy-elijah', 'elijah-brooks', 'Standards after dinner', 'Trio format — guitar, upright, brushes. Table service stays open.', 'solo', ((timezone('America/Chicago', now()))::date + 14 + time '19:30') at time zone 'America/Chicago', 30.245, -97.7512, 'C-Boy''s Heart & Soul, 2008 S Congress Ave', now()),
  ('gig-saxon-harper', 'harper-quinn', 'Sunday songwriter hour', 'New songs, old stories, and the Saxon sound system being kind.', 'solo', ((timezone('America/Chicago', now()))::date + 24 + time '18:00') at time zone 'America/Chicago', 30.2553, -97.7633, 'The Saxon Pub, 1320 S Lamar Blvd', now()),
  ('gig-whitehorse-copper', 'copper-notes', 'Two-step Tuesday', 'Dance lessons at 7, The Copper Notes at 8. Boots recommended.', 'band', ((timezone('America/Chicago', now()))::date + 26 + time '20:00') at time zone 'America/Chicago', 30.2625, -97.7258, 'The White Horse, 500 Comal St', now()),
  ('gig-parish-bassline', 'bassline-society', 'Club night: crates out', 'Hip-hop and bounce until last call. 21+.', 'dj', ((timezone('America/Chicago', now()))::date + 31 + time '22:30') at time zone 'America/Chicago', 30.2672, -97.74, 'Parish, 214 E 6th St', now()),
  ('gig-hotelvegas-maya', 'maya-chen', 'East Side twilight', 'Outdoor stage if the weather holds, inside if it doesn''t.', 'solo', ((timezone('America/Chicago', now()))::date + 32 + time '19:00') at time zone 'America/Chicago', 30.2622, -97.7278, 'Hotel Vegas, 1502 E 6th St', now()),
  ('gig-cheerup-luna', 'luna-park', 'After hours at Cheer Up', 'Minimal techno in the backyard. Starts late, ends later.', 'dj', ((timezone('America/Chicago', now()))::date + 41 + time '00:30') at time zone 'America/Chicago', 30.2694, -97.7365, 'Cheer Up Charlies, 900 Red River St', now()),
  ('gig-acl-velvet', 'velvet-static', 'Moody Theater warmup', 'Special sit-down set before a touring bill. Limited GA.', 'band', ((timezone('America/Chicago', now()))::date + 42 + time '20:00') at time zone 'America/Chicago', 30.2653, -97.7472, 'ACL Live at the Moody Theater, 310 W 2nd St', now())
on conflict (id) do update set
  performer_id = excluded.performer_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  datetime = excluded.datetime,
  lat = excluded.lat,
  lng = excluded.lng,
  label = excluded.label;
