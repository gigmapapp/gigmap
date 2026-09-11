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

No paid map keys and no `.env` file are required.

## Seed data

First read of the store creates `.data/db.json` from `lib/seed/austin.ts`:

- 10 Austin performers (solo, band, and DJ)
- 12 upcoming gigs at real venues (Antone’s, Stubb’s, Mohawk, Continental Club, and more)
- Clips mix YouTube URLs and direct MP4s

To reseed, delete the local store and restart:

```bash
rm -rf .data/db.json .data/uploads
```

The next page load writes a fresh seed. `.data/` is gitignored except for `.gitkeep`.

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

Typed JSON under `.data/` behind repository interfaces in `lib/repo/`. Swap the JSON adapters for Supabase without rewriting pages — details in `ARCHITECTURE.md`.
