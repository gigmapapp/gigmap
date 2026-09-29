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

## Store

`lib/repo/index.ts` is the only binding site. It uses the Supabase adapter when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set, and the JSON adapter otherwise.

### JSON adapter

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

## Supabase

`lib/repo/supabase.ts` implements the same interfaces with `@supabase/supabase-js` and the service-role client in `lib/supabase/server.ts`. That client is server-only. The browser never sees the service role key.

Schema and RLS live in `supabase/migrations/`. The `clips` bucket is its own file so a Storage error cannot roll back the tables. Apply them in filename order:

1. `20260929140000_drop_legacy_empty_tables.sql` drops empty legacy `profiles`, `gigs`, and `bookings` (different columns from v1). It aborts if any of those legacy tables has a row, and it is a no-op when they are absent. It does not use `CASCADE` and does not modify `auth.users`. Already applied on the hosted project.
2. `20260929150000_create_gigmap_tables.sql` creates the v1 tables, including a new `public.gigs`. It does not reference `storage`.
3. `20260929155000_create_clips_bucket.sql` inserts the public `clips` bucket (10 MB, MP4 / WebM / MOV) and `clips_public_read` on `storage.objects`.
4. `20260929160000_revoke_anon_table_writes.sql` leaves public read on performers, videos, and gigs, and removes anon, authenticated, and public insert/update/delete privileges and policies on those tables and on `booking_requests`.
5. `20260929170000_revoke_rls_auto_enable.sql` revokes `EXECUTE` on `public.rls_auto_enable()` when that function already exists. It does not create, drop, or edit the function.

`supabase start` then `supabase db reset` applies that filename order and then `supabase/seed.sql`. Local Storage already has RLS on `storage.objects`, and this repo never alters that table.

Hosted migration history will not match these filenames. `apply_migration` records its own version (the drop file was stored as `20260929144402`, not `20260929140000`), and later files will get new versions too. That does not affect the app or `supabase db reset`. It does block `supabase db push` / `db pull` / preview branches until the history table matches the filenames. After the SQL is actually applied, repair history without re-running it: `supabase migration repair --status reverted <remote version>` for each MCP version that has no local file, then `supabase migration repair --status applied <filename version>` for each local file whose changes are already in the database. Do not rename files to match or predict those remote versions.

If the clips migration fails on the hosted project, leave it failed and create the bucket in the dashboard: Storage → New bucket, name `clips`, public, 10 MB, MIME types `video/mp4`, `video/webm`, `video/quicktime`. Then add a SELECT policy named `clips_public_read` for `anon` and `authenticated` with `using (bucket_id = 'clips')`. Do not run `ALTER TABLE storage.objects`. Do not add an insert policy for anon.

- Public read of `performers`, `videos`, and `gigs` for `anon` and `authenticated`.
- All table writes use the service role. `booking_requests` has no select or write grant for anon. `BookingRepository.list` requires a performer id, and `/bookings` passes only the stub-session performer.
- Clip uploads: the server mints a signed upload URL with the service role after the stub-session check. The browser PUTs the file with the anon key and that token. The public object URL is stored on `videos`. There is no anon insert policy on `storage.objects`, and no `clips_service_insert` policy. The service role bypasses RLS, and the signed PUT writes as superuser, so that insert policy is unused. If minting a signed URL later fails an INSERT check, add `clips_service_insert` for `service_role` from the SQL editor. The statement is commented in the clips migration.

Seed data is `lib/seed/austin.ts`. `supabase/seed.sql` is rendered from it with gig times relative to `now()` in America/Chicago. `npm run seed:supabase` upserts the same rows with the service role and does not touch booking requests.

## Still temporary

Replace the cookie picker with Supabase Auth before treating inserts as user-owned. Add `user_id` on `performers` (one profile per user, or a join table if a user can manage a band) and tighten RLS so a session can insert gigs and videos only for their performer. Map tiles stay MapLibre + OSM. No payments, reviews, inbox threads, or admin tools.
