# Supabase setup (hire flow)

The app talks to Supabase from the browser via `lib/supabaseClient.ts`.

## Environment

Set these in `.env.local` (never commit secrets):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## Schema

Run `supabase/migrations/20260311_hire_artists.sql` in the Supabase SQL editor (or with the Supabase CLI) if the project does not already have these objects.

What it adds or confirms:

- `profiles.artist_category` — `solo` | `band` | `dj` | `null`. Hireable artists are rows with a category set. `is_musician` is kept in sync (`true` when a category is set).
- `bookings` — `requester_id`, `musician_id`, `status` (`pending` | `accepted` | `declined`), `event_type`, `event_date`, `location`, `message`, `budget`, `created_at`.
- RLS so profiles are publicly readable (artist directory), users can edit their own profile, and booking rows are visible only to the requester or the musician. Only the musician can update a booking (accept / decline).

Existing `profiles` / `bookings` tables are altered in place; the script is safe to re-run.
