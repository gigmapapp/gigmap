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

The Austin roster lives in `lib/seed/austin.ts`:

- 10 performers (solo, band, and DJ)
- 12 gigs at real venues (Antone’s, Stubb’s, Mohawk, Continental Club, and more)
- Clips mix YouTube URLs and direct MP4s
- Gig dates are computed when the seed runs: tomorrow through about six weeks, America/Chicago

**Local JSON.** The first read creates `.data/db.json`. To reseed, delete the store and restart:

```bash
rm -rf .data/db.json .data/uploads
```

**Supabase.** The hosted project already has empty legacy tables (`profiles`, `gigs`, `bookings`) with a different shape. Apply the migrations in filename order:

1. `supabase/migrations/20260929140000_drop_legacy_empty_tables.sql` drops those three only when every matching table is empty. If any has a row, it aborts and drops nothing. On a fresh database it does nothing.
2. `supabase/migrations/20260929150000_create_gigmap_tables.sql` creates the v1 tables.
3. `supabase/migrations/20260929160000_revoke_anon_table_writes.sql` removes anon, authenticated, and public insert/update/delete access. Public read of performers, videos, and gigs stays.
4. `supabase/migrations/20260929170000_revoke_rls_auto_enable.sql` revokes `EXECUTE` on `public.rls_auto_enable()` when that function is already there. It does nothing on a fresh database.

Then either paste `supabase/seed.sql` or run `npm run seed:supabase` with the server env vars set. See `ARCHITECTURE.md` for the full steps. Neither path writes booking requests. `supabase db reset` runs the migrations in that order; the drop and the function revoke are no-ops locally, then the seed loads v1 gigs.

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
