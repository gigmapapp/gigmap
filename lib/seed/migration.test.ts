import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const migration = readFileSync(
  path.join(migrationsDir, "20260929150000_create_gigmap_tables.sql"),
  "utf8",
);
const dropLegacy = readFileSync(
  path.join(migrationsDir, "20260929140000_drop_legacy_empty_tables.sql"),
  "utf8",
);

test("every app table enables and forces row level security", () => {
  for (const table of ["performers", "videos", "gigs", "booking_requests"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
});

test("booking requests are not publicly readable", () => {
  assert.match(migration, /grant insert on table public\.booking_requests to anon, authenticated/);
  assert.doesNotMatch(migration, /on public\.booking_requests\s+for select/i);
  assert.doesNotMatch(migration, /grant select(?:,| on)[^;]*booking_requests/i);
});

test("catalog tables are publicly readable and insertable", () => {
  for (const table of ["performers", "videos", "gigs"]) {
    assert.match(migration, new RegExp(`${table}_public_read`));
    assert.match(migration, new RegExp(`${table}_public_insert`));
    assert.match(migration, new RegExp(`grant select, insert on table public\\.${table} to anon, authenticated`));
  }
});

test("legacy drop migration sorts first and aborts when a legacy table has rows", () => {
  const files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();
  assert.deepEqual(files, [
    "20260929140000_drop_legacy_empty_tables.sql",
    "20260929150000_create_gigmap_tables.sql",
  ]);
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

test("clip bucket is public with a size cap and no anon insert policy", () => {
  assert.match(migration, /'clips'/);
  assert.match(migration, /10485760/);
  assert.match(migration, /clips_public_read/);
  assert.match(migration, /clips_service_insert/);
  assert.match(migration, /to service_role/);
  assert.doesNotMatch(migration, /clips_anon_insert|to anon, authenticated\s+with check \(\s*bucket_id = 'clips'/);
});
