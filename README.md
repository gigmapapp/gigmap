# Gig Map

Find live music near you, then book it.

Musicians and DJs post where they play. You browse an interactive map by date, watch short clips, and send a request to hire someone for a private event. Categories: **solo**, **band**, **DJ**.

This repository is the v1 vertical slice: Next.js 16 App Router, React 19, Tailwind 4, TypeScript, MapLibre + OSM tiles, and a local JSON store.

## What’s in v1

- Performer profiles (solo / band / DJ) with short videos (URL or upload)
- Post a gig: map pin (lat/lng) + label, datetime, category, title/description, linked performer
- Discovery map of upcoming gigs with a date filter
- “Request to book” for private events (contact, event details, preferred date/location, message)
- Booking requests persisted locally
- Stub auth (cookie: pick a performer) — clearly marked temporary

## What’s out of v1

Payments, reviews, a full messaging inbox, and admin moderation. Do not expect those here.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

No paid map keys are required. Without Supabase env vars the app keeps using the local JSON store under `.data/`. Set the variables in `.env.example` to use Supabase instead (required on Vercel, where the filesystem is read-only).

## Seed data

The Mystic roster lives in `lib/seed/fixtures/mystic-seed-final.csv`:

- 8 performers and 8 gigs listed from public pages (`source_kind = public_info`, each with `source_url`)
- No photos, videos, or clips
- `start_time_et` is venue wall time. The zone is looked up from lat/lng (`America/New_York` for these pins, including Westerly, RI)
- CSV notes are not stored and are not shown

**Local JSON.** The first read creates `.data/db.json`. To reseed, delete the store and restart:

```bash
rm -rf .data/db.json .data/uploads
```

**Supabase.** The hosted project already had empty legacy tables (`profiles`, `gigs`, `bookings`) with a different shape. Apply the migrations in filename order:

1. `supabase/migrations/20260929140000_drop_legacy_empty_tables.sql` drops those three only when every matching table is empty. If any has a row, it aborts and drops nothing. On a fresh database it does nothing. Already applied on the hosted project.
2. `supabase/migrations/20260929150000_create_gigmap_tables.sql` creates the v1 tables. It does not touch Storage.
3. `supabase/migrations/20260929155000_create_clips_bucket.sql` inserts the public `clips` bucket and a public read policy. It does not `ALTER` `storage.objects`. If this file fails, the tables from step 2 stay; use the dashboard fallback in `ARCHITECTURE.md`.
4. `supabase/migrations/20260929160000_revoke_anon_table_writes.sql` removes anon, authenticated, and public insert/update/delete access. Public read of performers, videos, and gigs stays. **Do not re-run this file after the PR #10 ownership migration** (`20260930120600_performer_auth_ownership.sql`). It would drop those owner write policies.
5. `supabase/migrations/20260929170000_revoke_rls_auto_enable.sql` revokes `EXECUTE` on `public.rls_auto_enable()` when that function is already there. It does nothing on a fresh database.
6. `supabase/migrations/20260930180000_gigs_add_timezone.sql` adds nullable `gigs.timezone`.
7. `supabase/migrations/20260930180500_gigs_backfill_timezone.sql` fills every existing row in SQL and raises if any zone is still null. No service-role key. The hosted rows are the Austin seed ids (`America/Chicago`) and the Milestone gig (`America/New_York`). Any other null uses `America/New_York` when `lng > -87.5`, otherwise `America/Chicago`.
8. `supabase/migrations/20260930181000_gigs_timezone_not_null.sql` sets `NOT NULL`. The previous file already asserted that no nulls remain.
9. `supabase/migrations/20260930182000_gigs_public_listing.sql` adds nullable `source_url` and `source_kind`.
10. On a database that still has the Austin sample, apply PR #10's ownership migration first if you use it, then `supabase/migrations/20260930183000_replace_austin_seed_with_mystic.sql`. It deletes those rows by id and inserts the Mystic listings. See `ARCHITECTURE.md`.

`npm run backfill:timezones` is an optional dev tool. It is not a production step.

Clip cleanup is optional and later. The release does not depend on it. The Austin seed videos are external sample URLs, not objects in `clips`. The only object path recorded under the 10 Austin prefixes is:

- `maya-chen/6b602aa7-5527-45d0-bf40-651cfd01418c.mp4`

The other prefixes (`broken-strings`, `dj-nova`, `elijah-brooks`, `velvet-static`, `luna-park`, `nightbirds`, `harper-quinn`, `bassline-society`, `copper-notes`) have no object paths in the seed or migrations. Nate can delete that one file in the dashboard (Storage → `clips`) whenever he wants. `npm run clips:remove-austin` (add `-- --apply` to delete) is the same optional cleanup and needs a service-role key.

A fresh database gets the Mystic rows from that migration and from `supabase/seed.sql`. `npm run seed:supabase` upserts the same listings and does not delete Austin rows. Neither path writes booking requests. `supabase db reset` runs the migrations in filename order, then the seed.

## Stub auth

There are no real accounts. Open **Pick performer** (`/session`) and act as a seeded artist (or create a new profile). That sets an HTTP-only cookie so you can post gigs and add clips. Fans can browse and send booking requests without picking anyone.

This is temporary scaffolding. See `ARCHITECTURE.md` for how it maps onto Supabase Auth later.

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Map + date filter + upcoming list |
| `/performers` | Roster |
| `/performers/[id]` | Profile and clips |
| `/performers/[id]/book` | Request to book |
| `/gigs/new` | Post a gig (needs stub session) |
| `/gigs/[id]` | Gig detail |
| `/bookings` | Stored booking requests |
| `/session` | Temporary “act as performer” |

## Persistence

Pages talk to `lib/repo`. That module uses Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and the JSON files otherwise.

Clip files in Supabase mode upload from the browser to the public `clips` bucket (10 MB cap) using a short-lived signed URL. They do not pass through the Next.js server. Local JSON mode still writes `.data/uploads/` and serves them from `/api/uploads/[filename]`.

Booking requests are visible only to the stub-session performer they were sent to. The anon key cannot read or write that table, or write the other tables. Table writes use the server service role.
