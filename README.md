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
- Email and password accounts (Supabase Auth) with confirmation, password reset, and sign out

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
6. `supabase/migrations/20260930120600_performer_auth_ownership.sql` adds `performers.user_id` and owner-only write policies. Seed rows stay unclaimed (`user_id` null). Do not re-run step 4 after this file without applying this file again. See `ARCHITECTURE.md`.
7. `supabase/migrations/20260930180000_gigs_add_timezone.sql` adds nullable `gigs.timezone`.
8. `supabase/migrations/20260930180500_gigs_backfill_timezone.sql` fills every existing row in SQL and raises if any zone is still null. No service-role key. The hosted rows are the Austin seed ids (`America/Chicago`) and the Milestone gig (`America/New_York`). Any other null uses `America/New_York` when `lng > -87.5`, otherwise `America/Chicago`.
9. `supabase/migrations/20260930181000_gigs_timezone_not_null.sql` sets `NOT NULL`. The previous file already asserted that no nulls remain.
10. `supabase/migrations/20260930182000_gigs_public_listing.sql` adds nullable `source_url` and `source_kind`.
11. `supabase/migrations/20260930183000_replace_austin_seed_with_mystic.sql` deletes the Austin sample by id and inserts the Mystic listings. It refuses when one of those performers has a non-null `user_id`. See `ARCHITECTURE.md`.

`npm run backfill:timezones` is an optional dev tool. It is not a production step.

Clip cleanup is optional and later. The release does not depend on it. The Austin seed videos are external sample URLs, not objects in `clips`. The only object path recorded under the 10 Austin prefixes is:

- `maya-chen/6b602aa7-5527-45d0-bf40-651cfd01418c.mp4`

The other prefixes (`broken-strings`, `dj-nova`, `elijah-brooks`, `velvet-static`, `luna-park`, `nightbirds`, `harper-quinn`, `bassline-society`, `copper-notes`) have no object paths in the seed or migrations. Nate can delete that one file in the dashboard (Storage → `clips`) whenever he wants. `npm run clips:remove-austin` (add `-- --apply` to delete) is the same optional cleanup and needs a service-role key.

Then either paste `supabase/seed.sql` or run `npm run seed:supabase` with the server env vars set. See `ARCHITECTURE.md` for the full steps, including hosted migration-history versions and the Auth dashboard settings this app expects. Neither path writes booking requests or sets `user_id`. A fresh database gets the Mystic rows from the swap migration and from `supabase/seed.sql`. `npm run seed:supabase` upserts the same listings and does not delete Austin rows. `supabase db reset` runs the migrations in filename order, then the seed.

## Accounts

Sign in at `/sign-in`. After email confirmation, `/account` creates the one performer profile for that user. Posting a gig, uploading clips, and opening `/bookings` require that profile. Fans can browse, and they can request a booking, without an account.

The eight Mystic listings are demo profiles (`user_id` null). They are labeled Demo, the Book button is hidden, and the server refuses those requests, because nobody could read the inbox. That rule is `REFUSE_BOOKINGS_FOR_UNCLAIMED_PERFORMERS` in `lib/auth/access.ts`. Claiming a seed profile is out of scope.

Without Supabase env vars the app still uses the local JSON store, but accounts do not. Owner actions explain that on the sign-in page. Auth email links use `NEXT_PUBLIC_SITE_URL` when it is set, and the request host otherwise.

The free plan has no custom SMTP, so leave the Auth email templates at their defaults (`{{ .ConfirmationURL }}`). Sign-up and resend set `emailRedirectTo` to `${siteUrl}/auth/callback?next=/account`. Password reset sets `redirectTo` to `${siteUrl}/auth/callback?next=/reset-password`. Supabase's verify link comes back to `/auth/callback` with a PKCE `code`, and that route exchanges it for a session. Recovery finishes on `/reset-password`. Open the link in the same browser that requested it. A different browser has no PKCE verifier, and `/auth/error` says so. Expired links (`otp_expired`) and the other `error` / `error_code` / `error_description` values, in the query or the hash, get the same friendly page. `/auth/confirm` remains for a later custom template that uses `token_hash`.

Auth dashboard, and nothing else:

- Site URL: `https://<production-host>` with no trailing slash.
- Confirm email: on.
- Templates: do not edit them.
- Redirect URLs: `https://<production-host>/auth/callback**` and `http://localhost:3000/auth/callback**`.

The allow list matches the whole redirect except the hash, including `?next=`. An exact `/auth/callback` entry does not match that query string. `**` does. A URL on the same scheme, host, and port as the Site URL is allowed even without an extra entry. See `ARCHITECTURE.md`.

## App routes

| Route | Purpose |
| --- | --- |
| `/` | Map + date filter + upcoming list |
| `/performers` | Roster |
| `/performers/[id]` | Profile and clips |
| `/performers/[id]/book` | Request to book |
| `/gigs/new` | Post a gig (signed-in profile) |
| `/gigs/[id]` | Gig detail |
| `/bookings` | Booking requests for the signed-in profile |
| `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Account screens |
| `/account` | Profile onboarding, or the signed-in profile |
| `/auth/confirm`, `/auth/callback` | Email link handlers |

## Persistence

Pages talk to `lib/repo`. That module uses Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and the JSON files otherwise.

Clip files in Supabase mode upload from the browser to the public `clips` bucket (10 MB cap) using a short-lived signed URL. They do not pass through the Next.js server. Local JSON mode still writes `.data/uploads/` and serves them from `/api/uploads/[filename]`.

Booking requests are visible only to the signed-in owner of that performer. The anon key cannot read or write that table. Owner edits run as the signed-in user so row level security applies. Booking inserts and signed clip URLs still use the service role, after the server checks the target.
