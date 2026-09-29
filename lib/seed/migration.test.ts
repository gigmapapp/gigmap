import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const migrationFiles = [
  "20260929140000_drop_legacy_empty_tables.sql",
  "20260929150000_create_gigmap_tables.sql",
  "20260929155000_create_clips_bucket.sql",
  "20260929160000_revoke_anon_table_writes.sql",
  "20260929170000_revoke_rls_auto_enable.sql",
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
