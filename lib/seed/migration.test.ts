import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { AUSTIN_GIG_IDS, MILESTONE_GIG_ID } from "./austin-ids";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const migrationFiles = [
  "20260929140000_drop_legacy_empty_tables.sql",
  "20260929150000_create_gigmap_tables.sql",
  "20260929155000_create_clips_bucket.sql",
  "20260929160000_revoke_anon_table_writes.sql",
  "20260929170000_revoke_rls_auto_enable.sql",
  "20260930120600_performer_auth_ownership.sql",
  "20260930180000_gigs_add_timezone.sql",
  "20260930180500_gigs_backfill_timezone.sql",
  "20260930181000_gigs_timezone_not_null.sql",
  "20260930182000_gigs_public_listing.sql",
  "20260930183000_replace_austin_seed_with_mystic.sql",
  "20261002130545_booking_request_status.sql",
];

function readMigration(name: string): string {
  return readFileSync(path.join(migrationsDir, name), "utf8");
}

/** SQL with line comments removed, so header notes are not treated as statements. */
function statements(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

const migration = readMigration("20260929150000_create_gigmap_tables.sql");
const dropLegacy = readMigration("20260929140000_drop_legacy_empty_tables.sql");
const clips = statements(readMigration("20260929155000_create_clips_bucket.sql"));

test("every app table enables and forces row level security", () => {
  for (const table of ["performers", "videos", "gigs", "booking_requests"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
});

test("booking requests are not publicly readable", () => {
  assert.doesNotMatch(migration, /grant insert on table public\.booking_requests/);
  assert.doesNotMatch(migration, /on public\.booking_requests\s+for select/i);
  assert.doesNotMatch(migration, /grant select(?:,| on)[^;]*booking_requests/i);
});

test("catalog tables are publicly readable and not writable by anon", () => {
  for (const table of ["performers", "videos", "gigs"]) {
    assert.match(migration, new RegExp(`${table}_public_read`));
    assert.doesNotMatch(migration, new RegExp(`${table}_public_insert`));
    assert.match(migration, new RegExp(`grant select on table public\\.${table} to anon, authenticated`));
    assert.doesNotMatch(migration, new RegExp(`grant select, insert on table public\\.${table}`));
  }
});

test("legacy drop migration sorts first and aborts when a legacy table has rows", () => {
  const files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(files, migrationFiles);
  assert.match(dropLegacy, /empty legacy tables/i);
  assert.match(dropLegacy, /raise exception/);
  assert.match(dropLegacy, /Nothing was dropped/);
  assert.doesNotMatch(dropLegacy, /drop\s+table[^;]*cascade/i);
  assert.doesNotMatch(dropLegacy, /drop\s+table\s+auth\.users/i);

  const raiseAt = dropLegacy.indexOf("raise exception");
  const dropAt = dropLegacy.search(/drop table public\./i);
  assert.ok(raiseAt > 0 && dropAt > raiseAt);

  const bookingsAt = dropLegacy.indexOf("'bookings'");
  const gigsAt = dropLegacy.indexOf("'gigs'");
  const profilesAt = dropLegacy.indexOf("'profiles'");
  assert.ok(bookingsAt > 0 && bookingsAt < gigsAt && gigsAt < profilesAt);
  assert.match(dropLegacy, /requester_id/);
  assert.match(dropLegacy, /musician_id/);
  assert.match(dropLegacy, /is_musician/);
  assert.match(dropLegacy, /count\(\*\)/);
});

test("anon write lock drops write policies and keeps public read", () => {
  const raw = readMigration("20260929160000_revoke_anon_table_writes.sql");
  const sql = statements(raw);
  assert.match(raw, /Block direct anon/);
  assert.match(sql, /polcmd in \('a', 'w', 'd', '\*'\)/);
  assert.match(sql, /revoke all on table public\.booking_requests from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.performers to anon, authenticated/);
  assert.doesNotMatch(sql, /grant insert|grant update|grant delete|for insert\s+to anon/i);
  assert.doesNotMatch(sql, /storage\.objects|storage\.buckets/);
});

test("rls_auto_enable revoke is a no-op when the function is absent", () => {
  const sql = readMigration("20260929170000_revoke_rls_auto_enable.sql");
  assert.match(sql, /pg_proc/);
  assert.match(sql, /proname = 'rls_auto_enable'/);
  assert.match(sql, /revoke execute on function/i);
  assert.match(sql, /from public, anon, authenticated/);
  assert.doesNotMatch(sql, /drop function|create or replace function|alter function/i);
});

test("table migration does not take ownership of storage objects", () => {
  const sql = statements(migration);
  assert.doesNotMatch(sql, /storage\.objects|storage\.buckets|alter table storage/i);
});

test("auth ownership migration keeps anon read-only and keys policies off auth.uid()", () => {
  const raw = readMigration("20260930120600_performer_auth_ownership.sql");
  const sql = statements(raw);
  assert.match(raw, /user_id uuid/);
  assert.match(raw, /alter column city drop default/i);
  assert.match(sql, /references auth\.users \(id\) on delete set null/i);
  assert.match(sql, /create unique index if not exists performers_user_id_key/i);
  assert.match(sql, /grant select on table public\.booking_requests to authenticated/);
  assert.match(sql, /booking_requests_owner_select/);
  assert.match(sql, /performers_owner_insert/);
  assert.match(sql, /videos_owner_delete/);
  assert.match(sql, /gigs_owner_update/);
  assert.doesNotMatch(sql, /auth\.uid\(\)(?!\))/);
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /grant insert[^;]*to anon/i);
  assert.doesNotMatch(sql, /for insert\s+to anon/i);
  assert.doesNotMatch(sql, /to anon,\s*authenticated\s+with check/i);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage|security definer/i);
  assert.doesNotMatch(sql, /user_metadata/);
});

test("timezone migration adds a nullable IANA column and does not alter storage", () => {
  const raw = readMigration("20260930180000_gigs_add_timezone.sql");
  const sql = statements(raw);
  assert.match(raw, /add column if not exists timezone text/i);
  assert.match(raw, /gigs_timezone_format_check/);
  assert.match(raw, /Africa\|America\|Antarctica/);
  assert.match(sql, /pg_catalog\.timezone\(new\.timezone/);
  assert.match(sql, /drop trigger if exists gigs_timezone_known/i);
  assert.match(sql, /revoke all on function public\.gigs_reject_unknown_timezone\(\) from public/i);
  assert.match(raw, /20260929160000_revoke_anon_table_writes/);
  assert.match(raw, /Never re-run|Do not re-run/i);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage/i);
  assert.doesNotMatch(sql, /alter column timezone set not null/i);
});

test("timezone backfill is SQL and asserts that no nulls remain", () => {
  const raw = readMigration("20260930180500_gigs_backfill_timezone.sql");
  const sql = statements(raw);
  assert.match(sql, new RegExp(`where id = '${MILESTONE_GIG_ID}'`));
  assert.match(sql, /set timezone = 'America\/New_York'/);
  assert.match(sql, /set timezone = 'America\/Chicago'/);
  for (const id of AUSTIN_GIG_IDS) {
    assert.match(sql, new RegExp(`'${id}'`));
  }
  assert.match(sql, /when lng > -87\.5 then 'America\/New_York'/);
  assert.match(sql, /else 'America\/Chicago'/);
  assert.match(sql, /where timezone is null/);
  assert.match(sql, /raise exception/);
  assert.match(sql, /still null after the SQL backfill/);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage|service_role|backfill-gig-timezones/i);
});

test("timezone not-null migration aborts while any row is missing a zone", () => {
  const raw = readMigration("20260930181000_gigs_timezone_not_null.sql");
  const sql = statements(raw);
  assert.match(sql, /where timezone is null/);
  assert.match(sql, /raise exception/);
  assert.match(sql, /20260930180500_gigs_backfill_timezone\.sql/);
  assert.match(sql, /alter table public\.gigs alter column timezone set not null/i);
  assert.match(sql, /is_nullable = 'NO'/);
  assert.match(raw, /20260929160000_revoke_anon_table_writes/);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage|backfill-gig-timezones/i);
});

test("public listing columns are nullable and require a source url", () => {
  const raw = readMigration("20260930182000_gigs_public_listing.sql");
  const sql = statements(raw);
  assert.match(sql, /add column if not exists source_url text/i);
  assert.match(sql, /add column if not exists source_kind text/i);
  assert.match(sql, /source_kind in \('owner', 'public_info'\)/);
  assert.match(sql, /source_kind is distinct from 'public_info' or source_url is not null/);
  assert.match(sql, /\^https:\/\//);
  assert.match(raw, /not "performers\.user_id is null"/i);
  assert.doesNotMatch(sql, /alter column source_kind set not null|alter column source_url set not null/i);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage|user_id/i);
});

test("booking status migration widens status, records the requester, and guards transitions", () => {
  const raw = readMigration("20261002130545_booking_request_status.sql");
  const sql = statements(raw);
  assert.match(raw, /20260929160000_revoke_anon_table_writes/);
  assert.match(raw, /Nothing was altered/);
  assert.match(sql, /add column if not exists requester_id uuid/i);
  assert.match(sql, /add column if not exists status_changed_at timestamptz/i);
  assert.match(sql, /status in \('pending', 'accepted', 'declined', 'cancelled'\)/);
  assert.match(sql, /references auth\.users \(id\) on delete set null/i);
  assert.match(sql, /booking_requests_requester_select/);
  assert.match(sql, /booking_requests_requester_insert/);
  assert.match(sql, /booking_requests_owner_update/);
  assert.match(sql, /booking_requests_requester_cancel/);
  assert.match(sql, /create trigger booking_requests_guard/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.match(sql, /grant select, insert, update on table public\.booking_requests to authenticated/i);
  assert.doesNotMatch(sql, /security definer/i);
  assert.doesNotMatch(sql, /user_metadata/);
  assert.doesNotMatch(sql, /grant [^;]*booking_requests[^;]*to anon/i);
  assert.doesNotMatch(sql, /storage\.objects|alter table storage/i);
  assert.doesNotMatch(sql, /delete from public\.booking_requests/i);
  assert.doesNotMatch(sql, /alter column requester_id set not null/i);
});

test("clip bucket migration is idempotent and does not alter storage.objects", () => {
  assert.match(clips, /insert into storage\.buckets/);
  assert.match(clips, /on conflict \(id\) do update/);
  assert.match(clips, /10485760/);
  assert.match(clips, /drop policy if exists clips_public_read/);
  assert.match(clips, /create policy clips_public_read/);
  assert.match(clips, /for select\s+to anon, authenticated/i);
  assert.match(clips, /drop policy if exists clips_anon_insert/);
  assert.match(clips, /drop policy if exists clips_service_insert/);
  assert.doesNotMatch(clips, /alter table storage/i);
  assert.doesNotMatch(clips, /create policy clips_service_insert|create policy clips_anon_insert|create policy clips_public_insert/);
  assert.doesNotMatch(clips, /for insert/i);
});
