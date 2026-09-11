# Architecture

Gig Map v1 keeps the product logic independent of the database so the local store can be replaced with Supabase later.

## Runtime shape

```
app/            App Router pages, server actions, a few route handlers
components/     Client islands (map, forms)
lib/types.ts    Shared domain types
lib/repo/       Repository interfaces + JSON adapters
lib/seed/       Austin seed used when `.data/db.json` is missing
lib/auth.ts     Temporary cookie session
.data/          Local database + video uploads (not committed)
```

Pages and actions talk only to `lib/repo` (`performers`, `gigs`, `bookings`). They never import filesystem paths or SQL.

## Local store

`lib/repo/json.ts` serializes a single `Database` document:

```ts
{
  performers: Performer[]
  gigs: Gig[]
  bookings: BookingRequest[]
}
```

Writes are queued in-process and persisted with write-to-temp + rename. That is enough for a single-node `next dev` / `next start` process. It is **not** safe across multiple serverless instances.

Uploads land in `.data/uploads/` and are served from `/api/uploads/[filename]`.

## Repository interfaces

See `lib/repo/interface.ts`:

- `PerformerRepository` — `list`, `get`, `create`, `addVideo`
- `GigRepository` — `list`, `get`, `create`
- `BookingRepository` — `list`, `create`

`lib/repo/index.ts` binds those interfaces to the JSON adapters. Changing backends is a new adapter plus a one-line swap.

## Temporary auth

`gigmap_performer` is an HTTP-only cookie holding a performer id. `getSessionPerformer()` / `requirePerformer()` resolve it through the performer repository. UI copy labels this as stub auth.

No passwords, email confirmation, or RLS exist in v1.

## Migrating to Supabase

1. **Schema** — three tables matching the TypeScript types:
   - `performers` (`id`, `name`, `category`, `bio`, `city`, `genres[]`, `created_at`)
   - `videos` (`id`, `performer_id`, `title`, `source_type`, `url`)
   - `gigs` (`id`, `performer_id`, `title`, `description`, `category`, `datetime`, `lat`, `lng`, `label`, `created_at`)
   - `booking_requests` (`id`, `performer_id`, `contact_name`, `contact_email`, `event_details`, `preferred_date`, `preferred_location`, `message`, `status`, `created_at`)
2. **Auth** — replace the cookie picker with Supabase Auth. Add `user_id` on `performers` (one profile per user, or a join table if a user can manage a band).
3. **Adapter** — implement the same repository interfaces with `@supabase/supabase-js` (server client + service role or user-scoped client). Keep `lib/repo/index.ts` as the only import site.
4. **Storage** — move clip uploads from `.data/uploads` to a Supabase Storage bucket; store the public or signed URL on `videos`.
5. **RLS** — public read for performers, videos, and upcoming gigs. Authenticated insert for gigs/videos owned by the session user. Anyone can insert a booking request; only the performer (and later an admin) can read their inbox.
6. **Seed** — load `lib/seed/austin.ts` once via a SQL seed or a one-off script instead of first-read JSON bootstrap.

Until that swap, keep paid SaaS out of the critical path: MapLibre + Carto/OSM tiles, local JSON, stub session.
